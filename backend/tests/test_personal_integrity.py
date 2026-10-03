from __future__ import annotations

import asyncio
import hashlib
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

from app.adapters.deepseek import CompilePayload
from app.db.models import (
    Answer,
    AnswerEvent,
    Base,
    CompileEvent,
    CompileRun,
    Conversation,
    Evidence,
    KnowledgeItem,
    Message,
    Project,
    Relation,
    Snapshot,
    Source,
    SourceVersion,
)
from app.services import compilation, knowledge, qa
from app.services.seed import PROJECT_ID, rebuild_search_index


@pytest.fixture
def personal_db(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'integrity.db'}")
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE VIRTUAL TABLE knowledge_search USING fts5("
            "snapshot_id UNINDEXED, knowledge_id UNINDEXED, title, summary, markdown, "
            "tokenize='trigram')"
        ))
    monkeypatch.setattr(compilation, "session_factory", lambda: factory)
    monkeypatch.setattr(qa, "session_factory", lambda: factory)
    with factory() as session:
        session.add(Project(project_id=PROJECT_ID, name="Personal integrity tests"))
        session.commit()
        yield session
    engine.dispose()


def add_source(session, source_id, content, *, version_number=1):
    version_id = f"SV-{source_id}-{version_number}"
    source = session.get(Source, source_id)
    if not source:
        source = Source(
            source_id=source_id, project_id=PROJECT_ID, title=source_id,
            filename=f"{source_id}.md", domain="Python", document_type="markdown",
        )
        session.add(source)
    previous = source.current_version_id
    source.current_version_id = version_id
    version = SourceVersion(
        source_version_id=version_id, source_id=source_id, version=str(version_number),
        content_sha256=hashlib.sha256(content.encode()).hexdigest(),
        original_path=f"/retained/{version_id}.md", original_filename=f"{source_id}.md",
        size_bytes=len(content.encode()), extracted_text=content, supersedes=previous,
        page_spans=[], block_spans=[], status="ready",
    )
    session.add(version)
    session.flush()
    return version


def add_knowledge(session, snapshot_id, knowledge_id, title, versions):
    evidence_ids = []
    for version in versions:
        evidence_id = f"E-{version.source_version_id}-{knowledge_id}"
        session.add(Evidence(
            evidence_id=evidence_id, source_id=version.source_id,
            source_version_id=version.source_version_id, path=version.original_path,
            char_start=0, char_end=len(version.extracted_text), quote=version.extracted_text,
        ))
        evidence_ids.append(evidence_id)
    item = KnowledgeItem(
        snapshot_id=snapshot_id, knowledge_id=knowledge_id, slug=knowledge_id.lower(),
        title=title, type="concept", domain="Python", summary=versions[0].extracted_text,
        markdown=f"# {title}\n\n{versions[0].extracted_text}",
        source_ids=[version.source_id for version in versions],
        source_version_ids=[version.source_version_id for version in versions],
        evidence_ids=evidence_ids,
    )
    session.add(item)
    session.flush()
    return item


def add_snapshot(session, snapshot_id="KS-OLD"):
    session.add(Snapshot(
        snapshot_id=snapshot_id, project_id=PROJECT_ID, version=snapshot_id,
        status="accepted",
    ))
    session.get(Project, PROJECT_ID).current_snapshot_id = snapshot_id
    session.flush()


def test_evidence_covers_short_blocks_long_tails_and_more_than_eighty_paragraphs():
    content = "limit=42\n\n" + "完整尾部" * 900 + "\n\n"
    content += "\n\n".join(f"Paragraph {index}: retained evidence after the old limit." for index in range(95))
    version = SourceVersion(
        source_version_id="SV-LONG", source_id="SRC-LONG", extracted_text=content,
        original_path="/retained/long.md", page_spans=[], block_spans=[],
    )
    fragments = compilation._split_evidence(version, "Long source")
    assert "".join("".join(fragment["quote"].split()) for fragment in fragments) == "".join(content.split())
    assert all(len(fragment["quote"]) <= 1200 for fragment in fragments)
    assert all(content[fragment["charStart"]:fragment["charEnd"]] == fragment["quote"] for fragment in fragments)


def test_evidence_never_crosses_a_physical_page_or_word_block():
    content = "A" * 1500 + "B" * 1500
    version = SourceVersion(
        source_version_id="SV-PAGES", source_id="SRC-PAGES", extracted_text=content,
        original_path="/retained/pages.pdf",
        page_spans=[
            {"pageNumber": 1, "charStart": 0, "charEnd": 1500},
            {"pageNumber": 2, "charStart": 1500, "charEnd": 3000},
        ],
        block_spans=[],
    )
    fragments = compilation._split_evidence(version, "Pages")
    assert sum(len(fragment["quote"]) for fragment in fragments) == len(content)
    assert all(fragment["quote"] == ("A" if fragment["pageNumber"] == 1 else "B") * len(fragment["quote"]) for fragment in fragments)


@pytest.mark.asyncio
async def test_compile_batches_every_fragment_and_persists_real_progress(personal_db, monkeypatch):
    version = add_source(personal_db, "SRC-LONG", "\n\n".join(
        f"Paragraph {index} contains retained evidence and detailed source material. " * 12
        for index in range(90)
    ))
    run = CompileRun(run_id="RUN-LONG", project_id=PROJECT_ID, source_version_ids=[version.source_version_id])
    personal_db.add(run)
    personal_db.commit()
    seen = []

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge):
            assert sum(len(item["quote"]) for item in evidence) <= 24000
            seen.extend(item["evidenceId"] for item in evidence)
            return CompilePayload.model_validate({"knowledge_items": [{
                "title": "Complete source", "domain": "Python",
                "summary": "All source paragraphs are processed without silent truncation.",
                "markdown": f"# Complete source\n\n{evidence[-1]['quote']}",
                "evidence_ids": [item["evidenceId"] for item in evidence],
            }], "relations": []})

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    await compilation.execute_compile_run(run.run_id)
    personal_db.expire_all()
    finished = personal_db.get(CompileRun, run.run_id)
    assert finished.status == "awaiting_review", finished.error_message
    fragments = compilation._split_evidence(version, version.source_id)
    assert seen == [item["evidenceId"] for item in fragments]
    assert finished.counts["batchesCompleted"] == finished.counts["batchesTotal"] > 1
    assert len(finished.candidate["knowledgeItems"]) == 1
    assert set(finished.candidate["knowledgeItems"][0]["evidenceIds"]) == set(seen)
    events = personal_db.scalars(select(CompileEvent).where(CompileEvent.run_id == run.run_id)).all()
    assert any(event.counts.get("batchesCompleted") == finished.counts["batchesTotal"] for event in events)


