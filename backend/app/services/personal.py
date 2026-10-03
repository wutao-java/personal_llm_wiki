from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.config import PERSONAL_PROJECT_ID, get_settings
from app.db.models import AppPreference, ModelProfile, Project


def ensure_personal_baseline(session: Session) -> None:
    settings = get_settings()
    if session.get(Project, PERSONAL_PROJECT_ID) is None:
        session.add(Project(project_id=PERSONAL_PROJECT_ID, name="我的知识库"))
    if session.get(ModelProfile, "deepseek-default") is None:
        session.add(
            ModelProfile(
                profile_id="deepseek-default",
                name="DeepSeek 在线服务",
                base_url=settings.deepseek_base_url,
                model_id=settings.deepseek_model,
                credential_ref="env:DEEPSEEK_API_KEY" if settings.deepseek_api_key else None,
                key_configured=bool(settings.deepseek_api_key),
                status="untested" if settings.deepseek_api_key else "incomplete",
            )
        )
    if session.get(AppPreference, "default") is None:
        session.add(
            AppPreference(
                preference_id="default",
                theme_preference="light",
                reduce_motion=False,
                default_model_profile_id="deepseek-default",
            )
        )
    session.commit()
