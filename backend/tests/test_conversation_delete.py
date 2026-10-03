from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Answer, AnswerEvent, AnswerReview, Conversation, Message, Project
from app.services.seed import PROJECT_ID


def test_delete_conversation_removes_messages_answers_and_reviews(
    client: TestClient, db_session: Session
) -> None:
    token = uuid.uuid4().hex.upper()
    project = db_session.get(Project, PROJECT_ID)
    assert project and project.current_snapshot_id
    conversation_id = f"CONV-REMOVE-{token}"
    other_id = f"CONV-KEEP-{token}"
    question_id = f"MSG-QUESTION-{token}"
    reply_id = f"MSG-REPLY-{token}"
    answer_id = f"ANS-REMOVE-{token}"
    db_session.add_all([
        Conversation(conversation_id=conversation_id, project_id=PROJECT_ID, title=f"删除 {token}"),
        Conversation(conversation_id=other_id, project_id=PROJECT_ID, title=f"保留 {token}"),
    ])
    db_session.add_all([
        Message(message_id=question_id, conversation_id=conversation_id, role="user", content=token),
        Message(message_id=reply_id, conversation_id=conversation_id, role="assistant", content="回答"),
    ])
    db_session.flush()
    db_session.add(Answer(
        answer_id=answer_id, conversation_id=conversation_id,
        question_message_id=question_id, answer_message_id=reply_id,
        snapshot_id=project.current_snapshot_id, status="completed",
    ))
    db_session.flush()
    db_session.add(AnswerEvent(answer_id=answer_id, sequence=1, event_type="final", payload={}))
    db_session.add(AnswerReview(answer_id=answer_id, verdict="accepted", note="已核对"))
    db_session.commit()

    path = f"/api/v1/conversations/{conversation_id}"
    assert client.delete(path).status_code == 200
    assert client.get(path).status_code == 404
    assert client.get(f"/api/v1/conversations/{other_id}").status_code == 200
    assert conversation_id not in {
        item["conversationId"] for item in client.get("/api/v1/conversations").json()["items"]
    }
    assert client.get("/api/v1/answer-quality", params={"query": token}).json()["total"] == 0
    db_session.expire_all()
    assert db_session.get(Message, question_id) is None
    assert db_session.get(Message, reply_id) is None
    assert db_session.get(Answer, answer_id) is None
    assert db_session.scalar(select(AnswerEvent).where(AnswerEvent.answer_id == answer_id)) is None
    assert db_session.get(AnswerReview, answer_id) is None
    assert client.delete(path).status_code == 404


def test_delete_empty_conversation(client: TestClient) -> None:
    conversation_id = client.post("/api/v1/conversations", json={}).json()["conversationId"]
    path = f"/api/v1/conversations/{conversation_id}"
    assert client.delete(path).status_code == 200
    assert client.get(path).status_code == 404


def test_delete_conversation_rejects_active_answer(
    client: TestClient, db_session: Session
) -> None:
    token = uuid.uuid4().hex.upper()
    project = db_session.get(Project, PROJECT_ID)
    assert project and project.current_snapshot_id
    conversation_id = f"CONV-ACTIVE-{token}"
    question_id = f"MSG-ACTIVE-{token}"
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

    path = f"/api/v1/conversations/{conversation_id}"
    assert client.delete(path).status_code == 400
    assert client.get(path).status_code == 200
