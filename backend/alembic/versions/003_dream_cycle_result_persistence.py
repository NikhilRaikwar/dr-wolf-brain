"""003_dream_cycle_result_persistence

Revision ID: 003_dream_cycle_result_persistence
Revises: 002_evidence_uniqueness
Create Date: 2026-09-27 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import os

revision: str = '003_dream_cycle_persistence'
down_revision: Union[str, None] = '002_evidence_uniqueness'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Read and execute canonical migration 003_dream_cycle_result_persistence.sql if on postgres,
    # or use op methods for cross-dialect compatibility
    sql_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "migrations", "003_dream_cycle_result_persistence.sql"
    )
    bind = op.get_bind()
    if bind.dialect.name == "postgresql" and os.path.exists(sql_path):
        with open(sql_path, "r", encoding="utf-8") as f:
            sql_statements = f.read()
        op.execute(sql_statements)
    else:
        # SQLite / generic fallback for testing
        with op.batch_alter_table("dream_cycle_runs") as batch_op:
            batch_op.add_column(sa.Column("status", sa.String(), nullable=False, server_default="processing"))
            batch_op.add_column(sa.Column("result_json", sa.JSON(), nullable=False, server_default="{}"))
            batch_op.add_column(sa.Column("language_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("dream_cycle_runs") as batch_op:
        batch_op.drop_column("language_json")
        batch_op.drop_column("result_json")
        batch_op.drop_column("status")