@pytest.mark.asyncio
async def test_batch_relations_keep_evidence_from_every_batch(personal_db, monkeypatch):
    settings = compilation.get_settings().model_copy(update={"compile_batch_units": 24})
    monkeypatch.setattr(compilation, "get_settings", lambda: settings)
    version = add_source(personal_db, "SRC-RELATIONS", "\n\n".join(
        f"Paragraph {index}: this source supports two related concepts."
        for index in range(30)
    ))
    personal_db.add(CompileRun(
        run_id="RUN-BATCH-RELATIONS", project_id=PROJECT_ID,
        source_version_ids=[version.source_version_id],
    ))
    personal_db.commit()
    seen = []

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge):
            ids = [evidence[-1]["evidenceId"]]
            seen.extend(ids)
            return CompilePayload.model_validate({
                "knowledge_items": [{
                    "title": title, "domain": "Python", "summary": "A related concept.",
                    "markdown": f"# {title}\n\nA related concept.", "evidence_ids": ids,
                } for title in ("First concept", "Second concept")],
                "relations": [{
                    "source_title": "First concept", "target_title": "Second concept",
                    "type": "supports", "evidence_ids": ids,
                }],
            })

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    await compilation.execute_compile_run("RUN-BATCH-RELATIONS")
    personal_db.expire_all()
    run = personal_db.get(CompileRun, "RUN-BATCH-RELATIONS")
    assert run.status == "awaiting_review", run.error_message
    assert len(seen) == 2
    assert len(run.candidate["relations"]) == run.counts["relationsValid"] == 1
    result = compilation.accept_run(personal_db, run.run_id)
    relation = personal_db.scalar(select(Relation).where(Relation.snapshot_id == result["snapshotId"]))
    assert relation.evidence_ids == seen


def test_content_groups_keep_question_explanations_and_nested_headings_together():
    content = (
        "# Interview\n\n### What is an agent?\n\nDefinition.\n\n"
        "#### Components\n\nPlanning and tools.\n\n```md\n### Not a question\n```\n\n"
        "### What is retrieval?\n\nExplanation.\n\nDetails."
    )
    version = SourceVersion(
        source_version_id="SV-GROUPS", source_id="SRC-GROUPS", extracted_text=content,
        original_path="/retained/questions.md", page_spans=[], block_spans=[],
    )
    evidence = compilation._split_evidence(version, "Interview")
    compilation._group_evidence(version, evidence)
    agent = next(item["unitId"] for item in evidence if "What is an agent?" in item["quote"])
    assert next(item["unitId"] for item in evidence if "Planning" in item["quote"]) == agent
    assert next(item["unitId"] for item in evidence if "Not a question" in item["quote"]) == agent
    retrieval = next(item["unitId"] for item in evidence if "What is retrieval?" in item["quote"])
    assert retrieval != agent
    assert next(item["unitId"] for item in evidence if item["quote"] == "Details.") == retrieval
    assert "".join("".join(item["quote"].split()) for item in evidence) == "".join(content.split())


def test_single_document_heading_falls_back_to_paragraph_groups():
    content = "# Notes\n\nFirst complete paragraph.\n\nSecond complete paragraph."
    version = SourceVersion(
        source_version_id="SV-PARAGRAPHS", source_id="SRC-PARAGRAPHS", extracted_text=content,
        original_path="/retained/notes.md", page_spans=[], block_spans=[],
    )
    evidence = compilation._split_evidence(version, "Notes")
    compilation._group_evidence(version, evidence)
    assert len({item["unitId"] for item in evidence}) == 3
    assert all(item["unitTitle"] == "Notes" for item in evidence)


def test_short_evidence_does_not_force_a_batch_split_and_large_units_keep_their_title(monkeypatch):
    settings = compilation.get_settings().model_copy(update={"compile_batch_chars": 5000})
    monkeypatch.setattr(compilation, "get_settings", lambda: settings)
    evidence = [{
        "evidenceId": f"E-{index}", "sourceVersionId": "SV-ONE", "sourceTitle": "Notes",
        "unitId": "U-ONE", "unitTitle": "One complete question", "quote": "Short answer.",
    } for index in range(30)]
    batches = compilation._evidence_batches(evidence)
    assert len(batches) == 1
    assert len(batches[0]) == 30
    for item in evidence:
        item["quote"] = "A" * 1000
    batches = compilation._evidence_batches(evidence)
    assert len(batches) > 1
    assert [item["evidenceId"] for batch in batches for item in batch] == [f"E-{i}" for i in range(30)]
    assert all(item["unitTitle"] == "One complete question" for batch in batches for item in batch)


def _pipeline_run(session, run_id="RUN-PIPELINE"):
    version = add_source(session, "SRC-PIPELINE", "\n\n".join(
        f"### Question {index}?\n\nAnswer {index} with complete supporting evidence."
        for index in range(6)
    ))
    run = CompileRun(run_id=run_id, project_id=PROJECT_ID, source_version_ids=[version.source_version_id])
    session.add(run)
    session.commit()
    return run


def _pipeline_result(evidence, *, title=None):
    return CompilePayload.model_validate({"knowledge_items": [{
        "title": title or evidence[0]["unitTitle"], "domain": evidence[0].get("topic", "Python"),
        "summary": "A complete answer with supporting source evidence.",
        "markdown": f"# Answer\n\n{evidence[-1]['quote']}",
        "evidence_ids": [item["evidenceId"] for item in evidence],
    }], "relations": []})


