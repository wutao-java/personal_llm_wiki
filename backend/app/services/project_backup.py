from __future__ import annotations

import hashlib
import io
import json
import math
import re
import zipfile
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    UniqueConstraint,
    delete,
    insert,
    select,
    text,
)
from sqlalchemy.orm import Session

from app.adapters.deepseek import CompilePayload, DeepSeekError, validate_compile_result
from app.core.config import get_settings
from app.db.models import (
    Answer,
    AnswerEvent,
    AnswerReview,
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
    SuggestedQuestion,
)
from app.services.knowledge import answer_view
from app.services.qa import TERMINAL_ANSWER_STATES
from app.services.seed import rebuild_search_index

MAX_PACKAGE_BYTES = 64 * 1024 * 1024
MAX_EXPANDED_BYTES = 256 * 1024 * 1024
MAX_MANIFEST_BYTES = 64 * 1024 * 1024
MODELS = (
    Project, Source, SourceVersion, Snapshot, Evidence, KnowledgeItem, Relation,
    SuggestedQuestion, CompileRun, CompileEvent, Conversation, Message, Answer,
    AnswerEvent, AnswerReview,
)
TABLES = {model.__tablename__: model.__table__ for model in MODELS}
LIST_FIELDS = {
    "page_spans", "block_spans", "source_ids", "source_version_ids", "evidence_ids",
    "related_knowledge_ids", "context_knowledge_ids", "issues", "citations",
}


def _valid_field(value, column) -> bool:
    if value is None:
        return column.nullable
    kind = column.type
    if isinstance(kind, Boolean):
        return type(value) is bool
    if isinstance(kind, Integer):
        return type(value) is int
    if isinstance(kind, Float):
        return type(value) in {int, float} and math.isfinite(value)
    if isinstance(kind, String):
        return isinstance(value, str) and (not kind.length or len(value) <= kind.length)
    if isinstance(kind, JSON):
        if column.name == "compiled_by":
            return isinstance(value, (dict, str))
        return isinstance(value, list if column.name in LIST_FIELDS else dict)
    return True


def _candidate_records(candidate: dict, key: str, model, fields: tuple[str, ...]) -> list[dict]:
    records = candidate[key]
    if not isinstance(records, list):
        raise ValueError("项目包审核记录格式无效")
    identities = []
    for record in records:
        if not isinstance(record, dict):
            raise ValueError("项目包审核记录格式无效")
        for field in fields:
            name = re.sub(r"_([a-z])", lambda match: match[1].upper(), field)
            if not _valid_field(record[name], model.__table__.columns[field]):
                raise ValueError("项目包审核字段类型无效")
        identities.append(record["knowledgeId" if model is KnowledgeItem else "relationId"])
    if len(identities) != len(set(identities)):
        raise ValueError("项目包审核记录存在重复身份")
    return records


def _ensure_idle(session: Session) -> None:
    if session.scalar(select(CompileRun.run_id).where(
        CompileRun.status.in_({"queued", "running", "publishing"}),
    ).limit(1)) or session.scalar(select(Answer.answer_id).where(
        Answer.status.not_in(TERMINAL_ANSWER_STATES),
    ).limit(1)):
        raise ValueError("请等待知识生成和回答结束，或先停止任务后再操作项目备份")


