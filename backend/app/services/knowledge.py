from __future__ import annotations

import hashlib
import re
import uuid
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.core.config import PERSONAL_PROJECT_ID, get_settings
from app.db.models import (
    Answer,
    AppPreference,
    CompileRun,
    Conversation,
    Evidence,
    KnowledgeItem,
    Message,
    ModelProfile,
    Project,
    Relation,
    Snapshot,
    Source,
    SourceVersion,
    SuggestedQuestion,
)
from app.services.seed import PROJECT_ID, rebuild_search_index

DOMAIN_META = [
    {"id": "project", "name": "项目与角色", "en": "PROJECT", "color": "#0891b2"},
    {"id": "catalog", "name": "商品与库存", "en": "CATALOG", "color": "#d97706"},
    {"id": "order", "name": "订单与支付", "en": "ORDER", "color": "#d946ef"},
    {"id": "fulfillment", "name": "履约与售后", "en": "FULFILLMENT", "color": "#65a30d"},
    {"id": "service", "name": "客户服务", "en": "SERVICE", "color": "#3b82f6"},
    {"id": "knowledge", "name": "知识与模型", "en": "KNOWLEDGE", "color": "#ea580c"},
    {"id": "system", "name": "系统与接口", "en": "SYSTEM", "color": "#0d9488"},
    {"id": "quality", "name": "质量、安全与运营", "en": "QUALITY", "color": "#f43f5e"},
]
PERSONAL_COLORS = ("#0891b2", "#d97706", "#65a30d", "#d946ef", "#3b82f6", "#ef4444")
PERSONAL_NAMES = {"java": "Java", "python": "Python", "agent": "Agent", "knowledge": "知识"}


def personal_domain_meta(domains: set[str]) -> list[dict]:
    return [
        {
            "id": domain,
            "name": PERSONAL_NAMES.get(domain.casefold(), domain),
            "en": domain.upper(),
            "color": PERSONAL_COLORS[index % len(PERSONAL_COLORS)],
            "index": index,
        }
        for index, domain in enumerate(sorted(domains, key=str.casefold))
    ]


def iso(value: datetime | None) -> str | None:
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat()


def current_project(session: Session) -> Project:
    settings = get_settings()
    project_id = PROJECT_ID if settings.testing and settings.seed_fixture else PERSONAL_PROJECT_ID
    project = session.get(Project, project_id)
    if not project:
        raise LookupError("知识项目尚未初始化")
    return project


def published_snapshot(session: Session) -> Snapshot | None:
    project = current_project(session)
    return session.get(Snapshot, project.current_snapshot_id) if project.current_snapshot_id else None


def current_snapshot(session: Session) -> Snapshot:
    snapshot = published_snapshot(session)
    if not snapshot:
        raise LookupError("当前没有已发布的知识版本")
    return snapshot


def snapshot_summary(snapshot: Snapshot | None) -> dict | None:
    if not snapshot:
        return None
    return {
        "snapshotId": snapshot.snapshot_id,
        "version": snapshot.version,
        "status": snapshot.status,
        "acceptedAt": iso(snapshot.accepted_at),
        "knowledgeCount": snapshot.knowledge_count,
        "relationCount": snapshot.relation_count,
        "evidenceCount": snapshot.evidence_count,
        "sourceVersionCount": snapshot.source_version_count,
        "modelId": snapshot.model_id,
    }


def compile_run_view(run: CompileRun) -> dict:
    return {
        "runId": run.run_id,
        "status": run.status,
        "stage": run.stage,
        "sourceVersionIds": run.source_version_ids,
        "counts": run.counts or {},
        "issues": run.issues or [],
        "modelId": run.model_id,
        "publishedSnapshotId": run.published_snapshot_id,
        "error": (
            {"code": run.error_code, "message": run.error_message, "retryable": True}
            if run.error_code
            else None
        ),
        "createdAt": iso(run.created_at),
        "updatedAt": iso(run.updated_at),
    }