def _pipeline_settings(monkeypatch, **overrides):
    settings = compilation.get_settings().model_copy(update={
        "compile_batch_units": 1, "compile_concurrency": 3, "compile_max_retries": 0, **overrides,
    })
    monkeypatch.setattr(compilation, "get_settings", lambda: settings)


def test_default_batches_limit_prompt_size_and_keep_all_evidence(monkeypatch):
    from app.adapters.deepseek import compile_messages
    from app.core.config import Settings

    settings = Settings(_env_file=None)
    assert settings.compile_batch_units == 6
    assert settings.compile_batch_chars == 12000
    monkeypatch.setattr(compilation, "get_settings", lambda: settings)
    evidence = [{
        "evidenceId": f"E-{index}", "topic": "Python", "sourceTitle": "Notes",
        "unitId": f"U-{index // 3}", "unitTitle": f"Question {index // 3}", "quote": "A" * 1100,
    } for index in range(60)]
    context = [{"knowledgeId": "K-1", "title": "Existing knowledge", "summary": "Retained context."}]
    batches = compilation._evidence_batches(evidence, context)
    assert [item for batch in batches for item in batch] == evidence
    assert all(len({item["unitId"] for item in batch}) <= 6 for batch in batches)
    assert all(sum(len(message["content"]) for message in compile_messages(batch, context)) <= 12000
               for batch in batches)


@pytest.mark.asyncio
async def test_waiting_batches_persist_elapsed_time_without_advancing_progress(personal_db, monkeypatch):
    _pipeline_settings(monkeypatch)
    monkeypatch.setattr(compilation, "COMPILE_PROGRESS_INTERVAL_SECONDS", 0.01)
    run = _pipeline_run(personal_db)
    release = asyncio.Event()

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge):
            await release.wait()
            return _pipeline_result(evidence)

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    task = asyncio.create_task(compilation.execute_compile_run(run.run_id))
    try:
        async with asyncio.timeout(2):
            while True:
                await asyncio.sleep(0.01)
                personal_db.expire_all()
                waiting = personal_db.get(CompileRun, run.run_id)
                if waiting.counts.get("compileDurationMs", 0) >= 30:
                    break
        assert waiting.counts["batchesCompleted"] == waiting.counts["evidenceProcessed"] == 0
        assert waiting.counts["batchesInFlight"] == 3
        assert waiting.candidate["checkpoint"]["completed"] == {}
        assert waiting.candidate["knowledgeItems"] == []
        assert personal_db.get(Project, PROJECT_ID).current_snapshot_id is None
        events = personal_db.scalars(select(CompileEvent).where(CompileEvent.run_id == run.run_id)).all()
        assert any(event.counts.get("compileDurationMs", 0) >= 30 for event in events)
    finally:
        release.set()
        await task
    personal_db.expire_all()
    assert personal_db.get(CompileRun, run.run_id).status == "awaiting_review"


@pytest.mark.asyncio
async def test_pipeline_limits_concurrency_and_merges_in_source_order(personal_db, monkeypatch):
    _pipeline_settings(monkeypatch)
    run = _pipeline_run(personal_db)
    in_flight = peak = 0
    seen = []

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge):
            nonlocal in_flight, peak
            in_flight += 1
            peak = max(peak, in_flight)
            seen.extend(item["evidenceId"] for item in evidence)
            await asyncio.sleep(0.02 if "Question 0" in evidence[0]["unitTitle"] else 0.001)
            in_flight -= 1
            return _pipeline_result(evidence, title="Shared answer")

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline", base_url="https://example.org"), Compiler(),
    ))
    await compilation.execute_compile_run(run.run_id)
    personal_db.expire_all()
    finished = personal_db.get(CompileRun, run.run_id)
    assert finished.status == "awaiting_review", finished.error_message
    assert peak == 3
    assert len(seen) == len(set(seen))
    markdown = finished.candidate["knowledgeItems"][0]["markdown"]
    assert [markdown.index(f"Answer {i} with") for i in range(6)] == sorted(
        markdown.index(f"Answer {i} with") for i in range(6)
    )
    assert finished.counts["batchesCompleted"] == 6
    assert finished.counts["batchesInFlight"] == 0
    assert finished.counts["knowledgeCandidates"] == 1
    assert finished.counts["compileDurationMs"] >= finished.counts["lastBatchDurationMs"]
    assert "checkpoint" not in finished.candidate


@pytest.mark.asyncio
@pytest.mark.parametrize("changed", [None, "model", "endpoint", "topic", "snapshot", "source"])
async def test_retry_reuses_only_valid_completed_batches(personal_db, monkeypatch, changed):
    from app.adapters.deepseek import DeepSeekError

    _pipeline_settings(monkeypatch, compile_concurrency=1)
    run = _pipeline_run(personal_db)
    profile = SimpleNamespace(profile_id="offline", model_id="offline", base_url="https://example.org")
    calls = []
    failing = True

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge):
            calls.append(evidence[0]["unitTitle"])
            if failing and "Question 2" in evidence[0]["unitTitle"]:
                raise DeepSeekError("deepseek_timeout", "Request timed out")
            return _pipeline_result(evidence)

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (profile, Compiler()))
    await compilation.execute_compile_run(run.run_id)
    personal_db.expire_all()
    failed = personal_db.get(CompileRun, run.run_id)
    assert failed.status == "failed"
    assert failed.counts["batchesCompleted"] == 2
    assert failed.candidate["knowledgeItems"] == []
    assert compilation.review_view(personal_db, run.run_id)["knowledgeItems"] == []
    assert personal_db.get(Project, PROJECT_ID).current_snapshot_id is None
    with pytest.raises(ValueError):
        compilation.accept_run(personal_db, run.run_id)
    if changed == "model":
        profile.model_id = "other-model"
    elif changed == "endpoint":
        profile.base_url = "https://other.example.org"
    elif changed == "topic":
        personal_db.get(Source, "SRC-PIPELINE").domain = "Agent"
    elif changed == "snapshot":
        add_snapshot(personal_db)
    elif changed == "source":
        old = personal_db.get(SourceVersion, failed.source_version_ids[0])
        add_source(personal_db, old.source_id, old.extracted_text + "\n\nNew information.", version_number=2)
    personal_db.commit()
    monkeypatch.setattr("app.workers.runner.schedule_compile", lambda run_id: None)
    retried = compilation.retry_run(personal_db, run.run_id)
    failing = False
    calls.clear()
    await compilation.execute_compile_run(retried["runId"])
    personal_db.expire_all()
    finished = personal_db.get(CompileRun, retried["runId"])
    assert finished.status == "awaiting_review", finished.error_message
    assert finished.counts["batchesReused"] == (2 if changed is None else 0)
    assert len(calls) == (4 if changed is None else 6)


