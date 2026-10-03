from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, delete, event, func, select, text
from sqlalchemy.orm import sessionmaker

from app.core.config import PERSONAL_PROJECT_ID, REPO_ROOT
from app.db.models import (
    Answer,
    AnswerEvent,
    Base,
    CompileRun,
    Conversation,
    Evidence,
    KnowledgeItem,
    Message,
    ModelProfile,
    Project,
    Snapshot,
    Source,
    SourceVersion,
)
from app.services import compilation, knowledge, project_backup, seed
from app.services.seed import PROJECT_ID, rebuild_search_index


@pytest.fixture
def backup_db(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'backup.db'}")
    event.listen(engine, "connect", lambda db, _: db.execute("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE VIRTUAL TABLE knowledge_search USING fts5("
            "snapshot_id UNINDEXED, knowledge_id UNINDEXED, title, summary, markdown, "
            "tokenize='trigram')"
        ))
    monkeypatch.setattr(project_backup, "get_settings", lambda: SimpleNamespace(data_dir=tmp_path))
    with sessionmaker(engine, expire_on_commit=False)() as session:
        session.add(Project(project_id=PROJECT_ID, name="Personal backup"))
        session.add(ModelProfile(
            profile_id="local-profile", name="Local", base_url="https://example.org",
            model_id="private-model", credential_ref="secret-credential-reference",
        ))
        session.flush()
        session.add(Source(
            source_id="SRC-1", project_id=PROJECT_ID, title="Refund",
            filename="refund.md", current_version_id="SV-1",
        ))
        session.flush()
        original = tmp_path / "refund.md"
        original.write_bytes(b"Refund deadline is thirty days.")
        import hashlib
        session.add(SourceVersion(
            source_version_id="SV-1", source_id="SRC-1", version="1",
            content_sha256=hashlib.sha256(original.read_bytes()).hexdigest(),
            original_path=str(original), original_filename="refund.md",
            size_bytes=original.stat().st_size, extracted_text=original.read_text(),
        ))
        session.add(Snapshot(snapshot_id="KS-1", project_id=PROJECT_ID, version="1"))
        session.flush()
        session.get(Project, PROJECT_ID).current_snapshot_id = "KS-1"
        session.add(Evidence(
            evidence_id="E-1", source_id="SRC-1", source_version_id="SV-1",
            path=str(original), quote=original.read_text(), char_start=0, char_end=30,
        ))
        session.add(KnowledgeItem(
            snapshot_id="KS-1", knowledge_id="K-1", slug="refund", title="Refund",
            type="rule", domain="other", summary="Refund deadline", markdown="# Refund",
            source_ids=["SRC-1"], source_version_ids=["SV-1"], evidence_ids=["E-1"],
        ))
        session.commit()
        rebuild_search_index(session)
        yield session, tmp_path
    engine.dispose()


def rewrite_package(package, change):
    with zipfile.ZipFile(io.BytesIO(package)) as archive:
        files = {name: archive.read(name) for name in archive.namelist()}
    change(files)
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return output.getvalue()


def test_roundtrip_retains_evidence_and_excludes_local_secrets(backup_db):
    session, root = backup_db
    package = project_backup.export_project(session)
    with zipfile.ZipFile(io.BytesIO(package)) as archive:
        manifest = archive.read("project.json")
        assert b"secret-credential-reference" not in manifest
        assert b"private-model" not in manifest
        assert str(root).encode() not in manifest
    summary = project_backup.inspect_package(package)
    assert summary["sourceCount"] == 1 and summary["knowledgeCount"] == 1
    session.get(Source, "SRC-1").title = "Changed since export"
    session.commit()
    project_backup.restore_project(session, package)
    session.expire_all()
    assert session.get(Source, "SRC-1").title == "Refund"
    version = session.get(SourceVersion, "SV-1")
    assert Path(version.original_path).is_relative_to(root)
    assert Path(version.original_path).read_bytes() == b"Refund deadline is thirty days."
    assert session.get(Evidence, "E-1").path == version.original_path
    assert session.get(ModelProfile, "local-profile").credential_ref == "secret-credential-reference"
    assert session.scalar(text("SELECT count(*) FROM knowledge_search")) == 1


@pytest.mark.parametrize("damage", [
    "hash", "path", "reference", "schema", "duplicate", "provenance", "span", "date",
])
def test_invalid_package_leaves_project_and_originals_unchanged(backup_db, damage):
    session, root = backup_db
    package = project_backup.export_project(session)

    def change(files):
        manifest = json.loads(files["project.json"])
        if damage == "hash":
            files[next(name for name in files if name.startswith("originals/"))] = b"tampered"
        elif damage == "path":
            files["../../outside.txt"] = b"untrusted"
        elif damage == "reference":
            manifest["tables"]["knowledge_items"][0]["evidence_ids"] = ["E-MISSING"]
        elif damage == "schema":
            manifest["formatVersion"] = 999
        elif damage == "duplicate":
            manifest["tables"]["sources"].append(manifest["tables"]["sources"][0])
        elif damage == "provenance":
            manifest["tables"]["knowledge_items"][0]["source_ids"] = []
        elif damage == "span":
            manifest["tables"]["source_versions"][0]["page_spans"] = [{"pageNumber": "one"}]
        else:
            manifest["exportedAt"] = "not-a-date"
        files["project.json"] = json.dumps(manifest).encode()

    broken = rewrite_package(package, change)
    with pytest.raises(ValueError):
        project_backup.restore_project(session, broken)
    assert session.get(Source, "SRC-1").title == "Refund"
    assert (root / "refund.md").read_bytes() == b"Refund deadline is thirty days."
    assert not (root.parent / "outside.txt").exists()


