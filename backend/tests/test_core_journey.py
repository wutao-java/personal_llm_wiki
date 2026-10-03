from __future__ import annotations

import time
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    Answer,
    AnswerEvent,
    CompileRun,
    Evidence,
    KnowledgeItem,
    Message,
    Project,
    Source,
    SourceVersion,
)
from app.services import qa
from app.services.compilation import accept_run
from app.services.seed import PROJECT_ID


def test_seeded_knowledge_contract(client: TestClient) -> None:
    bootstrap = client.get("/api/v1/bootstrap")
    assert bootstrap.status_code == 200
    payload = bootstrap.json()
    assert payload["productName"] == "FF - LLM Wiki知识库"
    assert payload["attribution"] == "@2026 赋范空间 独家自研"
    assert payload["project"]["sourceCount"] == 66
    assert payload["project"]["sourceVersionCount"] == 72
    assert payload["snapshot"]["knowledgeCount"] == 150
    assert payload["snapshot"]["relationCount"] == 450

    graph = client.get("/api/v1/graph")
    assert graph.status_code == 200
    graph_payload = graph.json()
    assert graph_payload["counts"] == {"nodes": 150, "edges": 450}
    node_ids = {node["knowledgeId"] for node in graph_payload["nodes"]}
    assert all(
        edge["source"] in node_ids and edge["target"] in node_ids for edge in graph_payload["edges"]
    )


def test_reader_graph_and_source_share_identifiers(client: TestClient) -> None:
    knowledge = client.get("/api/v1/knowledge?pageSize=10").json()["items"][0]
    detail_response = client.get(f"/api/v1/knowledge/{knowledge['knowledgeId']}")
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["markdown"]
    assert detail["evidence"]
    evidence = detail["evidence"][0]

    evidence_response = client.get(f"/api/v1/evidence/{evidence['evidenceId']}")
    assert evidence_response.status_code == 200
    evidence_detail = evidence_response.json()
    assert evidence_detail["sourceVersionId"] in detail["sourceVersionIds"]
    assert evidence_detail["quote"]
    assert evidence_detail["accessible"] is True

    source = client.get(f"/api/v1/sources/{evidence_detail['sourceId']}")
    assert source.status_code == 200
    content = client.get(f"/api/v1/source-versions/{evidence_detail['sourceVersionId']}/content")
    assert content.status_code == 200
    assert content.json()["readOnly"] is True
    assert evidence_detail["quote"] in content.json()["content"]


def test_appearance_is_persisted(client: TestClient) -> None:
    response = client.put(
        "/api/v1/settings/appearance",
        json={"themePreference": "dark", "reduceMotion": True},
    )
    assert response.status_code == 200
    assert response.json()["themePreference"] == "dark"
    assert response.json()["reduceMotion"] is True
    assert client.get("/api/v1/bootstrap").json()["appearance"] == response.json()


def test_import_validation_and_persistent_failed_run(client: TestClient) -> None:
    unsupported = client.post(
        "/api/v1/sources/import",
        files=[("files", ("notes.docx", b"not supported", "application/octet-stream"))],
    )
    assert unsupported.status_code == 202
    assert unsupported.json()["acceptedCount"] == 0
    assert unsupported.json()["failedCount"] == 1

    markdown = b"# Inventory exception\n\nA unique test policy with enough content for evidence extraction."
    imported = client.post(
        "/api/v1/sources/import",
        files=[("files", ("inventory-exception.md", markdown, "text/markdown"))],
    )
    assert imported.status_code == 202
    payload = imported.json()
    assert payload["acceptedCount"] == 1
    assert payload["runId"]
    item = payload["items"][0]

    source = client.get(f"/api/v1/sources/{item['sourceId']}").json()
    version = client.get(f"/api/v1/source-versions/{item['sourceVersionId']}/content").json()
    assert source["currentVersionId"] == item["sourceVersionId"]
    assert version["content"].startswith("# Inventory exception")

    run = _wait_for_run(client, payload["runId"])
    assert run["status"] == "failed"
    assert run["error"]["code"] == "deepseek_not_ready"
    listed = client.get("/api/v1/compile-runs?pageSize=100").json()["items"]
    assert any(entry["runId"] == payload["runId"] for entry in listed)


