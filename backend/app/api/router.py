from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, File, Form, Header, Query, UploadFile
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contracts.schemas import (
    AnswerReviewUpdate,
    AppearanceUpdate,
    ConversationCreate,
    DeepSeekSettingsUpdate,
    ModelDiscoverRequest,
    OcrReviewSubmit,
    QuestionCreate,
)
from app.db.models import Answer, AnswerEvent, CompileEvent, CompileRun
from app.db.session import get_db, session_factory
from app.services import answer_quality, compilation, knowledge, project_backup, qa, settings

router = APIRouter()


@router.get("/project/backup")
def export_project(session: Session = Depends(get_db)) -> Response:
    return Response(
        project_backup.export_project(session),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="ff-llm-wiki-backup.zip"',
                 "Cache-Control": "no-store"},
    )


async def _read_project_upload(file: UploadFile) -> bytes:
    try:
        content = await file.read(project_backup.MAX_PACKAGE_BYTES + 1)
        if len(content) > project_backup.MAX_PACKAGE_BYTES:
            raise ValueError("项目包不能超过 64 MB")
        return content
    finally:
        await file.close()


@router.post("/project/backup/inspect")
async def inspect_project_backup(file: UploadFile = File(...)) -> dict:
    return project_backup.inspect_package(await _read_project_upload(file))


@router.post("/project/restore")
async def restore_project(
    file: UploadFile = File(...), confirmation: str = Form(...),
    session: Session = Depends(get_db),
) -> dict:
    if confirmation != "replace":
        raise ValueError("请明确确认替换当前项目")
    return project_backup.restore_project(session, await _read_project_upload(file))


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "FF - LLM Wiki知识库"}


@router.get("/bootstrap")
def bootstrap(session: Session = Depends(get_db)) -> dict:
    return knowledge.bootstrap_view(session)


@router.get("/sources")
def sources(
    query: str | None = None,
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, alias="pageSize", ge=1, le=100),
    session: Session = Depends(get_db),
) -> dict:
    return knowledge.list_sources(
        session,
        query=query,
        status=status,
        page=page,
        page_size=page_size,
    )


@router.post("/sources/import", status_code=202)
async def import_sources(
    files: list[UploadFile] = File(...),
    topic: str | None = Form(default=None),
    session: Session = Depends(get_db),
) -> dict:
    return await compilation.import_files(session, files, topic=topic)


