"""Persist selectable models for each online service.

Revision ID: 0006_model_catalog
Revises: 0005_answer_model_profile
"""

import sqlalchemy as sa
from alembic import op

revision = "0006_model_catalog"
down_revision = "0005_answer_model_profile"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("model_profiles")}
    if "model_ids" not in columns:
        with op.batch_alter_table("model_profiles") as batch_op:
            batch_op.add_column(sa.Column("model_ids", sa.JSON(), nullable=True))
    op.execute(
        sa.text(
            "UPDATE model_profiles SET model_ids = "
            "CASE WHEN model_id != '' THEN json_array(model_id) ELSE '[]' END"
        )
    )


def downgrade() -> None:
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("model_profiles")}
    if "model_ids" in columns:
        with op.batch_alter_table("model_profiles") as batch_op:
            batch_op.drop_column("model_ids")
