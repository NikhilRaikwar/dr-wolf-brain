import uuid
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import chess

from app.main import app
from app.db import get_db
from app.models import Player, Game, Position, Skill, Hypothesis, EvidenceRecord, Episode
from app.chess.stockfish import StockfishAdapter, EngineUnavailableError
from app.chess.import_analysis import (
    MAX_CHESSCOM_GAMES,
    MIN_IMPORT_GAMES,
    MAX_ARCHIVES_TO_FETCH,
    resolve_pgn_player_color,
    classify_move_outcome,
    evaluate_concept_observation,
    AttributionError,
)

SAMPLE_VALID_PGN = """[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.20"]
[Round "-"]
[White "hikaru"]
[Black "magnus"]
[Result "1-0"]
[WhiteElo "2800"]
[BlackElo "2850"]
[ECO "C50"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 d6 6. c3 a6 7. a4 Ba7 8. Re1 O-O 9. h3 h6 10. Nbd2 Re8 11. Nf1 Be6 12. Bxe6 Rxe6 13. Be3 Bxe3 14. Nxe3 d5 15. Qc2 Qd7 16. Rad1 Rd8 17. b4 d4 18. cxd4 Nxd4 19. Nxd4 exd4 20. Nf5 Rc6 21. Qb2 Rc3 22. b5 axb5 23. axb5 c5 24. bxc6 bxc6 25. Qb4 c5 26. Qb6 Kh7 27. Rd2 Re8 28. Red1 Re6 29. Qb8 Re8 30. Qg3 g6 31. Nd6 Re6 32. Nc4 Nxe4 33. dxe4 Rxg3 34. fxg3 Rxe4 35. Rf2 f5 36. Rb1 d3 37. Nd2 Re2 38. Rxe2 dxe2 39. Nf3 Qd1+ 40. Rxd1 exd1=Q+ 1-0
"""

TWO_GAME_ALTERNATING_PGN = """[Event "Tournament Round 1"]
[Site "Chess.com"]
[Date "2026.09.20"]
[White "learner_bob"]
[Black "opponent_alice"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 d6 1-0

[Event "Tournament Round 2"]
[Site "Chess.com"]
[Date "2026.09.21"]
[White "opponent_charlie"]
[Black "learner_bob"]
[Result "0-1"]

1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 0-1
"""

AMBIGUOUS_PGN = """[Event "Self Play"]
[Site "Local"]
[Date "2026.09.20"]
[White "learner_bob"]
[Black "learner_bob"]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 1/2-1/2
"""

SAMPLE_CHESSCOM_ARCHIVE_RESPONSE = {
    "archives": [
        "https://api.chess.com/pub/player/hikaru/games/2026/09"
    ]
}

SAMPLE_CHESSCOM_MONTH_RESPONSE = {
    "games": [
        {
            "url": "https://www.chess.com/game/live/987654321",
            "pgn": SAMPLE_VALID_PGN,
            "time_control": "180+2",
            "end_time": 1790000000,
            "rated": True,
            "rules": "chess",
            "white": {"username": "hikaru", "rating": 2800, "result": "win"},
            "black": {"username": "magnus", "rating": 2850, "result": "resigned"},
        }
    ]
}


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_player(db_session):
    player = Player(
        id=uuid.uuid4(),
        chesscom_username="hikaru",
        estimated_rating=1500,
    )
    db_session.add(player)
    db_session.commit()
    db_session.refresh(player)
    return player


# =========================================================================
# 1. CANONICAL MOVE OUTCOME THRESHOLDS & NO 30/90 TAXONOMY
# =========================================================================

def test_canonical_move_outcome_thresholds():
    """Verify canonical frozen objective move bands: best <=15, acceptable <=60, inaccurate <=150, mistake >150."""
    assert classify_move_outcome(0) == "best"
    assert classify_move_outcome(15) == "best"
    assert classify_move_outcome(16) == "acceptable"
    assert classify_move_outcome(60) == "acceptable"
    assert classify_move_outcome(61) == "inaccurate"
    assert classify_move_outcome(150) == "inaccurate"
    assert classify_move_outcome(151) == "mistake"
    assert classify_move_outcome(500) == "mistake"


# =========================================================================
# 2. EPISTEMIC SEPARATION & REGRESSION TESTS (MOVE QUALITY != SKILL EVIDENCE)
# =========================================================================

