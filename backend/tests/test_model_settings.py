from __future__ import annotations

import json

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.adapters.deepseek import DeepSeekClient, DeepSeekError
from app.db.models import Answer, AppPreference, ModelProfile
from app.db.session import session_factory
from app.services import qa
from app.services.settings import get_client


def test_model_profiles_switch_only_after_successful_test(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    preference = db_session.get(AppPreference, "default")
    assert preference is not None
    original_id = preference.default_model_profile_id
    credentials: dict[str, str] = {}
    monkeypatch.setattr(
        "app.adapters.credentials.keyring.set_password",
        lambda _service, account, key: credentials.__setitem__(account, key),
    )
    monkeypatch.setattr(
        "app.adapters.credentials.keyring.get_password",
        lambda _service, account: credentials.get(account),
    )

    async def test_connection(self: DeepSeekClient) -> dict:
        return {"available": self.model_id == "working-model", "latencyMs": 9, "models": []}

    monkeypatch.setattr(DeepSeekClient, "test_connection", test_connection)
    try:
        initial = client.get("/api/v1/settings/models").json()
        assert initial["activeProfileId"] == "deepseek-default"
        assert len(initial["profiles"]) == 2
        assert initial["profiles"][1]["status"] == "incomplete"

        saved = client.put(
            "/api/v1/settings/models/openai-compatible",
            json={
                "name": "兼容服务",
                "baseUrl": "http://example.org:9999/v1",
                "modelId": "bad-model",
                "apiKey": "a-secret-test-key",
            },
        )
        assert saved.status_code == 200
        assert saved.json()["keyConfigured"]
        assert "a-secret-test-key" not in saved.text
        assert client.post("/api/v1/settings/models/openai-compatible/activate").status_code == 400
        failed = client.post("/api/v1/settings/models/openai-compatible/test")
        assert failed.json()["available"] is False
        assert failed.json()["message"] == "连接测试未获得可用文本，请检查模型标识和服务接口"
        assert client.get("/api/v1/settings/models").json()["activeProfileId"] == "deepseek-default"

        updated = client.put(
            "/api/v1/settings/models/openai-compatible",
            json={
                "name": "兼容服务",
                "baseUrl": "http://example.org:9999/v1",
                "modelId": "working-model",
            },
        )
        assert updated.json()["status"] == "untested"
        tested = client.post("/api/v1/settings/models/openai-compatible/test")
        assert tested.status_code == 200
        assert tested.json()["available"] is True
        activated = client.post("/api/v1/settings/models/openai-compatible/activate")
        assert activated.json()["activeProfileId"] == "openai-compatible"
        assert client.get("/api/v1/bootstrap").json()["model"]["modelId"] == "working-model"
        db_session.expire_all()
        profile, model_client = get_client(db_session)
        assert profile.profile_id == "openai-compatible"
        assert model_client.base_url == "http://example.org:9999/v1"
        assert model_client.api_key == "a-secret-test-key"
        assert client.get("/api/v1/settings/models").json()["activeProfileId"] == "openai-compatible"
        assert client.get("/api/v1/settings/deepseek").json()["profileId"] == "deepseek-default"

        with session_factory()() as reopened:
            assert get_client(reopened)[0].profile_id == "openai-compatible"

        deepseek = client.put(
            "/api/v1/settings/models/deepseek-default",
            json={
                "name": "DeepSeek 在线服务",
                "baseUrl": "https://api.deepseek.com",
                "modelId": "working-model",
                "apiKey": "another-secret-key",
            },
        )
        assert deepseek.json()["status"] == "untested"
        assert client.post("/api/v1/settings/models/deepseek-default/test").json()["available"]
        assert client.post("/api/v1/settings/models/deepseek-default/activate").json()["activeProfileId"] == "deepseek-default"
        db_session.expire_all()
        assert get_client(db_session)[1].api_key == "another-secret-key"
        assert credentials["profile:openai-compatible"] == "a-secret-test-key"
    finally:
        preference.default_model_profile_id = original_id
        db_session.commit()


@pytest.mark.parametrize(
    "base_url",
    [
        "http://user:password@example.org/v1",
        "http://example.org/v1?api_key=secret",
        "http://example.org/v1#fragment",
        "ftp://example.org/v1",
        "https://user:password@example.org/v1",
        "https://example.org/v1?api_key=secret",
        "https://example.org/v1#fragment",
        "https://[broken/v1",
    ],
)
def test_model_address_rejects_unsupported_schemes_or_embedded_credentials(
    client: TestClient, base_url: str
) -> None:
    response = client.put(
        "/api/v1/settings/models/openai-compatible",
        json={"name": "兼容服务", "baseUrl": base_url, "modelId": "model"},
    )
    assert response.status_code == 400


def test_deepseek_still_requires_https(client: TestClient) -> None:
    assert client.put(
        "/api/v1/settings/models/deepseek-default",
        json={"name": "DeepSeek", "baseUrl": "http://example.org", "modelId": "model"},
    ).status_code == 400
    assert client.post(
        "/api/v1/settings/models/deepseek-default/discover",
        json={"baseUrl": "http://example.org", "apiKey": "draft-only-secret-key"},
    ).status_code == 400


@pytest.mark.asyncio
async def test_compatible_connection_and_compile_use_chat_completions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/chat/completions"
        assert request.url.scheme == "http"
        assert request.headers["Authorization"] == "Bearer test-key"
        payload = json.loads(request.content)
        requests.append(payload)
        if len(requests) == 1:
            return httpx.Response(200, json={"choices": [{"message": {"content": "连接正常"}}]})
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "knowledge_items": [
                                        {
                                            "title": "测试知识",
                                            "domain": "Python",
                                            "summary": "这是一段用于验证来源约束的知识摘要。",
                                            "markdown": "# 测试知识\n\n这是足够长的核心说明与来源依据。",
                                            "evidence_ids": ["E-1"],
                                        }
                                    ],
                                    "relations": [],
                                }
                            )
                        }
                    }
                ]
            },
        )

    transport = httpx.MockTransport(handler)
    async_client = httpx.AsyncClient
    monkeypatch.setattr(
        httpx, "AsyncClient", lambda **kwargs: async_client(transport=transport, **kwargs)
    )
    model_client = DeepSeekClient("http://example.org:9999/v1", "working-model", "test-key", compatible=True)
    assert (await model_client.test_connection())["available"] is True
    result = await model_client.compile_knowledge(
        evidence=[
            {
                "evidenceId": "E-1",
                "topic": "Python",
                "sourceTitle": "笔记",
                "quote": "这是可追溯来源",
            }
        ],
        existing_knowledge=[],
    )
    assert result.knowledge_items[0].evidence_ids == ["E-1"]
    assert requests[1]["model"] == "working-model"
    assert requests[1]["stream"] is True
    assert "response_format" not in requests[1]
    assert "temperature" not in requests[1]
    assert "max_tokens" not in requests[1]


