"""Store structured compiler metadata on knowledge snapshots.

Revision ID: 0002_snapshot_compiler_metadata
Revises: 0001_initial
Create Date: 2026-08-04
"""

import sqlalchemy as sa
from alembic import op

revision = "0002_snapshot_compiler_metadata"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("knowledge_snapshots") as batch_op:
        batch_op.alter_column(
            "compiled_by",
            existing_type=sa.String(length=80),
            type_=sa.JSON(),
            existing_nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("knowledge_snapshots") as batch_op:
        batch_op.alter_column(
            "compiled_by",
            existing_type=sa.JSON(),
            type_=sa.String(length=80),
            existing_nullable=False,
        )
