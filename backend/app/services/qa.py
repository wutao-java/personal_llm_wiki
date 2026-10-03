from __future__ import annotations

import asyncio
import re
import uuid
from collections import Counter
from datetime import UTC, datetime
from math import log

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.adapters.deepseek import DeepSeekError
from app.db.models import (
    Answer,
    AnswerEvent,
    AnswerReview,
    Conversation,
    Evidence,
    KnowledgeItem,
    Message,
    Source,
)
from app.db.session import session_factory
from app.services.knowledge import (
    answer_view,
    conversation_detail,
    conversation_view,
    current_project,
    current_snapshot,
    page_provenance,
    search_knowledge,
)
from app.services.settings import get_client

TERMINAL_ANSWER_STATES = {"completed", "failed", "insufficient"}
_answer_tasks: dict[str, asyncio.Task] = {}


def list_conversations(session: Session) -> list[dict]:
    conversations = session.scalars(
        select(Conversation).order_by(Conversation.updated_at.desc()).limit(40)
    ).all()
    return [conversation_view(item) for item in conversations]


def create_conversation(session: Session, context_knowledge_ids: list[str] | None = None) -> dict:
    project = current_project(session)
    conversation = Conversation(
        conversation_id=f"CONV-{uuid.uuid4().hex.upper()}",
        project_id=project.project_id,
        title="新对话",
        context_knowledge_ids=list(dict.fromkeys(context_knowledge_ids or [])),
    )
    session.add(conversation)
    session.commit()
    return conversation_view(conversation)


def submit_question(
    session: Session, conversation_id: str, question: str,
    profile_id: str | None = None, model_id: str | None = None,
) -> dict:
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise LookupError("对话不存在")
    if session.scalar(select(Answer.answer_id).where(
        Answer.conversation_id == conversation_id,
        Answer.status.not_in(TERMINAL_ANSWER_STATES),
    ).limit(1)):
        raise ValueError("当前对话仍在生成回答，请结束或停止后再提问")
    normalized = question.strip()
    if not normalized:
        raise ValueError("问题不能为空")
    if len(normalized) > 4000:
        raise ValueError("问题内容过长")
    if bool(profile_id) != bool(model_id):
        raise ValueError("请选择完整的在线服务和模型")
    if profile_id and model_id:
        profile, client = get_client(
            session, profile_id=profile_id, model_id=model_id, require_available=True
        )
    snapshot = current_snapshot(session)
    question_message = Message(
        message_id=f"MSG-{uuid.uuid4().hex.upper()}",
        conversation_id=conversation_id,
        role="user",
        content=normalized,
    )
    answer = Answer(
        answer_id=f"ANS-{uuid.uuid4().hex.upper()}",
        conversation_id=conversation_id,
        question_message_id=question_message.message_id,
        snapshot_id=snapshot.snapshot_id,
        status="received",
        model_profile_id=profile.profile_id if profile_id and model_id else None,
        model_id=client.model_id if profile_id and model_id else None,
    )
    session.add(question_message)
    session.flush()
    session.add(answer)
    if conversation.title == "新对话":
        conversation.title = normalized[:32]
    conversation.updated_at = datetime.now(UTC)
    session.commit()
    _schedule_answer(answer.answer_id)
    return {
        "answerId": answer.answer_id,
        "conversationId": conversation_id,
        "snapshotId": snapshot.snapshot_id,
        "status": "received",
    }


def _schedule_answer(answer_id: str) -> None:
    task = asyncio.create_task(generate_answer(answer_id), name=f"answer:{answer_id}")
    _answer_tasks[answer_id] = task
    task.add_done_callback(lambda _: _answer_tasks.pop(answer_id, None))


def _record_answer_event(session: Session, answer: Answer, event_type: str, payload: dict) -> None:
    last_sequence = (
        session.scalar(
            select(func.max(AnswerEvent.sequence)).where(AnswerEvent.answer_id == answer.answer_id)
        )
        or 0
    )
    session.add(
        AnswerEvent(
            answer_id=answer.answer_id,
            sequence=last_sequence + 1,
            event_type=event_type,
            payload=payload,
        )
    )
    session.commit()


def _query_terms(query: str) -> set[str]:
    groups = re.findall(r"[\u3400-\u9fff]+|[A-Za-z0-9_-]+", query.lower())
    terms = set()
    for group in groups:
        if re.fullmatch(r"[\u3400-\u9fff]+", group):
            terms.update(group[index:index + 2] for index in range(len(group) - 1))
        elif len(group) > 1:
            terms.add(group)
    return terms - {"what", "is", "the", "are", "how", "does", "什么", "多少", "如何", "怎么"}