def test_generic_best_move_does_not_create_false_skill_evidence():
    """A generic best move (e.g. quiet opening move 1. e4) has low cp_loss but produces NO skill evidence."""
    board = chess.Board("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
    move = chess.Move.from_uci("e2e4")
    # Low cp_loss (best move) with no concrete tactical feature or threat
    obs = evaluate_concept_observation(
        board=board,
        move=move,
        player_color=chess.WHITE,
        move_number=1,
        prev_move=None,
        best_move_uci="e2e4",
        cp_loss=0,
        mate_white=None,
    )
    assert obs is None, f"Epistemic violation: generic best move produced concept observation: {obs}"


def test_tactical_awareness_unrelated_best_move_negative():
    """Regression A: Hanging piece exists, but learner plays an unrelated Stockfish-best move -> NO tactical_awareness support."""
    # Black bishop on e4 is hanging (0 defenders, attacked by pawn or knight)
    board_hanging = chess.Board("r1bqk2r/pppp1ppp/2n5/4p3/4b3/2P2N2/PPP2PPP/R1BQK2R w KQkq - 0 7")
    # Learner plays an unrelated move on the queenside (e.g. a2a3 or h2h3) with cp_loss=0
    unrelated_move = chess.Move.from_uci("a2a3")
    obs = evaluate_concept_observation(
        board=board_hanging,
        move=unrelated_move,
        player_color=chess.WHITE,
        move_number=7,
        prev_move=None,
        best_move_uci="a2a3",
        cp_loss=0,
        mate_white=None,
    )
    assert obs is None, "Learner played unrelated move without interacting with hanging piece; must NOT get tactical_awareness support"


def test_tactical_awareness_captures_exact_target():
    """Regression B: Hanging opponent piece exists and learner captures exact target -> tactical_awareness support allowed."""
    # Black bishop on e4 is hanging (attacked by White pawn on d3, 0 defenders)
    board_hanging = chess.Board("r1bqk2r/pppp1ppp/2n5/4p3/4b3/3P1N2/PPP2PPP/R1BQK2R w KQkq - 0 7")
    # White pawn on d3 captures exact hanging bishop on e4 (d3e4)
    exact_capture = chess.Move.from_uci("d3e4")
    assert exact_capture in board_hanging.legal_moves
    obs = evaluate_concept_observation(
        board=board_hanging,
        move=exact_capture,
        player_color=chess.WHITE,
        move_number=7,
        prev_move=None,
        best_move_uci="d3e4",
        cp_loss=0,
        mate_white=None,
    )
    assert obs is not None
    assert obs["concept"] == "tactical_awareness"
    assert obs["score"] == 1.0
    assert obs["basis"] == "captured_hanging_piece"


def test_tactical_awareness_defends_own_exact_target():
    """Regression C: Own piece is hanging and learner objectively saves/defends exact target -> tactical_awareness support allowed."""
    # White knight on e4 is hanging (attacked by Black pawn on d5, 0 defenders)
    board_own_hanging = chess.Board("r1bqk2r/ppp2ppp/2n5/3p4/4N3/5N2/PPPP1PPP/R1BQKB1R w KQkq - 0 6")
    # White knight retreats to safety (e4g3)
    retreat_move = chess.Move.from_uci("e4g3")
    assert retreat_move in board_own_hanging.legal_moves
    obs = evaluate_concept_observation(
        board=board_own_hanging,
        move=retreat_move,
        player_color=chess.WHITE,
        move_number=6,
        prev_move=chess.Move.from_uci("d7d5"),
        best_move_uci="e4g3",
        cp_loss=0,
        mate_white=None,
    )
    assert obs is not None
    assert obs["concept"] == "tactical_awareness"
    assert obs["score"] == 1.0
    assert obs["basis"] == "defended_hanging_piece"


def test_tactical_awareness_unrelated_blunder_negative():
    """Regression 5A: Opponent hanging piece exists, learner makes unrelated 200cp blunder, exact hanging opportunity is unchanged / unrelated -> NO tactical_awareness contradiction."""
    # Black bishop on e4 is hanging (attacked by White pawn on d3, 0 defenders)
    board_hanging = chess.Board("r1bqk2r/pppp1ppp/2n5/4p3/4b3/3P1N2/PPP2PPP/R1BQK2R w KQkq - 0 7")
    # Learner plays an unrelated blunder on the queenside (e.g. b2b4) with cp_loss=200, leaving d3 pawn untouched
    unrelated_blunder = chess.Move.from_uci("b2b4")
    assert unrelated_blunder in board_hanging.legal_moves
    obs = evaluate_concept_observation(
        board=board_hanging,
        move=unrelated_blunder,
        player_color=chess.WHITE,
        move_number=7,
        prev_move=None,
        best_move_uci="d3e4",
        cp_loss=200,
        mate_white=None,
    )
    assert obs is None, "Unrelated blunder while hanging target remains untouched must NOT produce tactical_awareness contradiction"


def test_tactical_awareness_opportunity_forfeited_contradict():
    """Regression 5B: Opponent hanging piece exists, learner fails to exploit it, opportunity objectively disappears afterward -> tactical_awareness contradiction allowed."""
    # Black bishop on e4 is hanging (attacked by White pawn on d3, 0 defenders)
    board_hanging = chess.Board("r1bqk2r/pppp1ppp/2n5/4p3/4b3/3P1N2/PPP2PPP/R1BQK2R w KQkq - 0 7")
    # Learner moves the attacking pawn forward to d4 (d3d4) without capturing e4, forfeiting the attack with cp_loss=200
    forfeiting_move = chess.Move.from_uci("d3d4")
    assert forfeiting_move in board_hanging.legal_moves
    obs = evaluate_concept_observation(
        board=board_hanging,
        move=forfeiting_move,
        player_color=chess.WHITE,
        move_number=7,
        prev_move=None,
        best_move_uci="d3e4",
        cp_loss=200,
        mate_white=None,
    )
    assert obs is not None
    assert obs["concept"] == "tactical_awareness"
    assert obs["score"] == 0.0
    assert obs["basis"] == "missed_hanging_piece"


def test_tactical_awareness_own_piece_lost_contradict():
    """Regression 5C: Own piece is hanging, learner makes unrelated move, exact piece remains lost -> contradiction allowed only when exact target failure is proven."""
    # White knight on e4 is hanging (attacked by Black pawn on d5, 0 defenders)
    board_own_hanging = chess.Board("r1bqk2r/ppp2ppp/2n5/3p4/4N3/5N2/PPPP1PPP/R1BQKB1R w KQkq - 0 6")
    # Learner ignores the threat and plays an unrelated move a2a3 with cp_loss=200
    unrelated_move = chess.Move.from_uci("a2a3")
    assert unrelated_move in board_own_hanging.legal_moves
    obs = evaluate_concept_observation(
        board=board_own_hanging,
        move=unrelated_move,
        player_color=chess.WHITE,
        move_number=6,
        prev_move=chess.Move.from_uci("d7d5"),
        best_move_uci="e4g3",
        cp_loss=200,
        mate_white=None,
    )
    assert obs is not None
    assert obs["concept"] == "tactical_awareness"
    assert obs["score"] == 0.0
    assert obs["basis"] == "lost_hanging_piece"


def test_king_safety_is_strictly_think_first_only():
    """Regression D & E: King safety position + low cp_loss or castling -> strictly Think-First-only in v1 (returns None)."""
    board_exposed = chess.Board("r1bqk2r/pppp1ppp/8/8/8/8/PPP2PPP/RNBQK2R w KQkq - 0 10")
    castle_move = chess.Move.from_uci("e1g1")
    obs_castle = evaluate_concept_observation(
        board=board_exposed,
        move=castle_move,
        player_color=chess.WHITE,
        move_number=10,
        prev_move=None,
        best_move_uci="e1g1",
        cp_loss=0,
        mate_white=None,
    )
    assert obs_castle is None, "king_safety must be Think-First-only in v1 (no imported evidence)"


def test_calculation_depth_is_strictly_think_first_only():
    """Calculation depth is strictly Think-First-only in v1."""
    board = chess.Board("r1bqk2r/pppp1ppp/2n5/1B2p3/4n3/2P2N2/PPP2PPP/R1BQK2R w KQkq - 0 7")
    move = chess.Move.from_uci("b5c6")
    obs = evaluate_concept_observation(
        board=board,
        move=move,
        player_color=chess.WHITE,
        move_number=7,
        prev_move=chess.Move.from_uci("e7e5"),
        best_move_uci="b5c6",
        cp_loss=0,
        mate_white=None,
    )
    assert obs is None, "calculation_depth must be Think-First-only in v1"


def test_opponent_threat_parried_check():
    """Regression G: Check threat is parried with low cp_loss -> opponent_threat_detection support."""
    board = chess.Board("r1b1k2r/pppp1ppp/8/8/8/8/PPP1qPPP/RNB1K2R w KQkq - 0 10")
    assert board.is_check()

    parry_move = chess.Move.from_uci("e1e2")
    obs = evaluate_concept_observation(
        board=board,
        move=parry_move,
        player_color=chess.WHITE,
        move_number=10,
        prev_move=chess.Move.from_uci("e8e2"),
        best_move_uci="e1e2",
        cp_loss=0,
        mate_white=None,
    )
    assert obs is not None
    assert obs["concept"] == "opponent_threat_detection"
    assert obs["score"] == 1.0
    assert obs["basis"] == "parried_check"


def test_opponent_threat_check_response_never_contradicts():
    """Regression: Under check, a legal check response (even with high cp_loss) must NEVER produce contradiction."""
    board = chess.Board("r1b1k2r/pppp1ppp/8/8/8/8/PPP1qPPP/RNB1K2R w KQkq - 0 10")
    assert board.is_check()

    parry_move = chess.Move.from_uci("e1e2")
    obs = evaluate_concept_observation(
        board=board,
        move=parry_move,
        player_color=chess.WHITE,
        move_number=10,
        prev_move=chess.Move.from_uci("e8e2"),
        best_move_uci="e1e2",
        cp_loss=200,
        mate_white=None,
    )
    assert obs is None, "Legal check response must not produce contradiction merely from cp_loss"


def test_opponent_threat_mate_threat_neutralized():
    """Regression G2: Mate threat is neutralized -> opponent_threat_detection support."""
    board = chess.Board("6k1/5ppp/8/8/8/8/4qPPP/6K1 w - - 0 30")
    # Black is threatening mate; White plays h2h3 to create luft
    defense_move = chess.Move.from_uci("h2h3")
    obs = evaluate_concept_observation(
        board=board,
        move=defense_move,
        player_color=chess.WHITE,
        move_number=30,
        prev_move=chess.Move.from_uci("e7e2"),
        best_move_uci="h2h3",
        cp_loss=0,
        mate_white=-1,  # Black had forced mate in 1
        mate_white_after=None,  # Mate neutralized
    )
    assert obs is not None
    assert obs["concept"] == "opponent_threat_detection"
    assert obs["score"] == 1.0
    assert obs["basis"] == "neutralized_mate_threat"


def test_opponent_threat_mate_neutralized_despite_high_cp_loss():
    """Regression 5D: Mate threat exists, learner makes >150cp move but neutralizes exact mate threat -> NO opponent_threat_detection contradiction."""
    board = chess.Board("6k1/5ppp/8/8/8/8/4qPPP/6K1 w - - 0 30")
    defense_move = chess.Move.from_uci("h2h3")
    obs = evaluate_concept_observation(
        board=board,
        move=defense_move,
        player_color=chess.WHITE,
        move_number=30,
        prev_move=chess.Move.from_uci("e7e2"),
        best_move_uci="h2h3",
        cp_loss=200,  # Bad move / high cp loss in resulting endgame
        mate_white=-1,  # Black had forced mate in 1
        mate_white_after=None,  # But the forced mate threat was neutralized
    )
    assert obs is None, "When mate threat is neutralized, must NOT produce contradiction despite high cp_loss"


def test_opponent_threat_mate_threat_persists_contradict():
    """Regression 5E: Mate threat exists, learner fails to neutralize it, post-move engine confirms forced mate threat remains -> opponent_threat_detection contradiction allowed."""
    board = chess.Board("6k1/5ppp/8/8/8/8/4qPPP/6K1 w - - 0 30")
    # Irrelevant move on the other wing that fails to stop mate in 1
    bad_move = chess.Move.from_uci("a2a3")
    obs = evaluate_concept_observation(
        board=board,
        move=bad_move,
        player_color=chess.WHITE,
        move_number=30,
        prev_move=chess.Move.from_uci("e7e2"),
        best_move_uci="h2h3",
        cp_loss=200,
        mate_white=-1,
        mate_white_after=-1,  # Mate in 1 still persists!
    )
    assert obs is not None
    assert obs["concept"] == "opponent_threat_detection"
    assert obs["score"] == 0.0
    assert obs["basis"] == "failed_threat_parry"


# =========================================================================
# 3. PGN ATTRIBUTION PRECEDENCE & CONFLICT TESTS
# =========================================================================

def test_single_game_attribution_conflict_rejected(client, sample_player, db_session):
    """A. Single game: White header = Alice, learner_name = Alice, learner_color = black -> reject 400 with 0 rows."""
    single_alice_pgn = """[Event "Casual"]
[Site "Local"]
[Date "2026.09.20"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0
"""
    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": single_alice_pgn,
            "learner_name": "Alice",
            "learner_color": "black",  # Conflict! Alice is White
            "max_games": 1,
        },
    )
    assert resp.status_code == 400
    assert "conflict" in resp.json()["detail"].lower()

    # Zero rows persisted
    assert db_session.query(Game).filter(Game.player_id == sample_player.id).count() == 0
    assert db_session.query(Position).filter(Position.player_id == sample_player.id).count() == 0


