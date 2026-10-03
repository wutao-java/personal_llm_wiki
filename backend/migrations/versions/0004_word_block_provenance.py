"""Retain Word paragraph and table-row source boundaries.

Revision ID: 0004_word_block_provenance
Revises: 0003_pdf_page_provenance
"""

import sqlalchemy as sa
from alembic import op

revision = "0004_word_block_provenance"
down_revision = "0003_pdf_page_provenance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    source_columns = {column["name"] for column in inspector.get_columns("source_versions")}
    evidence_columns = {column["name"] for column in inspector.get_columns("evidence_fragments")}
    if "block_spans" not in source_columns:
        with op.batch_alter_table("source_versions") as batch_op:
            batch_op.add_column(sa.Column("block_spans", sa.JSON(), nullable=False, server_default="[]"))
    if "block_number" not in evidence_columns:
        with op.batch_alter_table("evidence_fragments") as batch_op:
            batch_op.add_column(sa.Column("block_number", sa.Integer(), nullable=True))
    if "block_label" not in evidence_columns:
        with op.batch_alter_table("evidence_fragments") as batch_op:
            batch_op.add_column(sa.Column("block_label", sa.String(length=120), nullable=True))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    evidence_columns = {column["name"] for column in inspector.get_columns("evidence_fragments")}
    source_columns = {column["name"] for column in inspector.get_columns("source_versions")}
    if "block_label" in evidence_columns:
        with op.batch_alter_table("evidence_fragments") as batch_op:
            batch_op.drop_column("block_label")
    if "block_number" in evidence_columns:
        with op.batch_alter_table("evidence_fragments") as batch_op:
            batch_op.drop_column("block_number")
    if "block_spans" in source_columns:
        with op.batch_alter_table("source_versions") as batch_op:
            batch_op.drop_column("block_spans")
