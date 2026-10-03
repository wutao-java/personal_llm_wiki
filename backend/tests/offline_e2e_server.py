"""Isolated browser-test server using offline model results and real product routes."""

import asyncio
from contextlib import asynccontextmanager

from app.adapters.deepseek import CompilePayload, DeepSeekError
from app.core.config import get_settings
from app.db.session import session_factory
from app.main import app
from app.services import compilation, qa
from app.services.settings import current_profile, model_profile

if not get_settings().testing or get_settings().seed_fixture:
    raise RuntimeError("The offline browser-test server requires isolated test mode")

pipeline_attempts: dict[str, int] = {}


class OfflineClient:
    def __init__(self, model_id: str):
        self.model_id = model_id

    async def compile_knowledge(
        self, *, evidence: list[dict], existing_knowledge: list[dict], repair_references: bool = False,
    ):
        if any("Reference check" in item["quote"] for item in evidence):
            await asyncio.sleep(1)
            return CompilePayload.model_validate({
                "knowledge_items": [{
                    "title": "Reference check", "domain": evidence[0]["topic"],
                    "summary": "Retained evidence supports the corrected knowledge page.",
                    "markdown": "# Reference check\n\n" + "\n\n".join(item["quote"] for item in evidence),
                    "evidence_ids": ([item["evidenceId"] for item in evidence]
                                     if repair_references else ["E-OUTSIDE"]),
                }], "relations": [],
            })
        if any("Waiting check" in item["quote"] for item in evidence):
            await asyncio.sleep(8)
            return CompilePayload.model_validate({
                "knowledge_items": [{
                    "title": evidence[0]["unitTitle"], "domain": evidence[0]["topic"],
                    "summary": "Retained evidence supports the completed knowledge page.",
                    "markdown": "# Waiting check\n\n" + "\n\n".join(item["quote"] for item in evidence),
                    "evidence_ids": [item["evidenceId"] for item in evidence],
                }], "relations": [],
            })
        if any("Pipeline check" in item["quote"] for item in evidence):
            title = evidence[0]["unitTitle"]
            key = evidence[0]["evidenceId"]
            pipeline_attempts[key] = pipeline_attempts.get(key, 0) + 1
            number = int(title.rsplit(" ", 1)[-1].rstrip("?"))
            await asyncio.sleep({0: 0.8, 1: 1.0, 2: 2.0}.get(number, 3.0))
            if number == 2 and pipeline_attempts[key] == 1:
                raise DeepSeekError("invalid_compile_output", "本批知识结构未通过校验", retryable=False)
            return CompilePayload.model_validate({
                "knowledge_items": [{
                    "title": title, "domain": evidence[0]["topic"],
                    "summary": "Retained pipeline evidence supports this complete knowledge page.",
                    "markdown": f"# {title}\n\n" + "\n\n".join(item["quote"] for item in evidence),
                    "evidence_ids": [item["evidenceId"] for item in evidence],
                }],
                "relations": [],
            })
        if all(item["quote"].startswith("Directory entry ") for item in evidence):
            return CompilePayload.model_validate({
                "knowledge_items": [{
                    "title": item["sourceTitle"], "domain": item["topic"],
                    "summary": item["quote"], "markdown": f"# {item['sourceTitle']}\n\n{item['quote']}\n\n{item['evidenceId']}",
                    "evidence_ids": [item["evidenceId"]],
                } for item in evidence],
                "relations": [],
            })
        if any(item.get("blockLabel") for item in evidence):
            row = next(item for item in evidence if "Python files must close" in item["quote"])
            assert row["blockLabel"] == "表格 1 · 第 2 行"
            return CompilePayload.model_validate(
                {
                    "knowledge_items": [{
                        "title": "Python file cleanup",
                        "type": "rule",
                        "domain": "Python",
                        "summary": "Python files must close after a with block.",
                        "markdown": "# Python file cleanup\n\nClose Python files after a with block.",
                        "evidence_ids": [row["evidenceId"]],
                    }],
                    "relations": [],
                }
            )
        scanned = next((item for item in evidence if item.get("pageNumber") == 2 and "Python Agent notes" in item["quote"]), None)
        if scanned:
            return CompilePayload.model_validate({
                "knowledge_items": [{
                    "title": "Scanned source page",
                    "type": "concept",
                    "domain": scanned["topic"],
                    "summary": "Cite the second physical PDF page.",
                    "markdown": "# Scanned source page\n\nCite original evidence.",
                    "evidence_ids": [scanned["evidenceId"]],
                }],
                "relations": [],
            })
        corrected = next((item for item in evidence if item.get("pageNumber") == 1 and "Human verified" in item["quote"]), None)
        if corrected:
            return CompilePayload.model_validate({
                "knowledge_items": [{
                    "title": "Verified scanned source", "type": "concept",
                    "domain": corrected["topic"],
                    "summary": "The first physical page has verified text.",
                    "markdown": "# Verified scanned source\n\nCite the corrected original page.",
                    "evidence_ids": [corrected["evidenceId"]],
                }],
                "relations": [],
            })
        assert len(evidence) == 2
        first, second = evidence
        assert first["topic"] == second["topic"] == "Python"
        return CompilePayload.model_validate(
            {
                "knowledge_items": [
                    {
                        "title": "Python context managers",
                        "type": "concept",
                        "domain": "Python",
                        "summary": "Python context managers close resources after a with block.",
                        "markdown": "# Python context managers\n\nContext managers close resources after use.",
                        "evidence_ids": [first["evidenceId"]],
                    },
                    {
                        "title": "Closing file handles",
                        "type": "practice",
                        "domain": "Python",
                        "summary": "Closing file handles avoids leaked resources in Python.",
                        "markdown": "# Closing file handles\n\nClosing files prevents leaked file handles.",
                        "evidence_ids": [second["evidenceId"]],
                    },
                ],
                "relations": [
                    {
                        "source_title": "Python context managers",
                        "target_title": "Closing file handles",
                        "type": "supports",
                        "evidence_ids": [second["evidenceId"]],
                    }
                ],
            }
        )

    async def stream_answer(self, *, question: str, evidence: list[dict], history: list[dict] | None = None):
        assert evidence and evidence[0]["sourceVersionId"]
        if evidence[0]["quote"].startswith("Directory entry "):
            if question == "那它更新后呢？":
                assert history and history[-1]["content"] == "revised-only-needle"
            yield evidence[0]["quote"] + " [1]"
            return
        assert "Python" in question or any("Python" in item["content"] for item in history or [])
        if question == "Python slow recovery":
            yield "Python context managers "
            await asyncio.sleep(8)
            yield "close resources after a with block. [1]"
            return
        if evidence[0].get("blockLabel"):
            yield "Python files must close after a with block. [1]"
        elif "Human verified" in evidence[0]["quote"]:
            yield "The verified Python source cites the first physical page. [1]"
        elif evidence[0].get("extractionMethod") == "ocr":
            yield "Python Agent notes preserve the source and cite the second page. [1]"
        else:
            yield "Python context managers close resources after a with block. [1]"


def offline_client(
    session, *, require_available: bool,
    profile_id: str | None = None, model_id: str | None = None,
):
    profile = model_profile(session, profile_id) if profile_id else current_profile(session)
    return profile, OfflineClient(model_id or profile.model_id)


compilation.get_client = offline_client
qa.get_client = offline_client
original_lifespan = app.router.lifespan_context


@asynccontextmanager
async def offline_lifespan(application):
    async with original_lifespan(application):
        with session_factory()() as session:
            profile = current_profile(session)
            profile.status = "available"
            profile.key_configured = True
            profile.model_ids = [profile.model_id]
            session.commit()
        yield


app.router.lifespan_context = offline_lifespan
