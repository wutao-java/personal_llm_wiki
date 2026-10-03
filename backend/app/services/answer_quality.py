from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session

from app.db.models import Answer, AnswerReview, CompileRun, Conversation, Message, Snapshot
from app.services.knowledge import answer_view, compile_run_view, current_project, iso

TERMINAL = {"completed", "failed", "insufficient"}


def review_view(review: AnswerReview | None) -> dict | None:
    if not review:
        return None
    return {
        "verdict": review.verdict,
        "category": review.category,
        "note": review.note,
        "updatedAt": iso(review.updated_at),
    }


def item_view(
    answer: Answer, question: Message, review: AnswerReview | None, version: str | None
) -> dict:
    return {
        **answer_view(answer),
        "conversationId": answer.conversation_id,
        "question": question.content,
        "createdAt": iso(answer.created_at),
        "snapshotVersion": version,
        "review": review_view(review),
    }


def list_quality(
    session: Session, *, query: str | None, status: str, page: int, page_size: int
) -> dict:
    project_id = current_project(session).project_id
    scope = (
        select(Answer)
        .join(Conversation, Answer.conversation_id == Conversation.conversation_id)
        .outerjoin(AnswerReview, AnswerReview.answer_id == Answer.answer_id)
        .where(Conversation.project_id == project_id)
    )
    summary = session.execute(scope.with_only_columns(
        func.count(Answer.answer_id),
        func.sum(case((Answer.status == "completed", 1), else_=0)),
        func.sum(case((Answer.status == "failed", 1), else_=0)),
        func.sum(case((Answer.status == "insufficient", 1), else_=0)),
        func.sum(case((and_(Answer.status == "completed", Answer.used_source_count == 0), 1), else_=0)),
        func.sum(case((AnswerReview.verdict.is_not(None), 1), else_=0)),
        func.sum(case((AnswerReview.verdict == "issue", 1), else_=0)),
        func.sum(case((or_(
            Answer.status == "failed",
            and_(Answer.status == "completed", Answer.used_source_count == 0),
            AnswerReview.verdict == "issue",
        ), 1), else_=0)),
    )).one()
    filtered = (
        select(Answer, Message, AnswerReview, Snapshot.version)
        .join(Conversation, Answer.conversation_id == Conversation.conversation_id)
        .join(Message, Answer.question_message_id == Message.message_id)
        .outerjoin(AnswerReview, AnswerReview.answer_id == Answer.answer_id)
        .outerjoin(Snapshot, Answer.snapshot_id == Snapshot.snapshot_id)
        .where(Conversation.project_id == project_id)
    )
    if query and query.strip():
        filtered = filtered.where(Message.content.contains(query.strip(), autoescape=True))
    if status == "attention":
        filtered = filtered.where(or_(
            Answer.status == "failed",
            and_(Answer.status == "completed", Answer.used_source_count == 0),
            AnswerReview.verdict == "issue",
        ))
    elif status == "reviewed":
        filtered = filtered.where(AnswerReview.verdict.is_not(None))
    elif status == "unreviewed":
        filtered = filtered.where(AnswerReview.verdict.is_(None))
    total = session.scalar(filtered.with_only_columns(func.count()).order_by(None)) or 0
    rows = session.execute(
        filtered.order_by(Answer.created_at.desc(), Answer.answer_id.desc())
        .offset((page - 1) * page_size).limit(page_size)
    ).all()
    keys = (
        "answerCount", "completedCount", "failedCount", "insufficientCount",
        "uncitedCount", "reviewedCount", "issueCount", "attentionCount",
    )
    failed_runs = session.scalars(
        select(CompileRun).where(
            CompileRun.project_id == project_id, CompileRun.status == "failed",
        ).order_by(CompileRun.updated_at.desc()).limit(5)
    ).all()
    failed_run_count = session.scalar(select(func.count()).select_from(CompileRun).where(
        CompileRun.project_id == project_id, CompileRun.status == "failed",
    )) or 0
    return {
        "summary": {
            **dict(zip(keys, (int(value or 0) for value in summary), strict=True)),
            "compileFailureCount": failed_run_count,
        },
        "items": [item_view(*row) for row in rows],
        "failedRuns": [compile_run_view(run) for run in failed_runs],
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


def update_review(
    session: Session, answer_id: str, *, verdict: str, category: str | None, note: str
) -> dict:
    answer = session.get(Answer, answer_id)
    conversation = session.get(Conversation, answer.conversation_id) if answer else None
    if not conversation or conversation.project_id != current_project(session).project_id:
        raise LookupError("回答不存在")
    if answer.status not in TERMINAL:
        raise ValueError("回答结束后才可核查")
    cleaned_note = note.strip()
    cleaned_category = category.strip() if category else None
    if verdict == "issue" and (not cleaned_note or not cleaned_category):
        raise ValueError("需处理的回答必须填写问题类别和说明")
    review = session.get(AnswerReview, answer_id)
    if verdict == "pending":
        if review:
            session.delete(review)
        review = None
    else:
        if not review:
            review = AnswerReview(answer_id=answer_id)
            session.add(review)
        review.verdict = verdict
        review.category = cleaned_category if verdict == "issue" else None
        review.note = cleaned_note
        review.updated_at = datetime.now(UTC)
    session.commit()
    return {"answerId": answer_id, "review": review_view(review)}
