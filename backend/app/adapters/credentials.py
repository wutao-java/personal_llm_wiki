from __future__ import annotations

import keyring
from keyring.errors import KeyringError

from app.core.config import get_settings

SERVICE_NAME = "ff-llm-wiki-deepseek"


class CredentialStoreError(RuntimeError):
    pass


class CredentialStore:
    def get(self, credential_ref: str | None) -> str | None:
        if not credential_ref:
            return None
        if credential_ref == "env:DEEPSEEK_API_KEY":
            return get_settings().deepseek_api_key or None
        if credential_ref.startswith("keychain:"):
            account = credential_ref.removeprefix("keychain:")
            try:
                return keyring.get_password(SERVICE_NAME, account)
            except KeyringError as exc:
                raise CredentialStoreError("无法读取系统凭据库中的模型凭据") from exc
        return None

    def set(self, profile_id: str, api_key: str) -> str:
        account = f"profile:{profile_id}"
        try:
            keyring.set_password(SERVICE_NAME, account, api_key)
        except KeyringError as exc:
            raise CredentialStoreError("无法写入系统凭据库，请检查凭据管理器是否可用") from exc
        return f"keychain:{account}"


credential_store = CredentialStore()