def test_single_game_attribution_agreement_succeeds(client, sample_player, db_session):
    """B. Single game: learner_name = Alice, learner_color = white -> agrees and succeeds."""
    single_alice_pgn = """[Event "Casual"]
[Site "Local"]
[Date "2026.09.20"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0
"""
    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": single_alice_pgn,
            "learner_name": "Alice",
            "learner_color": "white",
            "max_games": 1,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["games_imported"] == 1


def test_multi_game_attribution_color_without_name_rejected(client, sample_player, db_session):
    """C. Multi-game: learner_color = white, learner_name omitted -> reject 400."""
    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": TWO_GAME_ALTERNATING_PGN,
            "learner_color": "white",
            "max_games": 5,
        },
    )
    assert resp.status_code == 400
    assert "requires 'learner_name'" in resp.json()["detail"]


def test_multi_game_attribution_color_forbidden(client, sample_player, db_session):
    """D. Multi-game: learner_name = Alice, learner_color = white -> reject 400 because learner_color is forbidden on multi-game."""
    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": TWO_GAME_ALTERNATING_PGN,
            "learner_name": "learner_bob",
            "learner_color": "white",
            "max_games": 5,
        },
    )
    assert resp.status_code == 400
    assert "cannot be used because colors may alternate" in resp.json()["detail"]


