"""Create the MVP knowledge store.

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-04
"""

from alembic import op

from app.db.models import Base

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)
    op.execute(
        """
        CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_search USING fts5(
          knowledge_id UNINDEXED,
          snapshot_id UNINDEXED,
          title,
          summary,
          markdown,
          tokenize='trigram'
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS knowledge_search")
    Base.metadata.drop_all(bind=op.get_bind())
