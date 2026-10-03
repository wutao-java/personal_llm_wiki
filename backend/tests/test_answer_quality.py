from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    Answer,
    AnswerEvent,
    AnswerReview,
    CompileRun,
    Conversation,
    Message,
    Project,
)
from app.services.seed import PROJECT_ID


def test_answer_quality_tracks_real_answers_and_persisted_review(
    client: TestClient, db_session: Session
) -> None:
    token = uuid.uuid4().hex.upper()
    project = db_session.get(Project, PROJECT_ID)
    assert project and project.current_snapshot_id
    conversation_id = f"CONV-QUALITY-{token}"
    question_id = f"MSG-QUALITY-{token}"
    answer_id = f"ANS-QUALITY-{token}"
    db_session.add(Conversation(
        conversation_id=conversation_id, project_id=PROJECT_ID, title="核查问题",
    ))
    db_session.add(Message(
        message_id=question_id, conversation_id=conversation_id, role="user",
        content=f"如何检查引用 {token}？",
    ))
    db_session.flush()
    db_session.add(Answer(
        answer_id=answer_id, conversation_id=conversation_id,
        question_message_id=question_id, snapshot_id=project.current_snapshot_id,
        status="completed", content="实际回答", evidence_status="limited",
        citations=[], used_source_count=0,
    ))
    db_session.commit()

    base = "/api/v1/answer-quality"
    result = client.get(base, params={"query": token})
    assert result.status_code == 200, result.text
    assert result.json()["total"] == 1
    assert result.json()["items"][0]["answerId"] == answer_id
    assert result.json()["items"][0]["question"].endswith(f"{token}？")
    assert result.json()["items"][0]["review"] is None
    assert result.json()["summary"]["uncitedCount"] >= 1
    assert result.json()["summary"]["attentionCount"] >= 1
    assert isinstance(result.json()["failedRuns"], list)

    bad = client.put(f"{base}/{answer_id}/review", json={
        "verdict": "issue", "category": "引用", "note": " ",
    })
    assert bad.status_code == 400
    submitted = client.put(f"{base}/{answer_id}/review", json={
        "verdict": "issue", "category": "引用", "note": "引用缺失，需要核对原文",
    })
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["review"]["verdict"] == "issue"
    assert client.get(base, params={"query": token}).json()["items"][0]["review"]["note"] == "引用缺失，需要核对原文"
    assert client.get(base, params={"query": token, "status": "attention"}).json()["total"] == 1

    cleared = client.put(f"{base}/{answer_id}/review", json={"verdict": "pending"})
    assert cleared.status_code == 200
    assert cleared.json()["review"] is None
    assert client.get(base, params={"query": token, "status": "reviewed"}).json()["total"] == 0
    assert client.put(f"{base}/missing/review", json={"verdict": "accepted"}).status_code == 404


def test_pending_answer_cannot_be_reviewed(client: TestClient, db_session: Session) -> None:
    token = uuid.uuid4().hex.upper()
    project = db_session.get(Project, PROJECT_ID)
    assert project and project.current_snapshot_id
    db_session.add(Conversation(conversation_id=f"CONV-{token}", project_id=PROJECT_ID, title="处理中"))
    db_session.add(Message(
        message_id=f"MSG-{token}", conversation_id=f"CONV-{token}", role="user", content="处理中",
    ))
    db_session.flush()
    db_session.add(Answer(
        answer_id=f"ANS-{token}", conversation_id=f"CONV-{token}",
        question_message_id=f"MSG-{token}", snapshot_id=project.current_snapshot_id,
        status="retrieving",
    ))
    db_session.commit()
    response = client.put(f"/api/v1/answer-quality/ANS-{token}/review", json={"verdict": "accepted"})
    assert response.status_code == 400


def test_compile_failure_total_is_not_limited_to_displayed_runs(
    client: TestClient, db_session: Session
) -> None:
    base = "/api/v1/answer-quality"
    before = client.get(base).json()["summary"]["compileFailureCount"]
    token = uuid.uuid4().hex.upper()
    for index in range(6):
        db_session.add(CompileRun(
            run_id=f"RUN-QUALITY-{token}-{index}", project_id=PROJECT_ID,
            status="failed", stage="compiling", error_code="compilation_failed",
            error_message="知识生成未完成",
        ))
    db_session.commit()
    result = client.get(base)
    assert result.status_code == 200
    assert result.json()["summary"]["compileFailureCount"] == before + 6
    assert len(result.json()["failedRuns"]) == 5


