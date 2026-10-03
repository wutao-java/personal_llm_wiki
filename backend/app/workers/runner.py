from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.db.models import CompileRun
from app.db.session import session_factory

_tasks: dict[str, asyncio.Task] = {}


def schedule_compile(run_id: str) -> None:
    from app.services.compilation import execute_compile_run

    task = asyncio.create_task(execute_compile_run(run_id), name=f"compile:{run_id}")
    _tasks[run_id] = task
    task.add_done_callback(lambda finished: _tasks.pop(run_id, None) if _tasks.get(run_id) is finished else None)


async def stop_compile(run_id: str) -> None:
    task = _tasks.get(run_id)
    if task and not task.done():
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)


def mark_interrupted_runs() -> int:
    with session_factory()() as session:
        runs = session.scalars(
            select(CompileRun).where(CompileRun.status.in_(["queued", "running", "publishing"]))
        ).all()
        for run in runs:
            run.status = "interrupted"
            run.error_code = "process_interrupted"
            run.error_message = "上次处理进程已中断，可以从失败任务重新处理"
            run.counts = {**(run.counts or {}), "batchesInFlight": 0}
        session.commit()
        return len(runs)


async def stop_tasks() -> None:
    tasks = tuple(_tasks.values())
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