def _build_evidence(
    session: Session, items: list[KnowledgeItem], *, query: str = "",
    context_query: str = "", limit: int = 12,
) -> list[dict]:
    payload: list[dict] = []
    seen: set[str] = set()
    candidates = []
    for item in items:
        for evidence_id in item.evidence_ids or []:
            if evidence_id in seen:
                continue
            evidence = session.get(Evidence, evidence_id)
            if not evidence:
                continue
            candidates.append((item, evidence))
            seen.add(evidence_id)
    current_terms = _query_terms(query)
    context_terms = _query_terms(context_query)
    terms = current_terms | context_terms
    matches = [terms.intersection(_query_terms(evidence.quote)) for _, evidence in candidates]
    frequencies = Counter(term for matched in matches for term in matched)
    scores = [
        sum(
            (1 if term in current_terms else 0.2)
            * log(1 + len(candidates) / frequencies[term])
            for term in matched
        ) for matched in matches
    ]
    order = sorted(range(len(candidates)), key=lambda index: -scores[index])[:limit]
    for index in order:
        item, evidence = candidates[index]
        source = session.get(Source, evidence.source_id)
        payload.append({
            "evidenceId": evidence.evidence_id,
            "knowledgeId": item.knowledge_id,
            "knowledgeTitle": item.title,
            "sourceId": evidence.source_id,
            "sourceVersionId": evidence.source_version_id,
            "sourceTitle": source.title if source else evidence.source_id,
            "quote": evidence.quote,
            "charStart": evidence.char_start,
            "charEnd": evidence.char_end,
            "pageNumber": evidence.page_number,
            **page_provenance(session, evidence),
            "blockNumber": evidence.block_number,
            "blockLabel": evidence.block_label,
        })
    return payload