def test_delete_answer_message_cleans_answer_records_but_keeps_question(
    client: TestClient, db_session: Session
) -> None:
    token = uuid.uuid4().hex.upper()
    project = db_session.get(Project, PROJECT_ID)
    assert project and project.current_snapshot_id
    conversation_id = f"CONV-DELETE-{token}"
    question_id = f"MSG-QUESTION-{token}"
    reply_id = f"MSG-REPLY-{token}"
    answer_id = f"ANS-DELETE-{token}"
    db_session.add(Conversation(
        conversation_id=conversation_id, project_id=PROJECT_ID, title="保留的问题",
    ))
    db_session.add_all([
        Message(message_id=question_id, conversation_id=conversation_id, role="user", content="保留的问题"),
        Message(message_id=reply_id, conversation_id=conversation_id, role="assistant", content="移除的回答"),
    ])
    db_session.flush()
    db_session.add(Answer(
        answer_id=answer_id, conversation_id=conversation_id,
        question_message_id=question_id, answer_message_id=reply_id,
        snapshot_id=project.current_snapshot_id, status="completed", content="移除的回答",
    ))
    db_session.flush()
    db_session.add(AnswerEvent(answer_id=answer_id, sequence=1, event_type="final", payload={}))
    db_session.add(AnswerReview(answer_id=answer_id, verdict="accepted", note="已核对"))
    db_session.commit()

    base = f"/api/v1/conversations/{conversation_id}"
    assert client.delete(f"{base}/messages/{reply_id}").status_code == 200
    assert [item["messageId"] for item in client.get(base).json()["messages"]] == [question_id]
    assert client.get(f"/api/v1/answers/{answer_id}").status_code == 404
    assert client.get("/api/v1/answer-quality", params={"query": "保留的问题"}).json()["total"] == 0
    db_session.expire_all()
    assert db_session.scalar(select(AnswerEvent).where(AnswerEvent.answer_id == answer_id)) is None
    assert db_session.get(AnswerReview, answer_id) is None
    assert client.delete(f"{base}/messages/{reply_id}").status_code == 404


def test_delete_question_removes_its_answers_and_retitles_conversation(
    client: TestClient, db_session: Session
) -> None:
    token = uuid.uuid4().hex.upper()
    project = db_session.get(Project, PROJECT_ID)
    assert project and project.current_snapshot_id
    conversation_id = f"CONV-DELETE-{token}"
    first_id = f"MSG-FIRST-{token}"
    second_id = f"MSG-SECOND-{token}"
    reply_id = f"MSG-REPLY-{token}"
    answer_id = f"ANS-DELETE-{token}"
    db_session.add(Conversation(
        conversation_id=conversation_id, project_id=PROJECT_ID, title="第一问题",
    ))
    db_session.add_all([
        Message(message_id=first_id, conversation_id=conversation_id, role="user", content="第一问题"),
        Message(message_id=second_id, conversation_id=conversation_id, role="user", content="第二问题"),
        Message(message_id=reply_id, conversation_id=conversation_id, role="assistant", content="第一回答"),
    ])
    db_session.flush()
    db_session.add(Answer(
        answer_id=answer_id, conversation_id=conversation_id,
        question_message_id=first_id, answer_message_id=reply_id,
        snapshot_id=project.current_snapshot_id, status="completed", content="第一回答",
    ))
    db_session.commit()

    base = f"/api/v1/conversations/{conversation_id}"
    assert client.delete(f"{base}/messages/{first_id}").status_code == 200
    detail = client.get(base).json()
    assert [item["messageId"] for item in detail["messages"]] == [second_id]
    assert detail["title"] == "第二问题"
    assert client.get(f"/api/v1/answers/{answer_id}").status_code == 404
    assert client.delete(f"/api/v1/conversations/missing/messages/{second_id}").status_code == 404


def test_delete_active_question_is_rejected(
    client: TestClient, db_session: Session
) -> None:
    token = uuid.uuid4().hex.upper()
    project = db_session.get(Project, PROJECT_ID)
    assert project and project.current_snapshot_id
    conversation_id = f"CONV-DELETE-{token}"
    question_id = f"MSG-QUESTION-{token}"
    db_session.add(Conversation(conversation_id=conversation_id, project_id=PROJECT_ID))
    db_session.add(Message(
        message_id=question_id, conversation_id=conversation_id, role="user", content="正在回答",
    ))
    db_session.flush()
    db_session.add(Answer(
        answer_id=f"ANS-ACTIVE-{token}", conversation_id=conversation_id,
        question_message_id=question_id, snapshot_id=project.current_snapshot_id,
        status="generating",
    ))
    db_session.commit()
    response = client.delete(f"/api/v1/conversations/{conversation_id}/messages/{question_id}")
    assert response.status_code == 400
    assert client.get(f"/api/v1/conversations/{conversation_id}").json()["messages"][0]["messageId"] == question_id
