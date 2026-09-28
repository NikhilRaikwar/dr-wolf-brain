"""004_game_import_uniqueness

Revision ID: 004_game_import_uniqueness
Revises: 003_dream_cycle_persistence
Create Date: 2026-09-28 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import os

revision: str = '004_game_import_uniqueness'
down_revision: Union[str, None] = '003_dream_cycle_persistence'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    sql_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "migrations", "004_game_import_uniqueness.sql"
    )
    bind = op.get_bind()
    if bind.dialect.name == "postgresql" and os.path.exists(sql_path):
        with open(sql_path, "r", encoding="utf-8") as f:
            sql_statements = f.read()
        op.execute(sql_statements)
    else:
        with op.batch_alter_table("games") as batch_op:
            batch_op.create_unique_constraint("uq_game_player_source_external_ref", ["player_id", "source", "external_ref"])
        with op.batch_alter_table("positions") as batch_op:
            batch_op.create_unique_constraint("uq_position_game_move_fen", ["game_id", "move_number", "fen"])


def downgrade() -> None:
    with op.batch_alter_table("positions") as batch_op:
        batch_op.drop_constraint("uq_position_game_move_fen", type_="unique")
    with op.batch_alter_table("games") as batch_op:
        batch_op.drop_constraint("uq_game_player_source_external_ref", type_="unique")
