"""Persist manual answer checks separately from immutable answer records.

Revision ID: 0007_answer_reviews
Revises: 0006_model_catalog
"""

import sqlalchemy as sa
from alembic import op

revision = "0007_answer_reviews"
down_revision = "0006_model_catalog"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "answer_reviews" not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table(
            "answer_reviews",
            sa.Column("answer_id", sa.String(length=128), sa.ForeignKey("answers.answer_id"), primary_key=True),
            sa.Column("verdict", sa.String(length=24), nullable=False),
            sa.Column("category", sa.String(length=40), nullable=True),
            sa.Column("note", sa.Text(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )


def downgrade() -> None:
    op.drop_table("answer_reviews")
