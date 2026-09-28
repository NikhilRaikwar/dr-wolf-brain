import pytest
import chess
from unittest.mock import patch
from app.chess.stockfish import StockfishAdapter, eval_for_color, EvalResult, EngineUnavailableError
from app.routers.session import engine_adapter

@pytest.fixture(autouse=True)
def ensure_engine_move():
    """Ensure engine returns a valid move for base session loop tests if binary not present."""
    if not engine_adapter._binary_available:
        with patch.object(engine_adapter, "choose_training_move", return_value="e7e5"):
            yield
    else:
        yield


def test_session_creation_persists_canonical_fen(client):
    """Test session creation stores canonical starting FEN and returns proper payload."""
    response = client.post("/api/session/start", json={})
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["fen"] == chess.STARTING_FEN
    assert data["color"] == "white"
    assert data["requested_engine_elo"] == 900
    assert data["engine_mode"] in ("custom_beginner", "skill_floor")


def test_legal_move_accepted(client):
    """Test playing legal move e2e4 updates board and returns engine reply."""
    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    move_res = client.post(f"/api/session/{session_id}/move", json={"move_uci": "e2e4"})
    assert move_res.status_code == 200
    data = move_res.json()
    assert data["player_move"] == "e2e4"
    assert data["engine_move"] is not None
    # Verify board state has 2 plies
    board = chess.Board(data["fen"])
    assert board.fullmove_number == 2
    assert board.turn == chess.WHITE


def test_illegal_move_rejected(client):
    """Test illegal move (e.g. e2e5 on move 1) is rejected with 400 Bad Request."""
    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    move_res = client.post(f"/api/session/{session_id}/move", json={"move_uci": "e2e5"})
    assert move_res.status_code == 400
    assert "Illegal move" in move_res.json()["detail"]


def test_engine_move_persisted(client):
    """Test engine move is saved in moves_uci and reflected in position endpoint."""
    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    move_res = client.post(f"/api/session/{session_id}/move", json={"move_uci": "d2d4"})
    assert move_res.status_code == 200
    engine_move = move_res.json()["engine_move"]

    pos_res = client.get(f"/api/session/{session_id}/position")
    assert pos_res.status_code == 200
    pos_data = pos_res.json()
    assert pos_data["moves_uci"] == ["d2d4", engine_move]
    assert pos_data["ply_count"] == 2


def test_fen_survives_new_request_state(client):
    """Test querying position across separate requests recovers exact canonical DB state."""
    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    client.post(f"/api/session/{session_id}/move", json={"move_uci": "g1f3"})

    # Second independent request
    pos_res = client.get(f"/api/session/{session_id}/position")
    assert pos_res.status_code == 200
    assert len(pos_res.json()["moves_uci"]) == 2
    assert pos_res.json()["turn"] == "white"


def test_moves_uci_reconstructs_game(client):
    """Test that applying moves_uci sequentially on a fresh chess.Board yields canonical current_fen."""
    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    # Play two moves
    client.post(f"/api/session/{session_id}/move", json={"move_uci": "e2e4"}).json()
    client.post(f"/api/session/{session_id}/move", json={"move_uci": "g1f3"}).json()

    pos_res = client.get(f"/api/session/{session_id}/position").json()
    moves_history = pos_res["moves_uci"]

    reconstructed_board = chess.Board()
    for mv in moves_history:
        reconstructed_board.push(chess.Move.from_uci(mv))

    assert reconstructed_board.fen() == pos_res["fen"]


def test_side_to_move_remains_correct(client):
    """Test that turn alternates and remains White's turn after engine's reply."""
    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    client.post(f"/api/session/{session_id}/move", json={"move_uci": "c2c4"})
    pos = client.get(f"/api/session/{session_id}/position").json()
    assert pos["turn"] == "white"
    assert pos["player_color"] == "white"


def test_fixed_evaluation_perspective_regression():
    """Test fixed evaluation perspective normalization:
    eval_for_color must always return white score for White, and -white score for Black.
    """
    eval_res = EvalResult(
        best_move="e7e5",
        best_move_san="e5",
        eval_white_cp=150,
        mate_white=None,
        pv=["e7e5"],
        top_moves=[{"move": "e7e5", "eval_white_cp": 150}],
    )
    # White perspective is +150
    assert eval_for_color(eval_res, chess.WHITE) == 150
    # Black perspective is -150
    assert eval_for_color(eval_res, chess.BLACK) == -150


def test_requested_900_elo_never_falsely_reported_as_effective_900():
    """Test requested 900 Elo is reported honestly as custom_beginner / skill_floor, not effective 900."""
    adapter = StockfishAdapter(min_stockfish_elo=1320)
    config = adapter.configure_limited(900)
    assert config["requested_elo"] == 900
    assert config["effective_elo"] is None
    assert config["mode"] in ("custom_beginner", "skill_floor")


def test_move_on_missing_session_returns_404(client):
    """Test playing moves on an invalid or malformed session is cleanly rejected with 404."""
    import uuid
    random_id = uuid.uuid4()
    res = client.post(f"/api/session/{random_id}/move", json={"move_uci": "e2e4"})
    assert res.status_code == 404


