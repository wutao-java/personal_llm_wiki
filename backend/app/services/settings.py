from __future__ import annotations

from datetime import UTC, datetime
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app.adapters.credentials import CredentialStoreError, credential_store
from app.adapters.deepseek import DeepSeekClient, DeepSeekError
from app.db.models import AppPreference, ModelProfile
from app.services.knowledge import appearance_view, model_profile_view

DEEPSEEK_PROFILE_ID = "deepseek-default"
COMPATIBLE_PROFILE_ID = "openai-compatible"


def model_profile(session: Session, profile_id: str) -> ModelProfile:
    if profile_id not in {DEEPSEEK_PROFILE_ID, COMPATIBLE_PROFILE_ID}:
        raise ValueError("不支持的在线模型配置")
    profile = session.get(ModelProfile, profile_id)
    if profile is None and profile_id == COMPATIBLE_PROFILE_ID:
        profile = ModelProfile(
            profile_id=profile_id,
            name="OpenAI 兼容服务",
            base_url="",
            model_id="",
            status="incomplete",
        )
        session.add(profile)
        session.commit()
    if profile is None:
        raise LookupError("模型配置不存在")
    return profile


def current_profile(session: Session) -> ModelProfile:
    preference = session.get(AppPreference, "default")
    return model_profile(session, preference.default_model_profile_id if preference else DEEPSEEK_PROFILE_ID)


def get_model_settings(session: Session) -> dict:
    return {
        "activeProfileId": current_profile(session).profile_id,
        "profiles": [
            model_profile_view(model_profile(session, profile_id))
            for profile_id in (DEEPSEEK_PROFILE_ID, COMPATIBLE_PROFILE_ID)
        ],
    }


def get_deepseek_settings(session: Session) -> dict:
    return model_profile_view(model_profile(session, DEEPSEEK_PROFILE_ID))


def update_deepseek_settings(session: Session, payload: dict) -> dict:
    return update_model_settings(session, DEEPSEEK_PROFILE_ID, payload)


def update_model_settings(session: Session, profile_id: str, payload: dict) -> dict:
    profile = model_profile(session, profile_id)
    name = str(payload.get("name", "")).strip()
    base_url = str(payload.get("baseUrl", "")).strip().rstrip("/")
    if not name or not base_url:
        raise ValueError("配置名称和服务地址不能为空")
    provided_ids = payload.get("modelIds")
    model_ids = (
        list(dict.fromkeys(value.strip() for value in provided_ids))
        if provided_ids is not None
        else list(profile.model_ids or ([profile.model_id] if profile.model_id else []))
    )
    if any(not value or len(value) > 160 for value in model_ids):
        raise ValueError("模型名称无效")
    chosen = str(payload.get("modelId") or "").strip()
    if chosen and chosen not in model_ids:
        if provided_ids is not None:
            raise ValueError("默认模型不在可用模型列表中")
        model_ids.append(chosen)
    model_id = chosen or (profile.model_id if profile.model_id in model_ids else "") or (
        model_ids[0] if model_ids else ""
    )
    _validate_base_url(base_url, allow_http=profile_id == COMPATIBLE_PROFILE_ID)
    profile.name = name
    profile.base_url = base_url
    profile.model_id = model_id
    profile.model_ids = model_ids
    api_key = str(payload.get("apiKey") or "").strip()
    if api_key:
        if len(api_key) < 16:
            raise ValueError("API 凭据格式不完整")
        try:
            profile.credential_ref = credential_store.set(profile.profile_id, api_key)
        except CredentialStoreError:
            raise
        profile.key_configured = True
    profile.status = "untested" if profile.key_configured and model_id else "incomplete"
    profile.last_error = None
    profile.last_tested_at = None
    profile.last_latency_ms = None
    session.commit()
    return model_profile_view(profile)


