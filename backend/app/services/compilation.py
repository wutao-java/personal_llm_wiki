from __future__ import annotations

import asyncio
import hashlib
import io
import json
import re
import time
import uuid
from collections import Counter
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path
from zipfile import ZipFile

from docx import Document
from docx.table import Table
from fastapi import UploadFile
from pydantic import ValidationError
from pypdf import PdfReader
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.adapters.deepseek import (
    CompilePayload,
    DeepSeekError,
    compile_messages,
    knowledge_title_key,
    validate_compile_result,
)
from app.contracts.schemas import OcrPageCorrection
from app.core.config import get_settings
from app.db.models import (
    CompileEvent,
    CompileRun,
    Evidence,
    KnowledgeItem,
    Project,
    Relation,
    Snapshot,
    Source,
    SourceVersion,
    SuggestedQuestion,
)
from app.db.session import session_factory
from app.services.knowledge import compile_run_view, current_project, search_knowledge
from app.services.pdf_ocr import MIN_OCR_CHARS, MIN_OCR_CONFIDENCE, extract_scanned_page
from app.services.seed import rebuild_search_index
from app.services.settings import get_client

ALLOWED_EXTENSIONS = {".md", ".markdown", ".txt", ".pdf", ".docx"}
TERMINAL_RUN_STATES = {"completed", "failed", "interrupted", "cancelled"}
COMPILE_PROGRESS_INTERVAL_SECONDS = 5


def _safe_filename(filename: str) -> str:
    clean = Path(filename).name.strip().replace("\x00", "")
    return clean[:240] or "untitled.md"


def _frontmatter_value(content: str, key: str) -> str | None:
    if not content.startswith("---"):
        return None
    match = re.search(rf"^{re.escape(key)}:\s*[\"']?(.+?)[\"']?\s*$", content, re.MULTILINE)
    return match.group(1).strip() if match else None


def _has_pdf_image(resources: object, *, depth: int = 0, image_pixels: list[int] | None = None) -> bool:
    if depth > 3:
        raise ValueError("PDF 图片嵌套超过处理限制")
    if not resources:
        return False
    if image_pixels is None:
        image_pixels = [0]
    resolved = resources.get_object() if hasattr(resources, "get_object") else resources
    xobjects = resolved.get("/XObject") if hasattr(resolved, "get") else None
    if not xobjects:
        return False
    entries = xobjects.get_object() if hasattr(xobjects, "get_object") else xobjects
    found = False
    for entry in entries.values():
        obj = entry.get_object()
        if obj.get("/Subtype") == "/Image":
            width, height = int(obj.get("/Width", 0)), int(obj.get("/Height", 0))
            image_pixels[0] += width * height
            if width <= 0 or height <= 0 or image_pixels[0] > 50_000_000:
                raise ValueError("PDF 嵌入图片超过处理限制")
            found = True
        if obj.get("/Subtype") == "/Form":
            found = _has_pdf_image(obj.get("/Resources"), depth=depth + 1, image_pixels=image_pixels) or found
    return found


def _extract_pdf(data: bytes) -> tuple[str, list[dict]]:
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ValueError("PDF 已加密，当前无法读取")
        if len(reader.pages) > 100:
            raise ValueError("PDF 超过 100 页处理限制")
        chunks: list[str] = []
        page_spans: list[dict] = []
        cursor = 0
        ocr_count = 0
        for page_number, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").strip()
            extraction_method = "text"
            quality_score = None
            review_status = None
            has_image = len(text) < 40 and _has_pdf_image(page.get("/Resources"))
            if has_image or (not text and page.get_contents()):
                ocr_count += 1
                if ocr_count > 30:
                    raise ValueError("PDF 需 OCR 的页面超过 30 页处理限制")
                text, quality_score = extract_scanned_page(data, page_number)
                extraction_method = "ocr"
                if len("".join(text.split())) < MIN_OCR_CHARS or quality_score < MIN_OCR_CONFIDENCE:
                    review_status = "needs_review"
            if len(text) > 200_000 or cursor + len(text) > 1_000_000:
                raise ValueError("PDF 提取文本超过处理限制")
            if text and chunks:
                chunks.append("\n\n")
                cursor += 2
            start = cursor
            if text:
                chunks.append(text)
                cursor += len(text)
            page_spans.append({
                "pageNumber": page_number, "charStart": start, "charEnd": cursor,
                "extractionMethod": extraction_method, "qualityScore": quality_score,
                "reviewStatus": review_status,
            })
        text_content = "".join(chunks)
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("PDF 文件损坏或无法读取") from exc
    if len(text_content) < 40 and not any(page["reviewStatus"] == "needs_review" for page in page_spans):
        raise ValueError("PDF 没有足够可引用文本")
    return text_content, page_spans


def _extract_docx(data: bytes) -> tuple[str, list[dict]]:
    try:
        with ZipFile(io.BytesIO(data)) as archive:
            entries = archive.infolist()
            if len(entries) > 2000 or sum(entry.file_size for entry in entries) > 40 * 1024 * 1024:
                raise ValueError("Word 文件展开后超过处理限制")
        document = Document(io.BytesIO(data))
        chunks: list[str] = []
        spans: list[dict] = []
        cursor = 0
        paragraph_number = 0
        table_number = 0

        def add_block(text: str, label: str) -> None:
            nonlocal cursor
            if chunks:
                chunks.append("\n\n")
                cursor += 2
            start = cursor
            chunks.append(text)
            cursor += len(text)
            spans.append({"blockNumber": len(spans) + 1, "label": label, "charStart": start, "charEnd": cursor})

        for block in document.iter_inner_content():
            if isinstance(block, Table):
                table_number += 1
                for row_number, row in enumerate(block.rows, start=1):
                    cells = [cell.text.strip().replace("\n", "; ") for cell in row.cells]
                    if any(cells):
                        add_block(" | ".join(cells), f"表格 {table_number} · 第 {row_number} 行")
            else:
                text = block.text.strip()
                if not text:
                    continue
                paragraph_number += 1
                style = block.style.name if block.style else ""
                match = re.fullmatch(r"Heading ([1-6])", style)
                if match:
                    text = f"{'#' * int(match.group(1))} {text}"
                add_block(text, f"第 {paragraph_number} 段")
        content = "".join(chunks)
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("Word 文件损坏或无法读取") from exc
    if not any(span["charEnd"] - span["charStart"] >= 24 for span in spans):
        raise ValueError("Word 文档没有足够可引用文本")
    return content, spans


def _decode_text(data: bytes) -> str:
    try:
        content = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("文本文件必须使用 UTF-8 编码") from exc
    if not content.strip():
        raise ValueError("文件中没有可处理内容")
    return content