async def generate_answer(answer_id: str) -> None:
    with session_factory()() as session:
        answer = session.get(Answer, answer_id)
        if not answer or answer.status in TERMINAL_ANSWER_STATES:
            return
        question_message = session.get(Message, answer.question_message_id)
        if not question_message:
            return
        try:
            answer.status = "retrieving"
            _record_answer_event(
                session,
                answer,
                "stage",
                {"stage": "retrieving", "message": "正在检索当前知识版本"},
            )
            conversation = session.get(Conversation, answer.conversation_id)
            previous_messages = session.scalars(select(Message).where(
                Message.conversation_id == answer.conversation_id,
                Message.role == "user",
                or_(
                    Message.created_at < question_message.created_at,
                    (Message.created_at == question_message.created_at)
                    & (Message.message_id < question_message.message_id),
                ),
            ).order_by(Message.created_at.desc(), Message.message_id.desc()).limit(6)).all()
            history = [
                {"role": "user", "content": message.content[:1000]}
                for message in reversed(previous_messages)
            ]
            items = search_knowledge(session, answer.snapshot_id, question_message.content, limit=8)
            if history:
                contextual = search_knowledge(
                    session, answer.snapshot_id,
                    f"{history[-1]['content']}\n{question_message.content}", limit=8,
                )
                seen_ids = {item.knowledge_id for item in items}
                items.extend(item for item in contextual if item.knowledge_id not in seen_ids)
            selected = session.scalars(select(KnowledgeItem).where(
                KnowledgeItem.snapshot_id == answer.snapshot_id,
                KnowledgeItem.knowledge_id.in_(conversation.context_knowledge_ids or []),
            )).all() if conversation else []
            by_id = {item.knowledge_id: item for item in [*selected, *items]}
            items = list(by_id.values())[:8]
            evidence = _build_evidence(
                session, items, query=question_message.content,
                context_query=history[-1]["content"] if history else "",
            )
            answer.related_knowledge_ids = [item.knowledge_id for item in items]
            answer.retrieved_source_count = len({item["sourceId"] for item in evidence})
            if not evidence:
                answer.status = "insufficient"
                answer.evidence_status = "insufficient"
                answer.content = (
                    "当前知识中无法确认这个问题。已检索当前知识版本，但没有找到能够支持确定结论的来源证据。"
                    "你可以换一种问法，或在资料管理中补充相关资料后重新生成知识。"
                )
                answer.completed_at = datetime.now(UTC)
                message = Message(
                    message_id=f"MSG-{uuid.uuid4().hex.upper()}",
                    conversation_id=answer.conversation_id,
                    role="assistant",
                    content=answer.content,
                )
                session.add(message)
                session.flush()
                answer.answer_message_id = message.message_id
                session.commit()
                _record_answer_event(session, answer, "final", answer_view(answer))
                return

            answer.status = "organizing"
            _record_answer_event(
                session,
                answer,
                "stage",
                {
                    "stage": "organizing",
                    "message": "正在整理可引用证据",
                    "knowledgeCount": len(items),
                    "sourceCount": answer.retrieved_source_count,
                },
            )
            if answer.model_profile_id and answer.model_id:
                profile, client = get_client(
                    session, require_available=True,
                    profile_id=answer.model_profile_id, model_id=answer.model_id,
                )
            else:
                profile, client = get_client(session, require_available=True)
            answer.model_id = getattr(client, "model_id", profile.model_id)
            answer.model_profile_id = getattr(profile, "profile_id", None)
            answer.status = "generating"
            _record_answer_event(
                session,
                answer,
                "stage",
                {"stage": "generating", "message": "正在生成带引用的回答"},
            )
            full_content = ""
            pending_chunk = ""
            context = {"history": history} if history else {}
            async for chunk in client.stream_answer(
                question=question_message.content, evidence=evidence, **context,
            ):
                full_content += chunk
                pending_chunk += chunk
                if len(pending_chunk) >= 12 or pending_chunk.endswith(("。", "！", "？", "；", "\n")):
                    _record_answer_event(session, answer, "chunk", {"text": pending_chunk})
                    pending_chunk = ""
            if pending_chunk:
                _record_answer_event(session, answer, "chunk", {"text": pending_chunk})
            if not full_content.strip():
                raise DeepSeekError("empty_answer", "模型服务没有返回可用回答")

            used_indexes = {int(match) for match in re.findall(r"\[(\d+)\]", full_content)}
            if any(index < 1 or index > len(evidence) for index in used_indexes):
                raise DeepSeekError("invalid_answer_citation", "回答引用了不存在的证据编号，请重试当前问题")
            if not used_indexes:
                raise DeepSeekError("missing_answer_citation", "回答未提供可追溯引用，请重试当前问题")
            citations = [{"index": index, **evidence[index - 1]} for index in sorted(used_indexes)]
            answer.content = full_content.strip()
            answer.citations = citations
            answer.used_source_count = len({item["sourceId"] for item in citations})
            answer.evidence_status = "sufficient" if citations else "limited"
            answer.status = "completed"
            answer.completed_at = datetime.now(UTC)
            message = Message(
                message_id=f"MSG-{uuid.uuid4().hex.upper()}",
                conversation_id=answer.conversation_id,
                role="assistant",
                content=answer.content,
            )
            session.add(message)
            session.flush()
            answer.answer_message_id = message.message_id
            conversation = session.get(Conversation, answer.conversation_id)
            if conversation:
                conversation.updated_at = datetime.now(UTC)
            session.commit()
            _record_answer_event(session, answer, "final", answer_view(answer))
        except asyncio.CancelledError as exc:
            session.rollback()
            code = "answer_cancelled" if exc.args == ("answer_cancelled",) else "answer_interrupted"
            _fail_answer(session, answer_id, code, (
                "回答已停止，可手动重新生成" if code == "answer_cancelled"
                else "服务中断，回答未完成，可手动重新生成"
            ))
            raise
        except DeepSeekError as exc:
            session.rollback()
            _fail_answer(session, answer_id, exc.code, exc.message)
        except Exception:
            session.rollback()
            _fail_answer(session, answer_id, "answer_internal_error", "回答未完成，可以重试当前问题")


def _attach_failed_message(session: Session, answer: Answer) -> None:
    if not answer.answer_message_id:
        message = Message(
            message_id=f"MSG-{uuid.uuid4().hex.upper()}",
            conversation_id=answer.conversation_id, role="assistant", content="",
        )
        session.add(message)
        session.flush()
        answer.answer_message_id = message.message_id


def _fail_answer(session: Session, answer_id: str, code: str, message: str) -> None:
    answer = session.get(Answer, answer_id)
    if not answer or answer.status in TERMINAL_ANSWER_STATES:
        return
    answer.status = "failed"
    answer.evidence_status = "limited"
    answer.error_code = code
    answer.error_message = message
    answer.completed_at = datetime.now(UTC)
    _attach_failed_message(session, answer)
    _record_answer_event(session, answer, "error", answer_view(answer))