@pytest.mark.asyncio
async def test_pipeline_cancellation_cleans_up_child_requests(personal_db, monkeypatch):
    _pipeline_settings(monkeypatch)
    run = _pipeline_run(personal_db)
    started = asyncio.Event()
    active = cancelled = 0

    class Compiler:
        async def compile_knowledge(self, **kwargs):
            nonlocal active, cancelled
            active += 1
            if active == 3:
                started.set()
            try:
                await asyncio.Event().wait()
            finally:
                active -= 1
                cancelled += 1

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    task = asyncio.create_task(compilation.execute_compile_run(run.run_id))
    await asyncio.wait_for(started.wait(), timeout=2)
    task.cancel()
    await asyncio.gather(task, return_exceptions=True)
    assert active == 0 and cancelled == 3
    personal_db.expire_all()
    assert personal_db.get(CompileRun, run.run_id).counts["batchesInFlight"] == 0


@pytest.mark.asyncio
async def test_failed_peer_does_not_discard_other_completed_batches(personal_db, monkeypatch):
    _pipeline_settings(monkeypatch)
    run = _pipeline_run(personal_db)
    release = asyncio.Event()
    arrived = 0

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge):
            nonlocal arrived
            arrived += 1
            if arrived == 3:
                release.set()
            await release.wait()
            if "Question 0" in evidence[0]["unitTitle"]:
                raise RuntimeError("Unexpected provider failure")
            return _pipeline_result(evidence)

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    await compilation.execute_compile_run(run.run_id)
    personal_db.expire_all()
    failed = personal_db.get(CompileRun, run.run_id)
    assert failed.status == "failed" and failed.error_code == "compile_internal_error"
    assert failed.counts["batchesCompleted"] == 2
    assert failed.counts["batchesInFlight"] == 0
    assert set(failed.candidate["checkpoint"]["completed"]) == {"1", "2"}
    assert failed.candidate["knowledgeItems"] == []


@pytest.mark.asyncio
@pytest.mark.parametrize("code,retryable,expected_calls", [
    ("deepseek_timeout", True, 2), ("deepseek_unreachable", True, 2),
    ("deepseek_http_error", True, 2), ("deepseek_http_error", False, 1),
    ("invalid_compile_output", True, 1),
])
async def test_only_transient_requests_retry(personal_db, monkeypatch, code, retryable, expected_calls):
    from app.adapters.deepseek import DeepSeekError

    _pipeline_settings(monkeypatch, compile_batch_units=12, compile_max_retries=1)
    run = _pipeline_run(personal_db)
    calls = 0

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge):
            nonlocal calls
            calls += 1
            if calls == 1:
                raise DeepSeekError(code, "A safe request error", retryable=retryable)
            return _pipeline_result(evidence)

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    await compilation.execute_compile_run(run.run_id)
    personal_db.expire_all()
    finished = personal_db.get(CompileRun, run.run_id)
    assert calls == expected_calls
    assert finished.status == ("awaiting_review" if expected_calls == 2 else "failed")
    assert finished.counts["batchesRetried"] == expected_calls - 1
    assert finished.counts["batchesInFlight"] == 0


@pytest.mark.asyncio
@pytest.mark.parametrize("invalid_relation", [False, True])
async def test_out_of_batch_evidence_is_not_checkpointed(personal_db, monkeypatch, invalid_relation):
    _pipeline_settings(monkeypatch, compile_batch_units=12)
    run = _pipeline_run(personal_db)

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge):
            result = _pipeline_result(evidence)
            if invalid_relation:
                from app.adapters.deepseek import CompiledRelation
                result.relations = [CompiledRelation(
                    source_title=result.knowledge_items[0].title,
                    target_title=result.knowledge_items[0].title,
                    type="supports", evidence_ids=["E-OUTSIDE"],
                )]
            else:
                result.knowledge_items[0].evidence_ids.append("E-OUTSIDE")
            return result

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    await compilation.execute_compile_run(run.run_id)
    personal_db.expire_all()
    failed = personal_db.get(CompileRun, run.run_id)
    assert failed.error_code == "invalid_evidence_reference"
    assert failed.counts["batchesCompleted"] == failed.counts["batchesRetried"] == 0
    assert failed.candidate["checkpoint"]["completed"] == {}


@pytest.mark.asyncio
@pytest.mark.parametrize("failures,retries,expected_calls,success", [
    (["invalid_evidence_reference"], 1, [False, True], True),
    (["invalid_evidence_reference", "invalid_evidence_reference"], 2, [False, True], False),
    (["invalid_evidence_reference"], 0, [False], False),
    (["deepseek_timeout", "invalid_evidence_reference"], 1, [False, False], False),
    (["invalid_evidence_reference", "deepseek_timeout"], 1, [False, True], False),
    (["invalid_evidence_reference", "deepseek_timeout"], 2, [False, True, True], True),
])
async def test_reference_repair_is_bounded_and_shares_request_retry_budget(
    personal_db, monkeypatch, failures, retries, expected_calls, success,
):
    from app.adapters.deepseek import DeepSeekError

    _pipeline_settings(monkeypatch, compile_batch_units=12, compile_max_retries=retries)
    run = _pipeline_run(personal_db)
    calls = []

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge, repair_references=False):
            calls.append(repair_references)
            if len(calls) <= len(failures):
                code = failures[len(calls) - 1]
                raise DeepSeekError(code, "A safe request error", retryable=code == "deepseek_timeout")
            return _pipeline_result(evidence)

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    await compilation.execute_compile_run(run.run_id)
    personal_db.expire_all()
    finished = personal_db.get(CompileRun, run.run_id)
    assert calls == expected_calls
    assert finished.counts["batchesRetried"] == len(calls) - 1
    assert finished.counts["batchesInFlight"] == 0
    assert finished.status == ("awaiting_review" if success else "failed")
    assert personal_db.get(Project, PROJECT_ID).current_snapshot_id is None
    if not success:
        assert finished.candidate["checkpoint"]["completed"] == {}
        assert compilation.review_view(personal_db, run.run_id)["knowledgeItems"] == []


