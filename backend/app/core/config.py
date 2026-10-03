from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent
PERSONAL_PROJECT_ID = "PROJECT-PERSONAL-WIKI"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "FF - LLM Wiki知识库"
    api_prefix: str = "/api/v1"
    data_dir: Path = Field(default=REPO_ROOT / "data" / "personal", alias="LMWK_DATA_DIR")
    fixture_dir: Path = Field(
        default=REPO_ROOT / "fixtures" / "enterprise-customer-service",
        alias="LMWK_FIXTURE_DIR",
    )
    frontend_dist: Path = Field(default=REPO_ROOT / "frontend" / "dist")
    max_upload_bytes: int = 10 * 1024 * 1024
    compile_concurrency: int = Field(default=3, ge=1, le=6, alias="LMWK_COMPILE_CONCURRENCY")
    compile_batch_units: int = Field(default=6, ge=1, le=24, alias="LMWK_COMPILE_BATCH_UNITS")
    compile_batch_chars: int = Field(default=12000, ge=4000, le=64000, alias="LMWK_COMPILE_BATCH_CHARS")
    compile_max_retries: int = Field(default=1, ge=0, le=2, alias="LMWK_COMPILE_MAX_RETRIES")
    compile_stream: bool = Field(default=True, alias="LMWK_COMPILE_STREAM")
    compile_connect_timeout: int = Field(default=20, ge=1, le=120, alias="LMWK_COMPILE_CONNECT_TIMEOUT")
    compile_read_timeout: int = Field(default=180, ge=1, le=600, alias="LMWK_COMPILE_READ_TIMEOUT")
    compile_total_timeout: int = Field(default=300, ge=1, le=1200, alias="LMWK_COMPILE_TOTAL_TIMEOUT")
    ocr_executable: Path | None = Field(
        default=REPO_ROOT / "data" / "toolchain" / "ocr" / "Library" / "bin" / "tesseract.exe",
        alias="LMWK_OCR_EXECUTABLE",
    )
    ocr_data_dir: Path | None = Field(
        default=REPO_ROOT / "data" / "toolchain" / "ocr" / "share" / "tessdata",
        alias="LMWK_OCR_DATA_DIR",
    )
    deepseek_api_key: str = Field(default="", alias="DEEPSEEK_API_KEY")
    deepseek_base_url: str = Field(default="https://api.deepseek.com", alias="DEEPSEEK_BASE_URL")
    deepseek_model: str = Field(default="deepseek-v4-pro", alias="DEEPSEEK_MODEL")
    testing: bool = Field(default=False, alias="LMWK_TESTING")
    seed_fixture: bool = Field(default=False, alias="LMWK_SEED_FIXTURE")

    @property
    def database_url(self) -> str:
        return f"sqlite:///{(self.data_dir / 'app.db').resolve()}"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    return settings


def reset_settings() -> None:
    get_settings.cache_clear()