def export_project(session: Session) -> bytes:
    session.rollback()
    # An explicit read transaction keeps all exported tables on one SQLite snapshot.
    session.execute(text("BEGIN"))
    try:
        _ensure_idle(session)
        tables = {}
        for name, table in TABLES.items():
            tables[name] = [
                {key: value.isoformat() if isinstance(value, datetime) else value
                 for key, value in dict(row).items()}
                for row in session.execute(select(table)).mappings()
            ]
        originals = {}
        root = get_settings().data_dir.resolve()
        for version in tables["source_versions"]:
            path = Path(version["original_path"]).resolve()
            if not path.is_relative_to(root) or not path.is_file():
                raise ValueError("资料原件不可访问，备份未完成")
            if path.stat().st_size > MAX_EXPANDED_BYTES - sum(map(len, originals.values())):
                raise ValueError("当前项目超过备份体积限制")
            content = path.read_bytes()
            digest = hashlib.sha256(content).hexdigest()
            if digest != version["content_sha256"] or len(content) != version["size_bytes"]:
                raise ValueError("资料原件校验失败，备份未完成")
            version["original_path"] = f"originals/{digest}"
            originals[version["original_path"]] = content
        by_version = {row["source_version_id"]: row for row in tables["source_versions"]}
        for evidence in tables["evidence_fragments"]:
            evidence["path"] = by_version[evidence["source_version_id"]]["original_path"]
        manifest = json.dumps({
            "format": "ff-llm-wiki-project", "formatVersion": 1,
            "exportedAt": datetime.now(UTC).isoformat(),
            "attribution": "@2026 赋范空间 独家自研", "tables": tables,
        }, ensure_ascii=False, allow_nan=False).encode("utf-8")
        if len(manifest) > MAX_MANIFEST_BYTES or (
            len(manifest) + sum(map(len, originals.values())) > MAX_EXPANDED_BYTES
        ):
            raise ValueError("当前项目超过备份体积限制")
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("project.json", manifest)
            for name, content in originals.items():
                archive.writestr(name, content)
        package = output.getvalue()
        if len(package) > MAX_PACKAGE_BYTES:
            raise ValueError("当前项目超过备份体积限制")
        _read_package(package)
        return package
    finally:
        session.rollback()


def _decode_rows(tables: dict) -> None:
    if not isinstance(tables, dict) or set(tables) != set(TABLES):
        raise ValueError("项目包表结构不兼容")
    count = 0
    for name, table in TABLES.items():
        rows = tables[name]
        if not isinstance(rows, list):
            raise ValueError("项目包记录格式无效")
        count += len(rows)
        if count > 100000:
            raise ValueError("项目包记录数量超出限制")
        for row in rows:
            if not isinstance(row, dict) or set(row) != set(table.columns.keys()):
                raise ValueError("项目包字段不兼容")
            for column in table.columns:
                value = row[column.name]
                if value is None:
                    if not column.nullable:
                        raise ValueError("项目包缺少必要字段")
                    continue
                if isinstance(column.type, DateTime):
                    valid = isinstance(value, str)
                    if valid:
                        row[column.name] = datetime.fromisoformat(value)
                else:
                    valid = _valid_field(value, column)
                if not valid:
                    raise ValueError("项目包字段类型无效")
        keys = [list(table.primary_key.columns)]
        keys.extend(list(item.columns) for item in table.constraints
                    if isinstance(item, UniqueConstraint))
        for columns in keys:
            identities = [tuple(row[column.name] for column in columns) for row in rows]
            if len(identities) != len(set(identities)):
                raise ValueError("项目包存在重复身份")
    for name, table in TABLES.items():
        for column in table.columns:
            for foreign_key in column.foreign_keys:
                target = foreign_key.column
                allowed = {row[target.name] for row in tables[target.table.name]}
                if any(row[column.name] is not None and row[column.name] not in allowed
                       for row in tables[name]):
                    raise ValueError("项目包引用了不存在的记录")