def bootstrap_view(session: Session) -> dict:
    project = current_project(session)
    snapshot = (
        session.get(Snapshot, project.current_snapshot_id) if project.current_snapshot_id else None
    )
    preference = session.get(AppPreference, "default")
    profile = session.get(ModelProfile, preference.default_model_profile_id) if preference else None
    active_runs = session.scalars(
        select(CompileRun)
        .where(CompileRun.status.in_(["queued", "running", "awaiting_review", "publishing"]))
        .order_by(CompileRun.created_at.desc())
    ).all()
    recent = session.scalars(
        select(Conversation).order_by(Conversation.updated_at.desc()).limit(12)
    ).all()
    source_count = session.scalar(
        select(func.count()).select_from(Source).where(Source.status != "removed")
    ) or 0
    version_count = session.scalar(
        select(func.count()).select_from(SourceVersion)
        .join(Source, Source.source_id == SourceVersion.source_id)
        .where(Source.status != "removed")
    ) or 0
    return {
        "productName": "FF - LLM Wiki知识库",
        "attribution": "@2026 赋范空间 独家自研",
        "project": {
            "projectId": project.project_id,
            "name": project.name,
            "sourceCount": source_count,
            "sourceVersionCount": version_count,
            "seededVersion": project.seeded_version,
        },
        "snapshot": snapshot_summary(snapshot),
        "appearance": appearance_view(preference),
        "model": model_profile_view(profile),
        "activeCompileRuns": [compile_run_view(run) for run in active_runs],
        "recentConversations": [conversation_view(item) for item in recent],
    }


def source_view(source: Source, version_count: int | None = None) -> dict:
    return {
        "sourceId": source.source_id,
        "title": source.title,
        "filename": source.filename,
        "domain": source.domain,
        "documentType": source.document_type,
        "currentVersionId": source.current_version_id,
        "versionCount": version_count,
        "status": source.status,
        "knowledgeCount": source.knowledge_count,
        "importedAt": iso(source.imported_at),
        "updatedAt": iso(source.updated_at),
    }


