"""001_initial

Revision ID: 001_initial
Revises: 
Create Date: 2026-09-26 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import os

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Read and execute migration 001_initial.sql
    sql_path = os.path.join(os.path.dirname(__file__), "..", "..", "migrations", "001_initial.sql")
    if os.path.exists(sql_path):
        with open(sql_path, "r", encoding="utf-8") as f:
            sql_statements = f.read()
        op.execute(sql_statements)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS dream_cycle_runs CASCADE;")
    op.execute("DROP TABLE IF EXISTS transfer_positions CASCADE;")
    op.execute("DROP TABLE IF EXISTS belief_changes CASCADE;")
    op.execute("DROP TABLE IF EXISTS evidence_records CASCADE;")
    op.execute("DROP TABLE IF EXISTS hypotheses CASCADE;")
    op.execute("DROP TABLE IF EXISTS skills CASCADE;")
    op.execute("DROP TABLE IF EXISTS episodes CASCADE;")
    op.execute("DROP TABLE IF EXISTS sessions CASCADE;")
    op.execute("DROP TABLE IF EXISTS positions CASCADE;")
    op.execute("DROP TABLE IF EXISTS games CASCADE;")
    op.execute("DROP TABLE IF EXISTS players CASCADE;")
