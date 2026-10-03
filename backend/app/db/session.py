from __future__ import annotations

from collections.abc import Generator
from functools import lru_cache

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import BACKEND_DIR, get_settings


@lru_cache
def get_engine() -> Engine:
    engine = create_engine(
        get_settings().database_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )

    @event.listens_for(engine, "connect")
    def configure_sqlite(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

    return engine


def session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    with session_factory()() as session:
        yield session


def run_migrations() -> None:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    config.set_main_option("sqlalchemy.url", get_settings().database_url)
    command.upgrade(config, "head")


def reset_engine() -> None:
    if get_engine.cache_info().currsize:
        get_engine().dispose()
    get_engine.cache_clear()
