from __future__ import annotations

import asyncio
import json
from copy import deepcopy

import httpx
import pytest

from app.adapters.deepseek import DeepSeekClient, DeepSeekError
from app.core.config import get_settings

EVIDENCE = [{"evidenceId": "E-1", "sourceTitle": "Notes", "topic": "Python", "quote": "Retained text."}]
CONTENT = json.dumps({"knowledge_items": [{
    "title": "Resource cleanup", "domain": "Python",
    "summary": "Context managers close resources after use.",
    "markdown": "# Resource cleanup\n\nContext managers close resources after use.",
    "evidence_ids": ["E-1"],
}], "relations": []})


def event(value):
    return f"data: {json.dumps(value)}\n\n".encode()


class Stream(httpx.AsyncByteStream):
    def __init__(self, chunks, *, delay=0):
        self.chunks = chunks
        self.delay = delay
        self.closed = False

    async def __aiter__(self):
        for chunk in self.chunks:
            await asyncio.sleep(self.delay)
            yield chunk

    async def aclose(self):
        self.closed = True


def install_transport(monkeypatch, handler):
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: original(
        transport=httpx.MockTransport(handler), **kwargs,
    ))


async def compile_result():
    return await DeepSeekClient("https://example.org/v1", "model", "private-key", compatible=True).compile_knowledge(
        evidence=EVIDENCE, existing_knowledge=[],
    )


@pytest.mark.asyncio
async def test_compile_collects_fragmented_stream_and_safe_usage(monkeypatch, caplog):
    first = event({"choices": [{"index": 0, "delta": {"content": CONTENT[:35]}}]})
    stream = Stream([
        b": keepalive\n\n", first[:11], first[11:],
        event({"choices": [{"index": 0, "delta": {"reasoning_content": "PRIVATE_REASONING"}}]}),
        event({"choices": [{"index": 0, "delta": {"content": CONTENT[35:]}}]}),
        event({"choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]}),
        event({"choices": [], "usage": {"completion_tokens": 88, "private": "PRIVATE_USAGE"}}),
        b"data: [DONE]\n\n",
    ])

    def handler(request):
        payload = json.loads(request.content)
        assert payload["stream"] is True
        assert not {"temperature", "max_tokens", "response_format", "stream_options"} & payload.keys()
        assert request.extensions["timeout"]["read"] == 180
        return httpx.Response(200, headers={"content-type": "text/event-stream"}, stream=stream)

    install_transport(monkeypatch, handler)
    with caplog.at_level("INFO", logger="app.adapters.deepseek"):
        result = await compile_result()
    assert result.knowledge_items[0].evidence_ids == ["E-1"]
    assert stream.closed
    logs = "\n".join(record.getMessage() for record in caplog.records if record.name == "app.adapters.deepseek")
    assert "first_content_ms=" in logs and "'completion_tokens': 88" in logs
    assert not any(value in logs for value in ("private-key", "PRIVATE_REASONING", "PRIVATE_USAGE", CONTENT))


@pytest.mark.asyncio
@pytest.mark.parametrize("ending", ["missing", "length", "malformed", "error", "no_content"])
async def test_incomplete_or_invalid_stream_never_returns_a_candidate(monkeypatch, ending):
    chunks = [event({"choices": [{"delta": {"content": CONTENT}}]})]
    if ending == "length":
        chunks.append(event({"choices": [{"delta": {}, "finish_reason": "length"}]}))
    elif ending == "malformed":
        chunks.append(b"data: not-json\n\n")
    elif ending == "error":
        chunks.append(event({"error": {"message": "PRIVATE_PROVIDER_ERROR"}}))
    elif ending == "no_content":
        chunks = [event({"choices": [{"delta": {}, "finish_reason": "stop"}]})]
    chunks.append(b"data: [DONE]\n\n")
    stream = Stream(chunks)
    install_transport(monkeypatch, lambda request: httpx.Response(
        200, headers={"content-type": "text/event-stream"}, stream=stream,
    ))
    with pytest.raises(DeepSeekError) as error:
        await compile_result()
    assert error.value.code == "invalid_compile_output"
    assert not error.value.retryable
    assert "PRIVATE_PROVIDER_ERROR" not in error.value.message
    assert stream.closed


@pytest.mark.asyncio
@pytest.mark.parametrize("stream_enabled", [False, True])
async def test_compile_supports_configured_json_and_provider_json_fallback(monkeypatch, stream_enabled):
    settings = get_settings().model_copy(update={"compile_stream": stream_enabled})
    monkeypatch.setattr("app.adapters.deepseek.get_settings", lambda: settings)

    def handler(request):
        assert json.loads(request.content)["stream"] is stream_enabled
        return httpx.Response(200, json={"choices": [{"message": {"content": CONTENT}}]})

    install_transport(monkeypatch, handler)
    assert (await compile_result()).knowledge_items[0].evidence_ids == ["E-1"]


@pytest.mark.asyncio
@pytest.mark.parametrize("failure", ["idle", "total", "cancel"])
async def test_compile_deadlines_and_cancellation_close_the_stream(monkeypatch, failure):
    settings = get_settings().model_copy(update={"compile_total_timeout": 0.03 if failure == "total" else 2})
    monkeypatch.setattr("app.adapters.deepseek.get_settings", lambda: settings)

    class WaitingStream(Stream):
        async def __aiter__(self):
            if failure == "idle":
                raise httpx.ReadTimeout("PRIVATE_TIMEOUT")
            while True:
                await asyncio.sleep(0.01)
                yield b": keepalive\n\n"

    stream = WaitingStream([])
    install_transport(monkeypatch, lambda request: httpx.Response(
        200, headers={"content-type": "text/event-stream"}, stream=stream,
    ))
    if failure == "cancel":
        task = asyncio.create_task(compile_result())
        await asyncio.sleep(0.02)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
    else:
        with pytest.raises(DeepSeekError) as error:
            await compile_result()
        assert error.value.code == "deepseek_timeout"
        assert error.value.retryable
    assert stream.closed


@pytest.mark.asyncio
async def test_truncated_json_response_is_rejected_even_when_json_is_parseable(monkeypatch):
    install_transport(monkeypatch, lambda request: httpx.Response(200, json={"choices": [{
        "message": {"content": CONTENT}, "finish_reason": "length",
    }]}))
    with pytest.raises(DeepSeekError) as error:
        await compile_result()
    assert error.value.code == "invalid_compile_output"


@pytest.mark.asyncio
async def test_reference_repair_maps_only_request_local_ids_without_changing_evidence(monkeypatch):
    evidence = [
        {**EVIDENCE[0], "evidenceId": "E-SV-LONG-C0-25", "unitId": "U-SV-LONG-0"},
        {**EVIDENCE[0], "evidenceId": "E-SV-LONG-C26-50", "unitId": "U-SV-LONG-0"},
    ]
    original = deepcopy(evidence)
    existing = [{"knowledgeId": "K-EXISTING", "title": "Existing", "summary": "Retained context."}]
    content = json.loads(CONTENT)
    content["knowledge_items"][0].update(
        evidence_ids=["E1", "E2"], related_existing_knowledge_ids=["K-EXISTING"],
    )
    content["relations"] = [{
        "source_title": "Resource cleanup", "target_knowledge_id": "K-EXISTING",
        "type": "supports", "evidence_ids": ["E2"],
    }]

    def handler(request):
        payload = json.loads(request.content)
        prompt = "\n".join(message["content"] for message in payload["messages"])
        assert "[E1]" in prompt and "[E2]" in prompt and "K-EXISTING" in prompt
        assert not any(item["evidenceId"] in prompt or item["unitId"] in prompt for item in evidence)
        assert prompt.count("Retained text.") == 2
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(content)}}]})

    install_transport(monkeypatch, handler)
    result = await DeepSeekClient("https://example.org/v1", "model", "private-key").compile_knowledge(
        evidence=evidence, existing_knowledge=existing, repair_references=True,
    )
    assert result.knowledge_items[0].evidence_ids == [item["evidenceId"] for item in evidence]
    assert result.relations[0].evidence_ids == [evidence[1]["evidenceId"]]
    assert result.knowledge_items[0].related_existing_knowledge_ids == ["K-EXISTING"]
    assert evidence == original