def _validate_references(tables: dict) -> None:
    projects = tables["projects"]
    if len(projects) != 1:
        raise ValueError("项目包必须包含一个项目")
    sources = {row["source_id"]: row for row in tables["sources"]}
    versions = {row["source_version_id"]: row for row in tables["source_versions"]}
    snapshots = {row["snapshot_id"] for row in tables["knowledge_snapshots"]}
    evidence = {row["evidence_id"]: row for row in tables["evidence_fragments"]}
    knowledge = {(row["snapshot_id"], row["knowledge_id"]) for row in tables["knowledge_items"]}

    def references(values, allowed):
        if not isinstance(values, list) or any(not isinstance(value, str) or value not in allowed
                                               for value in values):
            raise ValueError("项目包包含无效来源或知识引用")

    def page(row, *, candidate=False):
        source_ids = row["sourceIds" if candidate else "source_ids"]
        version_ids = row["sourceVersionIds" if candidate else "source_version_ids"]
        evidence_ids = row["evidenceIds" if candidate else "evidence_ids"]
        references(source_ids, sources)
        references(version_ids, versions)
        references(evidence_ids, evidence)
        if (any(versions[key]["source_id"] not in source_ids for key in version_ids)
            or any(evidence[key]["source_id"] not in source_ids for key in evidence_ids)
            or (candidate and any(evidence[key]["source_version_id"] not in version_ids
                                  for key in evidence_ids))):
            raise ValueError("项目包知识与证据来源不一致")

    current = projects[0]["current_snapshot_id"]
    if current is not None and current not in snapshots:
        raise ValueError("项目包当前知识版本不存在")
    for row in sources.values():
        current = row["current_version_id"]
        if current is not None and (current not in versions or versions[current]["source_id"] != row["source_id"]):
            raise ValueError("项目包当前来源版本不一致")
    for row in versions.values():
        previous = row["supersedes"]
        if previous is not None and (previous not in versions or versions[previous]["source_id"] != row["source_id"]):
            raise ValueError("项目包历史来源版本不一致")
        if row["size_bytes"] < 0:
            raise ValueError("项目包原件大小无效")
        if not isinstance(row["page_spans"], list) or not isinstance(row["block_spans"], list):
            raise ValueError("项目包来源定位格式无效")
        for field, number in (("page_spans", "pageNumber"), ("block_spans", "blockNumber")):
            for span in row[field]:
                if (not isinstance(span, dict) or type(span.get(number)) is not int
                    or span[number] < 1
                    or type(span.get("charStart")) is not int
                    or type(span.get("charEnd")) is not int
                    or not 0 <= span["charStart"] <= span["charEnd"] <= len(row["extracted_text"])
                    or (field == "block_spans" and not isinstance(span.get("label"), str))):
                    raise ValueError("项目包来源定位格式无效")
    for row in evidence.values():
        version = versions[row["source_version_id"]]
        if row["source_id"] != version["source_id"] or row["path"] != version["original_path"]:
            raise ValueError("项目包证据来源不一致")
        if not 0 <= row["char_start"] <= row["char_end"] <= len(version["extracted_text"]):
            raise ValueError("项目包证据位置无效")
    for row in tables["knowledge_items"]:
        page(row)
    for row in tables["relations"]:
        if any((row["snapshot_id"], row[key]) not in knowledge
               for key in ("source_knowledge_id", "target_knowledge_id")):
            raise ValueError("项目包关系端点不存在")
        references(row["evidence_ids"], evidence)
    for row in tables["suggested_questions"]:
        references(row["related_knowledge_ids"],
                   {key for snapshot, key in knowledge if snapshot == row["snapshot_id"]})
    for row in tables["compile_runs"]:
        if row["status"] in {"queued", "running", "publishing"}:
            raise ValueError("项目包包含尚未结束的任务")
        references(row["source_version_ids"], versions)
        if row["published_snapshot_id"] and row["published_snapshot_id"] not in snapshots:
            raise ValueError("项目包编译结果不存在")
        candidate = row["candidate"]
        if candidate is not None:
            items = _candidate_records(candidate, "knowledgeItems", KnowledgeItem, (
                "knowledge_id", "slug", "title", "type", "domain", "summary", "markdown",
                "source_ids", "source_version_ids", "evidence_ids",
            ))
            relations = _candidate_records(candidate, "relations", Relation, (
                "relation_id", "source_knowledge_id", "target_knowledge_id", "type",
                "directed", "weight", "evidence_ids", "review_status",
            ))
            base = candidate.get("baseSnapshotId")
            if base is not None and base not in snapshots:
                raise ValueError("项目包审核基于不存在的知识版本")
            references(candidate.get("refreshedSourceIds", []), sources)
            checkpoint = candidate.get("checkpoint")
            if checkpoint is not None:
                if (not isinstance(checkpoint, dict)
                    or not isinstance(checkpoint.get("signature"), str)
                    or not re.fullmatch(r"[a-f0-9]{64}", checkpoint["signature"])
                    or not isinstance(checkpoint.get("completed"), dict)
                    or items or relations):
                    raise ValueError("项目包编译断点格式无效")
                allowed_evidence = [{
                    "evidenceId": key, "topic": sources[fragment["source_id"]]["domain"],
                } for key, fragment in evidence.items()
                    if fragment["source_version_id"] in row["source_version_ids"]]
                existing = [{"knowledgeId": key} for _, key in knowledge]
                for index, saved in checkpoint["completed"].items():
                    if (not re.fullmatch(r"0|[1-9]\d*", index) or not isinstance(saved, dict)):
                        raise ValueError("项目包编译断点格式无效")
                    digest = hashlib.sha256(json.dumps(
                        saved.get("result"), ensure_ascii=False, sort_keys=True, separators=(",", ":"),
                    ).encode("utf-8")).hexdigest()
                    if saved.get("sha256") != digest:
                        raise ValueError("项目包编译断点校验失败")
                    payload = CompilePayload.model_validate(saved.get("result"))
                    try:
                        validate_compile_result(payload, allowed_evidence, existing)
                    except DeepSeekError as exc:
                        raise ValueError("项目包编译断点引用无效") from exc
            ids = {item["knowledgeId"] for item in items}
            ids.update(key for snapshot, key in knowledge if snapshot == base)
            for item in items:
                if not _valid_field(item.get("reviewStatus", "accepted"),
                                    KnowledgeItem.__table__.columns.review_status):
                    raise ValueError("项目包审核字段类型无效")
                page(item, candidate=True)
            for relation in relations:
                if relation["sourceKnowledgeId"] not in ids or relation["targetKnowledgeId"] not in ids:
                    raise ValueError("项目包候选关系端点不存在")
                references(relation["evidenceIds"], evidence)
    for row in tables["conversations"]:
        references(row["context_knowledge_ids"], {key for _, key in knowledge})
    messages = {row["message_id"]: row for row in tables["messages"]}
    for row in tables["answers"]:
        if row["snapshot_id"] not in snapshots or row["status"] not in TERMINAL_ANSWER_STATES:
            raise ValueError("项目包回答状态或知识版本无效")
        for field, role in (("question_message_id", "user"), ("answer_message_id", "assistant")):
            if row[field]:
                message = messages[row[field]]
                if message["role"] != role or message["conversation_id"] != row["conversation_id"]:
                    raise ValueError("项目包回答与对话不一致")
        references(row["related_knowledge_ids"],
                   {key for snapshot, key in knowledge if snapshot == row["snapshot_id"]})
        indexes = set()
        for citation in row["citations"]:
            if (not isinstance(citation, dict) or type(citation.get("index")) is not int
                or citation["index"] < 1 or citation["index"] in indexes):
                raise ValueError("项目包回答引用编号无效")
            indexes.add(citation["index"])
            if citation.get("knowledgeId") and (row["snapshot_id"], citation["knowledgeId"]) not in knowledge:
                raise ValueError("项目包回答引用的知识不存在")
            fragment = evidence.get(citation["evidenceId"])
            if not fragment or any(citation[key] != fragment[column] for key, column in (
                ("sourceId", "source_id"), ("sourceVersionId", "source_version_id"),
                ("quote", "quote"), ("charStart", "char_start"), ("charEnd", "char_end"),
            )):
                raise ValueError("项目包回答引用与原始证据不一致")
    answers = {row["answer_id"]: row for row in tables["answers"]}
    for row in tables["answer_events"]:
        if row["event_type"] in {"final", "error"}:
            saved = answer_view(Answer(**answers[row["answer_id"]]))
            if any(row["payload"].get(key) != saved[key] for key in (
                "answerId", "snapshotId", "status", "content", "citations",
                "relatedKnowledgeIds", "evidenceStatus", "error",
            )):
                raise ValueError("项目包回答事件与保存结果不一致")


