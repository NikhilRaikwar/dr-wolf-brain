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

    # Assert epistemology CHECK constraint exists in 001
    assert "no_import_hypothesis_claims" in content
    assert "NOT (source_type='imported_position' AND claim_type='hypothesis'" in content or \
           "NOT (source_type = 'imported_position' AND claim_type = 'hypothesis'" in content

    # Assert 001_initial is historical and does NOT contain 002 constraint
    assert "uq_evidence_source_claim_concept" not in content


def test_002_migration_sql_exists_and_adds_uniqueness_constraint():
    """Verify 002_evidence_uniqueness.sql contains preflight check and unique constraint."""
    sql2_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "migrations", "002_evidence_uniqueness.sql")
    )
    assert os.path.exists(sql2_path), f"Missing migration file: {sql2_path}"

    with open(sql2_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "uq_evidence_source_claim_concept" in content
    assert "UNIQUE (source_type, source_id, claim_type, concept)" in content or \
           "UNIQUE(source_type, source_id, claim_type, concept)" in content
    assert "HAVING COUNT(*) > 1" in content
    assert "RAISE EXCEPTION" in content


def test_alembic_migration_parity():
    """Verify Alembic 001_initial.py and 002_evidence_uniqueness.py execute their respective SQL files."""
    rev1_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "alembic", "versions", "001_initial.py")
    )
    rev2_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "alembic", "versions", "002_evidence_uniqueness.py")
    )
    assert os.path.exists(rev1_path), f"Missing Alembic revision 001: {rev1_path}"
    assert os.path.exists(rev2_path), f"Missing Alembic revision 002: {rev2_path}"

    with open(rev1_path, "r", encoding="utf-8") as f:
        c1 = f.read()
    with open(rev2_path, "r", encoding="utf-8") as f:
        c2 = f.read()

    assert "001_initial" in c1
    assert "001_initial.sql" in c1

    assert "down_revision: Union[str, None] = '001_initial'" in c2 or "down_revision = '001_initial'" in c2
    assert "002_evidence_uniqueness.sql" in c2


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

    # Inspect constraints on evidence_records
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT conname, contype 
            FROM pg_constraint 
            WHERE conrelid = 'evidence_records'::regclass;
        """)).fetchall()

        constraints_by_name = {row[0]: row[1] for row in result}
        assert "no_import_hypothesis_claims" in constraints_by_name, (
            f"Missing check constraint 'no_import_hypothesis_claims' on evidence_records"
        )
        assert "uq_evidence_source_claim_concept" in constraints_by_name, (
            f"Missing unique constraint 'uq_evidence_source_claim_concept' on evidence_records"
        )

