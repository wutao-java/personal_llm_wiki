from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.adapters.credentials import CredentialStoreError
from app.adapters.deepseek import DeepSeekError
from app.api.router import router
from app.contracts.schemas import ApiErrorEnvelope
from app.core.config import get_settings
from app.db.session import run_migrations, session_factory
from app.services.personal import ensure_personal_baseline
from app.services.qa import mark_interrupted_answers, stop_answer_tasks
from app.services.seed import seed_if_needed
from app.services.settings import current_profile, test_model_settings
from app.workers.runner import mark_interrupted_runs, stop_tasks


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    run_migrations()
    with session_factory()() as session:
        if settings.testing and settings.seed_fixture:
            seed_if_needed(session)
        else:
            ensure_personal_baseline(session)
        mark_interrupted_runs()
        mark_interrupted_answers()
        profile = current_profile(session)
        if profile.key_configured and not settings.testing:
            await test_model_settings(session, profile.profile_id)
    yield
    await stop_tasks()
    await stop_answer_tasks()


app = FastAPI(
    title="FF - LLM Wiki知识库 API",
    version="0.1.0",
    lifespan=lifespan,
    responses={400: {"model": ApiErrorEnvelope}, 404: {"model": ApiErrorEnvelope}},
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix=get_settings().api_prefix)
_project_write_lock = asyncio.Lock()


@app.middleware("http")
async def serialize_project_writes(request: Request, call_next):
    if request.method in {"POST", "PUT", "DELETE"}:
        async with _project_write_lock:
            return await call_next(request)
    return await call_next(request)


def error_response(
    code: str, message: str, *, status_code: int, retryable: bool = False
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "retryable": retryable}},
    )


@app.exception_handler(LookupError)
async def lookup_error_handler(_request: Request, exc: LookupError) -> JSONResponse:
    return error_response("not_found", str(exc), status_code=404)


@app.exception_handler(ValueError)
async def value_error_handler(_request: Request, exc: ValueError) -> JSONResponse:
    return error_response("invalid_request", str(exc), status_code=400)


@app.exception_handler(CredentialStoreError)
async def credential_error_handler(_request: Request, exc: CredentialStoreError) -> JSONResponse:
    return error_response("credential_store_error", str(exc), status_code=503, retryable=True)


@app.exception_handler(DeepSeekError)
async def deepseek_error_handler(_request: Request, exc: DeepSeekError) -> JSONResponse:
    status = 400 if exc.code.startswith("model_list_") and not exc.retryable else 409 if not exc.retryable else 503
    return error_response(exc.code, exc.message, status_code=status, retryable=exc.retryable)


frontend_dist = get_settings().frontend_dist
if frontend_dist.is_dir():
    assets_dir = frontend_dist / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def frontend(full_path: str) -> FileResponse:
        requested = (frontend_dist / full_path).resolve()
        if requested.is_file() and frontend_dist.resolve() in requested.parents:
            return FileResponse(requested)
        return FileResponse(frontend_dist / "index.html")