def test_restore_rolls_back_when_search_rebuild_fails(backup_db, monkeypatch):
    session, _ = backup_db
    package = project_backup.export_project(session)
    session.get(Source, "SRC-1").title = "Current title"
    session.commit()

    def fail(*args, **kwargs):
        raise RuntimeError("Search rebuild failed")

    monkeypatch.setattr(project_backup, "rebuild_search_index", fail)
    with pytest.raises(RuntimeError):
        project_backup.restore_project(session, package)
    session.expire_all()
    assert session.get(Source, "SRC-1").title == "Current title"


def test_restore_and_export_reject_active_answers(backup_db):
    session, _ = backup_db
    package = project_backup.export_project(session)
    session.add(Conversation(conversation_id="C-1", project_id=PROJECT_ID, title="Question"))
    session.flush()
    session.add(Message(message_id="M-1", conversation_id="C-1", role="user", content="Refund"))
    session.flush()
    session.add(Answer(
        answer_id="A-1", conversation_id="C-1", question_message_id="M-1",
        snapshot_id="KS-1", status="generating",
    ))
    session.commit()
    for action in (lambda: project_backup.restore_project(session, package),
                   lambda: project_backup.export_project(session)):
        with pytest.raises(ValueError, match="结束"):
            action()
    assert session.scalar(select(Answer.answer_id)) == "A-1"


def add_review_candidate(session):
    session.add(CompileRun(
        run_id="RUN-REVIEW", project_id=PROJECT_ID, status="awaiting_review",
        source_version_ids=["SV-1"],
        candidate={
            "baseSnapshotId": "KS-1", "refreshedSourceIds": ["SRC-1"],
            "knowledgeItems": [{
                "knowledgeId": "K-1", "slug": "refund", "title": "Refund",
                "type": "rule", "domain": "other", "summary": "Refund deadline",
                "markdown": "# Refund\n\nThirty days.", "reviewStatus": "accepted",
                "sourceIds": ["SRC-1"], "sourceVersionIds": ["SV-1"],
                "evidenceIds": ["E-1"], "changeType": "updated",
            }],
            "relations": [],
        },
    ))
    session.commit()


def test_restored_review_can_publish_without_a_model_call(backup_db):
    session, _ = backup_db
    add_review_candidate(session)
    package = project_backup.export_project(session)
    project_backup.restore_project(session, package)
    result = compilation.accept_run(session, "RUN-REVIEW")
    assert session.get(Project, PROJECT_ID).current_snapshot_id == result["snapshotId"]
    item = session.scalar(select(KnowledgeItem).where(
        KnowledgeItem.snapshot_id == result["snapshotId"],
    ))
    assert item.evidence_ids == ["E-1"] and "Thirty days" in item.markdown


def add_compile_checkpoint(session):
    payload = {
        "knowledge_items": [{
            "title": "Refund deadline", "domain": "other",
            "summary": "Refund deadline is thirty days.",
            "markdown": "# Refund deadline\n\nRefund deadline is thirty days.",
            "evidence_ids": ["E-1"],
        }],
        "relations": [],
    }
    session.add(CompileRun(
        run_id="RUN-CHECKPOINT", project_id=PROJECT_ID, status="failed",
        source_version_ids=["SV-1"],
        candidate={"knowledgeItems": [], "relations": [], "checkpoint": {
            "signature": "a" * 64,
            "completed": {"0": {"result": payload, "sha256": compilation._payload_digest(payload)}},
        }},
    ))
    session.commit()


def test_project_roundtrip_preserves_private_compile_checkpoint(backup_db):
    session, _ = backup_db
    add_compile_checkpoint(session)
    before = session.get(CompileRun, "RUN-CHECKPOINT").candidate
    package = project_backup.export_project(session)
    project_backup.restore_project(session, package)
    session.expire_all()
    assert session.get(CompileRun, "RUN-CHECKPOINT").candidate == before
    assert compilation.review_view(session, "RUN-CHECKPOINT")["knowledgeItems"] == []