def test_multi_game_attribution_alternating_colors(client, sample_player, db_session):
    """E. Multi-game: learner_name = learner_bob -> Bob alternates White/Black -> both attributed correctly."""
    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": TWO_GAME_ALTERNATING_PGN,
            "learner_name": "learner_bob",
            "max_games": 10,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["games_found"] == 2
    assert data["games_imported"] == 2

    games = db_session.query(Game).filter(Game.player_id == sample_player.id).all()
    assert len(games) == 2

    g1_pos = db_session.query(Position).filter(Position.game_id == games[0].id).all()
    for pos in g1_pos:
        assert chess.Board(pos.fen).turn == chess.WHITE

    g2_pos = db_session.query(Position).filter(Position.game_id == games[1].id).all()
    for pos in g2_pos:
        assert chess.Board(pos.fen).turn == chess.BLACK


def test_pgn_attribution_white_matched(client, sample_player, db_session):
    """White matched attribution test."""
    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": SAMPLE_VALID_PGN,
            "learner_name": "hikaru",
            "max_games": 5,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["games_imported"] == 1

    game = db_session.query(Game).filter(Game.player_id == sample_player.id).first()
    assert game is not None

    positions = db_session.query(Position).filter(Position.game_id == game.id).all()
    assert len(positions) > 0
    for pos in positions:
        board = chess.Board(pos.fen)
        assert board.turn == chess.WHITE
        played_move = pos.engine.get("played_move")
        assert played_move is not None
        assert chess.Move.from_uci(played_move) in board.legal_moves


