"""Retain PDF page boundaries and evidence page numbers.

Revision ID: 0003_pdf_page_provenance
Revises: 0002_snapshot_compiler_metadata
"""

import sqlalchemy as sa
from alembic import op

revision = "0003_pdf_page_provenance"
down_revision = "0002_snapshot_compiler_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    source_columns = {column["name"] for column in inspector.get_columns("source_versions")}
    evidence_columns = {column["name"] for column in inspector.get_columns("evidence_fragments")}
    if "page_spans" not in source_columns:
        with op.batch_alter_table("source_versions") as batch_op:
            batch_op.add_column(sa.Column("page_spans", sa.JSON(), nullable=False, server_default="[]"))
    if "page_number" not in evidence_columns:
        with op.batch_alter_table("evidence_fragments") as batch_op:
            batch_op.add_column(sa.Column("page_number", sa.Integer(), nullable=True))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    evidence_columns = {column["name"] for column in inspector.get_columns("evidence_fragments")}
    source_columns = {column["name"] for column in inspector.get_columns("source_versions")}
    if "page_number" in evidence_columns:
        with op.batch_alter_table("evidence_fragments") as batch_op:
            batch_op.drop_column("page_number")
    if "page_spans" in source_columns:
        with op.batch_alter_table("source_versions") as batch_op:
            batch_op.drop_column("page_spans")
