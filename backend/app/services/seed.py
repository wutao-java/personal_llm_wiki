from __future__ import annotations

import hashlib
import json
import shutil
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import (
    AppPreference,
    Evidence,
    KnowledgeItem,
    ModelProfile,
    Project,
    Relation,
    Snapshot,
    Source,
    SourceVersion,
    SuggestedQuestion,
)

PROJECT_ID = "PROJECT-RETAIL-SERVICE-KNOWLEDGE"
DEFAULT_SNAPSHOT_ID = "KS-RETAIL-SERVICE-1.1"
SEED_VERSION = "1.0.4"


def _read_json(path: Path) -> dict | list:
    return json.loads(path.read_text(encoding="utf-8"))


def _parse_datetime(value: str | None) -> datetime:
    if not value:
        return datetime.now(UTC)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed


def _strip_frontmatter(markdown: str) -> str:
    if not markdown.startswith("---\n"):
        return markdown
    marker = markdown.find("\n---\n", 4)
    return markdown[marker + 5 :].lstrip() if marker >= 0 else markdown


def _validate_manifest(fixture_dir: Path, manifest: dict) -> None:
    for item in manifest["files"]:
        path = fixture_dir / item["path"]
        if not path.is_file():
            raise RuntimeError(f"内置资料缺失：{item['path']}")
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != item["sha256"]:
            raise RuntimeError(f"内置资料校验失败：{item['sourceVersionId']}")


def seed_if_needed(session: Session) -> dict:
    settings = get_settings()
    fixture_dir = settings.fixture_dir
    manifest = _read_json(fixture_dir / "corpus-manifest.json")
    assert isinstance(manifest, dict)
    _validate_manifest(fixture_dir, manifest)

    existing = session.get(Project, PROJECT_ID)
    if existing and existing.seeded_version == SEED_VERSION:
        return {
            "seeded": False,
            "projectId": PROJECT_ID,
            "snapshotId": existing.current_snapshot_id,
        }
    if existing:
        raise RuntimeError("检测到不完整的内置知识项目，请在开发数据目录中恢复后再启动")

    project = Project(
        project_id=PROJECT_ID,
        name="连锁零售企业客户服务与知识运营",
        seeded_version=SEED_VERSION,
    )
    session.add(project)
    session.flush()

    sources: dict[str, Source] = {}
    runtime_sources = settings.data_dir / "sources"
    for item in manifest["files"]:
        source_id = item["sourceId"]
        source = sources.get(source_id)
        if source is None:
            source = Source(
                source_id=source_id,
                project_id=PROJECT_ID,
                title=item["title"],
                filename=Path(item["path"]).name,
                domain=item["domain"],
                document_type="markdown",
                status="ready",
            )
            sources[source_id] = source
            session.add(source)

        source_path = fixture_dir / item["path"]
        stored_dir = runtime_sources / source_id / item["sourceVersionId"]
        stored_dir.mkdir(parents=True, exist_ok=True)
        stored_path = stored_dir / "original.md"
        shutil.copyfile(source_path, stored_path)
        content = source_path.read_text(encoding="utf-8")
        session.add(
            SourceVersion(
                source_version_id=item["sourceVersionId"],
                source_id=source_id,
                version=item["version"],
                content_sha256=item["sha256"],
                original_path=str(stored_path),
                original_filename=Path(item["path"]).name,
                mime_type="text/markdown",
                size_bytes=item["bytes"],
                extracted_text=content,
                supersedes=item.get("supersedes"),
                status="ready",
            )
        )
        source.current_version_id = item["sourceVersionId"]
        source.filename = Path(item["path"]).name
        source.updated_at = datetime.now(UTC)

    evidence_seen: set[str] = set()
    knowledge_source_counts: Counter[str] = Counter()
    for filename in ("knowledge-snapshot-v1.0.json", "knowledge-snapshot-v1.1.json"):
        payload = _read_json(fixture_dir / "preset" / filename)
        assert isinstance(payload, dict)
        snapshot = Snapshot(
            snapshot_id=payload["snapshotId"],
            project_id=payload["projectId"],
            version=payload["version"],
            status=payload["status"],
            compiled_by=payload["compiledBy"],
            source_version_count=payload["counts"]["sourceVersions"],
            knowledge_count=payload["counts"]["knowledgeItems"],
            relation_count=payload["counts"]["relations"],
            evidence_count=payload["counts"]["evidenceFragments"],
            accepted_at=_parse_datetime(payload["acceptedAt"]),
        )
        session.add(snapshot)
        session.flush()

        for evidence in payload["evidenceFragments"]:
            if evidence["evidenceId"] in evidence_seen:
                continue
            evidence_seen.add(evidence["evidenceId"])
            session.add(
                Evidence(
                    evidence_id=evidence["evidenceId"],
                    source_id=evidence["sourceId"],
                    source_version_id=evidence["sourceVersionId"],
                    kind=evidence["kind"],
                    path=evidence["path"],
                    char_start=evidence["charStart"],
                    char_end=evidence["charEnd"],
                    quote=evidence["quote"],
                )
            )

        for item in payload["knowledgeItems"]:
            markdown_path = fixture_dir / item["markdownPath"]
            markdown = _strip_frontmatter(markdown_path.read_text(encoding="utf-8"))
            session.add(
                KnowledgeItem(
                    snapshot_id=payload["snapshotId"],
                    knowledge_id=item["knowledgeId"],
                    slug=item["slug"],
                    title=item["title"],
                    type=item["type"],
                    domain=item["domain"],
                    summary=item["summary"],
                    markdown=markdown,
                    review_status=item["reviewStatus"],
                    source_ids=item["sourceIds"],
                    source_version_ids=item["sourceVersionIds"],
                    evidence_ids=item["evidenceIds"],
                    updated_at=_parse_datetime(item["updatedAt"]),
                )
            )
            if payload["snapshotId"] == DEFAULT_SNAPSHOT_ID:
                knowledge_source_counts.update(item["sourceIds"])

        for relation in payload["relations"]:
            session.add(
                Relation(
                    snapshot_id=payload["snapshotId"],
                    relation_id=relation["relationId"],
                    source_knowledge_id=relation["sourceKnowledgeId"],
                    target_knowledge_id=relation["targetKnowledgeId"],
                    type=relation["type"],
                    directed=relation["directed"],
                    weight=relation["weight"],
                    evidence_ids=relation["evidenceIds"],
                    review_status=relation["reviewStatus"],
                )
            )

        for question in payload["suggestedQuestions"]:
            session.add(
                SuggestedQuestion(
                    question_id=question["questionId"],
                    snapshot_id=payload["snapshotId"],
                    text=question["text"],
                    related_knowledge_ids=question["relatedKnowledgeIds"],
                    generated_at=snapshot.accepted_at,
                )
            )

    for source_id, source in sources.items():
        source.knowledge_count = knowledge_source_counts[source_id]

    project.current_snapshot_id = DEFAULT_SNAPSHOT_ID
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
    session.add(
        AppPreference(
            preference_id="default",
            theme_preference="dark",
            reduce_motion=False,
            default_model_profile_id="deepseek-default",
        )
    )
    session.commit()
    rebuild_search_index(session)
    return {"seeded": True, "projectId": PROJECT_ID, "snapshotId": DEFAULT_SNAPSHOT_ID}


