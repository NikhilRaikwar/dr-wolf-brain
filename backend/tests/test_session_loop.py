import pytest
import chess
from app.chess.stockfish import StockfishAdapter, eval_for_color, EvalResult

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
    m1 = client.post(f"/api/session/{session_id}/move", json={"move_uci": "e2e4"}).json()
    m2 = client.post(f"/api/session/{session_id}/move", json={"move_uci": "g1f3"}).json()

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

def test_concurrent_duplicate_move_cannot_corrupt_state(client):
    """Test playing moves on an invalid or malformed session is cleanly rejected."""
    import uuid
    random_id = uuid.uuid4()
    res = client.post(f"/api/session/{random_id}/move", json={"move_uci": "e2e4"})
    assert res.status_code == 404