def test_pgn_attribution_black_matched(client, sample_player, db_session):
    """Black matched attribution test."""
    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": SAMPLE_VALID_PGN,
            "learner_name": "magnus",
            "max_games": 5,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["games_imported"] == 1

    game = db_session.query(Game).filter(Game.player_id == sample_player.id).first()
    assert game is not None

    positions = db_session.query(Position).filter(Position.game_id == game.id).all()
    assert len(positions) > 0
    for pos in positions:
        board = chess.Board(pos.fen)
        assert board.turn == chess.BLACK
        played_move = pos.engine.get("played_move")
        assert played_move is not None
        assert chess.Move.from_uci(played_move) in board.legal_moves


def test_pgn_attribution_unmatched_rejected_cleanly(client, sample_player, db_session):
    """Unmatched learner_name rejected cleanly with 0 rows."""
    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": SAMPLE_VALID_PGN,
            "learner_name": "completely_unknown_user_123",
            "max_games": 5,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["games_found"] == 1
    assert data["games_imported"] == 0
    assert data["games_failed"] == 1
    assert len(data["failures"]) == 1
    assert "Attribution error" in data["failures"][0]["reason"]

    assert db_session.query(Game).filter(Game.player_id == sample_player.id).count() == 0
    assert db_session.query(Position).filter(Position.player_id == sample_player.id).count() == 0
    assert db_session.query(EvidenceRecord).filter(EvidenceRecord.player_id == sample_player.id).count() == 0


def test_pgn_attribution_ambiguous_safe_rejection(client, sample_player, db_session):
    """Ambiguous attribution (both headers match) safe rejection."""
    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": AMBIGUOUS_PGN,
            "learner_name": "learner_bob",
            "max_games": 5,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["games_found"] == 1
    assert data["games_imported"] == 0
    assert data["games_failed"] == 1
    assert len(data["failures"]) == 1
    assert "Ambiguous attribution" in data["failures"][0]["reason"]


# =========================================================================
# 4. CHESS.COM & PGN BOUNDS AND LIMITS
# =========================================================================

def test_api_bounds_validation_rejection(client, sample_player):
    """Verify max_games bounds (ge=1, le=50) are enforced via Pydantic validation."""
    resp_zero = client.post(
        "/api/import/chesscom",
        json={
            "player_id": str(sample_player.id),
            "username": "hikaru",
            "max_games": 0,
        },
    )
    assert resp_zero.status_code == 422

    resp_high = client.post(
        "/api/import/chesscom",
        json={
            "player_id": str(sample_player.id),
            "username": "hikaru",
            "max_games": 51,
        },
    )
    assert resp_high.status_code == 422


def test_chesscom_archive_traversal_hard_bounded(client, sample_player):
    """Verify Chess.com monthly archive traversal is strictly bounded by MAX_ARCHIVES_TO_FETCH (12)."""
    mock_archives = [f"https://api.chess.com/pub/player/hikaru/games/202{i//12}/{i%12+1:02d}" for i in range(30)]
    fetched_urls = []

    with patch("httpx.Client.get") as mock_get:
        def side_effect(url, *args, **kwargs):
            fetched_urls.append(url)
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            if "archives" in url:
                mock_resp.json.return_value = {"archives": mock_archives}
            else:
                mock_resp.json.return_value = {"games": []}
            return mock_resp

        mock_get.side_effect = side_effect

        resp = client.post(
            "/api/import/chesscom",
            json={
                "player_id": str(sample_player.id),
                "username": "hikaru",
                "max_games": 50,
            },
        )
        assert resp.status_code == 200

        month_archive_calls = [u for u in fetched_urls if "archives" not in u]
        assert len(month_archive_calls) <= MAX_ARCHIVES_TO_FETCH
        assert len(month_archive_calls) == 12