@pytest.mark.asyncio
@pytest.mark.parametrize("invalid_relation", [False, True])
async def test_invalid_reference_after_repair_is_still_not_checkpointed(personal_db, monkeypatch, invalid_relation):
    _pipeline_settings(monkeypatch, compile_batch_units=12, compile_max_retries=2)
    run = _pipeline_run(personal_db)
    calls = []

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge, repair_references=False):
            calls.append(repair_references)
            result = _pipeline_result(evidence)
            if invalid_relation:
                from app.adapters.deepseek import CompiledRelation
                result.relations = [CompiledRelation(
                    source_title=result.knowledge_items[0].title,
                    target_title=result.knowledge_items[0].title,
                    type="supports", evidence_ids=["E-OUTSIDE"],
                )]
            else:
                result.knowledge_items[0].evidence_ids.append("E-OUTSIDE")
            return result

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    await compilation.execute_compile_run(run.run_id)
    personal_db.expire_all()
    failed = personal_db.get(CompileRun, run.run_id)
    assert calls == [False, True]
    assert failed.error_code == "invalid_evidence_reference"
    assert failed.counts["batchesCompleted"] == 0 and failed.counts["batchesRetried"] == 1
    assert failed.candidate["checkpoint"]["completed"] == {}


@pytest.mark.asyncio
async def test_reference_repair_resumes_legacy_checkpoint_without_recompiling_valid_batches(personal_db, monkeypatch):
    from app.adapters.deepseek import DeepSeekClient

    _pipeline_settings(monkeypatch, compile_concurrency=1)
    run = _pipeline_run(personal_db)
    client = DeepSeekClient("https://example.org/v1", "offline", "unused")
    calls = []
    resumed = False

    async def response(payload, *, timeout):
        messages = payload["messages"]
        user = messages[-1]["content"]
        calls.append(user)
        repaired = "[E1]" in user
        first_id = user.split("本次可用证据：\n[", 1)[1].split("]", 1)[0]
        result = _pipeline_result([{
            "evidenceId": first_id, "unitTitle": "Batch " + str(len(calls)),
            "quote": "Retained evidence for this generated knowledge page.",
        }])
        if "Question 2" in user and not repaired:
            result.knowledge_items[0].evidence_ids = ["E-OUTSIDE"]
        if repaired:
            assert resumed
        return {"choices": [{"message": {"content": result.model_dump_json()}}]}

    monkeypatch.setattr(client, "_post_json", response)
    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline", base_url=client.base_url), client,
    ))
    await compilation.execute_compile_run(run.run_id)
    personal_db.expire_all()
    failed = personal_db.get(CompileRun, run.run_id)
    assert failed.status == "failed" and failed.counts["batchesCompleted"] == 2
    signature = failed.candidate["checkpoint"]["signature"]
    monkeypatch.setattr("app.workers.runner.schedule_compile", lambda run_id: None)
    retried = compilation.retry_run(personal_db, run.run_id)
    assert personal_db.get(CompileRun, retried["runId"]).candidate["checkpoint"]["signature"] == signature
    _pipeline_settings(monkeypatch, compile_concurrency=1, compile_max_retries=1)
    calls.clear()
    resumed = True
    await compilation.execute_compile_run(retried["runId"])
    personal_db.expire_all()
    finished = personal_db.get(CompileRun, retried["runId"])
    assert finished.status == "awaiting_review", finished.error_message
    assert finished.counts["batchesReused"] == 2 and finished.counts["batchesRetried"] == 1
    assert len(calls) == 5
    assert not any("Question 0" in call or "Question 1" in call for call in calls)
    assert all(evidence_id.startswith("E-SV-") for item in finished.candidate["knowledgeItems"]
               for evidence_id in item["evidenceIds"])


@pytest.mark.asyncio
async def test_interrupted_retry_revalidates_checkpoint_evidence(personal_db, monkeypatch):
    from copy import deepcopy

    from app.adapters.deepseek import DeepSeekError

    _pipeline_settings(monkeypatch, compile_concurrency=1)
    run = _pipeline_run(personal_db)
    failing = True
    calls = []

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge):
            calls.append(evidence[0]["unitTitle"])
            if failing and "Question 2" in evidence[0]["unitTitle"]:
                raise DeepSeekError("deepseek_timeout", "A safe timeout")
            return _pipeline_result(evidence)

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    await compilation.execute_compile_run(run.run_id)
    personal_db.expire_all()
    failed = personal_db.get(CompileRun, run.run_id)
    candidate = deepcopy(failed.candidate)
    saved = candidate["checkpoint"]["completed"]["0"]
    saved["result"]["knowledge_items"][0]["evidence_ids"] = ["E-TAMPERED"]
    saved["sha256"] = compilation._payload_digest(saved["result"])
    failed.candidate = candidate
    failed.status = "running"
    failed.counts = {**failed.counts, "batchesInFlight": 1}
    personal_db.commit()
    from app.workers import runner
    monkeypatch.setattr(runner, "session_factory", compilation.session_factory)
    assert runner.mark_interrupted_runs() == 1
    personal_db.expire_all()
    assert personal_db.get(CompileRun, run.run_id).counts["batchesInFlight"] == 0
    monkeypatch.setattr(runner, "schedule_compile", lambda run_id: None)
    retried = compilation.retry_run(personal_db, run.run_id)
    calls.clear()
    failing = False
    await compilation.execute_compile_run(retried["runId"])
    personal_db.expire_all()
    finished = personal_db.get(CompileRun, retried["runId"])
    assert finished.status == "awaiting_review"
    assert finished.counts["batchesReused"] == 1
    assert len(calls) == 5