@pytest.mark.asyncio
@pytest.mark.parametrize("status,retryable", [(429, True), (503, True), (401, False), (400, False)])
async def test_compile_http_retry_classification_and_private_logs(client, monkeypatch, caplog, status, retryable):
    def handler(request):
        return httpx.Response(status, text="PRIVATE_PROVIDER_BODY")

    async_client = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: async_client(
        transport=httpx.MockTransport(handler), **kwargs,
    ))
    model_client = DeepSeekClient("https://private.example.org", "model", "PRIVATE_KEY")
    with caplog.at_level("INFO"), pytest.raises(DeepSeekError) as error:
        await model_client.compile_knowledge(evidence=[{
            "evidenceId": "E-PRIVATE", "sourceTitle": "PRIVATE_TITLE", "topic": "Python",
            "quote": "PRIVATE_SOURCE_TEXT",
        }], existing_knowledge=[])
    assert error.value.retryable is retryable
    adapter_logs = "\n".join(record.getMessage() for record in caplog.records
                             if record.name == "app.adapters.deepseek")
    assert f"status={status}" in adapter_logs and "duration_ms=" in adapter_logs
    assert not any(secret in adapter_logs for secret in (
        "PRIVATE_KEY", "PRIVATE_TITLE", "PRIVATE_SOURCE_TEXT", "PRIVATE_PROVIDER_BODY", "private.example.org",
    ))