async def import_files(session: Session, files: list[UploadFile], *, topic: str | None = None) -> dict:
    settings = get_settings()
    if topic is not None:
        topic = topic.strip()
        if not topic or len(topic) > 64 or any(ord(char) < 32 for char in topic):
            raise ValueError("专题不能为空、超过 64 字符或包含控制字符")
    project = current_project(session)
    imported: list[dict] = []
    valid_version_ids: list[str] = []

    for upload in files:
        filename = _safe_filename(upload.filename or "untitled")
        extension = Path(filename).suffix.lower()
        if extension not in ALLOWED_EXTENSIONS:
            imported.append(
                {
                    "filename": filename,
                    "status": "failed",
                    "message": "当前支持 Markdown、文本、DOCX 和 PDF",
                }
            )
            continue
        data = await upload.read(settings.max_upload_bytes + 1)
        if len(data) > settings.max_upload_bytes:
            imported.append(
                {"filename": filename, "status": "failed", "message": "文件超过 10 MB 限制"}
            )
            continue
        digest = hashlib.sha256(data).hexdigest()
        duplicate = session.scalar(
            select(SourceVersion)
            .join(Source, Source.source_id == SourceVersion.source_id)
            .where(
                Source.project_id == project.project_id,
                Source.status != "removed",
                SourceVersion.content_sha256 == digest,
            )
            .limit(1)
        )
        if duplicate:
            imported.append(
                {
                    "filename": filename,
                    "status": "duplicate",
                    "message": "相同内容已经入库",
                    "sourceId": duplicate.source_id,
                    "sourceVersionId": duplicate.source_version_id,
                }
            )
            continue
        try:
            if extension == ".pdf":
                extracted, page_spans = await asyncio.to_thread(_extract_pdf, data)
                block_spans = []
            elif extension == ".docx":
                extracted, block_spans = _extract_docx(data)
                page_spans = []
            else:
                extracted, page_spans, block_spans = _decode_text(data), [], []
        except ValueError as exc:
            imported.append({"filename": filename, "status": "failed", "message": str(exc)})
            continue

        needs_review = any(page.get("reviewStatus") == "needs_review" for page in page_spans)
        source = session.scalar(
            select(Source).where(
                Source.project_id == project.project_id,
                Source.status != "removed",
                func.lower(Source.filename) == filename.lower(),
            ).limit(1)
        )
        if source:
            if topic is not None:
                source.domain = topic
            version_count = (
                session.scalar(
                    select(func.count())
                    .select_from(SourceVersion)
                    .where(SourceVersion.source_id == source.source_id)
                )
                or 0
            )
            version_number = version_count + 1
            source_version_id = f"SV-{source.source_id}-{version_number}"
            supersedes = source.current_version_id
        else:
            source_id = f"SRC-USER-{uuid.uuid4().hex[:12].upper()}"
            source = Source(
                source_id=source_id,
                project_id=project.project_id,
                title=_frontmatter_value(extracted, "title") or Path(filename).stem,
                filename=filename,
                domain=topic or "knowledge",
                document_type="pdf" if extension == ".pdf" else "docx" if extension == ".docx" else "text" if extension == ".txt" else "markdown",
                status="update_pending",
            )
            session.add(source)
            version_number = 1
            source_version_id = f"SV-{source_id}-1"
            supersedes = None

        source.status = "needs_review" if needs_review else "update_pending"
        source.filename = filename
        source.current_version_id = source_version_id
        source.updated_at = datetime.now(UTC)
        storage_dir = settings.data_dir / "sources" / source.source_id / source_version_id
        storage_dir.mkdir(parents=True, exist_ok=True)
        stored_path = storage_dir / f"original{extension}"
        stored_path.write_bytes(data)
        version = SourceVersion(
            source_version_id=source_version_id,
            source_id=source.source_id,
            version=f"{version_number}.0",
            content_sha256=digest,
            original_path=str(stored_path),
            original_filename=filename,
            mime_type="application/pdf" if extension == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document" if extension == ".docx" else "text/markdown",
            size_bytes=len(data),
            extracted_text=extracted,
            page_spans=page_spans,
            block_spans=block_spans,
            supersedes=supersedes,
            status="needs_review" if needs_review else "imported",
        )
        session.add(version)
        if not needs_review:
            valid_version_ids.append(source_version_id)
        imported.append(
            {
                "filename": filename,
                "status": "needs_review" if needs_review else "imported",
                "message": "扫描页文字待核对，确认后再生成知识" if needs_review else "资料已入库，等待生成知识",
                "sourceId": source.source_id,
                "sourceVersionId": source_version_id,
            }
        )

    if not valid_version_ids:
        session.commit()
        return {
            "runId": None, "items": imported,
            "acceptedCount": sum(item["status"] in {"imported", "needs_review"} for item in imported),
            "failedCount": sum(item["status"] == "failed" for item in imported),
        }

    run = CompileRun(
        run_id=f"RUN-{uuid.uuid4().hex.upper()}",
        project_id=project.project_id,
        status="queued",
        stage="validating",
        source_version_ids=valid_version_ids,
        counts={
            "filesTotal": len(files),
            "filesAccepted": len(valid_version_ids),
            "filesFailed": sum(1 for item in imported if item["status"] == "failed"),
            "filesDuplicate": sum(1 for item in imported if item["status"] == "duplicate"),
            "sourcesRead": 0,
            "evidenceFragments": 0,
            "knowledgeCandidates": 0,
            "knowledgeAdded": 0,
            "knowledgeUpdated": 0,
            "relationCandidates": 0,
            "relationsValid": 0,
            "warnings": 0,
            "failures": 0,
        },
    )
    session.add(run)
    session.commit()
    from app.workers.runner import schedule_compile

    schedule_compile(run.run_id)
    return {
        "runId": run.run_id,
        "items": imported,
        "acceptedCount": sum(item["status"] in {"imported", "needs_review"} for item in imported),
        "failedCount": sum(1 for item in imported if item["status"] == "failed"),
    }