@pytest.mark.asyncio
@pytest.mark.parametrize("other_topic", [False, True])
async def test_exact_title_merge_deduplicates_bodies_but_not_topics(personal_db, monkeypatch, other_topic):
    _pipeline_settings(monkeypatch, compile_batch_units=1)
    first = add_source(personal_db, "SRC-A", "A complete source answer with retained evidence.")
    second = add_source(personal_db, "SRC-B", "Another complete source answer with retained evidence.")
    if other_topic:
        personal_db.get(Source, second.source_id).domain = "Agent"
    run = CompileRun(
        run_id="RUN-TITLES", project_id=PROJECT_ID,
        source_version_ids=[first.source_version_id, second.source_version_id],
    )
    personal_db.add(run)
    personal_db.commit()

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge):
            result = _pipeline_result(evidence, title=" Shared  Answer " if evidence[0]["sourceId"] == "SRC-A" else "shared answer")
            result.knowledge_items[0].markdown = "# Shared answer\n\nIdentical content supported by both sources."
            return result

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    await compilation.execute_compile_run(run.run_id)
    personal_db.expire_all()
    finished = personal_db.get(CompileRun, run.run_id)
    if other_topic:
        assert finished.status == "failed" and finished.error_code == "conflicting_knowledge_topic"
        assert finished.candidate["knowledgeItems"] == []
    else:
        assert finished.status == "awaiting_review"
        assert len(finished.candidate["knowledgeItems"]) == 1
        item = finished.candidate["knowledgeItems"][0]
        assert item["markdown"].count("Identical content") == 1
        assert set(item["sourceIds"]) == {"SRC-A", "SRC-B"}

@pytest.mark.asyncio
async def test_update_recompiles_shared_sources_and_retires_obsolete_pages(personal_db, monkeypatch):
    add_snapshot(personal_db)
    old = add_source(personal_db, "SRC-A", "The old limit is 10 and is no longer valid.")
    shared = add_source(personal_db, "SRC-B", "Shared source retains the resource cleanup requirement.")
    untouched = add_source(personal_db, "SRC-C", "Unrelated knowledge remains available and unchanged.")
    mixed = add_knowledge(personal_db, "KS-OLD", "K-SHARED", "Shared cleanup", [old, shared])
    obsolete = add_knowledge(personal_db, "KS-OLD", "K-OLD", "Obsolete limit", [old])
    add_knowledge(personal_db, "KS-OLD", "K-C", "Unrelated knowledge", [untouched])
    personal_db.add(Relation(
        snapshot_id="KS-OLD", relation_id="REL-OLD", source_knowledge_id=mixed.knowledge_id,
        target_knowledge_id=obsolete.knowledge_id, type="supports",
        evidence_ids=obsolete.evidence_ids,
    ))
    new = add_source(personal_db, "SRC-A", "The current limit is 20. Cleanup is still required.", version_number=2)
    personal_db.add(CompileRun(
        run_id="RUN-UPDATE", project_id=PROJECT_ID, source_version_ids=[new.source_version_id],
    ))
    personal_db.commit()

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge):
            assert {item["sourceVersionId"] for item in evidence} == {new.source_version_id, shared.source_version_id}
            return CompilePayload.model_validate({"knowledge_items": [{
                "title": "Shared cleanup", "domain": "Python",
                "summary": "The limit is 20 and the shared cleanup rule is retained.",
                "markdown": "# Shared cleanup\n\nThe current limit is 20. Shared resource cleanup is required.",
                "evidence_ids": [item["evidenceId"] for item in evidence],
            }], "relations": []})

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    await compilation.execute_compile_run("RUN-UPDATE")
    personal_db.expire_all()
    run = personal_db.get(CompileRun, "RUN-UPDATE")
    assert run.status == "awaiting_review", run.error_message
    result = compilation.accept_run(personal_db, run.run_id)
    items = personal_db.scalars(select(KnowledgeItem).where(KnowledgeItem.snapshot_id == result["snapshotId"])).all()
    assert {item.knowledge_id for item in items} == {"K-SHARED", "K-C"}
    current = next(item for item in items if item.knowledge_id == "K-SHARED")
    assert set(current.source_version_ids) == {new.source_version_id, shared.source_version_id}
    assert not set(mixed.evidence_ids).intersection(current.evidence_ids)
    assert not personal_db.scalars(select(Relation).where(Relation.snapshot_id == result["snapshotId"])).all()
    assert personal_db.get(Evidence, obsolete.evidence_ids[0]).quote == old.extracted_text
    assert personal_db.scalar(select(KnowledgeItem).where(
        KnowledgeItem.snapshot_id == "KS-OLD", KnowledgeItem.knowledge_id == "K-OLD",
    )) is not None
    assert "K-OLD" not in {
        item.knowledge_id for item in knowledge.search_knowledge(personal_db, result["snapshotId"], "Obsolete limit")
    }


def test_obsolete_review_cannot_publish(personal_db):
    add_snapshot(personal_db)
    old = add_source(personal_db, "SRC-A", "Old source content retained only for history.")
    run = CompileRun(
        run_id="RUN-STALE", project_id=PROJECT_ID, status="awaiting_review",
        source_version_ids=[old.source_version_id],
        candidate={"knowledgeItems": [], "relations": []},
    )
    personal_db.add(run)
    add_source(personal_db, "SRC-A", "New source content is now the current revision.", version_number=2)
    personal_db.commit()
    with pytest.raises(ValueError, match="版本"):
        compilation.accept_run(personal_db, run.run_id)
    assert personal_db.get(Project, PROJECT_ID).current_snapshot_id == "KS-OLD"