# =========================================================================
# 5. MULTI-GAME TRANSACTION SEMANTICS (OPTION B: FACTUAL PARTIAL SUCCESS)
# =========================================================================

def test_multigame_option_b_mid_batch_failure_behavior(client, sample_player, db_session):
    """Verify Option B: Game 1 succeeds, Game 2 fails mid-analysis, Game 3 succeeds."""
    three_game_pgn = """[Event "Game 1"]
[Site "Local"]
[Date "2026.09.20"]
[White "learner_bob"]
[Black "opp_1"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0

[Event "Game 2"]
[Site "Local"]
[Date "2026.09.21"]
[White "learner_bob"]
[Black "opp_2"]
[Result "1-0"]

1. d4 d5 2. c4 e6 1-0

[Event "Game 3"]
[Site "Local"]
[Date "2026.09.22"]
[White "learner_bob"]
[Black "opp_3"]
[Result "1-0"]

1. c4 c5 2. Nc3 Nc6 1-0
"""
    from app.routers.import_router import engine_adapter as import_adapter

    real_analyze = import_adapter.analyze

    def conditional_analyze(fen, *args, **kwargs):
        if "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR" in fen:
            raise EngineUnavailableError("Simulated engine crash on Game 2 position")
        return real_analyze(fen, *args, **kwargs)

    with patch.object(import_adapter, "analyze", side_effect=conditional_analyze):
        resp = client.post(
            "/api/import/pgn",
            json={
                "player_id": str(sample_player.id),
                "pgn": three_game_pgn,
                "learner_name": "learner_bob",
                "max_games": 10,
            },
        )
        assert resp.status_code == 200
        data = resp.json()

        assert data["games_found"] == 3
        assert data["games_imported"] == 2
        assert data["games_failed"] == 1
        assert len(data["failures"]) == 1
        assert "Simulated engine crash" in data["failures"][0]["reason"]

        games = db_session.query(Game).filter(Game.player_id == sample_player.id).all()
        assert len(games) == 2
        for g in games:
            pos_count = db_session.query(Position).filter(Position.game_id == g.id).count()
            assert pos_count > 0


# =========================================================================
# 6. BLACK PERSPECTIVE STOCKFISH / EVIDENCE REGRESSION TEST
# =========================================================================

def test_black_perspective_stockfish_and_cp_loss_correctness(client, sample_player, db_session):
    """Verify Black-side perspective: White-relative engine storage + eval_for_color + move_outcome."""
    black_game_pgn = """[Event "Black Perspective Test"]
[Site "Local"]
[Date "2026.09.20"]
[White "Grandmaster"]
[Black "learner_hero"]
[Result "0-1"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Na5 6. Bb5+ c6 7. dxc6 bxc6 0-1
"""
    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": black_game_pgn,
            "learner_name": "learner_hero",
            "max_games": 1,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["games_imported"] == 1

    game = db_session.query(Game).filter(Game.player_id == sample_player.id).first()
    assert game is not None

    positions = db_session.query(Position).filter(Position.game_id == game.id).all()
    assert len(positions) > 0

    for pos in positions:
        board = chess.Board(pos.fen)
        assert board.turn == chess.BLACK

        eng = pos.engine
        assert "eval_white_cp" in eng
        assert "cp_loss" in eng
        assert "played_move" in eng
        assert "move_outcome" in eng
        assert eng["cp_loss"] >= 0
        assert eng["move_outcome"] in ("best", "acceptable", "inaccurate", "mistake")

        played_move = chess.Move.from_uci(eng["played_move"])
        assert played_move in board.legal_moves


# =========================================================================
# 7. HYPOTHESIS SEED SEMANTICS TEST
# =========================================================================

def test_imported_hypothesis_evidence_strictly_seeds(client, sample_player, db_session):
    """Verify imported positions only seed hypotheses: direction='seeds', confidence unchanged, observed_count=0."""
    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": SAMPLE_VALID_PGN,
            "learner_name": "hikaru",
            "max_games": 1,
        },
    )
    assert resp.status_code == 200

    hyp_evidence = (
        db_session.query(EvidenceRecord)
        .filter(
            EvidenceRecord.player_id == sample_player.id,
            EvidenceRecord.source_type == "imported_position",
            EvidenceRecord.claim_type == "hypothesis",
        )
        .all()
    )

    for ev in hyp_evidence:
        assert ev.direction == "seeds", f"Epistemic violation: imported evidence direction is {ev.direction}"

    # Verify all hypotheses remain at confidence=0.5, observed_count=0, state in ('suspected', 'needs_evidence')
    hyps = db_session.query(Hypothesis).filter(Hypothesis.player_id == sample_player.id).all()
    for h in hyps:
        assert h.observed_count == 0, "Imported seeds must NOT increment Think First observed_count"
        assert h.confidence == 0.5, "Imported seeds must NOT mutate hypothesis confidence"
        assert h.state in ("suspected", "needs_evidence"), "Imported seeds must NOT promote hypothesis state"


