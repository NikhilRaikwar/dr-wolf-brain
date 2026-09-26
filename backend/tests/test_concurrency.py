import os
import pytest
import chess
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.db import Base, get_db
from app import models
from app.main import app
from app.routers.session import engine_adapter

@pytest.mark.postgres
def test_real_postgres_concurrent_duplicate_moves():
    """Real PostgreSQL concurrency test:
    Two simultaneous requests for the same initial move target the same session.
    Using SELECT ... FOR UPDATE, exactly one request must succeed and mutate the session;
    the second must fail cleanly.
    Final session state must have ply_count=2 and moves_uci containing 1 player move + 1 engine reply.
    """
    pg_url = os.environ.get("POSTGRES_TEST_DATABASE_URL", os.environ.get("DATABASE_URL", ""))
    if not pg_url.startswith("postgresql"):
        pytest.skip("PostgreSQL not configured in test environment")

    pg_engine = create_engine(pg_url)
    try:
        # Check connection
        with pg_engine.connect() as conn:
            pass
    except Exception as e:
        pytest.skip(f"PostgreSQL connection failed: {e}")

    Base.metadata.create_all(bind=pg_engine)
    PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)

    def override_pg_db():
        db = PgSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_pg_db

    # Ensure engine move is deterministic for the test
    with patch.object(engine_adapter, "choose_training_move", return_value="e7e5"):
        with TestClient(app) as test_client:
            # 1. Create a real session in Postgres
            start_res = test_client.post("/api/session/start", json={})
            assert start_res.status_code == 200
            session_id = start_res.json()["session_id"]

            # 2. Fire two near-simultaneous POST /move requests for the same initial move 'e2e4'
            def send_move():
                return test_client.post(
                    f"/api/session/{session_id}/move",
                    json={"move_uci": "e2e4"},
                )

            with ThreadPoolExecutor(max_workers=2) as executor:
                f1 = executor.submit(send_move)
                f2 = executor.submit(send_move)
                res1 = f1.result()
                res2 = f2.result()

            statuses = sorted([res1.status_code, res2.status_code])
            
            # Exactly one request must succeed (200), the duplicate must fail cleanly (400)
            assert statuses == [200, 400], f"Expected [200, 400], got {statuses}"

            # 3. Verify final canonical database state
            pos_res = test_client.get(f"/api/session/{session_id}/position")
            assert pos_res.status_code == 200
            pos_data = pos_res.json()

            # Final state must have exactly 1 player move + 1 engine reply
            assert pos_data["moves_uci"] == ["e2e4", "e7e5"]
            assert pos_data["ply_count"] == 2
            assert pos_data["turn"] == "white"

            # Reconstruct and assert exact FEN match
            reconstructed = chess.Board()
            for mv in pos_data["moves_uci"]:
                reconstructed.push(chess.Move.from_uci(mv))
            assert reconstructed.fen() == pos_data["fen"]

    app.dependency_overrides.clear()
