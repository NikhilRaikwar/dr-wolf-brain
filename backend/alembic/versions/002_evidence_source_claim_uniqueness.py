"""002_evidence_source_claim_uniqueness

Revision ID: 002_evidence_source_claim_uniqueness
Revises: 001_initial
Create Date: 2026-09-27 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import os

revision: str = '002_evidence_source_claim_uniqueness'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Read and execute canonical migration 002_evidence_source_claim_uniqueness.sql
    sql_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "migrations", "002_evidence_source_claim_uniqueness.sql"
    )
    if os.path.exists(sql_path):
        with open(sql_path, "r", encoding="utf-8") as f:
            sql_statements = f.read()
        op.execute(sql_statements)


def downgrade() -> None:
    op.execute("ALTER TABLE evidence_records DROP CONSTRAINT IF EXISTS uq_evidence_source_claim_concept;")