def test_review_publish_updates_all_read_models(client: TestClient, db_session: Session) -> None:
    project = db_session.get(Project, PROJECT_ID)
    assert project and project.current_snapshot_id
    existing = db_session.scalar(
        select(KnowledgeItem).where(KnowledgeItem.snapshot_id == project.current_snapshot_id)
    )
    evidence = db_session.scalar(select(Evidence))
    source_version = db_session.get(SourceVersion, evidence.source_version_id) if evidence else None
    source = db_session.get(Source, evidence.source_id) if evidence else None
    assert existing and evidence and source_version and source

    knowledge_id = f"K-TEST-{uuid.uuid4().hex[:12].upper()}"
    relation_id = f"REL-TEST-{uuid.uuid4().hex[:12].upper()}"
    run = CompileRun(
        run_id=f"RUN-TEST-{uuid.uuid4().hex.upper()}",
        project_id=PROJECT_ID,
        status="awaiting_review",
        stage="awaiting_review",
        source_version_ids=[source_version.source_version_id],
        counts={
            "knowledgeAdded": 1,
            "knowledgeUpdated": 0,
            "relationsValid": 1,
            "warnings": 0,
            "failures": 0,
        },
        model_id="deepseek-test",
        candidate={
            "knowledgeItems": [
                {
                    "knowledgeId": knowledge_id,
                    "slug": knowledge_id.lower(),
                    "title": "自动验收知识单元",
                    "type": "rule",
                    "domain": "quality",
                    "summary": "用于验证审核发布后所有读取模型使用同一个知识身份。",
                    "markdown": "# 自动验收知识单元\n\n该内容由审核发布测试创建，并保留来源证据。",
                    "reviewStatus": "accepted",
                    "sourceIds": [source.source_id],
                    "sourceVersionIds": [source_version.source_version_id],
                    "evidenceIds": [evidence.evidence_id],
                    "changeType": "added",
                }
            ],
            "relations": [
                {
                    "relationId": relation_id,
                    "sourceKnowledgeId": knowledge_id,
                    "targetKnowledgeId": existing.knowledge_id,
                    "type": "验证关联",
                    "directed": True,
                    "weight": 1.0,
                    "evidenceIds": [evidence.evidence_id],
                    "reviewStatus": "accepted",
                }
            ],
        },
    )
    db_session.add(run)
    db_session.commit()
    published = accept_run(db_session, run.run_id)
    assert published["snapshotId"]
    assert published["run"]["status"] == "completed"

    knowledge_response = client.get(f"/api/v1/knowledge/{knowledge_id}")
    assert knowledge_response.status_code == 200
    assert knowledge_response.json()["evidence"][0]["evidenceId"] == evidence.evidence_id
    graph = client.get("/api/v1/graph").json()
    assert any(node["knowledgeId"] == knowledge_id for node in graph["nodes"])
    assert any(edge["relationId"] == relation_id for edge in graph["edges"])


def test_question_without_evidence_returns_explicit_boundary(client: TestClient) -> None:
    conversation = client.post("/api/v1/conversations", json={"contextKnowledgeIds": []})
    assert conversation.status_code == 201
    conversation_id = conversation.json()["conversationId"]
    question = client.post(
        f"/api/v1/conversations/{conversation_id}/questions",
        json={"question": "zzzzzz-nonexistent-quantum-identifier-947251"},
    )
    assert question.status_code == 202
    answer_id = question.json()["answerId"]

    deadline = time.monotonic() + 5
    answer = {}
    while time.monotonic() < deadline:
        answer = client.get(f"/api/v1/answers/{answer_id}").json()
        if answer["status"] in {"completed", "failed", "insufficient"}:
            break
        time.sleep(0.05)
    assert answer["status"] == "insufficient"
    assert answer["evidenceStatus"] == "insufficient"
    assert answer["citations"] == []
    assert "无法确认" in answer["content"]


@pytest.mark.asyncio
async def test_answer_stream_persists_one_message_and_incremental_chunks(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    del client
    conversation = qa.create_conversation(db_session)
    question_message = Message(
        message_id=f"MSG-TEST-{uuid.uuid4().hex.upper()}",
        conversation_id=conversation["conversationId"],
        role="user",
        content="什么是可用库存？",
    )
    db_session.add(question_message)
    db_session.flush()
    project = db_session.get(Project, PROJECT_ID)
    assert project and project.current_snapshot_id
    answer = Answer(
        answer_id=f"ANS-TEST-{uuid.uuid4().hex.upper()}",
        conversation_id=conversation["conversationId"],
        question_message_id=question_message.message_id,
        snapshot_id=project.current_snapshot_id,
        status="received",
    )
    db_session.add(answer)
    db_session.commit()

    class StreamingClient:
        async def stream_answer(self, *, question: str, evidence: list[dict]):
            assert question == "什么是可用库存？"
            assert evidence
            for chunk in [
                "可用库存是在实物库存基础上，",
                "扣除锁定、冻结与安全库存后，",
                "可用于新订单的数量[1]。",
            ]:
                yield chunk

    monkeypatch.setattr(
        qa,
        "get_client",
        lambda _session, require_available: (
            SimpleNamespace(model_id="deepseek-stream-test"),
            StreamingClient(),
        ),
    )

    await qa.generate_answer(answer.answer_id)
    db_session.expire_all()
    completed = db_session.get(Answer, answer.answer_id)
    assert completed and completed.status == "completed"
    events = db_session.scalars(
        select(AnswerEvent)
        .where(AnswerEvent.answer_id == answer.answer_id)
        .order_by(AnswerEvent.sequence)
    ).all()
    chunks = [event.payload["text"] for event in events if event.event_type == "chunk"]
    assert len(chunks) >= 2
    assert "".join(chunks) == completed.content
    assert events[-1].event_type == "final"
    messages = db_session.scalars(
        select(Message)
        .where(Message.conversation_id == conversation["conversationId"])
        .order_by(Message.created_at)
    ).all()
    assert [message.role for message in messages] == ["user", "assistant"]


def _wait_for_run(client: TestClient, run_id: str) -> dict:
    deadline = time.monotonic() + 5
    payload = {}
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/compile-runs/{run_id}")
        assert response.status_code == 200
        payload = response.json()
        if payload["status"] in {"completed", "failed", "interrupted", "awaiting_review"}:
            return payload
        time.sleep(0.05)
    raise AssertionError(f"compile run did not finish: {payload}")