@pytest.mark.parametrize("damage", ["shape", "hash", "reference", "endpoint"])
def test_invalid_compile_checkpoint_is_rejected_before_restore(backup_db, damage):
    session, _ = backup_db
    add_compile_checkpoint(session)
    package = project_backup.export_project(session)

    def change(files):
        manifest = json.loads(files["project.json"])
        checkpoint = manifest["tables"]["compile_runs"][0]["candidate"]["checkpoint"]
        saved = checkpoint["completed"]["0"]
        if damage == "shape":
            checkpoint["completed"] = []
        elif damage == "hash":
            saved["sha256"] = "b" * 64
        else:
            if damage == "reference":
                saved["result"]["knowledge_items"][0]["evidence_ids"] = ["E-MISSING"]
            else:
                saved["result"]["relations"] = [{
                    "source_title": "Missing title", "target_title": "Refund deadline",
                    "type": "supports", "evidence_ids": ["E-1"],
                }]
            saved["sha256"] = compilation._payload_digest(saved["result"])
        files["project.json"] = json.dumps(manifest).encode()

    with pytest.raises(ValueError):
        project_backup.inspect_package(rewrite_package(package, change))
    assert session.get(CompileRun, "RUN-CHECKPOINT").candidate["knowledgeItems"] == []


@pytest.mark.parametrize("damage", ["title", "duplicate", "shape", "context"])
def test_invalid_nested_records_are_rejected_before_restore(backup_db, damage):
    session, _ = backup_db
    add_review_candidate(session)
    session.add(Conversation(
        conversation_id="C-1", project_id=PROJECT_ID, context_knowledge_ids=["K-1"],
    ))
    session.commit()
    package = project_backup.export_project(session)

    def change(files):
        manifest = json.loads(files["project.json"])
        candidate = manifest["tables"]["compile_runs"][0]["candidate"]
        if damage == "title":
            candidate["knowledgeItems"][0]["title"] = {"invalid": "title"}
        elif damage == "duplicate":
            candidate["knowledgeItems"].append(candidate["knowledgeItems"][0])
        elif damage == "shape":
            candidate["knowledgeItems"] = {}
        else:
            manifest["tables"]["conversations"][0]["context_knowledge_ids"] = "K-1"
        files["project.json"] = json.dumps(manifest).encode()

    with pytest.raises(ValueError):
        project_backup.inspect_package(rewrite_package(package, change))
    assert session.get(CompileRun, "RUN-REVIEW").status == "awaiting_review"


def test_terminal_answer_events_cannot_change_saved_citations(backup_db):
    session, _ = backup_db
    session.add(Conversation(conversation_id="C-1", project_id=PROJECT_ID))
    session.flush()
    session.add(Message(message_id="M-1", conversation_id="C-1", role="user", content="Refund"))
    session.flush()
    answer = Answer(
        answer_id="A-1", conversation_id="C-1", question_message_id="M-1",
        snapshot_id="KS-1", status="failed", error_code="answer_cancelled",
        error_message="Stopped",
    )
    session.add(answer)
    session.flush()
    session.add(AnswerEvent(
        answer_id="A-1", sequence=1, event_type="error", payload=knowledge.answer_view(answer),
    ))
    session.commit()
    package = project_backup.export_project(session)

    def change(files):
        manifest = json.loads(files["project.json"])
        manifest["tables"]["answer_events"][0]["payload"]["citations"] = [
            {"evidenceId": "E-MISSING", "quote": "untrusted"}
        ]
        files["project.json"] = json.dumps(manifest).encode()

    with pytest.raises(ValueError):
        project_backup.inspect_package(rewrite_package(package, change))


def test_full_fixture_roundtrip_remaps_project_and_preserves_all_versions(backup_db, monkeypatch):
    session, root = backup_db
    for model in reversed(project_backup.MODELS):
        session.execute(delete(model))
    session.commit()
    monkeypatch.setattr(seed, "get_settings", lambda: SimpleNamespace(
        data_dir=root, fixture_dir=REPO_ROOT / "fixtures" / "enterprise-customer-service",
        deepseek_base_url="https://example.org", deepseek_model="offline", deepseek_api_key="",
    ))
    seed.seed_if_needed(session)
    counts = {model.__tablename__: session.scalar(select(func.count()).select_from(model))
              for model in project_backup.MODELS}
    package = project_backup.export_project(session)
    summary = project_backup.inspect_package(package)
    assert summary["sourceCount"] == 66 and summary["sourceVersionCount"] == 72
    for model in reversed(project_backup.MODELS):
        session.execute(delete(model))
    session.add(Project(project_id=PERSONAL_PROJECT_ID, name="Empty personal project"))
    session.commit()
    project_backup.restore_project(session, package)
    monkeypatch.setattr(knowledge, "get_settings", lambda: SimpleNamespace(testing=False))
    assert knowledge.graph_projection(session)["counts"] == {"nodes": 150, "edges": 450}
    assert knowledge.current_project(session).project_id == PERSONAL_PROJECT_ID
    assert {model.__tablename__: session.scalar(select(func.count()).select_from(model))
            for model in project_backup.MODELS} == counts
    for version in session.scalars(select(SourceVersion)):
        assert Path(version.original_path).is_file()