@router.get("/compile-runs")
def list_compile_runs(
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, alias="pageSize", ge=1, le=100),
    session: Session = Depends(get_db),
) -> dict:
    statement = select(CompileRun)
    if status:
        statement = statement.where(CompileRun.status == status)
    runs = session.scalars(
        statement.order_by(CompileRun.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {"items": [knowledge.compile_run_view(run) for run in runs]}


@router.get("/sources/{source_id}")
def get_source(source_id: str, session: Session = Depends(get_db)) -> dict:
    return knowledge.source_detail(session, source_id)


@router.delete("/sources/{source_id}")
def remove_source(source_id: str, session: Session = Depends(get_db)) -> dict:
    return knowledge.remove_source(session, source_id)


@router.get("/source-versions/{source_version_id}/content")
def get_source_content(source_version_id: str, session: Session = Depends(get_db)) -> dict:
    return knowledge.source_version_content(session, source_version_id)


@router.post("/source-versions/{source_version_id}/ocr-review", status_code=202)
async def submit_ocr_review(
    source_version_id: str,
    payload: OcrReviewSubmit,
    session: Session = Depends(get_db),
) -> dict:
    return compilation.review_ocr_pages(session, source_version_id, payload.pages)


@router.get("/source-versions/{source_version_id}/original")
def get_source_original(source_version_id: str, session: Session = Depends(get_db)) -> FileResponse:
    version = knowledge.source_original_file(session, source_version_id)
    return FileResponse(
        version.original_path,
        media_type=version.mime_type,
        filename=version.original_filename,
        content_disposition_type="inline" if version.mime_type == "application/pdf" else "attachment",
    )


@router.get("/compile-runs/{run_id}")
def get_compile_run(run_id: str, session: Session = Depends(get_db)) -> dict:
    run = session.get(CompileRun, run_id)
    if not run:
        raise LookupError("处理任务不存在")
    return knowledge.compile_run_view(run)


@router.post("/compile-runs/{run_id}/cancel")
async def cancel_compile_run(run_id: str) -> dict:
    return await compilation.cancel_run(run_id)


@router.delete("/compile-runs/{run_id}", status_code=204)
def delete_compile_run(run_id: str, session: Session = Depends(get_db)) -> None:
    compilation.delete_run(session, run_id)


@router.get("/compile-runs/{run_id}/review")
def get_compile_review(run_id: str, session: Session = Depends(get_db)) -> dict:
    return compilation.review_view(session, run_id)


@router.post("/compile-runs/{run_id}/accept")
def accept_compile_run(run_id: str, session: Session = Depends(get_db)) -> dict:
    return compilation.accept_run(session, run_id)


@router.post("/compile-runs/{run_id}/retry", status_code=202)
async def retry_compile_run(run_id: str, session: Session = Depends(get_db)) -> dict:
    return compilation.retry_run(session, run_id)


@router.get("/compile-runs/{run_id}/events")
async def compile_events(
    run_id: str,
    last_event_id_header: str | None = Header(default=None, alias="Last-Event-ID"),
    last_event_id_query: int = Query(default=0, alias="lastEventId", ge=0),
) -> StreamingResponse:
    last_event_id = int(last_event_id_header or last_event_id_query or 0)
    return StreamingResponse(
        _compile_event_stream(run_id, last_event_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _compile_event_stream(run_id: str, last_event_id: int) -> AsyncIterator[str]:
    cursor = last_event_id
    idle_ticks = 0
    while True:
        with session_factory()() as session:
            run = session.get(CompileRun, run_id)
            if not run:
                payload = {"code": "compile_run_not_found", "message": "处理任务不存在"}
                yield f"event: error\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
                return
            events = session.scalars(
                select(CompileEvent)
                .where(CompileEvent.run_id == run_id, CompileEvent.sequence > cursor)
                .order_by(CompileEvent.sequence)
            ).all()
            for event in events:
                cursor = event.sequence
                payload = {
                    "runId": run_id,
                    "status": run.status,
                    "stage": event.stage,
                    "message": event.message,
                    "counts": event.counts,
                    "objectId": event.object_id,
                    "createdAt": event.created_at.isoformat(),
                }
                yield (
                    f"id: {event.sequence}\nevent: compile\n"
                    f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                )
            terminal = (
                run.status in compilation.TERMINAL_RUN_STATES or run.status == "awaiting_review"
            )
        if terminal and not events:
            return
        idle_ticks += 1
        if idle_ticks % 40 == 0:
            yield ": keep-alive\n\n"
        await asyncio.sleep(0.25)


@router.get("/knowledge")
def list_knowledge(
    query: str | None = None,
    domain: str | None = None,
    knowledge_type: str | None = Query(default=None, alias="type"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=36, alias="pageSize", ge=1, le=100),
    session: Session = Depends(get_db),
) -> dict:
    return knowledge.list_knowledge(
        session,
        query=query,
        domain=domain,
        knowledge_type=knowledge_type,
        page=page,
        page_size=page_size,
    )


@router.get("/knowledge/{knowledge_id}")
def get_knowledge(knowledge_id: str, session: Session = Depends(get_db)) -> dict:
    return knowledge.knowledge_detail(session, knowledge_id)


@router.get("/evidence/{evidence_id}")
def get_evidence(evidence_id: str, session: Session = Depends(get_db)) -> dict:
    return knowledge.evidence_detail(session, evidence_id)


@router.get("/relations/{relation_id}")
def get_relation(relation_id: str, session: Session = Depends(get_db)) -> dict:
    return knowledge.relation_detail(session, relation_id)


@router.get("/graph")
def graph(session: Session = Depends(get_db)) -> dict:
    return knowledge.graph_projection(session)


@router.get("/suggested-questions")
def get_suggested_questions(session: Session = Depends(get_db)) -> dict:
    return knowledge.suggested_questions(session)


@router.get("/conversations")
def get_conversations(session: Session = Depends(get_db)) -> dict:
    return {"items": qa.list_conversations(session)}


@router.post("/conversations", status_code=201)
def create_conversation(
    payload: ConversationCreate,
    session: Session = Depends(get_db),
) -> dict:
    return qa.create_conversation(session, payload.contextKnowledgeIds)


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, session: Session = Depends(get_db)) -> dict:
    return qa.get_conversation(session, conversation_id)


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, session: Session = Depends(get_db)) -> dict:
    return qa.delete_conversation(session, conversation_id)


@router.delete("/conversations/{conversation_id}/messages/{message_id}")
def delete_message(
    conversation_id: str, message_id: str, session: Session = Depends(get_db)
) -> dict:
    return qa.delete_message(session, conversation_id, message_id)


@router.post("/conversations/{conversation_id}/questions", status_code=202)
async def create_question(
    conversation_id: str,
    payload: QuestionCreate,
    session: Session = Depends(get_db),
) -> dict:
    return qa.submit_question(
        session, conversation_id, payload.question, payload.profileId, payload.modelId
    )


@router.get("/answers/{answer_id}")
def get_answer(answer_id: str, session: Session = Depends(get_db)) -> dict:
    return qa.get_answer(session, answer_id)


@router.get("/answer-quality")
def list_answer_quality(
    query: str | None = Query(default=None, max_length=200),
    status: str = Query(default="all", pattern="^(all|attention|reviewed|unreviewed)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, alias="pageSize", ge=1, le=100),
    session: Session = Depends(get_db),
) -> dict:
    return answer_quality.list_quality(
        session, query=query, status=status, page=page, page_size=page_size,
    )


@router.put("/answer-quality/{answer_id}/review")
def put_answer_review(
    answer_id: str, payload: AnswerReviewUpdate, session: Session = Depends(get_db)
) -> dict:
    return answer_quality.update_review(session, answer_id, **payload.model_dump())


@router.post("/answers/{answer_id}/retry", status_code=202)
async def retry_answer(answer_id: str, session: Session = Depends(get_db)) -> dict:
    return qa.retry_answer(session, answer_id)


@router.post("/answers/{answer_id}/cancel")
async def cancel_answer(answer_id: str) -> dict:
    return await qa.cancel_answer(answer_id)


@router.get("/answers/{answer_id}/events")
async def answer_events(
    answer_id: str,
    last_event_id_header: str | None = Header(default=None, alias="Last-Event-ID"),
    last_event_id_query: int = Query(default=0, alias="lastEventId", ge=0),
) -> StreamingResponse:
    last_event_id = int(last_event_id_header or last_event_id_query or 0)
    return StreamingResponse(
        _answer_event_stream(answer_id, last_event_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _answer_event_stream(answer_id: str, last_event_id: int) -> AsyncIterator[str]:
    cursor = last_event_id
    idle_ticks = 0
    while True:
        with session_factory()() as session:
            answer = session.get(Answer, answer_id)
            if not answer:
                payload = {"code": "answer_not_found", "message": "回答不存在"}
                yield f"event: error\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
                return
            events = session.scalars(
                select(AnswerEvent)
                .where(AnswerEvent.answer_id == answer_id, AnswerEvent.sequence > cursor)
                .order_by(AnswerEvent.sequence)
            ).all()
            for event in events:
                cursor = event.sequence
                yield (
                    f"id: {event.sequence}\nevent: {event.event_type}\n"
                    f"data: {json.dumps(event.payload, ensure_ascii=False)}\n\n"
                )
            terminal = answer.status in {"completed", "failed", "insufficient"}
        if terminal and not events:
            return
        idle_ticks += 1
        if idle_ticks % 40 == 0:
            yield ": keep-alive\n\n"
        await asyncio.sleep(0.1)


@router.get("/settings/deepseek")
def get_deepseek(session: Session = Depends(get_db)) -> dict:
    return settings.get_deepseek_settings(session)


@router.put("/settings/deepseek")
def put_deepseek(
    payload: DeepSeekSettingsUpdate,
    session: Session = Depends(get_db),
) -> dict:
    return settings.update_deepseek_settings(session, payload.model_dump())


@router.post("/settings/deepseek/test")
async def test_deepseek(session: Session = Depends(get_db)) -> dict:
    return await settings.test_deepseek_settings(session)


@router.get("/settings/models")
def get_models(session: Session = Depends(get_db)) -> dict:
    return settings.get_model_settings(session)


@router.put("/settings/models/{profile_id}")
def put_model(
    profile_id: str,
    payload: DeepSeekSettingsUpdate,
    session: Session = Depends(get_db),
) -> dict:
    return settings.update_model_settings(session, profile_id, payload.model_dump())


@router.post("/settings/models/{profile_id}/test")
async def test_model(profile_id: str, session: Session = Depends(get_db)) -> dict:
    return await settings.test_model_settings(session, profile_id)

@router.post("/settings/models/{profile_id}/discover")
async def discover_models(
    profile_id: str,
    payload: ModelDiscoverRequest,
    session: Session = Depends(get_db),
) -> dict:
    return await settings.discover_models(session, profile_id, payload.model_dump())


@router.post("/settings/models/{profile_id}/activate")
def activate_model(profile_id: str, session: Session = Depends(get_db)) -> dict:
    return settings.activate_model(session, profile_id)


@router.get("/settings/appearance")
def get_appearance(session: Session = Depends(get_db)) -> dict:
    return settings.get_appearance(session)


@router.put("/settings/appearance")
def put_appearance(
    payload: AppearanceUpdate,
    session: Session = Depends(get_db),
) -> dict:
    return settings.update_appearance(session, payload.model_dump())