def mark_interrupted_answers() -> None:
    with session_factory()() as session:
        for answer in session.scalars(select(Answer).where(or_(
            Answer.status.not_in(TERMINAL_ANSWER_STATES),
            (Answer.status == "failed") & Answer.answer_message_id.is_(None),
        ))).all():
            if answer.status not in TERMINAL_ANSWER_STATES:
                _fail_answer(
                    session, answer.answer_id, "answer_interrupted",
                    "服务中断，回答未完成，可手动重新生成",
                )
            elif answer.status == "failed":
                _attach_failed_message(session, answer)
        session.commit()


async def cancel_answer(answer_id: str) -> dict:
    with session_factory()() as session:
        answer = session.get(Answer, answer_id)
        if not answer:
            raise LookupError("回答不存在")
        if answer.status in TERMINAL_ANSWER_STATES:
            return answer_view(answer)
    task = _answer_tasks.get(answer_id)
    if task:
        task.cancel("answer_cancelled")
        await asyncio.gather(task, return_exceptions=True)
    with session_factory()() as session:
        _fail_answer(session, answer_id, "answer_cancelled", "回答已停止，可手动重新生成")
        return get_answer(session, answer_id)


def get_answer(session: Session, answer_id: str) -> dict:
    answer = session.get(Answer, answer_id)
    if not answer:
        raise LookupError("回答不存在")
    return answer_view(answer)


def get_conversation(session: Session, conversation_id: str) -> dict:
    return conversation_detail(session, conversation_id)


def delete_conversation(session: Session, conversation_id: str) -> dict:
    conversation = session.get(Conversation, conversation_id)
    if not conversation or conversation.project_id != current_project(session).project_id:
        raise LookupError("对话不存在")
    answers = session.scalars(
        select(Answer).where(Answer.conversation_id == conversation_id)
    ).all()
    if any(answer.status not in {"completed", "failed", "insufficient"} for answer in answers):
        raise ValueError("回答仍在生成，请完成后再删除对话")

    answer_ids = [answer.answer_id for answer in answers]
    if answer_ids:
        session.execute(delete(AnswerEvent).where(AnswerEvent.answer_id.in_(answer_ids)))
        session.execute(delete(AnswerReview).where(AnswerReview.answer_id.in_(answer_ids)))
        session.execute(delete(Answer).where(Answer.conversation_id == conversation_id))
    session.execute(delete(Message).where(Message.conversation_id == conversation_id))
    session.delete(conversation)
    session.commit()
    return {"conversationId": conversation_id}


def delete_message(session: Session, conversation_id: str, message_id: str) -> dict:
    conversation = session.get(Conversation, conversation_id)
    if not conversation or conversation.project_id != current_project(session).project_id:
        raise LookupError("对话不存在")
    message = session.get(Message, message_id)
    if not message or message.conversation_id != conversation_id:
        raise LookupError("消息不存在")

    answers = session.scalars(
        select(Answer).where(
            Answer.conversation_id == conversation_id,
            (Answer.question_message_id == message_id)
            if message.role == "user" else (Answer.answer_message_id == message_id),
        )
    ).all()
    if any(answer.status not in {"completed", "failed", "insufficient"} for answer in answers):
        raise ValueError("回答仍在生成，请完成后再删除")

    answer_ids = [answer.answer_id for answer in answers]
    if answer_ids:
        session.execute(delete(AnswerEvent).where(AnswerEvent.answer_id.in_(answer_ids)))
        session.execute(delete(AnswerReview).where(AnswerReview.answer_id.in_(answer_ids)))
        for answer in answers:
            session.delete(answer)
        session.flush()
        if message.role == "user":
            for answer in answers:
                if answer.answer_message_id:
                    reply = session.get(Message, answer.answer_message_id)
                    if reply:
                        session.delete(reply)
    session.delete(message)
    session.flush()
    if message.role == "user":
        next_question = session.scalar(
            select(Message)
            .where(Message.conversation_id == conversation_id, Message.role == "user")
            .order_by(Message.created_at, Message.message_id)
            .limit(1)
        )
        conversation.title = next_question.content[:32] if next_question else "新对话"
    conversation.updated_at = datetime.now(UTC)
    session.commit()
    return {"messageId": message_id}


def retry_answer(session: Session, answer_id: str) -> dict:
    previous = session.get(Answer, answer_id)
    if not previous:
        raise LookupError("回答不存在")
    if previous.status != "failed":
        raise ValueError("只有失败的回答可以重试")
    question = session.get(Message, previous.question_message_id)
    if not question:
        raise LookupError("原问题不存在")
    return submit_question(
        session, previous.conversation_id, question.content,
        previous.model_profile_id, previous.model_id
        if previous.model_profile_id else None,
    )


async def stop_answer_tasks() -> None:
    tasks = tuple(_answer_tasks.values())
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    mark_interrupted_answers()