def review_ocr_pages(session: Session, source_version_id: str, pages: list[OcrPageCorrection]) -> dict:
    version = session.get(SourceVersion, source_version_id)
    source = session.get(Source, version.source_id) if version else None
    if not source or source.project_id != current_project(session).project_id:
        raise LookupError("资料版本不存在")
    if (source.current_version_id != source_version_id or version.status != "needs_review"
            or version.mime_type != "application/pdf"):
        raise ValueError("此资料版本已不处于扫描文字待复核状态")
    existing_spans = version.page_spans or []
    pending = {page["pageNumber"] for page in existing_spans if page.get("reviewStatus") == "needs_review"}
    corrections = {page.pageNumber: page.text.strip() for page in pages}
    if not pending or len(corrections) != len(pages) or set(corrections) != pending:
        raise ValueError("请提交全部待复核页，每页只能提交一次")
    if any(len("".join(text.split())) < MIN_OCR_CHARS or any(
        ord(char) < 32 and char not in "\n\t" for char in text
    ) for text in corrections.values()):
        raise ValueError("每页校对文字须至少 40 个字符且不能包含控制字符")

    chunks: list[str] = []
    revised_spans: list[dict] = []
    cursor = 0
    reviewed_at = datetime.now(UTC).isoformat()
    for page in existing_spans:
        text = corrections.get(page["pageNumber"], version.extracted_text[page["charStart"]:page["charEnd"]])
        if text and chunks:
            chunks.append("\n\n")
            cursor += 2
        start = cursor
        if text:
            chunks.append(text)
            cursor += len(text)
        updated = {**page, "charStart": start, "charEnd": cursor}
        if page["pageNumber"] in pending:
            updated.update(reviewStatus="reviewed", reviewedAt=reviewed_at)
        revised_spans.append(updated)
    if cursor > 1_000_000:
        raise ValueError("校对文字超过处理限制")
    version.extracted_text = "".join(chunks)
    version.page_spans = revised_spans
    version.status = "imported"
    source.status = "update_pending"
    source.updated_at = datetime.now(UTC)
    run = CompileRun(
        run_id=f"RUN-{uuid.uuid4().hex.upper()}",
        project_id=source.project_id,
        status="queued",
        stage="validating",
        source_version_ids=[source_version_id],
        counts={"filesTotal": 1, "filesAccepted": 1, "filesFailed": 0, "filesDuplicate": 0,
                "sourcesRead": 0, "evidenceFragments": 0, "knowledgeCandidates": 0,
                "knowledgeAdded": 0, "knowledgeUpdated": 0, "relationCandidates": 0,
                "relationsValid": 0, "warnings": 0, "failures": 0},
    )
    session.add(run)
    session.commit()
    from app.workers.runner import schedule_compile

    schedule_compile(run.run_id)
    return compile_run_view(run)


def _append_event(
    session: Session,
    run: CompileRun,
    stage: str,
    message: str,
    *,
    object_id: str | None = None,
) -> None:
    last_sequence = (
        session.scalar(
            select(func.max(CompileEvent.sequence)).where(CompileEvent.run_id == run.run_id)
        )
        or 0
    )
    run.stage = stage
    run.updated_at = datetime.now(UTC)
    session.add(
        CompileEvent(
            run_id=run.run_id,
            sequence=last_sequence + 1,
            stage=stage,
            message=message,
            counts=dict(run.counts or {}),
            object_id=object_id,
        )
    )


def _record_event(
    session: Session,
    run: CompileRun,
    stage: str,
    message: str,
    *,
    object_id: str | None = None,
) -> None:
    _append_event(session, run, stage, message, object_id=object_id)
    session.commit()


def _split_evidence(version: SourceVersion, source_title: str) -> list[dict]:
    content = version.extracted_text
    body_start = 0
    if content.startswith("---"):
        marker = content.find("\n---\n", 4)
        if marker >= 0:
            body_start = marker + 5
    evidence: list[dict] = []
    provenance = [*(version.page_spans or []), *(version.block_spans or [])]
    boundaries = sorted({span[key] for span in provenance for key in ("charStart", "charEnd")})
    ranges: list[tuple[int, int]] = []
    for match in re.finditer(r"\S[\s\S]*?(?=\n[ \t]*\n|\Z)", content[body_start:]):
        start = body_start + match.start()
        end = body_start + match.end()
        while end > start and content[end - 1].isspace():
            end -= 1
        cuts = [start, *(point for point in boundaries if start < point < end), end]
        for left, right in zip(cuts, cuts[1:], strict=False):
            ranges.extend((offset, min(offset + 1200, right)) for offset in range(left, right, 1200))
    for start, end in ranges:
        if not content[start:end].strip():
            continue
        evidence.append(
            {
                # Offset identities cannot overwrite evidence retained by the old splitter.
                "evidenceId": f"E-{version.source_version_id}-C{start}-{end}",
                "sourceId": version.source_id,
                "sourceVersionId": version.source_version_id,
                "sourceTitle": source_title,
                "path": version.original_path,
                "charStart": start,
                "charEnd": end,
                "pageNumber": next(
                    (
                        span["pageNumber"]
                        for span in version.page_spans or []
                        if span["charStart"] <= start < span["charEnd"]
                    ),
                    None,
                ),
                "blockNumber": next(
                    (
                        span["blockNumber"]
                        for span in version.block_spans or []
                        if span["charStart"] <= start < span["charEnd"]
                    ),
                    None,
                ),
                "blockLabel": next(
                    (
                        span["label"]
                        for span in version.block_spans or []
                        if span["charStart"] <= start < span["charEnd"]
                    ),
                    None,
                ),
                "quote": content[start:end],
            }
        )
    return evidence


def _compile_versions(session: Session, run: CompileRun, items: list[KnowledgeItem]) -> list[SourceVersion]:
    versions = session.scalars(select(SourceVersion).where(
        SourceVersion.source_version_id.in_(run.source_version_ids)
    )).all()
    if len(versions) != len(run.source_version_ids):
        raise DeepSeekError("source_version_missing", "任务中的资料版本不存在")
    source_ids = {version.source_id for version in versions}
    # Recompile the connected source component, including other support for shared pages.
    while True:
        expanded = source_ids | {
            source_id for item in items if source_ids.intersection(item.source_ids or [])
            for source_id in item.source_ids or []
        }
        if expanded == source_ids:
            break
        source_ids = expanded
    existing_ids = {version.source_id for version in versions}
    for source_id in sorted(source_ids):
        source = session.get(Source, source_id)
        if not source or source.status == "removed":
            raise DeepSeekError("source_unavailable", "任务中的资料已移出")
        if source_id not in existing_ids:
            version = session.get(SourceVersion, source.current_version_id)
            if not version or version.status == "needs_review":
                raise DeepSeekError("source_needs_review", "关联资料文字尚待核对，请完成核对后重新处理")
            versions.append(version)
    for version in versions:
        if session.get(Source, version.source_id).current_version_id != version.source_version_id:
            raise DeepSeekError("stale_source_version", "资料版本已变化，请重新处理当前资料")
    return sorted(versions, key=lambda version: version.source_version_id)


