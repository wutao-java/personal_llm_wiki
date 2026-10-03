from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class Project(Base):
    __tablename__ = "projects"

    project_id: Mapped[str] = mapped_column(String(96), primary_key=True)
    name: Mapped[str] = mapped_column(String(240))
    current_snapshot_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    seeded_version: Mapped[str | None] = mapped_column(String(40), nullable=True)
    initialized_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class Source(Base):
    __tablename__ = "sources"

    source_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.project_id"), index=True)
    title: Mapped[str] = mapped_column(String(320))
    filename: Mapped[str] = mapped_column(String(320))
    domain: Mapped[str] = mapped_column(String(64), default="other", index=True)
    document_type: Mapped[str] = mapped_column(String(80), default="markdown")
    current_version_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status: Mapped[str] = mapped_column(String(48), default="ready", index=True)
    knowledge_count: Mapped[int] = mapped_column(Integer, default=0)
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class SourceVersion(Base):
    __tablename__ = "source_versions"
    __table_args__ = (UniqueConstraint("source_id", "version", name="uq_source_version"),)

    source_version_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.source_id"), index=True)
    version: Mapped[str] = mapped_column(String(40))
    content_sha256: Mapped[str] = mapped_column(String(64), index=True)
    original_path: Mapped[str] = mapped_column(Text)
    original_filename: Mapped[str] = mapped_column(String(320))
    mime_type: Mapped[str] = mapped_column(String(120), default="text/markdown")
    size_bytes: Mapped[int] = mapped_column(Integer)
    extracted_text: Mapped[str] = mapped_column(Text)
    page_spans: Mapped[list[dict]] = mapped_column(JSON, default=list)
    block_spans: Mapped[list[dict]] = mapped_column(JSON, default=list)
    supersedes: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status: Mapped[str] = mapped_column(String(48), default="ready", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Snapshot(Base):
    __tablename__ = "knowledge_snapshots"

    snapshot_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.project_id"), index=True)
    version: Mapped[str] = mapped_column(String(48))
    status: Mapped[str] = mapped_column(String(32), default="accepted", index=True)
    compiled_by: Mapped[dict | str] = mapped_column(JSON, default="system")
    model_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    source_version_count: Mapped[int] = mapped_column(Integer, default=0)
    knowledge_count: Mapped[int] = mapped_column(Integer, default=0)
    relation_count: Mapped[int] = mapped_column(Integer, default=0)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Evidence(Base):
    __tablename__ = "evidence_fragments"

    evidence_id: Mapped[str] = mapped_column(String(240), primary_key=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.source_id"), index=True)
    source_version_id: Mapped[str] = mapped_column(
        ForeignKey("source_versions.source_version_id"), index=True
    )
    kind: Mapped[str] = mapped_column(String(40), default="knowledge")
    path: Mapped[str] = mapped_column(Text)
    char_start: Mapped[int] = mapped_column(Integer, default=0)
    char_end: Mapped[int] = mapped_column(Integer, default=0)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    block_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    block_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    quote: Mapped[str] = mapped_column(Text)


class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"
    __table_args__ = (
        UniqueConstraint("snapshot_id", "knowledge_id", name="uq_snapshot_knowledge"),
        Index("ix_knowledge_snapshot_domain", "snapshot_id", "domain"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("knowledge_snapshots.snapshot_id"), index=True
    )
    knowledge_id: Mapped[str] = mapped_column(String(180), index=True)
    slug: Mapped[str] = mapped_column(String(180))
    title: Mapped[str] = mapped_column(String(320), index=True)
    type: Mapped[str] = mapped_column(String(80), index=True)
    domain: Mapped[str] = mapped_column(String(64), index=True)
    summary: Mapped[str] = mapped_column(Text)
    markdown: Mapped[str] = mapped_column(Text)
    review_status: Mapped[str] = mapped_column(String(40), default="accepted", index=True)
    source_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    source_version_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    evidence_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Relation(Base):
    __tablename__ = "relations"
    __table_args__ = (
        UniqueConstraint("snapshot_id", "relation_id", name="uq_snapshot_relation"),
        Index(
            "ix_relation_snapshot_endpoints",
            "snapshot_id",
            "source_knowledge_id",
            "target_knowledge_id",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("knowledge_snapshots.snapshot_id"), index=True
    )
    relation_id: Mapped[str] = mapped_column(String(180), index=True)
    source_knowledge_id: Mapped[str] = mapped_column(String(180), index=True)
    target_knowledge_id: Mapped[str] = mapped_column(String(180), index=True)
    type: Mapped[str] = mapped_column(String(80), index=True)
    directed: Mapped[bool] = mapped_column(Boolean, default=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    evidence_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    review_status: Mapped[str] = mapped_column(String(40), default="accepted")


class SuggestedQuestion(Base):
    __tablename__ = "suggested_questions"
    __table_args__ = (UniqueConstraint("snapshot_id", "question_id", name="uq_snapshot_question"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[str] = mapped_column(String(128), index=True)
    snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("knowledge_snapshots.snapshot_id"), index=True
    )
    text: Mapped[str] = mapped_column(Text)
    related_knowledge_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CompileRun(Base):
    __tablename__ = "compile_runs"

    run_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.project_id"), index=True)
    status: Mapped[str] = mapped_column(String(40), default="queued", index=True)
    stage: Mapped[str] = mapped_column(String(64), default="validating")
    source_version_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    counts: Mapped[dict] = mapped_column(JSON, default=dict)
    issues: Mapped[list[dict]] = mapped_column(JSON, default=list)
    candidate: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    model_profile_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    model_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    published_snapshot_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class CompileEvent(Base):
    __tablename__ = "compile_events"
    __table_args__ = (UniqueConstraint("run_id", "sequence", name="uq_compile_event_sequence"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("compile_runs.run_id"), index=True)
    sequence: Mapped[int] = mapped_column(Integer)
    stage: Mapped[str] = mapped_column(String(64))
    message: Mapped[str] = mapped_column(Text)
    counts: Mapped[dict] = mapped_column(JSON, default=dict)
    object_id: Mapped[str | None] = mapped_column(String(180), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    conversation_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.project_id"), index=True)
    title: Mapped[str] = mapped_column(String(240), default="新对话")
    context_knowledge_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class Message(Base):
    __tablename__ = "messages"

    message_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.conversation_id"), index=True
    )
    role: Mapped[str] = mapped_column(String(24))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Answer(Base):
    __tablename__ = "answers"

    answer_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.conversation_id"), index=True
    )
    question_message_id: Mapped[str] = mapped_column(ForeignKey("messages.message_id"))
    answer_message_id: Mapped[str | None] = mapped_column(
        ForeignKey("messages.message_id"), nullable=True
    )
    snapshot_id: Mapped[str] = mapped_column(String(128), index=True)
    status: Mapped[str] = mapped_column(String(40), default="received", index=True)
    content: Mapped[str] = mapped_column(Text, default="")
    citations: Mapped[list[dict]] = mapped_column(JSON, default=list)
    related_knowledge_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    evidence_status: Mapped[str] = mapped_column(String(40), default="pending")
    retrieved_source_count: Mapped[int] = mapped_column(Integer, default=0)
    used_source_count: Mapped[int] = mapped_column(Integer, default=0)
    model_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    model_profile_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AnswerEvent(Base):
    __tablename__ = "answer_events"
    __table_args__ = (UniqueConstraint("answer_id", "sequence", name="uq_answer_event_sequence"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    answer_id: Mapped[str] = mapped_column(ForeignKey("answers.answer_id"), index=True)
    sequence: Mapped[int] = mapped_column(Integer)
    event_type: Mapped[str] = mapped_column(String(48))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AnswerReview(Base):
    __tablename__ = "answer_reviews"

    answer_id: Mapped[str] = mapped_column(
        ForeignKey("answers.answer_id"), primary_key=True
    )
    verdict: Mapped[str] = mapped_column(String(24))
    category: Mapped[str | None] = mapped_column(String(40), nullable=True)
    note: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class ModelProfile(Base):
    __tablename__ = "model_profiles"

    profile_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    base_url: Mapped[str] = mapped_column(String(500))
    model_id: Mapped[str] = mapped_column(String(160))
    model_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    credential_ref: Mapped[str | None] = mapped_column(String(240), nullable=True)
    key_configured: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(40), default="untested")
    last_tested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class AppPreference(Base):
    __tablename__ = "app_preferences"

    preference_id: Mapped[str] = mapped_column(String(64), primary_key=True, default="default")
    theme_preference: Mapped[str] = mapped_column(String(16), default="light")
    reduce_motion: Mapped[bool] = mapped_column(Boolean, default=False)
    default_model_profile_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
