from __future__ import annotations

import json

import pytest

from app.adapters.deepseek import DeepSeekClient, DeepSeekError


@pytest.mark.parametrize(
    "topic,domain",
    [("Python", "Python"), ("knowledge", "AI applications")],
)
async def test_single_cited_topic_determines_compiled_domain(
    monkeypatch, topic: str, domain: str,
) -> None:
    client = DeepSeekClient("https://api.deepseek.com", "deepseek-chat", "offline-test")
    payload = {
        "knowledge_items": [
            {
                "title": "Python context managers",
                "type": "concept",
                "domain": domain,
                "summary": "A context manager closes a file after use.",
                "markdown": "# Python context managers\n\nA with block closes an opened file safely.",
                "evidence_ids": ["E-1"],
            }
        ],
        "relations": [],
    }

    async def offline_response(_payload: dict, *, timeout: int) -> dict:
        assert timeout == 180
        assert f"专题：{topic}" in _payload["messages"][1]["content"]
        return {"choices": [{"message": {"content": json.dumps(payload)}}]}

    monkeypatch.setattr(client, "_post_json", offline_response)
    evidence = [
        {
            "evidenceId": "E-1",
            "sourceTitle": "python.pdf",
            "topic": topic,
            "quote": "A Python context manager closes a file safely.",
        }
    ]
    result = await client.compile_knowledge(evidence=evidence, existing_knowledge=[])
    assert result.knowledge_items[0].domain == topic


@pytest.mark.parametrize(
    "evidence_ids,expected_code",
    [
        (["E-1", "E-2"], "invalid_domain_reference"),
        (["E-1", "E-unknown"], "invalid_evidence_reference"),
    ],
)
async def test_unresolved_topic_or_unknown_evidence_is_rejected(
    monkeypatch, evidence_ids: list[str], expected_code: str,
) -> None:
    client = DeepSeekClient("https://api.deepseek.com", "deepseek-chat", "offline-test")
    payload = {
        "knowledge_items": [{
            "title": "Python context managers",
            "domain": "unrelated",
            "summary": "A context manager closes a file after use.",
            "markdown": "# Python context managers\n\nA with block closes an opened file safely.",
            "evidence_ids": evidence_ids,
        }],
        "relations": [],
    }

    async def offline_response(_payload: dict, *, timeout: int) -> dict:
        return {"choices": [{"message": {"content": json.dumps(payload)}}]}

    monkeypatch.setattr(client, "_post_json", offline_response)
    evidence = [
        {"evidenceId": "E-1", "topic": "Python", "sourceTitle": "python.pdf", "quote": "Python"},
        {"evidenceId": "E-2", "topic": "Java", "sourceTitle": "java.pdf", "quote": "Java"},
    ]
    with pytest.raises(DeepSeekError) as error:
        await client.compile_knowledge(evidence=evidence, existing_knowledge=[])
    assert error.value.code == expected_code