# =========================================================================
# 8. CHESS.COM & GENERAL TESTS
# =========================================================================

def test_chesscom_import_success(client, sample_player, db_session):
    """Test importing games from Chess.com API successfully."""
    with patch("httpx.Client.get") as mock_get:
        def side_effect(url, *args, **kwargs):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            if "archives" in url:
                mock_resp.json.return_value = SAMPLE_CHESSCOM_ARCHIVE_RESPONSE
            else:
                mock_resp.json.return_value = SAMPLE_CHESSCOM_MONTH_RESPONSE
            return mock_resp

        mock_get.side_effect = side_effect

        resp = client.post(
            "/api/import/chesscom",
            json={
                "player_id": str(sample_player.id),
                "username": "hikaru",
                "max_games": 5,
            },
        )
        assert resp.status_code == 200
        data = resp.json()

        assert data["player_id"] == str(sample_player.id)
        assert data["source"] == "chesscom"
        assert data["games_found"] == 1
        assert data["games_imported"] == 1
        assert data["games_skipped_existing"] == 0
        assert data["positions_analyzed"] > 0

        game = db_session.query(Game).filter(Game.player_id == sample_player.id).first()
        assert game is not None
        assert game.source == "chesscom"
        assert game.external_ref == "https://www.chess.com/game/live/987654321"

        positions = db_session.query(Position).filter(Position.game_id == game.id).all()
        assert len(positions) > 0
        assert len(positions) <= 12


def test_chesscom_import_idempotency(client, sample_player, db_session):
    """Test that importing the same Chess.com game twice does not duplicate rows."""
    with patch("httpx.Client.get") as mock_get:
        def side_effect(url, *args, **kwargs):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            if "archives" in url:
                mock_resp.json.return_value = SAMPLE_CHESSCOM_ARCHIVE_RESPONSE
            else:
                mock_resp.json.return_value = SAMPLE_CHESSCOM_MONTH_RESPONSE
            return mock_resp

        mock_get.side_effect = side_effect

        # 1st import
        resp1 = client.post(
            "/api/import/chesscom",
            json={
                "player_id": str(sample_player.id),
                "username": "hikaru",
                "max_games": 5,
            },
        )
        assert resp1.status_code == 200
        d1 = resp1.json()
        assert d1["games_imported"] == 1

        games_count_1 = db_session.query(Game).filter(Game.player_id == sample_player.id).count()
        pos_count_1 = db_session.query(Position).filter(Position.player_id == sample_player.id).count()

        # 2nd import (repeat)
        resp2 = client.post(
            "/api/import/chesscom",
            json={
                "player_id": str(sample_player.id),
                "username": "hikaru",
                "max_games": 5,
            },
        )
        assert resp2.status_code == 200
        d2 = resp2.json()
        assert d2["games_imported"] == 0
        assert d2["games_skipped_existing"] == 1

        games_count_2 = db_session.query(Game).filter(Game.player_id == sample_player.id).count()
        pos_count_2 = db_session.query(Position).filter(Position.player_id == sample_player.id).count()

        assert games_count_1 == games_count_2 == 1
        assert pos_count_1 == pos_count_2


def test_malformed_pgn_rejected_safely(client, sample_player):
    """Verify malformed/empty PGN is safely rejected with 400 Bad Request."""
    resp1 = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": "",
            "learner_name": "hikaru",
        },
    )
    assert resp1.status_code == 400


def test_chesscom_unknown_user_returns_404(client, sample_player):
    """Verify non-existent Chess.com username returns 404."""
    with patch("httpx.Client.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_get.return_value = mock_resp

        resp = client.post(
            "/api/import/chesscom",
            json={
                "player_id": str(sample_player.id),
                "username": "non_existent_user_99999",
            },
        )
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


def test_stockfish_unavailable_at_startup_returns_503(client, sample_player):
    """Verify Stockfish complete unavailability at endpoint start returns HTTP 503."""
    from app.routers.import_router import engine_adapter as import_adapter
    with patch.object(import_adapter, "_binary_available", False):
        resp = client.post(
            "/api/import/pgn",
            json={
                "player_id": str(sample_player.id),
                "pgn": SAMPLE_VALID_PGN,
                "learner_name": "hikaru",
            },
        )
        assert resp.status_code == 503
        assert "Stockfish" in resp.json()["detail"] or "engine" in resp.json()["detail"]


def test_brain_dashboard_reflects_imported_evidence(client, sample_player, db_session):
    """Verify GET /api/brain naturally reflects evidence from imported games."""
    b_before = client.get(f"/api/brain?player_id={sample_player.id}").json()
    assert b_before["summary"]["episodes_analyzed"] == 0

    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": SAMPLE_VALID_PGN,
            "learner_name": "hikaru",
        },
    )
    assert resp.status_code == 200

    b_after = client.get(f"/api/brain?player_id={sample_player.id}").json()

    for h in b_after["hypotheses"]:
        assert h["state"] in ("suspected", "needs_evidence")


