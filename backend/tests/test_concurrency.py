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


@pytest.mark.postgres
def test_postgres_concurrent_duplicate_evidence_write():
    """Real PostgreSQL concurrency test:
    Two independent DB sessions concurrently race to write the exact same logical evidence claim:
    (source_type, source_id, claim_type, concept).
    Using the DB unique constraint and Session.begin_nested() savepoint handling:
    - Exactly one evidence_records row survives in the database.
    - Exactly one session creates the row (created_new=True), the other returns existing (created_new=False).
    - Both transactions remain valid and can commit cleanly.
    """
    import uuid
    from app.models import Player, EvidenceRecord
    from app.beliefs.updater import write_evidence_record

    pg_url = os.environ.get("POSTGRES_TEST_DATABASE_URL", os.environ.get("DATABASE_URL", ""))
    if not pg_url.startswith("postgresql"):
        pytest.skip("PostgreSQL not configured in test environment")

    pg_engine = create_engine(pg_url)
    try:
        with pg_engine.connect() as conn:
            pass
    except Exception as e:
        pytest.skip(f"PostgreSQL connection failed: {e}")

    Base.metadata.create_all(bind=pg_engine)
    PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)

    init_db = PgSessionLocal()
    player = Player(chesscom_username="concurrency_test_player")
    init_db.add(player)
    init_db.commit()
    player_id = player.id
    init_db.close()

    source_id = uuid.uuid4()

    def worker_write_evidence():
        db = PgSessionLocal()
        try:
            rec, created = write_evidence_record(
                db=db,
                player_id=player_id,
                source_type="think_first_episode",
                source_id=source_id,
                claim_type="skill",
                concept="opponent_threat_detection",
                direction="supports",
            )
            db.commit()
            return rec.id, created
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(worker_write_evidence)
        f2 = executor.submit(worker_write_evidence)
        id1, created1 = f1.result()
        id2, created2 = f2.result()

    assert id1 == id2
    assert sorted([created1, created2]) == [False, True]

    verify_db = PgSessionLocal()
    rows = verify_db.query(EvidenceRecord).filter(EvidenceRecord.source_id == source_id).all()
    assert len(rows) == 1
    assert rows[0].id == id1
    verify_db.close()


@pytest.mark.postgres
def test_postgres_concurrent_duplicate_dream_cycle():
    """Real PostgreSQL concurrency test:
    Two simultaneous requests trigger Dream Cycle for the exact same session.
    Using DB authority (dream_cycle_runs PRIMARY KEY):
    - Exactly one dream_cycle_runs row survives.
    - Beliefs are processed exactly once.
    - No duplicate evidence records or belief changes are created.
    - Both callers return a valid 200 DreamCycleResult.
    - No 500 internal server errors.
    """
    import uuid
    from app.models import Player, Session as GameSession, Episode, EvidenceRecord, BeliefChange, DreamCycleRun
    from app.dream.cycle import run_dream_cycle
    from app.beliefs.updater import ensure_initial_player_beliefs

    pg_url = os.environ.get("POSTGRES_TEST_DATABASE_URL", os.environ.get("DATABASE_URL", ""))
    if not pg_url.startswith("postgresql"):
        pytest.skip("PostgreSQL not configured in test environment")

    pg_engine = create_engine(pg_url)
    try:
        with pg_engine.connect() as conn:
            pass
    except Exception as e:
        pytest.skip(f"PostgreSQL connection failed: {e}")

    Base.metadata.create_all(bind=pg_engine)
    PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)

    init_db = PgSessionLocal()
    player = Player(chesscom_username="dream_concurrency_player", estimated_rating=1200)
    init_db.add(player)
    init_db.commit()
    ensure_initial_player_beliefs(init_db, player.id)

    session = GameSession(
        player_id=player.id,
        engine_elo=1300,
        player_color="white",
        current_fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    )
    init_db.add(session)
    init_db.commit()

    # Seed 3 graded episodes
    for i in range(3):
        ep = Episode(
            session_id=session.id,
            player_id=player.id,
            move_number=i + 1,
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            status="graded",
            trigger_evidence={"type": "opponent_threat", "concept": "opponent_threat_detection", "question_id": "threat_defend"},
            engine_truth={"concept": "opponent_threat_detection", "best_move": "e2e4"},
            learner_reasoning={"choice": "spot_threat", "free_text": ""},
            learner_action={"move_played": "e2e4"},
            reasoning_outcome="recognized",
            move_outcome="best",
            move_quality_cp_loss=0,
        )
        init_db.add(ep)
    init_db.commit()
    session_id = session.id
    player_id = player.id
    init_db.close()

    def worker_run_dream():
        db = PgSessionLocal()
        try:
            return run_dream_cycle(db=db, session_id=session_id)
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(worker_run_dream)
        f2 = executor.submit(worker_run_dream)
        res1 = f1.result()
        res2 = f2.result()

    # Both must succeed and return consistent facts
    assert res1.session_id == session_id
    assert res2.session_id == session_id
    assert res1.session_facts.graded_episode_count == 3
    assert res2.session_facts.graded_episode_count == 3

    # Assert exact DB authority
    verify_db = PgSessionLocal()
    runs = verify_db.query(DreamCycleRun).filter(DreamCycleRun.session_id == session_id).all()
    assert len(runs) == 1
    assert runs[0].status == "complete"
    assert "belief_change_ids" in runs[0].result_json
    assert runs[0].language_json is not None

    # Both returned results observe the exact same canonical state
    assert res1.language.session_summary == res2.language.session_summary
    assert res1.language.key_takeaway == res2.language.key_takeaway
    assert res1.model_dump() == res2.model_dump()

    # Assert loser Phase A writes were cleanly rolled back
    ev_count = verify_db.query(EvidenceRecord).filter(EvidenceRecord.player_id == player_id).count()
    assert ev_count == 3

    bc_count = verify_db.query(BeliefChange).filter(BeliefChange.player_id == player_id).count()
    assert bc_count == 2  # 1 for skill + 1 for hypothesis

    skill = (
        verify_db.query(LearnerSkill)
        .filter(LearnerSkill.player_id == player_id, LearnerSkill.concept == "opponent_threat_detection")
        .first()
    )
    assert skill.evidence_count == 3
    assert skill.mastery_score is not None

    hyp = (
        verify_db.query(models.Hypothesis)
        .filter(models.Hypothesis.player_id == player_id, models.Hypothesis.concept == "tunnel_vision_after_attack")
        .first()
    )
    assert hyp.observed_count == 3

    verify_db.close()