def test_review_based_on_replaced_snapshot_cannot_publish(personal_db):
    add_snapshot(personal_db)
    version = add_source(personal_db, "SRC-A", "Source content is unchanged during concurrent publication.")
    run = CompileRun(
        run_id="RUN-STALE", project_id=PROJECT_ID, status="awaiting_review",
        source_version_ids=[version.source_version_id],
        candidate={"knowledgeItems": [], "relations": [], "baseSnapshotId": "KS-OLD"},
    )
    personal_db.add(run)
    add_snapshot(personal_db, "KS-NEW")
    personal_db.commit()
    with pytest.raises(ValueError, match="知识版本"):
        compilation.accept_run(personal_db, run.run_id)
    assert personal_db.get(Project, PROJECT_ID).current_snapshot_id == "KS-NEW"
    assert run.status == "failed" and run.error_code == "stale_knowledge_version"


def test_retry_compile_uses_current_source_version(personal_db, monkeypatch):
    old = add_source(personal_db, "SRC-A", "The old content is retained for historical evidence.")
    personal_db.add(CompileRun(
        run_id="RUN-FAILED", project_id=PROJECT_ID, status="failed",
        source_version_ids=[old.source_version_id],
    ))
    new = add_source(personal_db, "SRC-A", "The current revision must be used for a retry.", version_number=2)
    personal_db.commit()
    scheduled = []
    monkeypatch.setattr("app.workers.runner.schedule_compile", scheduled.append)
    result = compilation.retry_run(personal_db, "RUN-FAILED")
    assert result["sourceVersionIds"] == [new.source_version_id]
    assert scheduled == [result["runId"]]


@pytest.mark.asyncio
async def test_recompiled_relation_replaces_old_evidence(personal_db, monkeypatch):
    add_snapshot(personal_db)
    old = add_source(personal_db, "SRC-A", "Old evidence supports two related knowledge pages.")
    first = add_knowledge(personal_db, "KS-OLD", "K-FIRST", "First concept", [old])
    second = add_knowledge(personal_db, "KS-OLD", "K-SECOND", "Second concept", [old])
    personal_db.add(Relation(
        snapshot_id="KS-OLD", relation_id="REL-OLD", source_knowledge_id=first.knowledge_id,
        target_knowledge_id=second.knowledge_id, type="supports", evidence_ids=first.evidence_ids,
    ))
    new = add_source(personal_db, "SRC-A", "Current evidence supports the same two concepts.", version_number=2)
    personal_db.add(CompileRun(
        run_id="RUN-RELATION", project_id=PROJECT_ID, source_version_ids=[new.source_version_id],
    ))
    personal_db.commit()

    class Compiler:
        async def compile_knowledge(self, *, evidence, existing_knowledge):
            ids = [evidence[0]["evidenceId"]]
            return CompilePayload.model_validate({
                "knowledge_items": [{
                    "title": title, "domain": "Python", "summary": "Current source supports this concept.",
                    "markdown": f"# {title}\n\nCurrent source supports this concept.", "evidence_ids": ids,
                } for title in ("First concept", "Second concept")],
                "relations": [{
                    "source_title": "First concept", "target_title": "Second concept",
                    "type": "supports", "evidence_ids": ids,
                }],
            })

    monkeypatch.setattr(compilation, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), Compiler(),
    ))
    await compilation.execute_compile_run("RUN-RELATION")
    personal_db.expire_all()
    result = compilation.accept_run(personal_db, "RUN-RELATION")
    relation = personal_db.scalar(select(Relation).where(Relation.snapshot_id == result["snapshotId"]))
    assert relation and not set(first.evidence_ids).intersection(relation.evidence_ids)
    assert all(personal_db.get(Evidence, item).source_version_id == new.source_version_id for item in relation.evidence_ids)


@pytest.mark.asyncio
@pytest.mark.parametrize("response", ["Unsupported answer with no citation.", "A claim [1] and an invalid claim [999].", "Invalid zero [0]."])
async def test_missing_or_out_of_range_citations_fail_and_can_be_retried(personal_db, monkeypatch, response):
    add_snapshot(personal_db)
    version = add_source(personal_db, "SRC-QA", "Python context managers close file handles.")
    item = add_knowledge(personal_db, "KS-OLD", "K-PYTHON", "Python context managers", [version])
    answer = make_answer(personal_db, "Python context managers")

    class AnswerClient:
        model_id = "offline"

        async def stream_answer(self, **kwargs):
            yield response

    monkeypatch.setattr(qa, "search_knowledge", lambda *args, **kwargs: [item])
    monkeypatch.setattr(qa, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), AnswerClient(),
    ))
    await qa.generate_answer(answer.answer_id)
    personal_db.expire_all()
    failed = personal_db.get(Answer, answer.answer_id)
    assert failed.status == "failed"
    assert failed.error_code in {"missing_answer_citation", "invalid_answer_citation"}
    assert failed.evidence_status != "sufficient"
    assert failed.citations == []
    assert personal_db.scalars(select(AnswerEvent).where(AnswerEvent.answer_id == answer.answer_id)).all()[-1].event_type == "error"
    scheduled = []
    monkeypatch.setattr(qa, "_schedule_answer", scheduled.append)
    assert qa.retry_answer(personal_db, answer.answer_id)["answerId"] in scheduled


def make_answer(session, question, *, context_ids=None, previous_question=None):
    now = datetime.now(UTC)
    conversation = Conversation(
        conversation_id="CONV-TEST", project_id=PROJECT_ID, title="Test conversation",
        context_knowledge_ids=context_ids or [],
    )
    session.add(conversation)
    if previous_question:
        session.add(Message(
            message_id="MSG-PREVIOUS", conversation_id=conversation.conversation_id, role="user",
            content=previous_question, created_at=now - timedelta(seconds=1),
        ))
    message = Message(
        message_id="MSG-CURRENT", conversation_id=conversation.conversation_id,
        role="user", content=question, created_at=now,
    )
    session.add(message)
    session.flush()
    answer = Answer(
        answer_id="ANS-TEST", conversation_id=conversation.conversation_id,
        question_message_id=message.message_id, snapshot_id="KS-OLD", status="received",
    )
    session.add(answer)
    session.commit()
    return answer