def rebuild_search_index(
    session: Session, snapshot_id: str | None = None, *, commit: bool = True
) -> None:
    if snapshot_id:
        session.execute(
            text("DELETE FROM knowledge_search WHERE snapshot_id = :snapshot_id"),
            {"snapshot_id": snapshot_id},
        )
        items = session.scalars(
            select(KnowledgeItem).where(KnowledgeItem.snapshot_id == snapshot_id)
        ).all()
    else:
        session.execute(text("DELETE FROM knowledge_search"))
        items = session.scalars(select(KnowledgeItem)).all()
    for item in items:
        session.execute(
            text(
                "INSERT INTO knowledge_search "
                "(knowledge_id, snapshot_id, title, summary, markdown) "
                "VALUES (:knowledge_id, :snapshot_id, :title, :summary, :markdown)"
            ),
            {
                "knowledge_id": item.knowledge_id,
                "snapshot_id": item.snapshot_id,
                "title": item.title,
                "summary": item.summary,
                "markdown": item.markdown,
            },
        )
    if commit:
        session.commit()


def clear_all_data(session: Session) -> None:
    for model in (
        SuggestedQuestion,
        Relation,
        KnowledgeItem,
        Evidence,
        Snapshot,
        SourceVersion,
        Source,
        ModelProfile,
        AppPreference,
        Project,
    ):
        session.execute(delete(model))
    session.execute(text("DELETE FROM knowledge_search"))
    session.commit()