def list_sources(
    session: Session,
    *,
    query: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 30,
) -> dict:
    conditions = [Source.status != "removed"]
    if query:
        term = f"%{query.strip()}%"
        conditions.append(or_(Source.title.like(term), Source.filename.like(term)))
    if status:
        conditions.append(Source.status == status)
    statement = select(Source)
    count_statement = select(func.count()).select_from(Source)
    for condition in conditions:
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    total = session.scalar(count_statement) or 0
    sources = session.scalars(
        statement.order_by(Source.updated_at.desc(), Source.source_id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    version_counts = dict(
        session.execute(
            select(SourceVersion.source_id, func.count(SourceVersion.source_version_id))
            .where(SourceVersion.source_id.in_([item.source_id for item in sources] or [""]))
            .group_by(SourceVersion.source_id)
        ).all()
    )
    return {
        "items": [source_view(item, version_counts.get(item.source_id, 0)) for item in sources],
        "page": page,
        "pageSize": page_size,
        "total": total,
    }


def source_detail(session: Session, source_id: str) -> dict:
    source = session.get(Source, source_id)
    if not source:
        raise LookupError("资料不存在")
    versions = session.scalars(
        select(SourceVersion)
        .where(SourceVersion.source_id == source_id)
        .order_by(SourceVersion.created_at.desc(), SourceVersion.version.desc())
    ).all()
    payload = source_view(source, len(versions))
    payload["versions"] = [source_version_view(item, include_content=False) for item in versions]
    return payload


def remove_source(session: Session, source_id: str) -> dict:
    project = current_project(session)
    source = session.get(Source, source_id)
    if not source or source.project_id != project.project_id:
        raise LookupError("资料不存在")
    if source.status == "removed":
        raise ValueError("资料已移出")
    active = session.scalar(
        select(CompileRun.run_id).where(
            CompileRun.project_id == project.project_id,
            CompileRun.status.in_(["queued", "running", "publishing", "awaiting_review"]),
        ).limit(1)
    )
    if active:
        raise ValueError("请先完成或取消进行中的处理任务，再移出资料")

    previous = published_snapshot(session)
    current_items = session.scalars(
        select(KnowledgeItem).where(KnowledgeItem.snapshot_id == previous.snapshot_id)
    ).all() if previous else []
    retained = [item for item in current_items if source_id not in (item.source_ids or [])]
    removed_ids = {item.knowledge_id for item in current_items if item not in retained}
    old_relations = session.scalars(
        select(Relation).where(Relation.snapshot_id == previous.snapshot_id)
    ).all() if previous else []
    excluded_evidence = set(session.scalars(
        select(Evidence.evidence_id).where(Evidence.source_id == source_id)
    ).all())
    relations = [
        item for item in old_relations
        if item.source_knowledge_id not in removed_ids
        and item.target_knowledge_id not in removed_ids
        and not excluded_evidence.intersection(item.evidence_ids or [])
    ]
    now = datetime.now(UTC)
    snapshot_id = None
    if previous and (len(retained) != len(current_items) or len(relations) != len(old_relations)):
        if retained:
            snapshot_id = f"KS-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8].upper()}"
            snapshot = Snapshot(
                snapshot_id=snapshot_id, project_id=project.project_id,
                version=now.strftime("%Y.%m.%d.%H%M"), status="accepted",
                compiled_by={"provider": "资料管理"}, model_id=previous.model_id,
                source_version_count=len({
                    version for item in retained for version in (item.source_version_ids or [])
                }),
                knowledge_count=len(retained), relation_count=len(relations),
                evidence_count=len({
                    evidence for item in retained for evidence in (item.evidence_ids or [])
                } | {
                    evidence for relation in relations for evidence in (relation.evidence_ids or [])
                }),
                accepted_at=now,
            )
            session.add(snapshot)
            session.flush()
            session.add_all([
                KnowledgeItem(
                    snapshot_id=snapshot_id, knowledge_id=item.knowledge_id, slug=item.slug,
                    title=item.title, type=item.type, domain=item.domain, summary=item.summary,
                    markdown=item.markdown, review_status=item.review_status,
                    source_ids=item.source_ids, source_version_ids=item.source_version_ids,
                    evidence_ids=item.evidence_ids, updated_at=item.updated_at,
                ) for item in retained
            ])
            session.add_all([
                Relation(
                    snapshot_id=snapshot_id, relation_id=item.relation_id,
                    source_knowledge_id=item.source_knowledge_id,
                    target_knowledge_id=item.target_knowledge_id, type=item.type,
                    directed=item.directed, weight=item.weight,
                    evidence_ids=item.evidence_ids, review_status=item.review_status,
                ) for item in relations
            ])
            session.flush()
            rebuild_search_index(session, snapshot_id, commit=False)
        project.current_snapshot_id = snapshot_id
    knowledge_counts = Counter(
        retained_source_id for item in retained for retained_source_id in (item.source_ids or [])
    )
    for remaining_source in session.scalars(
        select(Source).where(Source.project_id == project.project_id, Source.status != "removed")
    ):
        remaining_source.knowledge_count = knowledge_counts[remaining_source.source_id]
    source.status = "removed"
    source.knowledge_count = 0
    source.updated_at = now
    session.commit()
    return {
        "sourceId": source_id,
        "snapshotId": project.current_snapshot_id,
        "removedKnowledgeCount": len(removed_ids),
        "removedRelationCount": len(old_relations) - len(relations),
    }


def source_version_view(version: SourceVersion, *, include_content: bool) -> dict:
    payload = {
        "sourceVersionId": version.source_version_id,
        "sourceId": version.source_id,
        "version": version.version,
        "filename": version.original_filename,
        "mimeType": version.mime_type,
        "sizeBytes": version.size_bytes,
        "sha256": version.content_sha256,
        "pageSpans": version.page_spans or [],
        "blockSpans": version.block_spans or [],
        "supersedes": version.supersedes,
        "status": version.status,
        "createdAt": iso(version.created_at),
    }
    if include_content:
        payload["content"] = version.extracted_text
        payload["readOnly"] = True
    return payload


def source_original_file(session: Session, source_version_id: str) -> SourceVersion:
    version = session.get(SourceVersion, source_version_id)
    source = session.get(Source, version.source_id) if version else None
    if not source or source.project_id != current_project(session).project_id:
        raise LookupError("资料版本不存在")
    path = Path(version.original_path).resolve()
    if not path.is_relative_to(get_settings().data_dir.resolve()) or not path.is_file():
        raise LookupError("资料原件不可访问")
    if hashlib.sha256(path.read_bytes()).hexdigest() != version.content_sha256:
        raise ValueError("资料原件校验失败")
    return version


def source_version_content(session: Session, source_version_id: str) -> dict:
    version = session.get(SourceVersion, source_version_id)
    if not version:
        raise LookupError("资料版本不存在")
    payload = source_version_view(version, include_content=True)
    source = session.get(Source, version.source_id)
    payload["title"] = source.title if source else version.original_filename
    return payload


def list_knowledge(
    session: Session,
    *,
    query: str | None = None,
    domain: str | None = None,
    knowledge_type: str | None = None,
    page: int = 1,
    page_size: int = 36,
) -> dict:
    snapshot = published_snapshot(session)
    if not snapshot:
        return {
            "snapshotId": None,
            "items": [],
            "domains": [],
            "page": page,
            "pageSize": page_size,
            "total": 0,
        }
    conditions = [KnowledgeItem.snapshot_id == snapshot.snapshot_id]
    if query:
        term = f"%{query.strip()}%"
        conditions.append(or_(
            KnowledgeItem.title.like(term), KnowledgeItem.summary.like(term), KnowledgeItem.markdown.like(term),
        ))
    if domain:
        conditions.append(KnowledgeItem.domain == domain)
    if knowledge_type:
        conditions.append(KnowledgeItem.type == knowledge_type)
    total = session.scalar(select(func.count()).select_from(KnowledgeItem).where(*conditions)) or 0
    items = session.scalars(
        select(KnowledgeItem)
        .where(*conditions)
        .order_by(KnowledgeItem.updated_at.desc(), KnowledgeItem.title)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    domains = (
        DOMAIN_META
        if snapshot.project_id == PROJECT_ID
        else personal_domain_meta(
            set(
                session.scalars(
                    select(KnowledgeItem.domain)
                    .where(KnowledgeItem.snapshot_id == snapshot.snapshot_id)
                    .distinct()
                ).all()
            )
        )
    )
    return {
        "snapshotId": snapshot.snapshot_id,
        "items": [knowledge_summary(item) for item in items],
        "domains": domains,
        "page": page,
        "pageSize": page_size,
        "total": total,
    }


def knowledge_summary(item: KnowledgeItem) -> dict:
    return {
        "knowledgeId": item.knowledge_id,
        "snapshotId": item.snapshot_id,
        "slug": item.slug,
        "title": item.title,
        "type": item.type,
        "domain": item.domain,
        "summary": item.summary,
        "reviewStatus": item.review_status,
        "sourceCount": len(item.source_ids or []),
        "updatedAt": iso(item.updated_at),
    }


def knowledge_detail(session: Session, knowledge_id: str) -> dict:
    snapshot = current_snapshot(session)
    item = session.scalar(
        select(KnowledgeItem).where(
            KnowledgeItem.snapshot_id == snapshot.snapshot_id,
            KnowledgeItem.knowledge_id == knowledge_id,
        )
    )
    if not item:
        raise LookupError("知识内容不存在")
    relations = session.scalars(
        select(Relation).where(
            Relation.snapshot_id == snapshot.snapshot_id,
            or_(
                Relation.source_knowledge_id == knowledge_id,
                Relation.target_knowledge_id == knowledge_id,
            ),
        )
    ).all()
    related_ids = {
        relation.target_knowledge_id
        if relation.source_knowledge_id == knowledge_id
        else relation.source_knowledge_id
        for relation in relations
    }
    related = session.scalars(
        select(KnowledgeItem).where(
            KnowledgeItem.snapshot_id == snapshot.snapshot_id,
            KnowledgeItem.knowledge_id.in_(related_ids or {""}),
        )
    ).all()
    related_by_id = {entry.knowledge_id: entry for entry in related}
    evidence = session.scalars(
        select(Evidence).where(Evidence.evidence_id.in_(item.evidence_ids or [""]))
    ).all()
    evidence_by_id = {entry.evidence_id: entry for entry in evidence}
    return {
        **knowledge_summary(item),
        "markdown": item.markdown,
        "sourceIds": item.source_ids,
        "sourceVersionIds": item.source_version_ids,
        "evidence": [
            evidence_summary(session, evidence_by_id[eid])
            for eid in item.evidence_ids
            if eid in evidence_by_id
        ],
        "relations": [
            relation_view(relation, related_by_id, current_id=knowledge_id)
            for relation in relations
        ],
    }


def page_provenance(session: Session, evidence: Evidence) -> dict:
    if evidence.page_number is None:
        return {"extractionMethod": None, "qualityScore": None, "reviewStatus": None}
    version = session.get(SourceVersion, evidence.source_version_id)
    span = next(
        (item for item in (version.page_spans or []) if item["pageNumber"] == evidence.page_number),
        None,
    ) if version else None
    return {
        "extractionMethod": span.get("extractionMethod", "text") if span else None,
        "qualityScore": span.get("qualityScore") if span else None,
        "reviewStatus": span.get("reviewStatus") if span else None,
    }


def evidence_summary(session: Session, evidence: Evidence) -> dict:
    source = session.get(Source, evidence.source_id)
    return {
        "evidenceId": evidence.evidence_id,
        "sourceId": evidence.source_id,
        "sourceVersionId": evidence.source_version_id,
        "sourceTitle": source.title if source else evidence.source_id,
        "kind": evidence.kind,
        "charStart": evidence.char_start,
        "charEnd": evidence.char_end,
        "pageNumber": evidence.page_number,
        **page_provenance(session, evidence),
        "blockNumber": evidence.block_number,
        "blockLabel": evidence.block_label,
        "quote": evidence.quote,
    }


def evidence_detail(session: Session, evidence_id: str) -> dict:
    evidence = session.get(Evidence, evidence_id)
    if not evidence:
        raise LookupError("引用证据不存在")
    version = session.get(SourceVersion, evidence.source_version_id)
    content = version.extracted_text if version else ""
    context_start = max(0, evidence.char_start - 280)
    context_end = min(len(content), evidence.char_end + 280)
    return {
        **evidence_summary(session, evidence),
        "path": evidence.path,
        "context": content[context_start:context_end],
        "contextStart": context_start,
        "matchStart": evidence.char_start - context_start,
        "matchEnd": evidence.char_end - context_start,
        "accessible": version is not None,
    }


def relation_detail(session: Session, relation_id: str) -> dict:
    snapshot = current_snapshot(session)
    relation = session.scalar(
        select(Relation).where(
            Relation.snapshot_id == snapshot.snapshot_id,
            Relation.relation_id == relation_id,
        )
    )
    if not relation:
        raise LookupError("知识关系不存在")
    endpoints = session.scalars(
        select(KnowledgeItem).where(
            KnowledgeItem.snapshot_id == snapshot.snapshot_id,
            KnowledgeItem.knowledge_id.in_(
                [relation.source_knowledge_id, relation.target_knowledge_id]
            ),
        )
    ).all()
    by_id = {item.knowledge_id: knowledge_summary(item) for item in endpoints}
    evidence = session.scalars(
        select(Evidence).where(Evidence.evidence_id.in_(relation.evidence_ids or [""]))
    ).all()
    return {
        "snapshotId": snapshot.snapshot_id,
        "relationId": relation.relation_id,
        "source": by_id.get(relation.source_knowledge_id),
        "target": by_id.get(relation.target_knowledge_id),
        "type": relation.type,
        "directed": relation.directed,
        "weight": relation.weight,
        "reviewStatus": relation.review_status,
        "evidence": [evidence_summary(session, item) for item in evidence],
    }


def relation_view(
    relation: Relation, related_by_id: dict[str, KnowledgeItem], *, current_id: str
) -> dict:
    other_id = (
        relation.target_knowledge_id
        if relation.source_knowledge_id == current_id
        else relation.source_knowledge_id
    )
    other = related_by_id.get(other_id)
    return {
        "relationId": relation.relation_id,
        "sourceKnowledgeId": relation.source_knowledge_id,
        "targetKnowledgeId": relation.target_knowledge_id,
        "type": relation.type,
        "directed": relation.directed,
        "weight": relation.weight,
        "reviewStatus": relation.review_status,
        "evidenceIds": relation.evidence_ids,
        "relatedKnowledge": knowledge_summary(other) if other else None,
    }


def graph_projection(session: Session) -> dict:
    snapshot = published_snapshot(session)
    if not snapshot:
        return {
            "snapshotId": None,
            "domains": [],
            "nodes": [],
            "edges": [],
            "hierarchy": {"name": "知识图谱", "children": []},
            "layoutSeed": 0,
            "counts": {"nodes": 0, "edges": 0},
        }
    items = session.scalars(
        select(KnowledgeItem).where(KnowledgeItem.snapshot_id == snapshot.snapshot_id)
    ).all()
    relations = session.scalars(
        select(Relation).where(Relation.snapshot_id == snapshot.snapshot_id)
    ).all()
    domains = (
        [{**domain, "index": index} for index, domain in enumerate(DOMAIN_META)]
        if snapshot.project_id == PROJECT_ID
        else personal_domain_meta({item.domain for item in items})
    )
    domain_by_id = {item["id"]: item for item in domains}
    degree: Counter[str] = Counter()
    for relation in relations:
        degree[relation.source_knowledge_id] += 1
        degree[relation.target_knowledge_id] += 1
    nodes = []
    for index, item in enumerate(items):
        meta = domain_by_id[item.domain]
        nodes.append(
            {
                "id": item.knowledge_id,
                "knowledgeId": item.knowledge_id,
                "name": item.title,
                "summary": item.summary,
                "type": item.type,
                "domain": meta["index"],
                "domainId": meta["id"],
                "hub": degree[item.knowledge_id] >= 12 or item.type == "domain",
                "degree": degree[item.knowledge_id],
                "sourceCount": len(item.source_ids or []),
                "reviewStatus": item.review_status,
                "index": index,
            }
        )
    edges = [
        {
            "relationId": relation.relation_id,
            "source": relation.source_knowledge_id,
            "target": relation.target_knowledge_id,
            "type": relation.type,
            "directed": relation.directed,
            "weight": relation.weight,
            "evidenceCount": len(relation.evidence_ids or []),
            "evidenceIds": relation.evidence_ids,
            "reviewStatus": relation.review_status,
        }
        for relation in relations
    ]
    grouped: dict[str, list[dict]] = defaultdict(list)
    for node in nodes:
        grouped[node["domainId"]].append({"id": node["id"], "name": node["name"]})
    layout_seed = int(hashlib.sha256(snapshot.snapshot_id.encode()).hexdigest()[:8], 16)
    return {
        "snapshotId": snapshot.snapshot_id,
        "domains": domains,
        "nodes": nodes,
        "edges": edges,
        "hierarchy": {
            "name": "知识图谱",
            "children": [
                {"id": domain["id"], "name": domain["name"], "children": grouped[domain["id"]]}
                for domain in domains
            ],
        },
        "layoutSeed": layout_seed,
        "counts": {"nodes": len(nodes), "edges": len(edges)},
    }


def suggested_questions(session: Session) -> dict:
    snapshot = published_snapshot(session)
    if not snapshot:
        return {"snapshotId": None, "items": []}
    items = session.scalars(
        select(SuggestedQuestion)
        .where(SuggestedQuestion.snapshot_id == snapshot.snapshot_id)
        .order_by(SuggestedQuestion.question_id)
        .limit(4)
    ).all()
    return {
        "snapshotId": snapshot.snapshot_id,
        "items": [
            {
                "questionId": item.question_id,
                "snapshotId": item.snapshot_id,
                "text": item.text,
                "relatedKnowledgeIds": item.related_knowledge_ids,
                "generatedAt": iso(item.generated_at),
                "stale": False,
            }
            for item in items
        ],
    }


def appearance_view(preference: AppPreference | None) -> dict:
    return {
        "themePreference": preference.theme_preference if preference else "light",
        "reduceMotion": preference.reduce_motion if preference else False,
        "updatedAt": iso(preference.updated_at) if preference else None,
    }


def model_profile_view(profile: ModelProfile | None) -> dict:
    if not profile:
        return {
            "profileId": None,
            "name": "DeepSeek 在线服务",
            "baseUrl": "https://api.deepseek.com",
            "modelId": "",
            "modelIds": [],
            "keyConfigured": False,
            "credentialMask": None,
            "status": "incomplete",
            "lastTestedAt": None,
            "lastLatencyMs": None,
            "lastError": None,
        }
    return {
        "profileId": profile.profile_id,
        "name": profile.name,
        "baseUrl": profile.base_url,
        "modelId": profile.model_id,
        "modelIds": profile.model_ids if profile.model_ids is not None else (
            [profile.model_id] if profile.model_id else []
        ),
        "keyConfigured": profile.key_configured,
        "credentialMask": "••••••••" if profile.key_configured else None,
        "status": profile.status,
        "lastTestedAt": iso(profile.last_tested_at),
        "lastLatencyMs": profile.last_latency_ms,
        "lastError": profile.last_error,
    }


def conversation_view(conversation: Conversation) -> dict:
    return {
        "conversationId": conversation.conversation_id,
        "projectId": conversation.project_id,
        "title": conversation.title,
        "contextKnowledgeIds": conversation.context_knowledge_ids,
        "createdAt": iso(conversation.created_at),
        "updatedAt": iso(conversation.updated_at),
    }


def conversation_detail(session: Session, conversation_id: str) -> dict:
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise LookupError("对话不存在")
    messages = session.scalars(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at, Message.message_id)
    ).all()
    answers = session.scalars(select(Answer).where(Answer.conversation_id == conversation_id)).all()
    answer_by_message = {item.answer_message_id: item for item in answers if item.answer_message_id}
    return {
        **conversation_view(conversation),
        "messages": [
            message_view(item, answer_by_message.get(item.message_id)) for item in messages
        ],
        "activeAnswer": next((
            answer_view(item) for item in answers
            if item.status not in {"completed", "failed", "insufficient"}
        ), None),
    }


def message_view(message: Message, answer: Answer | None = None) -> dict:
    payload = {
        "messageId": message.message_id,
        "role": message.role,
        "content": message.content,
        "createdAt": iso(message.created_at),
    }
    if answer:
        payload["answer"] = answer_view(answer)
    return payload


def answer_view(answer: Answer) -> dict:
    return {
        "answerId": answer.answer_id,
        "snapshotId": answer.snapshot_id,
        "status": answer.status,
        "content": answer.content,
        "citations": answer.citations or [],
        "relatedKnowledgeIds": answer.related_knowledge_ids or [],
        "evidenceStatus": answer.evidence_status,
        "retrievedSourceCount": answer.retrieved_source_count,
        "usedSourceCount": answer.used_source_count,
        "modelId": answer.model_id,
        "modelProfileId": answer.model_profile_id,
        "error": (
            {"code": answer.error_code, "message": answer.error_message, "retryable": True}
            if answer.error_code
            else None
        ),
        "completedAt": iso(answer.completed_at),
    }


def _fts_expression(query: str) -> str | None:
    groups = re.findall(r"[\u3400-\u9fff]{3,}|[A-Za-z0-9_-]{3,}", query)
    terms: list[str] = []
    for group in groups:
        if re.fullmatch(r"[\u3400-\u9fff]+", group):
            terms.extend(group[index : index + 3] for index in range(len(group) - 2))
        else:
            terms.append(group.lower())
    unique = list(dict.fromkeys(term for term in terms if len(term) >= 3))[:24]
    return " OR ".join(f'"{term.replace(chr(34), "")}"' for term in unique) or None


def search_knowledge(
    session: Session, snapshot_id: str, query: str, *, limit: int = 8
) -> list[KnowledgeItem]:
    expression = _fts_expression(query)
    ids: list[str] = []
    if expression:
        rows = session.execute(
            text(
                "SELECT knowledge_id, bm25(knowledge_search, 0.0, 0.0, 8.0, 3.0, 1.0) AS rank "
                "FROM knowledge_search WHERE snapshot_id = :snapshot_id "
                "AND knowledge_search MATCH :query ORDER BY rank LIMIT :limit"
            ),
            {"snapshot_id": snapshot_id, "query": expression, "limit": limit},
        ).all()
        ids = [row[0] for row in rows]
    if not ids:
        compact = re.sub(r"[^\w\u3400-\u9fff]", "", query)
        fragments = [compact[index : index + 2] for index in range(max(1, len(compact) - 1))]
        fragments = [item for item in dict.fromkeys(fragments) if item][:8]
        conditions = [
            or_(KnowledgeItem.title.like(f"%{part}%"), KnowledgeItem.summary.like(f"%{part}%"))
            for part in fragments
        ]
        if conditions:
            found = session.scalars(
                select(KnowledgeItem)
                .where(KnowledgeItem.snapshot_id == snapshot_id, or_(*conditions))
                .limit(limit)
            ).all()
            ids = [item.knowledge_id for item in found]
    if not ids:
        return []
    found_items = session.scalars(
        select(KnowledgeItem).where(
            KnowledgeItem.snapshot_id == snapshot_id,
            KnowledgeItem.knowledge_id.in_(ids),
        )
    ).all()
    by_id = {item.knowledge_id: item for item in found_items}
    ordered = [by_id[item_id] for item_id in ids if item_id in by_id]

    if ordered and len(ordered) < limit:
        primary_ids = [item.knowledge_id for item in ordered[:4]]
        relations = session.scalars(
            select(Relation).where(
                Relation.snapshot_id == snapshot_id,
                or_(
                    Relation.source_knowledge_id.in_(primary_ids),
                    Relation.target_knowledge_id.in_(primary_ids),
                ),
            )
        ).all()
        neighbor_ids = []
        for relation in relations:
            neighbor_ids.extend([relation.source_knowledge_id, relation.target_knowledge_id])
        neighbor_ids = [item for item in dict.fromkeys(neighbor_ids) if item not in by_id]
        neighbors = session.scalars(
            select(KnowledgeItem).where(
                KnowledgeItem.snapshot_id == snapshot_id,
                KnowledgeItem.knowledge_id.in_(neighbor_ids[: limit - len(ordered)] or [""]),
            )
        ).all()
        ordered.extend(neighbors)
    return ordered[:limit]