@pytest.mark.asyncio
async def test_compatible_stream_answer_uses_current_model_and_sse(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/chat/completions"
        assert request.headers["Authorization"] == "Bearer test-key"
        payload = json.loads(request.content)
        assert payload["model"] == "working-model"
        assert payload["stream"] is True
        assert "temperature" not in payload
        return httpx.Response(
            200,
            text='data: {"choices":[{"delta":{"content":"有依据[1]。"}}]}\n\n'
            "data: [DONE]\n\n",
            headers={"content-type": "text/event-stream"},
        )

    transport = httpx.MockTransport(handler)
    async_client = httpx.AsyncClient
    monkeypatch.setattr(
        httpx, "AsyncClient", lambda **kwargs: async_client(transport=transport, **kwargs)
    )
    model_client = DeepSeekClient("https://example.org/v1", "working-model", "test-key", compatible=True)
    chunks = [
        chunk
        async for chunk in model_client.stream_answer(
            question="问题？",
            evidence=[
                {
                    "evidenceId": "E-1",
                    "knowledgeId": "K-1",
                    "sourceTitle": "笔记",
                    "quote": "原文证据",
                }
            ],
        )
    ]
    assert chunks == ["有依据[1]。"]


def test_discover_models_uses_draft_and_saved_credentials_without_persisting_draft(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    credentials: dict[str, str] = {}
    monkeypatch.setattr(
        "app.adapters.credentials.keyring.set_password",
        lambda _service, account, key: credentials.__setitem__(account, key),
    )
    monkeypatch.setattr(
        "app.adapters.credentials.keyring.get_password",
        lambda _service, account: credentials.get(account),
    )
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == "/v1/models":
            return httpx.Response(200, json={"data": [
                {"id": "model-b"}, {"id": "model-a"}, {"id": "model-a"}, {"id": 3},
            ]})
        return httpx.Response(404)

    async_client = httpx.AsyncClient
    monkeypatch.setattr(
        httpx, "AsyncClient",
        lambda **kwargs: async_client(transport=httpx.MockTransport(handler), **kwargs),
    )
    previous_url = client.get("/api/v1/settings/models").json()["profiles"][1]["baseUrl"]
    draft = client.post(
        "/api/v1/settings/models/openai-compatible/discover",
        json={"baseUrl": "http://example.org:9999/v1", "apiKey": "draft-only-secret-key"},
    )
    assert draft.status_code == 200
    assert draft.json() == {"models": ["model-b", "model-a"]}
    assert requests[-1].url.scheme == "http"
    assert requests[-1].url.port == 9999
    assert requests[-1].headers["Authorization"] == "Bearer draft-only-secret-key"
    assert "draft-only-secret-key" not in draft.text
    assert client.get("/api/v1/settings/models").json()["profiles"][1]["baseUrl"] == previous_url
    saved = client.put(
        "/api/v1/settings/models/openai-compatible",
        json={"name": "兼容服务", "baseUrl": "http://example.org:9999/v1",
              "modelId": "model-a", "apiKey": "saved-secret-key-123"},
    )
    assert saved.status_code == 200
    result = client.post("/api/v1/settings/models/openai-compatible/discover", json={})
    assert result.json()["models"] == ["model-b", "model-a"]
    assert requests[-1].headers["Authorization"] == "Bearer saved-secret-key-123"

    def unsupported(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, text="do-not-expose-provider-body")

    monkeypatch.setattr(
        httpx, "AsyncClient",
        lambda **kwargs: async_client(transport=httpx.MockTransport(unsupported), **kwargs),
    )
    failure = client.post("/api/v1/settings/models/openai-compatible/discover", json={})
    assert failure.status_code == 400
    assert "手动添加" in failure.json()["error"]["message"]
    assert "do-not-expose-provider-body" not in failure.text


def test_question_model_selection_is_per_answer_and_retry_keeps_it(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    client.get("/api/v1/settings/models")
    profile = db_session.get(ModelProfile, "openai-compatible")
    assert profile is not None
    before = (profile.status, profile.credential_ref)
    profile.status = "available"
    profile.credential_ref = "keychain:profile:openai-compatible"
    db_session.commit()
    monkeypatch.setattr(
        "app.adapters.credentials.keyring.get_password",
        lambda _service, account: "saved-secret-key-123"
        if account == "profile:openai-compatible" else None,
    )
    monkeypatch.setattr(qa, "_schedule_answer", lambda _answer_id: None)
    try:
        conversation = client.post("/api/v1/conversations", json={}).json()
        path = f"/api/v1/conversations/{conversation['conversationId']}/questions"
        created = client.post(path, json={
            "question": "什么是可用库存？",
            "profileId": "openai-compatible",
            "modelId": "model-b",
        })
        assert created.status_code == 202
        answer_id = created.json()["answerId"]
        db_session.expire_all()
        answer = db_session.get(Answer, answer_id)
        assert answer and answer.model_profile_id == "openai-compatible"
        assert answer.model_id == "model-b"
        assert client.get(f"/api/v1/answers/{answer_id}").json()["modelId"] == "model-b"

        answer.status = "failed"
        db_session.commit()
        retried = client.post(f"/api/v1/answers/{answer_id}/retry")
        assert retried.status_code == 202
        db_session.expire_all()
        retry = db_session.get(Answer, retried.json()["answerId"])
        assert retry and (retry.model_profile_id, retry.model_id) == ("openai-compatible", "model-b")
        assert client.post(path, json={
            "question": "测试", "profileId": "openai-compatible", "modelId": "model-b",
        }).status_code == 400
        cancelled = client.post(f"/api/v1/answers/{retry.answer_id}/cancel")
        assert cancelled.status_code == 200 and cancelled.json()["status"] == "failed"
        profile.status = "incomplete"
        db_session.commit()
        assert client.post(path, json={
            "question": "测试", "profileId": "openai-compatible", "modelId": "model-b",
        }).status_code == 409
    finally:
        db_session.expire_all()
        profile = db_session.get(ModelProfile, "openai-compatible")
        assert profile is not None
        profile.status, profile.credential_ref = before
        db_session.commit()


def test_model_catalog_is_saved_and_default_is_selected_from_catalog(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    credentials: dict[str, str] = {}
    monkeypatch.setattr(
        "app.adapters.credentials.keyring.set_password",
        lambda _service, account, key: credentials.__setitem__(account, key),
    )
    monkeypatch.setattr(
        "app.adapters.credentials.keyring.get_password",
        lambda _service, account: credentials.get(account),
    )

    async def test_connection(self: DeepSeekClient) -> dict:
        return {"available": self.model_id == "remote-a", "latencyMs": 8, "models": []}

    monkeypatch.setattr(DeepSeekClient, "test_connection", test_connection)
    path = "/api/v1/settings/models/openai-compatible"
    saved = client.put(path, json={
        "name": "兼容服务", "baseUrl": "http://example.org/v1",
        "modelIds": ["remote-a", "manual-b", "remote-a"], "apiKey": "saved-secret-key-123",
    })
    assert saved.status_code == 200
    assert saved.json()["modelId"] == "remote-a"
    assert saved.json()["modelIds"] == ["remote-a", "manual-b"]
    assert client.get("/api/v1/settings/models").json()["profiles"][1]["modelIds"] == [
        "remote-a", "manual-b",
    ]
    with session_factory()() as reopened:
        assert reopened.get(ModelProfile, "openai-compatible").model_ids == ["remote-a", "manual-b"]
    assert client.post(f"{path}/test").json()["available"] is True
    assert client.post(f"{path}/activate").status_code == 200
    db_session.expire_all()
    assert get_client(db_session)[1].model_id == "remote-a"
    assert get_client(db_session, profile_id="openai-compatible", model_id="manual-b")[1].model_id == "manual-b"
    assert client.put(path, json={
        "name": "兼容服务", "baseUrl": "http://example.org/v1",
        "modelIds": ["remote-a"], "modelId": "not-in-catalog",
    }).status_code == 400