def test_missing_stockfish_binary_returns_503(client):
    """Test that engine unavailability returns 503 with safe message."""
    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    with patch.object(
        engine_adapter,
        "choose_training_move",
        side_effect=EngineUnavailableError("Training engine is temporarily unavailable."),
    ):
        move_res = client.post(f"/api/session/{session_id}/move", json={"move_uci": "e2e4"})
        assert move_res.status_code == 503
        assert "Training engine is temporarily unavailable" in move_res.json()["detail"]


def test_engine_failure_persists_no_move(client):
    """Test that when engine fails, the transaction is rolled back and no partial player move is saved."""
    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    with patch.object(
        engine_adapter,
        "choose_training_move",
        side_effect=EngineUnavailableError("Engine crashed during calculation"),
    ):
        move_res = client.post(f"/api/session/{session_id}/move", json={"move_uci": "e2e4"})
        assert move_res.status_code == 503

    # Inspect position: should still be move 1, starting FEN, 0 plies
    pos_res = client.get(f"/api/session/{session_id}/position")
    assert pos_res.status_code == 200
    pos_data = pos_res.json()
    assert pos_data["fen"] == chess.STARTING_FEN
    assert pos_data["moves_uci"] == []
    assert pos_data["ply_count"] == 0
    assert pos_data["turn"] == "white"


def test_canonical_fen_and_moves_uci_remain_unchanged_after_engine_failure(client):
    """Test that subsequent valid moves still work after a transient engine 503 failure."""
    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    # 1. Engine fails
    with patch.object(
        engine_adapter,
        "choose_training_move",
        side_effect=EngineUnavailableError("Temporary network/binary error"),
    ):
        failed_res = client.post(f"/api/session/{session_id}/move", json={"move_uci": "e2e4"})
        assert failed_res.status_code == 503

    # 2. Engine recovers, player plays move again
    with patch.object(engine_adapter, "choose_training_move", return_value="e7e5"):
        ok_res = client.post(f"/api/session/{session_id}/move", json={"move_uci": "e2e4"})
        assert ok_res.status_code == 200
        assert ok_res.json()["engine_move"] == "e7e5"

    pos = client.get(f"/api/session/{session_id}/position").json()
    assert pos["moves_uci"] == ["e2e4", "e7e5"]
    assert pos["ply_count"] == 2


def test_active_session_summary_returns_409_conflict_and_remains_active(client, db_session):
    """
    GET /api/session/{id}/summary must return 409 Conflict if session is still active,
    and must not mutate session status or ended_at.
    """
    from app.models import Session

    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    # Session is active
    sum_res = client.get(f"/api/session/{session_id}/summary")
    assert sum_res.status_code == 409
    assert "Session is still active" in sum_res.json()["detail"]

    # Verify session remains active in DB
    session = db_session.query(Session).filter(Session.id == session_id).first()
    assert session.status == "active"
    assert session.ended_at is None


def test_post_finish_idempotency_and_ended_at_immutability(client, db_session):
    """
    POST /api/session/{id}/finish marks active session completed.
    Repeated POST /finish calls are idempotent and do not alter ended_at.
    """
    from app.models import Session

    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    # First call: active -> completed
    finish_1 = client.post(f"/api/session/{session_id}/finish")
    assert finish_1.status_code == 200
    assert finish_1.json()["status"] == "completed"

    session = db_session.query(Session).filter(Session.id == session_id).first()
    assert session.status == "completed"
    assert session.ended_at is not None
    original_ended_at = session.ended_at

    # Second call: idempotent replay
    finish_2 = client.post(f"/api/session/{session_id}/finish")
    assert finish_2.status_code == 200
    assert finish_2.json()["status"] == "completed"

    db_session.refresh(session)
    assert session.status == "completed"
    assert session.ended_at == original_ended_at


def test_completed_session_rejects_moves(client):
    """
    Once a session is completed (manually or naturally), POST /move is rejected with 400 Bad Request.
    """
    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    # Finish session
    client.post(f"/api/session/{session_id}/finish")

    # Attempt move
    move_res = client.post(f"/api/session/{session_id}/move", json={"move_uci": "e2e4"})
    assert move_res.status_code == 400
    assert "already completed" in move_res.json()["detail"]


def test_completed_session_summary_and_dream_cycle_replay_stability(client):
    """
    Completed session allows GET /summary and POST /dream-cycle.
    Replaying summary and dream cycle is stable with zero duplicate writes.
    """
    start_res = client.post("/api/session/start", json={})
    session_id = start_res.json()["session_id"]

    with patch.object(engine_adapter, "choose_training_move", return_value="e7e5"):
        client.post(f"/api/session/{session_id}/move", json={"move_uci": "e2e4"})

    # Complete session
    client.post(f"/api/session/{session_id}/finish")

    # Call summary twice
    s1 = client.get(f"/api/session/{session_id}/summary")
    assert s1.status_code == 200
    s2 = client.get(f"/api/session/{session_id}/summary")
    assert s2.status_code == 200
    assert s1.json()["stats"] == s2.json()["stats"]

    # Call dream cycle twice
    dc1 = client.post("/api/dream-cycle", json={"session_id": session_id})
    assert dc1.status_code == 200
    dc2 = client.post("/api/dream-cycle", json={"session_id": session_id})
    assert dc2.status_code == 200
    assert dc1.json()["ran_at"] == dc2.json()["ran_at"]