def _group_evidence(version: SourceVersion, evidence: list[dict]) -> None:
    if not evidence:
        return
    headings: list[tuple[int, int, str]] = []
    questions: list[tuple[int, int, str]] = []
    offset = 0
    fence = None
    for line in version.extracted_text.splitlines(keepends=True):
        stripped = line.strip()
        marker = re.match(r"^(`{3,}|~{3,})", stripped)
        if marker:
            token = marker.group(1)
            if fence is None:
                fence = token
            elif token[0] == fence[0] and len(token) >= len(fence) and stripped == token:
                fence = None
        elif fence is None and offset >= evidence[0]["charStart"]:
            heading = re.match(r"^(#{1,6})\s+(.+?)\s*#*\s*$", stripped)
            question = re.match(r"^(?:\d+[.)、]\s*|Q\d*[:：]\s*|问题\s*\d*[:：]\s*)(.+)", stripped, re.I)
            if heading:
                headings.append((offset, len(heading.group(1)), heading.group(2)))
            elif question and (stripped.endswith(("?", "？")) or stripped.startswith(("Q", "问题"))):
                questions.append((offset, 0, stripped))
        offset += len(line)
    levels = Counter(level for _, level, _ in headings)
    peer_level = min((level for level, count in levels.items() if count > 1), default=0)
    boundaries = sorted([
        *questions,
        *(heading for heading in headings if heading[1] == peer_level
          or heading[2].endswith(("?", "？"))),
    ])
    unit_index = -1
    boundary_index = 0
    title = headings[0][2] if not boundaries and headings else evidence[0]["sourceTitle"]
    for index, fragment in enumerate(evidence):
        changed = False
        while boundary_index < len(boundaries) and boundaries[boundary_index][0] <= fragment["charStart"]:
            title = boundaries[boundary_index][2]
            boundary_index += 1
            changed = True
        paragraph_start = index == 0 or "\n\n" in version.extracted_text[
            evidence[index - 1]["charEnd"]:fragment["charStart"]
        ].replace("\r\n", "\n")
        if index == 0 or changed or (not boundaries and paragraph_start):
            unit_index += 1
        fragment["unitId"] = f"U-{version.source_version_id}-{unit_index}"
        fragment["unitTitle"] = title


def _evidence_batches(
    evidence: list[dict], existing_knowledge: list[dict] | None = None,
) -> list[list[dict]]:
    settings = get_settings()
    context = existing_knowledge or []
    empty_size = sum(len(message["content"]) for message in compile_messages([], []))
    overhead = sum(len(message["content"]) for message in compile_messages([], context))
    groups: list[list[dict]] = []
    for fragment in evidence:
        key = fragment.get("unitId", fragment["evidenceId"])
        if not groups or groups[-1][0].get("unitId", groups[-1][0]["evidenceId"]) != key:
            groups.append([])
        groups[-1].append(fragment)
    batches: list[list[dict]] = []
    batch: list[dict] = []
    size, units = overhead, 0
    for group in groups:
        group_size = sum(len(message["content"]) for message in compile_messages(group, [])) - empty_size + 2
        if batch and (units >= settings.compile_batch_units or size + group_size > settings.compile_batch_chars):
            batches.append(batch)
            batch, size, units = [], overhead, 0
        for fragment in group:
            fragment_size = sum(len(message["content"]) for message in compile_messages([fragment], [])) - empty_size + 2
            if overhead + fragment_size > settings.compile_batch_chars:
                raise DeepSeekError("compile_context_too_large", "资料和已有知识上下文超过单批处理限制", retryable=False)
            if batch and size + fragment_size > settings.compile_batch_chars:
                batches.append(batch)
                batch, size, units = [], overhead, 0
            batch.append(fragment)
            size += fragment_size
        units += 1
    if batch:
        batches.append(batch)
    return batches


def _knowledge_identity(
    title: str, existing_by_title: dict[str, KnowledgeItem]
) -> tuple[str, str, bool]:
    existing = existing_by_title.get(knowledge_title_key(title))
    if existing:
        return existing.knowledge_id, existing.slug, True
    digest = hashlib.sha1(knowledge_title_key(title).encode("utf-8"), usedforsecurity=False).hexdigest()[:16].upper()
    return f"K-USER-{digest}", f"user-{digest.lower()}", False


def _payload_digest(value: object) -> str:
    return hashlib.sha256(json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":"),
    ).encode("utf-8")).hexdigest()