def _read_package(package: bytes) -> tuple[dict, dict[str, bytes]]:
    if len(package) > MAX_PACKAGE_BYTES:
        raise ValueError("项目包不能超过 64 MB")
    try:
        with zipfile.ZipFile(io.BytesIO(package)) as archive:
            entries = archive.infolist()
            names = [entry.filename for entry in entries]
            if (len(entries) > 4096 or len(set(names)) != len(names)
                or sum(entry.file_size for entry in entries) > MAX_EXPANDED_BYTES
                or "project.json" not in names
                or any(entry.flag_bits & 1 or not (
                    entry.filename == "project.json"
                    or re.fullmatch(r"originals/[0-9a-f]{64}", entry.filename)
                ) for entry in entries)):
                raise ValueError("项目包文件结构或展开体积无效")
            if archive.getinfo("project.json").file_size > MAX_MANIFEST_BYTES:
                raise ValueError("项目包清单体积超出限制")
            manifest = json.loads(archive.read("project.json"))
            if manifest["format"] != "ff-llm-wiki-project" or manifest["formatVersion"] != 1:
                raise ValueError("项目包版本不兼容")
            datetime.fromisoformat(manifest["exportedAt"])
            if manifest["attribution"] != "@2026 赋范空间 独家自研":
                raise ValueError("项目包清单格式无效")
            _decode_rows(manifest["tables"])
            tables = manifest["tables"]
            expected = {row["original_path"] for row in tables["source_versions"]}
            if set(names) != {"project.json", *expected}:
                raise ValueError("项目包缺少原件或包含额外文件")
            originals = {name: archive.read(name) for name in expected}
            for row in tables["source_versions"]:
                name = row["original_path"]
                content = originals[name]
                digest = hashlib.sha256(content).hexdigest()
                if (name != f"originals/{digest}" or digest != row["content_sha256"]
                    or len(content) != row["size_bytes"]):
                    raise ValueError("项目包原件校验失败")
            _validate_references(tables)
            return manifest, originals
    except (KeyError, TypeError, AttributeError, UnicodeError, OverflowError,
            RecursionError, EOFError, zipfile.BadZipFile, NotImplementedError, RuntimeError) as exc:
        raise ValueError("项目包格式无效或文件损坏") from exc