@pytest.mark.asyncio
@pytest.mark.parametrize("reference", ["E2", "E-1", "U1", "E01", " E1", "E1-C0-25"])
@pytest.mark.parametrize("relation", [False, True])
async def test_reference_repair_rejects_unknown_or_altered_ids(monkeypatch, reference, relation):
    content = json.loads(CONTENT)
    content["knowledge_items"][0]["evidence_ids"] = ["E1"]
    if relation:
        content["relations"] = [{
            "source_title": "Resource cleanup", "target_title": "Resource cleanup",
            "type": "supports", "evidence_ids": ["E1", reference],
        }]
    else:
        content["knowledge_items"][0]["evidence_ids"].append(reference)
    install_transport(monkeypatch, lambda request: httpx.Response(200, json={
        "choices": [{"message": {"content": json.dumps(content)}}],
    }))
    with pytest.raises(DeepSeekError) as error:
        await DeepSeekClient("https://example.org/v1", "model", "private-key", compatible=True).compile_knowledge(
            evidence=EVIDENCE, existing_knowledge=[], repair_references=True,
        )
    assert error.value.code == "invalid_evidence_reference"
    assert not error.value.retryable


@pytest.mark.asyncio
async def test_reference_repair_keeps_relation_endpoint_validation(monkeypatch):
    content = json.loads(CONTENT)
    content["knowledge_items"][0]["evidence_ids"] = ["E1"]
    content["relations"] = [{
        "source_title": "Resource cleanup", "target_knowledge_id": "K-MISSING",
        "type": "supports", "evidence_ids": ["E1"],
    }]
    install_transport(monkeypatch, lambda request: httpx.Response(200, json={
        "choices": [{"message": {"content": json.dumps(content)}}],
    }))
    with pytest.raises(DeepSeekError) as error:
        await DeepSeekClient("https://example.org/v1", "model", "private-key").compile_knowledge(
            evidence=EVIDENCE, existing_knowledge=[], repair_references=True,
        )
    assert error.value.code == "invalid_relation_endpoint"