async def _compile_batches(
    session: Session, run: CompileRun, batches: list[list[dict]], existing_context: list[dict],
    profile, client, versions: list[SourceVersion], base_snapshot_id: str | None,
) -> list[CompilePayload]:
    settings = get_settings()
    signature = _payload_digest({
        "revision": 2, "baseSnapshotId": base_snapshot_id,
        "profile": [profile.profile_id, profile.model_id, getattr(profile, "base_url", "")],
        "versions": [version.content_sha256 for version in versions],
        "context": existing_context,
        "batches": [[{key: value for key, value in fragment.items() if key != "path"}
                     for fragment in batch] for batch in batches],
    })
    old = (run.candidate or {}).get("checkpoint", {})
    results: dict[int, CompilePayload] = {}
    if isinstance(old, dict) and old.get("signature") == signature and isinstance(old.get("completed"), dict):
        for index, batch in enumerate(batches):
            saved = old["completed"].get(str(index))
            try:
                if not isinstance(saved, dict) or saved.get("sha256") != _payload_digest(saved.get("result")):
                    continue
                result = CompilePayload.model_validate(saved["result"])
                validate_compile_result(result, batch, existing_context)
                results[index] = result
            except (ValidationError, DeepSeekError, KeyError, TypeError, ValueError):
                continue
    checkpoint = {
        "signature": signature,
        "completed": {str(index): {"result": result.model_dump(), "sha256": _payload_digest(result.model_dump())}
                      for index, result in results.items()},
    }
    run.candidate = {"knowledgeItems": [], "relations": [], "checkpoint": checkpoint}
    run.counts = {
        **run.counts, "batchesTotal": len(batches), "batchesCompleted": len(results),
        "batchesReused": len(results), "batchesRetried": 0, "batchesInFlight": 0,
    }
    pending = iter(index for index in range(len(batches)) if index not in results)
    tasks: dict[asyncio.Task, tuple[int, int]] = {}
    reference_repairs: set[int] = set()
    started = time.perf_counter()
    batch_started: dict[int, float] = {}

    def progress(message: str) -> None:
        run.counts = {
            **run.counts, "batchesCompleted": len(results), "batchesInFlight": len(tasks),
            "evidenceProcessed": sum(len(batches[index]) for index in results),
            "knowledgeCandidates": len({
                knowledge_title_key(item.title) for result in results.values() for item in result.knowledge_items
            }),
            "relationCandidates": sum(len(result.relations) for result in results.values()),
            "compileDurationMs": round((time.perf_counter() - started) * 1000),
        }
        _record_event(session, run, "compiling", message)

    async def request(index: int, attempt: int) -> CompilePayload:
        if attempt:
            await asyncio.sleep(2 ** (attempt - 1))
        options = {"repair_references": True} if index in reference_repairs else {}
        return await client.compile_knowledge(
            evidence=batches[index], existing_knowledge=existing_context, **options,
        )

    def launch(index: int, attempt: int = 0) -> None:
        batch_started.setdefault(index, time.perf_counter())
        task = asyncio.create_task(request(index, attempt), name=f"compile:{run.run_id}:batch:{index}")
        tasks[task] = (index, attempt)

    try:
        for _ in range(settings.compile_concurrency):
            index = next(pending, None)
            if index is not None:
                launch(index)
        progress("正在根据资料内容分组生成知识")
        while tasks:
            completed, _ = await asyncio.wait(
                tasks, timeout=COMPILE_PROGRESS_INTERVAL_SECONDS, return_when=asyncio.FIRST_COMPLETED,
            )
            if not completed:
                progress(f"已完成 {len(results)} / {len(batches)} 批资料，正在等待模型返回")
                continue
            error = None
            for task in sorted(completed, key=lambda task: tasks[task][0]):
                index, attempt = tasks.pop(task)
                try:
                    result = task.result()
                    validate_compile_result(result, batches[index], existing_context)
                except DeepSeekError as exc:
                    repair = exc.code == "invalid_evidence_reference" and index not in reference_repairs
                    transient = exc.retryable and exc.code in {
                        "deepseek_timeout", "deepseek_unreachable", "deepseek_http_error",
                    }
                    if (repair or transient) and attempt < settings.compile_max_retries:
                        if repair:
                            reference_repairs.add(index)
                        run.counts = {**run.counts, "batchesRetried": run.counts["batchesRetried"] + 1}
                        launch(index, attempt + 1)
                        progress("证据引用未通过校验，正在重新生成该批知识" if repair
                                 else "模型请求暂未完成，正在重新处理该批资料")
                    else:
                        error = error or exc
                    continue
                except Exception as exc:
                    error = error or exc
                    continue
                results[index] = result
                payload = result.model_dump()
                checkpoint["completed"][str(index)] = {"result": payload, "sha256": _payload_digest(payload)}
                run.candidate = {"knowledgeItems": [], "relations": [], "checkpoint": deepcopy(checkpoint)}
                run.counts = {**run.counts, "lastBatchDurationMs": round(
                    (time.perf_counter() - batch_started[index]) * 1000,
                )}
                progress(f"已完成 {len(results)} / {len(batches)} 批资料")
            if error:
                raise error
            while len(tasks) < settings.compile_concurrency:
                index = next(pending, None)
                if index is None:
                    break
                launch(index)
            progress(f"已完成 {len(results)} / {len(batches)} 批资料")
    finally:
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        run.counts = {**run.counts, "batchesInFlight": 0, "compileDurationMs": round(
            (time.perf_counter() - started) * 1000,
        )}
        session.commit()
    return [results[index].model_copy(deep=True) for index in range(len(batches))]