def test_games_listing_and_detail_endpoints(client, sample_player, db_session):
    """Verify GET /api/games and GET /api/games/{game_id} return real DB data."""
    client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": SAMPLE_VALID_PGN,
            "learner_name": "hikaru",
        },
    )

    list_resp = client.get(f"/api/games?player_id={sample_player.id}")
    assert list_resp.status_code == 200
    games = list_resp.json()
    assert len(games) == 1
    game_id = games[0]["id"]
    assert games[0]["source"] == "pgn"
    assert games[0]["positions_analyzed_count"] > 0

    detail_resp = client.get(f"/api/games/{game_id}?player_id={sample_player.id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == game_id
    assert len(detail["positions"]) > 0
    first_pos = detail["positions"][0]
    assert "fen" in first_pos
    assert "move_number" in first_pos
    assert "engine" in first_pos
    assert "best_move" in first_pos["engine"]
    assert "move_outcome" in first_pos["engine"]


def test_bounded_stockfish_call_count(client, sample_player):
    """Prove deep Stockfish compute is strictly bounded and does not scale across every ply of a long game."""
    from app.routers.import_router import engine_adapter as import_adapter

    analyze_spy = MagicMock(wraps=import_adapter.analyze)
    analyze_after_spy = MagicMock(wraps=import_adapter.analyze_after)

    with patch.object(import_adapter, "analyze", analyze_spy), \
         patch.object(import_adapter, "analyze_after", analyze_after_spy):

        resp = client.post(
            "/api/import/pgn",
            json={
                "player_id": str(sample_player.id),
                "pgn": SAMPLE_VALID_PGN,  # 40-move / 80-ply game
                "learner_name": "hikaru",
            },
        )
        assert resp.status_code == 200

        # In an 80-ply game, total depth-18 Stockfish calls MUST NOT exceed 24 (12 candidate positions * 2 calls)
        assert analyze_after_spy.call_count <= 12, f"Too many analyze_after calls: {analyze_after_spy.call_count}"
        assert analyze_spy.call_count <= 24, f"Too many total analyze calls: {analyze_spy.call_count}"


def test_pgn_dedup_across_different_formatting(client, sample_player, db_session):
    """Verify that comments, annotations, NAGs, and whitespace formatting do not duplicate the same game."""
    pgn_clean = """[Event "Casual Game"]
[Site "Local"]
[Date "2026.09.20"]
[White "PlayerA"]
[Black "PlayerB"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 d6 1-0"""

    pgn_with_comments_and_whitespace = """[Event "Casual Game"]
[White "PlayerA"]
[Site "Local"]
[Date "2026.09.20"]
[Black "PlayerB"]
[Result "1-0"]

1. e4 {solid opening} e5
2. Nf3 $1 Nc6
3. Bc4 Bc5 !?
4. d3   d6   1-0
"""

    resp1 = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": pgn_clean,
            "learner_name": "PlayerA",
            "max_games": 1,
        },
    )
    assert resp1.status_code == 200
    assert resp1.json()["games_imported"] == 1

    resp2 = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": pgn_with_comments_and_whitespace,
            "learner_name": "PlayerA",
            "max_games": 1,
        },
    )
    assert resp2.status_code == 200
    assert resp2.json()["games_imported"] == 0
    assert resp2.json()["games_skipped_existing"] == 1

    assert db_session.query(Game).filter(Game.player_id == sample_player.id).count() == 1


def test_cross_player_game_detail_isolation(client, sample_player, db_session):
    """Verify Player B cannot inspect or access Player A's imported game details."""
    player_b = Player(
        id=uuid.uuid4(),
        chesscom_username="player_b",
        estimated_rating=1200,
    )
    db_session.add(player_b)
    db_session.commit()

    resp = client.post(
        "/api/import/pgn",
        json={
            "player_id": str(sample_player.id),
            "pgn": SAMPLE_VALID_PGN,
            "learner_name": "hikaru",
            "max_games": 1,
        },
    )
    assert resp.status_code == 200

    game_a = db_session.query(Game).filter(Game.player_id == sample_player.id).first()
    assert game_a is not None

    resp_leak = client.get(f"/api/games/{game_a.id}?player_id={player_b.id}")
    assert resp_leak.status_code == 404