def _summary(manifest: dict) -> dict:
    tables = manifest["tables"]
    return {
        "projectName": tables["projects"][0]["name"],
        "exportedAt": manifest["exportedAt"],
        "sourceCount": len(tables["sources"]),
        "sourceVersionCount": len(tables["source_versions"]),
        "knowledgeCount": len(tables["knowledge_items"]),
        "snapshotCount": len(tables["knowledge_snapshots"]),
        "conversationCount": len(tables["conversations"]),
    }


def inspect_package(package: bytes) -> dict:
    manifest, _ = _read_package(package)
    return _summary(manifest)


def restore_project(session: Session, package: bytes) -> dict:
    manifest, originals = _read_package(package)
    tables = manifest["tables"]
    session.rollback()
    session.execute(text("BEGIN IMMEDIATE"))
    created = []
    try:
        _ensure_idle(session)
        current = session.scalar(select(Project))
        if not current:
            raise ValueError("当前项目尚未初始化")
        project_id = current.project_id
        for model in (Project, Source, Snapshot, CompileRun, Conversation):
            for row in tables[model.__tablename__]:
                row["project_id"] = project_id
        root = get_settings().data_dir.resolve()
        target = (root / "restored-originals").resolve()
        if not target.is_relative_to(root):
            raise ValueError("项目恢复目录不可用")
        target.mkdir(exist_ok=True)
        paths = {}
        for name, content in originals.items():
            path = (target / name.split("/")[1]).resolve()
            if not path.is_relative_to(target):
                raise ValueError("项目恢复原件路径无效")
            if path.exists():
                if hashlib.sha256(path.read_bytes()).hexdigest() != path.name:
                    raise ValueError("已有恢复原件校验失败")
            else:
                with path.open("xb") as output:
                    created.append(path)
                    output.write(content)
            paths[name] = str(path)
        for row in tables["source_versions"]:
            row["original_path"] = paths[row["original_path"]]
        for row in tables["evidence_fragments"]:
            row["path"] = paths[row["path"]]
        for model in reversed(MODELS):
            session.execute(delete(model.__table__))
        for model in MODELS:
            rows = tables[model.__tablename__]
            if rows:
                session.execute(insert(model.__table__), rows)
        session.expire_all()
        rebuild_search_index(session, commit=False)
        session.commit()
        return _summary(manifest)
    except Exception:
        session.rollback()
        for path in created:
            path.unlink(missing_ok=True)
        raise