async def execute_compile_run(run_id: str) -> None:
    with session_factory()() as session:
        run = session.get(CompileRun, run_id)
        if not run or run.status in TERMINAL_RUN_STATES:
            return
        try:
            run.status = "running"
            _record_event(session, run, "validating", "资料校验完成")
            _record_event(session, run, "importing", "不可变资料版本已经写入")

            project = session.get(Project, run.project_id)
            if not project:
                raise LookupError("知识项目尚未初始化")
            base_snapshot_id = project.current_snapshot_id
            current_items = session.scalars(select(KnowledgeItem).where(
                KnowledgeItem.snapshot_id == base_snapshot_id
            )).all()
            versions = _compile_versions(session, run, current_items)
            run.source_version_ids = [version.source_version_id for version in versions]
            refreshed_source_ids = {version.source_id for version in versions}
            extraction_started = time.perf_counter()
            evidence_payload: list[dict] = []
            for version in versions:
                source = session.get(Source, version.source_id)
                fragments = _split_evidence(
                    version, source.title if source else version.original_filename
                )
                _group_evidence(version, fragments)
                for fragment in fragments:
                    fragment["topic"] = source.domain if source else "knowledge"
                    existing = session.get(Evidence, fragment["evidenceId"])
                    if not existing:
                        session.add(
                            Evidence(
                                evidence_id=fragment["evidenceId"],
                                source_id=fragment["sourceId"],
                                source_version_id=fragment["sourceVersionId"],
                                kind="knowledge",
                                path=fragment["path"],
                                char_start=fragment["charStart"],
                                char_end=fragment["charEnd"],
                                page_number=fragment["pageNumber"],
                                block_number=fragment["blockNumber"],
                                block_label=fragment["blockLabel"],
                                quote=fragment["quote"],
                            )
                        )
                evidence_payload.extend(fragments)
                version.status = "extracted"
            counts = dict(run.counts or {})
            counts["sourcesRead"] = len(versions)
            counts["evidenceFragments"] = len(evidence_payload)
            counts["contentGroups"] = len({fragment["unitId"] for fragment in evidence_payload})
            counts["extractionDurationMs"] = round((time.perf_counter() - extraction_started) * 1000)
            run.counts = counts
            session.commit()
            _record_event(session, run, "extracting", "资料内容和可定位证据已经读取")

            query_text = " ".join(fragment["quote"][:160] for fragment in evidence_payload[:8])
            existing_items = (
                search_knowledge(session, project.current_snapshot_id, query_text, limit=20)
                if project.current_snapshot_id
                else []
            )
            existing_context = [
                {
                    "knowledgeId": item.knowledge_id,
                    "title": item.title,
                    "summary": item.summary,
                    "domain": item.domain,
                }
                for item in existing_items
            ]
            profile, client = get_client(session, require_available=True)
            run.model_profile_id = profile.profile_id
            run.model_id = profile.model_id
            session.commit()
            batches = _evidence_batches(evidence_payload, existing_context)
            if not batches:
                raise DeepSeekError("no_source_evidence", "资料没有可用于生成知识的正文证据")
            batch_results = await _compile_batches(
                session, run, batches, existing_context, profile, client, versions, base_snapshot_id,
            )
            compiled_by_title = {}
            compiled_relations = []
            bodies_by_title: dict[str, set[str]] = {}
            for batch_result in batch_results:
                for item in batch_result.knowledge_items:
                    key = knowledge_title_key(item.title)
                    body = re.sub(r"^# [^\n]+\n*", "", item.markdown.strip()).strip()
                    previous = compiled_by_title.get(key)
                    if previous:
                        if previous.domain != item.domain:
                            raise DeepSeekError("conflicting_knowledge_topic", "同名知识来自不同专题，不能自动合并", retryable=False)
                        if body not in bodies_by_title[key]:
                            previous.markdown += "\n\n" + body
                            bodies_by_title[key].add(body)
                        if item.summary != previous.summary:
                            previous.summary = (previous.summary + " " + item.summary)[:500]
                        previous.evidence_ids = list(dict.fromkeys([*previous.evidence_ids, *item.evidence_ids]))
                    else:
                        compiled_by_title[key] = item
                        bodies_by_title[key] = {body}
                compiled_relations.extend(batch_result.relations)
            # The per-request schema is bounded; the aggregate may contain more than 24 pages.
            result = CompilePayload.model_construct(
                knowledge_items=list(compiled_by_title.values()), relations=compiled_relations,
            )
            validate_compile_result(result, evidence_payload, existing_context)
            existing_by_title = {knowledge_title_key(item.title): item for item in current_items}
            candidate_items: list[dict] = []
            title_to_id: dict[str, str] = {}
            added = 0
            updated = 0
            for item in result.knowledge_items:
                knowledge_id, slug, is_update = _knowledge_identity(item.title, existing_by_title)
                existing_item = existing_by_title.get(knowledge_title_key(item.title))
                if existing_item and existing_item.domain != item.domain:
                    raise DeepSeekError("conflicting_knowledge_topic", "同名知识与已有知识专题不同，不能自动覆盖", retryable=False)
                title_to_id[knowledge_title_key(item.title)] = knowledge_id
                new_source_version_ids = [
                    fragment["sourceVersionId"]
                    for fragment in evidence_payload
                    if fragment["evidenceId"] in item.evidence_ids
                ]
                new_source_ids = [
                    fragment["sourceId"]
                    for fragment in evidence_payload
                    if fragment["evidenceId"] in item.evidence_ids
                ]
                retained_evidence = [
                    evidence_id for evidence_id in (existing_item.evidence_ids if existing_item else [])
                    if (fragment := session.get(Evidence, evidence_id))
                    and fragment.source_id not in refreshed_source_ids
                ]
                retained_versions = [
                    version_id for version_id in (existing_item.source_version_ids if existing_item else [])
                    if (version := session.get(SourceVersion, version_id))
                    and version.source_id not in refreshed_source_ids
                ]
                source_version_ids = list(
                    dict.fromkeys(
                        [
                            *retained_versions,
                            *new_source_version_ids,
                        ]
                    )
                )
                source_ids = list(
                    dict.fromkeys(
                        [*(source_id for source_id in (existing_item.source_ids if existing_item else [])
                           if source_id not in refreshed_source_ids), *new_source_ids]
                    )
                )
                evidence_ids = list(
                    dict.fromkeys(
                        [*item.evidence_ids, *retained_evidence]
                    )
                )
                markdown = item.markdown.strip()
                if not markdown.startswith("#"):
                    markdown = f"# {item.title}\n\n{markdown}"
                candidate_items.append(
                    {
                        "knowledgeId": knowledge_id,
                        "slug": slug,
                        "title": item.title,
                        "type": item.type,
                        "domain": item.domain,
                        "summary": item.summary,
                        "markdown": markdown,
                        "reviewStatus": "accepted",
                        "sourceIds": source_ids,
                        "sourceVersionIds": source_version_ids,
                        "evidenceIds": evidence_ids,
                        "changeType": "updated" if is_update else "added",
                    }
                )
                updated += int(is_update)
                added += int(not is_update)

            warnings: list[dict] = []
            candidate_relations: list[dict] = []
            relations_by_signature: dict[str, dict] = {}
            current_ids = {
                item.knowledge_id for item in current_items
                if not refreshed_source_ids.intersection(item.source_ids or [])
            }
            for relation in result.relations:
                source_id = title_to_id.get(knowledge_title_key(relation.source_title))
                target_id = relation.target_knowledge_id or (
                    title_to_id.get(knowledge_title_key(relation.target_title))
                    if relation.target_title
                    else None
                )
                if (
                    not source_id
                    or not target_id
                    or target_id not in current_ids | set(title_to_id.values())
                ):
                    warnings.append(
                        {
                            "code": "relation_endpoint_unresolved",
                            "message": "一条关系的知识端点无法确认，已保留为待处理",
                            "object": relation.source_title,
                        }
                    )
                    continue
                if source_id == target_id:
                    continue
                signature = f"{source_id}|{relation.type}|{target_id}"
                if signature in relations_by_signature:
                    previous = relations_by_signature[signature]
                    previous["evidenceIds"] = list(dict.fromkeys([
                        *previous["evidenceIds"], *relation.evidence_ids,
                    ]))
                    continue
                relation_id = (
                    "REL-USER-"
                    + hashlib.sha1(signature.encode("utf-8"), usedforsecurity=False)
                    .hexdigest()[:16]
                    .upper()
                )
                candidate_relations.append(
                    {
                        "relationId": relation_id,
                        "sourceKnowledgeId": source_id,
                        "targetKnowledgeId": target_id,
                        "type": relation.type,
                        "directed": relation.directed,
                        "weight": relation.weight,
                        "evidenceIds": relation.evidence_ids,
                        "reviewStatus": "accepted",
                    }
                )
                relations_by_signature[signature] = candidate_relations[-1]

            counts = dict(run.counts or {})
            counts.update(
                {
                    "knowledgeCandidates": len(candidate_items),
                    "knowledgeAdded": added,
                    "knowledgeUpdated": updated,
                    "relationCandidates": len(result.relations),
                    "relationsValid": len(candidate_relations),
                    "warnings": len(warnings),
                }
            )
            run.counts = counts
            run.issues = warnings
            run.candidate = {
                "knowledgeItems": candidate_items, "relations": candidate_relations,
                "baseSnapshotId": base_snapshot_id, "refreshedSourceIds": sorted(refreshed_source_ids),
            }
            session.commit()
            _record_event(session, run, "relating", "知识关系已经建立并绑定来源证据")
            _record_event(session, run, "validating_result", "知识身份、关系端点和来源引用校验完成")
            run.status = "awaiting_review"
            _record_event(session, run, "awaiting_review", "知识结果可以确认发布")
        except DeepSeekError as exc:
            run = session.get(CompileRun, run_id)
            if not run:
                return
            run.status = "failed"
            run.stage = "failed"
            run.error_code = exc.code
            run.error_message = exc.message
            counts = dict(run.counts or {})
            counts["failures"] = counts.get("failures", 0) + 1
            run.counts = counts
            _record_event(session, run, "failed", exc.message)
        except Exception:
            run = session.get(CompileRun, run_id)
            if not run:
                return
            run.status = "failed"
            run.stage = "failed"
            run.error_code = "compile_internal_error"
            run.error_message = "知识处理未完成，请从任务记录重新处理"
            counts = dict(run.counts or {})
            counts["failures"] = counts.get("failures", 0) + 1
            run.counts = counts
            _record_event(session, run, "failed", run.error_message)