def _validate_base_url(base_url: str, *, allow_http: bool = False) -> None:
    parsed = urlparse(base_url)
    if (
        parsed.scheme not in ({"http", "https"} if allow_http else {"https"})
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        protocols = "HTTP 或 HTTPS" if allow_http else "HTTPS"
        raise ValueError(f"模型服务地址必须是不含凭据、查询串或片段的 {protocols} 根地址")


async def discover_models(session: Session, profile_id: str, payload: dict) -> dict:
    profile = model_profile(session, profile_id)
    base_url = str(payload.get("baseUrl") or profile.base_url).strip().rstrip("/")
    _validate_base_url(base_url, allow_http=profile_id == COMPATIBLE_PROFILE_ID)
    key = str(payload.get("apiKey") or "").strip() or credential_store.get(profile.credential_ref)
    if not key:
        raise ValueError("请先填写 API 凭据")
    client = DeepSeekClient(base_url, "", key, compatible=profile_id == COMPATIBLE_PROFILE_ID)
    return {"models": await client.list_models()}


def activate_model(session: Session, profile_id: str) -> dict:
    profile = model_profile(session, profile_id)
    if profile.status != "available" or not credential_store.get(profile.credential_ref):
        raise ValueError("请先保存配置并通过连接测试")
    preference = session.get(AppPreference, "default")
    if preference is None:
        raise LookupError("应用设置不存在")
    preference.default_model_profile_id = profile_id
    session.commit()
    return get_model_settings(session)


def get_client(
    session: Session, *, require_available: bool = True,
    profile_id: str | None = None, model_id: str | None = None,
) -> tuple[ModelProfile, DeepSeekClient]:
    profile = model_profile(session, profile_id) if profile_id else current_profile(session)
    if require_available and profile.status != "available":
        raise DeepSeekError(
            "deepseek_not_ready", "当前模型服务尚未通过连接测试", retryable=False
        )
    key = credential_store.get(profile.credential_ref)
    if not key:
        profile.status = "incomplete"
        profile.key_configured = False
        session.commit()
        raise DeepSeekError("deepseek_missing_key", "当前模型服务 API 凭据尚未配置", retryable=False)
    selected_model_id = model_id or profile.model_id
    if not selected_model_id.strip() or len(selected_model_id) > 160:
        raise ValueError("模型标识无效")
    return profile, DeepSeekClient(
        profile.base_url, selected_model_id, key,
        compatible=profile.profile_id == COMPATIBLE_PROFILE_ID,
    )


async def test_deepseek_settings(session: Session) -> dict:
    return await test_model_settings(session, DEEPSEEK_PROFILE_ID)


async def test_model_settings(session: Session, profile_id: str) -> dict:
    profile = model_profile(session, profile_id)
    if not profile.model_id:
        raise ValueError("请先获取或添加模型并保存配置")
    try:
        key = credential_store.get(profile.credential_ref)
        if not key:
            raise DeepSeekError("deepseek_missing_key", "API 凭据尚未配置", retryable=False)
        client = DeepSeekClient(
            profile.base_url, profile.model_id, key, compatible=profile_id == COMPATIBLE_PROFILE_ID
        )
        result = await client.test_connection()
        if not result["available"]:
            profile.status = "unavailable"
            profile.last_error = (
                "连接测试未获得可用文本，请检查模型标识和服务接口"
                if profile_id == COMPATIBLE_PROFILE_ID
                else "当前模型标识不在服务返回的可用模型列表中"
            )
        else:
            profile.status = "available"
            profile.last_error = None
        profile.last_latency_ms = result["latencyMs"]
        profile.last_tested_at = datetime.now(UTC)
        session.commit()
        return {
            **model_profile_view(profile),
            "available": result["available"],
            "message": "模型服务连接可用" if result["available"] else profile.last_error,
        }
    except DeepSeekError as exc:
        profile.status = "unavailable" if profile.key_configured else "incomplete"
        profile.last_error = exc.message
        profile.last_tested_at = datetime.now(UTC)
        profile.last_latency_ms = None
        session.commit()
        return {
            **model_profile_view(profile),
            "available": False,
            "message": exc.message,
            "error": {"code": exc.code, "retryable": exc.retryable},
        }


def get_appearance(session: Session) -> dict:
    return appearance_view(session.get(AppPreference, "default"))


def update_appearance(session: Session, payload: dict) -> dict:
    preference = session.get(AppPreference, "default")
    if not preference:
        preference = AppPreference(preference_id="default")
        session.add(preference)
    theme = payload.get("themePreference")
    if theme not in {"system", "light", "dark"}:
        raise ValueError("主题偏好必须是跟随系统、浅色或深色")
    preference.theme_preference = theme
    preference.reduce_motion = bool(payload.get("reduceMotion", False))
    session.commit()
    return appearance_view(preference)
