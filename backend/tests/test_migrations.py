import os
import pytest
from sqlalchemy import create_engine, inspect, text

def test_migration_sql_exists_and_has_11_tables():
    """Verify 001_initial.sql contains all 11 tables and epistemology check constraint."""
    sql_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "migrations", "001_initial.sql")
    )
    assert os.path.exists(sql_path), f"Missing migration file: {sql_path}"

    with open(sql_path, "r", encoding="utf-8") as f:
        content = f.read()

    expected_tables = [
        "players",
        "games",
        "positions",
        "sessions",
        "episodes",
        "skills",
        "hypotheses",
        "evidence_records",
        "belief_changes",
        "transfer_positions",
        "dream_cycle_runs",
    ]

    for table in expected_tables:
        assert f"CREATE TABLE IF NOT EXISTS {table}" in content or f"CREATE TABLE {table}" in content, (
            f"Table {table} missing from 001_initial.sql"
        )

    # Assert epistemology CHECK constraint exists
    assert "no_import_hypothesis_claims" in content
    assert "NOT (source_type='imported_position' AND claim_type='hypothesis'" in content or \
           "NOT (source_type = 'imported_position' AND claim_type = 'hypothesis'" in content


def test_alembic_migration_parity():
    """Verify Alembic 001_initial.py executes 001_initial.sql."""
    alembic_rev_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "alembic", "versions", "001_initial.py")
    )
    assert os.path.exists(alembic_rev_path), f"Missing Alembic revision: {alembic_rev_path}"

    with open(alembic_rev_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "001_initial.sql" in content
    assert "op.execute(sql_statements)" in content


@pytest.mark.postgres
def test_postgres_alembic_migration_inspection():
    """Verify the real PostgreSQL schema created by Alembic migration without Base.metadata.create_all()."""
    pg_url = os.environ.get("POSTGRES_TEST_DATABASE_URL")
    if not pg_url or not pg_url.startswith("postgresql"):
        pytest.skip("POSTGRES_TEST_DATABASE_URL not configured")

    engine = create_engine(pg_url)
    try:
        with engine.connect() as conn:
            # Verify database connectivity
            conn.execute(text("SELECT 1"))
    except Exception as e:
        pytest.skip(f"PostgreSQL connection failed: {e}")

    # Inspect the actual tables created by Alembic migration
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    expected_tables = {
        "players",
        "games",
        "positions",
        "sessions",
        "episodes",
        "skills",
        "hypotheses",
        "evidence_records",
        "belief_changes",
        "transfer_positions",
        "dream_cycle_runs",
    }

    assert expected_tables.issubset(tables), (
        f"Alembic PostgreSQL migration missing tables: {expected_tables - tables}"
    )

    # Inspect CHECK constraints on evidence_records
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'evidence_records'::regclass AND contype = 'c';
        """)).fetchall()

        constraint_names = [row[0] for row in result]
        assert "no_import_hypothesis_claims" in constraint_names, (
            f"Missing constraint 'no_import_hypothesis_claims' on evidence_records. Found: {constraint_names}"
        )