def review_view(session: Session, run_id: str) -> dict:
    run = session.get(CompileRun, run_id)
    if not run:
        raise LookupError("处理任务不存在")
    candidate = run.candidate or {"knowledgeItems": [], "relations": []}
    return {
        **compile_run_view(run),
        "knowledgeItems": candidate.get("knowledgeItems", []),
        "relations": candidate.get("relations", []),
        "summary": {
            "added": run.counts.get("knowledgeAdded", 0),
            "updated": run.counts.get("knowledgeUpdated", 0),
            "relations": run.counts.get("relationsValid", 0),
            "warnings": run.counts.get("warnings", 0),
            "failures": run.counts.get("failures", 0),
        },
    }


def accept_run(session: Session, run_id: str) -> dict:
    run = session.get(CompileRun, run_id)
    if not run:
        raise LookupError("处理任务不存在")
    if run.status == "completed" and run.published_snapshot_id:
        snapshot = session.get(Snapshot, run.published_snapshot_id)
        return {
            "run": compile_run_view(run),
            "snapshotId": snapshot.snapshot_id if snapshot else None,
        }
    if run.status != "awaiting_review" or not run.candidate:
        raise ValueError("当前处理结果尚不能发布")
    versions = session.scalars(
        select(SourceVersion).where(SourceVersion.source_version_id.in_(run.source_version_ids))
    ).all()
    if len(versions) != len(run.source_version_ids) or any(
        (source := session.get(Source, version.source_id)) is None or source.status == "removed"
        for version in versions
    ):
        raise ValueError("任务包含已移出的资料，不能发布")
    if any(session.get(Source, version.source_id).current_version_id != version.source_version_id for version in versions):
        run.status = "failed"
        run.error_code = "stale_source_version"
        run.error_message = "资料版本已变化，请重新处理当前资料后发布"
        _record_event(session, run, "failed", run.error_message)
        raise ValueError(run.error_message)
    project = session.get(Project, run.project_id)
    if not project:
        raise ValueError("知识项目不存在")
    previous_id = project.current_snapshot_id
    if "baseSnapshotId" in run.candidate and run.candidate["baseSnapshotId"] != previous_id:
        run.status = "failed"
        run.error_code = "stale_knowledge_version"
        run.error_message = "知识版本已变化，请重新处理后发布"
        _record_event(session, run, "failed", run.error_message)
        raise ValueError(run.error_message)
    refreshed_source_ids = set(run.candidate.get("refreshedSourceIds", []))
    now = datetime.now(UTC)
    snapshot_id = f"KS-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8].upper()}"
    snapshot = Snapshot(
        snapshot_id=snapshot_id,
        project_id=project.project_id,
        version=now.strftime("%Y.%m.%d.%H%M"),
        status="accepted",
        compiled_by={
            "provider": "OpenAI 兼容服务" if run.model_profile_id == "openai-compatible" else "DeepSeek",
            "modelId": run.model_id,
        },
        model_id=run.model_id,
        accepted_at=now,
    )
    session.add(snapshot)
    session.flush()
    run.status = "publishing"
    _append_event(session, run, "publishing", "正在发布新的知识版本")
    session.flush()

    current_items = session.scalars(
        select(KnowledgeItem).where(KnowledgeItem.snapshot_id == previous_id)
    ).all()
    candidate_by_id = {
        item["knowledgeId"]: item for item in run.candidate.get("knowledgeItems", [])
    }
    merged_items: list[KnowledgeItem] = []
    for current in current_items:
        candidate = candidate_by_id.pop(current.knowledge_id, None)
        if not candidate and refreshed_source_ids.intersection(current.source_ids or []):
            continue
        data = candidate or {
            "knowledgeId": current.knowledge_id,
            "slug": current.slug,
            "title": current.title,
            "type": current.type,
            "domain": current.domain,
            "summary": current.summary,
            "markdown": current.markdown,
            "reviewStatus": current.review_status,
            "sourceIds": current.source_ids,
            "sourceVersionIds": current.source_version_ids,
            "evidenceIds": current.evidence_ids,
        }
        merged_items.append(_knowledge_from_candidate(snapshot_id, data, now))
    for candidate in candidate_by_id.values():
        merged_items.append(_knowledge_from_candidate(snapshot_id, candidate, now))
    session.add_all(merged_items)

    current_relations = session.scalars(
        select(Relation).where(Relation.snapshot_id == previous_id)
    ).all()
    refreshed_evidence_ids = set(session.scalars(select(Evidence.evidence_id).where(
        Evidence.source_id.in_(refreshed_source_ids)
    )).all()) if refreshed_source_ids else set()
    valid_ids = {item.knowledge_id for item in merged_items}
    candidate_signatures = {
        (relation["sourceKnowledgeId"], relation["type"], relation["targetKnowledgeId"])
        for relation in run.candidate.get("relations", [])
    }
    relation_signatures: set[tuple[str, str, str]] = set()
    merged_relations: list[Relation] = []
    for relation in current_relations:
        signature = (relation.source_knowledge_id, relation.type, relation.target_knowledge_id)
        if (signature in candidate_signatures
                or relation.source_knowledge_id not in valid_ids
                or relation.target_knowledge_id not in valid_ids
                or refreshed_evidence_ids.intersection(relation.evidence_ids or [])):
            continue
        relation_signatures.add(signature)
        merged_relations.append(
            Relation(
                snapshot_id=snapshot_id,
                relation_id=relation.relation_id,
                source_knowledge_id=relation.source_knowledge_id,
                target_knowledge_id=relation.target_knowledge_id,
                type=relation.type,
                directed=relation.directed,
                weight=relation.weight,
                evidence_ids=relation.evidence_ids,
                review_status=relation.review_status,
            )
        )
    for relation in run.candidate.get("relations", []):
        signature = (relation["sourceKnowledgeId"], relation["type"], relation["targetKnowledgeId"])
        if signature in relation_signatures:
            continue
        if (
            relation["sourceKnowledgeId"] not in valid_ids
            or relation["targetKnowledgeId"] not in valid_ids
        ):
            raise ValueError("发布前发现关系端点不存在")
        relation_signatures.add(signature)
        merged_relations.append(
            Relation(
                snapshot_id=snapshot_id,
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
    session.add_all(merged_relations)

    previous_questions = session.scalars(
        select(SuggestedQuestion).where(SuggestedQuestion.snapshot_id == previous_id).limit(4)
    ).all()
    for index, question in enumerate(previous_questions, start=1):
        related = [item for item in question.related_knowledge_ids if item in valid_ids]
        session.add(
            SuggestedQuestion(
                question_id=f"SQ-{snapshot_id}-{index}",
                snapshot_id=snapshot_id,
                text=question.text,
                related_knowledge_ids=related,
                generated_at=now,
            )
        )
    new_titles = [item["title"] for item in run.candidate.get("knowledgeItems", [])]
    if new_titles:
        first = run.candidate["knowledgeItems"][0]
        session.add(
            SuggestedQuestion(
                question_id=f"SQ-{snapshot_id}-NEW",
                snapshot_id=snapshot_id,
                text=f"{first['title']}的核心规则是什么？",
                related_knowledge_ids=[first["knowledgeId"]],
                generated_at=now,
            )
        )

    source_version_ids = {
        source_version_id
        for item in merged_items
        for source_version_id in (item.source_version_ids or [])
    }
    evidence_ids = {
        evidence_id for item in merged_items for evidence_id in (item.evidence_ids or [])
    } | {
        evidence_id
        for relation in merged_relations
        for evidence_id in (relation.evidence_ids or [])
    }
    snapshot.source_version_count = len(source_version_ids)
    snapshot.knowledge_count = len(merged_items)
    snapshot.relation_count = len(merged_relations)
    snapshot.evidence_count = len(evidence_ids)
    project.current_snapshot_id = snapshot_id
    run.status = "completed"
    run.stage = "completed"
    run.published_snapshot_id = snapshot_id
    run.error_code = None
    run.error_message = None
    for version_id in run.source_version_ids:
        version = session.get(SourceVersion, version_id)
        if version:
            version.status = "ready"
            source = session.get(Source, version.source_id)
            if source:
                source.status = "ready"
    knowledge_counts: Counter[str] = Counter(
        source_id for item in merged_items for source_id in (item.source_ids or [])
    )
    for source in session.scalars(select(Source)).all():
        source.knowledge_count = knowledge_counts[source.source_id]
    session.flush()
    rebuild_search_index(session, snapshot_id, commit=False)
    _append_event(session, run, "completed", "新的知识版本已经发布")
    session.commit()
    return {"run": compile_run_view(run), "snapshotId": snapshot_id}


def _knowledge_from_candidate(snapshot_id: str, data: dict, updated_at: datetime) -> KnowledgeItem:
    return KnowledgeItem(
        snapshot_id=snapshot_id,
        knowledge_id=data["knowledgeId"],
        slug=data["slug"],
        title=data["title"],
        type=data["type"],
        domain=data["domain"],
        summary=data["summary"],
        markdown=data["markdown"],
        review_status=data.get("reviewStatus", "accepted"),
        source_ids=data.get("sourceIds", []),
        source_version_ids=data.get("sourceVersionIds", []),
        evidence_ids=data.get("evidenceIds", []),
        updated_at=updated_at,
    )


def retry_run(session: Session, run_id: str) -> dict:
    previous = session.get(CompileRun, run_id)
    if not previous:
        raise LookupError("处理任务不存在")
    if previous.status not in {"failed", "interrupted"}:
        raise ValueError("只有失败或中断的任务可以重新处理")
    versions = session.scalars(
        select(SourceVersion).where(SourceVersion.source_version_id.in_(previous.source_version_ids))
    ).all()
    if len(versions) != len(previous.source_version_ids) or any(
        (source := session.get(Source, version.source_id)) is None or source.status == "removed"
        for version in versions
    ):
        raise ValueError("任务包含已移出的资料，不能重新处理")
    current_version_ids = list(dict.fromkeys(
        session.get(Source, version.source_id).current_version_id for version in versions
    ))
    if any(
        not (version := session.get(SourceVersion, version_id)) or version.status == "needs_review"
        for version_id in current_version_ids
    ):
        raise ValueError("当前资料文字尚待核对，请完成核对后重新处理")
    run = CompileRun(
        run_id=f"RUN-{uuid.uuid4().hex.upper()}",
        project_id=previous.project_id,
        status="queued",
        stage="validating",
        source_version_ids=current_version_ids,
        counts={
            "filesTotal": len(previous.source_version_ids),
            "filesAccepted": len(previous.source_version_ids),
            "filesFailed": 0,
            "filesDuplicate": 0,
            "sourcesRead": 0,
            "evidenceFragments": 0,
            "knowledgeCandidates": 0,
            "knowledgeAdded": 0,
            "knowledgeUpdated": 0,
            "relationCandidates": 0,
            "relationsValid": 0,
            "warnings": 0,
            "failures": 0,
        },
        candidate=deepcopy(previous.candidate) if (previous.candidate or {}).get("checkpoint") else None,
    )
    session.add(run)
    session.commit()
    from app.workers.runner import schedule_compile

    schedule_compile(run.run_id)
    return compile_run_view(run)


async def cancel_run(run_id: str) -> dict:
    from app.workers.runner import stop_compile

    with session_factory()() as session:
        run = session.get(CompileRun, run_id)
        if not run:
            raise LookupError("处理任务不存在")
        if run.status in TERMINAL_RUN_STATES:
            raise ValueError("只有进行中的任务可以取消")
    await stop_compile(run_id)
    with session_factory()() as session:
        run = session.get(CompileRun, run_id)
        if not run or run.status in TERMINAL_RUN_STATES:
            raise ValueError("任务已结束，无法取消")
        run.status = "cancelled"
        run.candidate = None
        _record_event(session, run, "cancelled", "任务已取消，未发布知识")
        return compile_run_view(run)


def delete_run(session: Session, run_id: str) -> None:
    run = session.get(CompileRun, run_id)
    if not run:
        raise LookupError("处理任务不存在")
    if run.status not in TERMINAL_RUN_STATES:
        raise ValueError("请先取消进行中的任务")
    session.execute(delete(CompileEvent).where(CompileEvent.run_id == run_id))
    session.delete(run)
    session.commit()