@pytest.mark.postgres
def test_postgres_concurrent_different_language_race():
    """Real PostgreSQL concurrency test:
    Caller A generates 'Language Candidate A' while Caller B generates 'Language Candidate B'.
    Both race concurrently to finalize a pending (processing) DreamCycleRun via atomic CAS.
    Expected:
    - Exactly one candidate becomes canonical in Postgres.
    - Status is 'complete'.
    - Neither overwrites after completion.
    - Both callers return the SAME canonical language.
    - Each caller's returned result equals reconstruction from DB.
    - No null language, no 500.
    """
    from unittest.mock import MagicMock
    from app.llm.client import LLMClient, DreamCycleLanguage
    from app.models import Player, Session as GameSession, DreamCycleRun
    from app.dream.cycle import run_dream_cycle

    pg_url = os.environ.get("POSTGRES_TEST_DATABASE_URL", os.environ.get("DATABASE_URL", ""))
    if not pg_url.startswith("postgresql"):
        pytest.skip("PostgreSQL not configured in test environment")

    pg_engine = create_engine(pg_url)
    try:
        with pg_engine.connect() as conn:
            pass
    except Exception as e:
        pytest.skip(f"PostgreSQL connection failed: {e}")

    Base.metadata.create_all(bind=pg_engine)
    PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)

    init_db = PgSessionLocal()
    player = Player(chesscom_username="lang_race_player", estimated_rating=1200)
    init_db.add(player)
    init_db.commit()

    session = GameSession(
        player_id=player.id,
        engine_elo=1300,
        player_color="white",
        current_fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    )
    init_db.add(session)
    init_db.commit()

    # Pre-seed a pending processing run
    result_data = {
        "session_id": str(session.id),
        "player_id": str(player.id),
        "graded_episode_count": 1,
        "reasoning_counts": {"recognized": 1, "partial": 0, "missed": 0},
        "move_counts": {"best": 1, "acceptable": 0, "inaccurate": 0, "mistake": 0},
        "concept_counts": {"opponent_threat_detection": 1},
        "belief_change_ids": [],
        "next_focus": "opponent_threat_detection",
        "transfer_position_ids": [],
    }
    pending_run = DreamCycleRun(
        session_id=session.id,
        status="processing",
        result_json=result_data,
        language_json=None,
    )
    init_db.add(pending_run)
    init_db.commit()
    session_id = session.id
    init_db.close()

    mock_llm_a = MagicMock(spec=LLMClient)
    mock_llm_a.generate_dream_cycle_language.return_value = DreamCycleLanguage(
        session_summary="Postgres Language Candidate A",
        key_takeaway="Takeaway A",
        next_focus_phrase="Focus A",
    )

    mock_llm_b = MagicMock(spec=LLMClient)
    mock_llm_b.generate_dream_cycle_language.return_value = DreamCycleLanguage(
        session_summary="Postgres Language Candidate B",
        key_takeaway="Takeaway B",
        next_focus_phrase="Focus B",
    )

    def worker_a():
        db = PgSessionLocal()
        try:
            return run_dream_cycle(db=db, session_id=session_id, llm=mock_llm_a)
        finally:
            db.close()

    def worker_b():
        db = PgSessionLocal()
        try:
            return run_dream_cycle(db=db, session_id=session_id, llm=mock_llm_b)
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(worker_a)
        f2 = executor.submit(worker_b)
        res_a = f1.result()
        res_b = f2.result()

    assert res_a.language.session_summary in ["Postgres Language Candidate A", "Postgres Language Candidate B"]
    assert res_b.language.session_summary == res_a.language.session_summary
    assert res_a.model_dump() == res_b.model_dump()

    verify_db = PgSessionLocal()
    persisted = verify_db.query(DreamCycleRun).filter(DreamCycleRun.session_id == session_id).first()
    assert persisted.status == "complete"
    assert persisted.language_json["session_summary"] == res_a.language.session_summary
    verify_db.close()