@pytest.mark.asyncio
async def test_follow_up_uses_bounded_history_and_selected_current_knowledge(personal_db, monkeypatch):
    add_snapshot(personal_db)
    version = add_source(personal_db, "SRC-QA", "Python context managers close file handles.")
    item = add_knowledge(personal_db, "KS-OLD", "K-PYTHON", "Python context managers", [version])
    answer = make_answer(
        personal_db, "那它有什么限制？", context_ids=[item.knowledge_id, "K-MISSING"],
        previous_question="Python context managers 如何关闭文件？",
    )
    queries = []

    def search(session, snapshot_id, query, **kwargs):
        queries.append(query)
        return []

    class AnswerClient:
        async def stream_answer(self, *, question, evidence, history):
            assert question == "那它有什么限制？"
            assert history == [{"role": "user", "content": "Python context managers 如何关闭文件？"}]
            assert evidence[0]["knowledgeId"] == item.knowledge_id
            yield "上下文管理器负责关闭文件；来源未说明其他限制。[1]"

    monkeypatch.setattr(qa, "search_knowledge", search)
    monkeypatch.setattr(qa, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), AnswerClient(),
    ))
    await qa.generate_answer(answer.answer_id)
    personal_db.expire_all()
    completed = personal_db.get(Answer, answer.answer_id)
    assert completed.status == "completed", completed.error_message
    assert completed.related_knowledge_ids == [item.knowledge_id]
    assert any("Python context managers" in query for query in queries)


def test_knowledge_directory_searches_body_and_pages_without_overlap(personal_db):
    add_snapshot(personal_db)
    version = add_source(personal_db, "SRC-LIST", "Retained source content for directory testing.")
    for index in range(35):
        item = add_knowledge(personal_db, "KS-OLD", f"K-{index:03d}", f"Entry {index:03d}", [version])
        item.markdown += "\n\nbody-only-needle"
    personal_db.flush()
    rebuild_search_index(personal_db)
    first = knowledge.list_knowledge(personal_db, query="body-only-needle", page=1, page_size=30)
    second = knowledge.list_knowledge(personal_db, query="body-only-needle", page=2, page_size=30)
    assert first["total"] == second["total"] == 35
    assert len(first["items"]) == 30 and len(second["items"]) == 5
    assert not {item["knowledgeId"] for item in first["items"]}.intersection(item["knowledgeId"] for item in second["items"])


@pytest.mark.parametrize("question, relevant", [
    ("退款期限是多少？", "退款期限为三十天。"),
    ("What is the refund deadline?", "The refund deadline is thirty days."),
])
def test_evidence_ranks_relevant_tail_before_truncation(personal_db, question, relevant):
    add_snapshot(personal_db)
    version = add_source(personal_db, "SRC-RANK", relevant)
    item = add_knowledge(personal_db, "KS-OLD", "K-RANK", "Rules", [version])
    tail_id = item.evidence_ids[0]
    ids = []
    for index in range(15):
        evidence_id = f"E-UNRELATED-{index}"
        personal_db.add(Evidence(
            evidence_id=evidence_id, source_id=version.source_id,
            source_version_id=version.source_version_id, path=version.original_path,
            quote="Office hours and contact details.", char_start=0, char_end=10,
        ))
        ids.append(evidence_id)
    item.evidence_ids = [*ids, tail_id, tail_id]
    personal_db.commit()
    evidence = qa._build_evidence(personal_db, [item], query=question)
    assert len(evidence) == 12
    assert evidence[0]["evidenceId"] == tail_id
    assert evidence[0]["quote"] == relevant
    assert evidence[0]["sourceVersionId"] == version.source_version_id
    assert len({entry["evidenceId"] for entry in evidence}) == 12
    assert evidence == qa._build_evidence(personal_db, [item], query=question)


def test_startup_recovers_interrupted_answer_and_rejects_duplicate_question(personal_db, monkeypatch):
    add_snapshot(personal_db)
    answer = make_answer(personal_db, "refund deadline")
    with pytest.raises(ValueError, match="生成"):
        qa.submit_question(personal_db, answer.conversation_id, "Another question")
    qa.mark_interrupted_answers()
    personal_db.expire_all()
    failed = personal_db.get(Answer, answer.answer_id)
    assert failed.status == "failed" and failed.error_code == "answer_interrupted"
    detail = qa.get_conversation(personal_db, answer.conversation_id)
    assert detail["messages"][-1]["answer"]["error"]["retryable"]
    scheduled = []
    monkeypatch.setattr(qa, "_schedule_answer", scheduled.append)
    result = qa.retry_answer(personal_db, answer.answer_id)
    assert result["answerId"] in scheduled
    with pytest.raises(ValueError, match="生成"):
        qa.retry_answer(personal_db, answer.answer_id)


@pytest.mark.asyncio
async def test_stop_answer_persists_failure_and_terminal_event(personal_db, monkeypatch):
    add_snapshot(personal_db)
    version = add_source(personal_db, "SRC-STOP", "A supported refund deadline.")
    item = add_knowledge(personal_db, "KS-OLD", "K-STOP", "Refund", [version])
    answer = make_answer(personal_db, "refund deadline")
    started = asyncio.Event()

    class SlowClient:
        model_id = "offline"

        async def stream_answer(self, **kwargs):
            started.set()
            yield "Unfinished content"
            await asyncio.Event().wait()

    monkeypatch.setattr(qa, "search_knowledge", lambda *args, **kwargs: [item])
    monkeypatch.setattr(qa, "get_client", lambda *args, **kwargs: (
        SimpleNamespace(profile_id="offline", model_id="offline"), SlowClient(),
    ))
    qa._schedule_answer(answer.answer_id)
    await asyncio.wait_for(started.wait(), timeout=2)
    result = await qa.cancel_answer(answer.answer_id)
    assert result["status"] == "failed" and result["error"]["code"] == "answer_cancelled"
    assert result["content"] == "" and result["citations"] == []
    personal_db.expire_all()
    events = personal_db.scalars(select(AnswerEvent).where(
        AnswerEvent.answer_id == answer.answer_id,
    ).order_by(AnswerEvent.sequence)).all()
    assert events[-1].event_type == "error"
    assert len({event.sequence for event in events}) == len(events)
    assert (await qa.cancel_answer(answer.answer_id)) == result
