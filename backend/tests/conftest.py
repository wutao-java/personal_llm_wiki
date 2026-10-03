from __future__ import annotations

import os
import shutil
import tempfile
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

TEST_DATA_DIR = Path(tempfile.mkdtemp(prefix="ff-llm-wiki-tests-"))
os.environ["LMWK_DATA_DIR"] = str(TEST_DATA_DIR)
os.environ["LMWK_TESTING"] = "true"
os.environ["LMWK_SEED_FIXTURE"] = "true"
os.environ["DEEPSEEK_API_KEY"] = ""

from app.db.session import session_factory  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
    shutil.rmtree(TEST_DATA_DIR, ignore_errors=True)


@pytest.fixture
def db_session(client: TestClient) -> Generator[Session, None, None]:
    del client
    with session_factory()() as session:
        yield session
