"""Keep the selected online service with each answer.

Revision ID: 0005_answer_model_profile
Revises: 0004_word_block_provenance
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_answer_model_profile"
down_revision = "0004_word_block_provenance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("answers")}
    if "model_profile_id" not in columns:
        with op.batch_alter_table("answers") as batch_op:
            batch_op.add_column(sa.Column("model_profile_id", sa.String(length=128), nullable=True))


def downgrade() -> None:
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("answers")}
    if "model_profile_id" in columns:
        with op.batch_alter_table("answers") as batch_op:
            batch_op.drop_column("model_profile_id")
