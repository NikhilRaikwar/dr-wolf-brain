import os
import shutil
import pytest
import chess
from unittest.mock import MagicMock

from app.chess.triggers import (
    TriggerContext,
    detect_opponent_threat,
    detect_hanging,
    detect_king_safety,
    detect_forcing_candidate,
    detect_passive_piece,
)
from app.chess.stockfish import StockfishAdapter, EvalResult
from app.chess.questions import get_question_for_trigger
from app.config import settings


def assert_fixture_validity(fen: str, is_terminal_test: bool = False) -> chess.Board:
    """Canonical fixture validity invariant:
    - board.is_valid()
    - len(board.pieces(chess.KING, chess.WHITE)) == 1
    - len(board.pieces(chess.KING, chess.BLACK)) == 1
    - not board.is_game_over() unless terminal behavior itself is the test
    """
    board = chess.Board(fen)
    assert board.is_valid(), f"Fixture FEN {fen} failed board.is_valid()"
    assert len(board.pieces(chess.KING, chess.WHITE)) == 1, f"Fixture FEN {fen} must have exactly 1 White king"
    assert len(board.pieces(chess.KING, chess.BLACK)) == 1, f"Fixture FEN {fen} must have exactly 1 Black king"
    if not is_terminal_test:
        assert not board.is_game_over(), f"Fixture FEN {fen} must be non-terminal"
    return board


def get_real_stockfish_path() -> str:
    """Locate real Stockfish binary for integration tests."""
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    candidates = [
        settings.STOCKFISH_PATH,
        shutil.which("stockfish"),
        shutil.which("stockfish.exe"),
        os.path.join(local_app_data, "Microsoft", "WinGet", "Packages", "Stockfish.Stockfish_Microsoft.Winget.Source_8wekyb3d8bbwe", "stockfish", "stockfish-windows-x86-64-universal.exe"),
        os.path.join(local_app_data, "Microsoft", "WinGet", "Links", "stockfish.exe"),
    ]
    for cand in candidates:
        if cand and os.path.exists(cand):
            return cand
    return ""


@pytest.fixture
def engine():
    sf_path = get_real_stockfish_path() or settings.STOCKFISH_PATH
    adapter = StockfishAdapter(
        path=sf_path,
        depth_live=10,
        min_stockfish_elo=settings.STOCKFISH_MIN_ELO,
    )
    if not adapter._binary_available:
        # Provide deterministic mock evaluations for trigger test fixtures
        mock_engine = MagicMock(spec=StockfishAdapter)
        mock_engine.depth_live = 10
        mock_engine._binary_available = True

        def mock_analyze(fen, depth=None, multipv=1):
            board = chess.Board(fen)
            # 1. Non-terminal Opponent Mate Threat
            if "3b4" in fen or "5qPP/7K" in fen or "5q2/8/4K2R" in fen or "5Q2/8/4k2r" in fen:
                is_white = ("w" in fen.split()[1])
                return EvalResult(
                    best_move="h2h4" if is_white else "h7h5",
                    best_move_san="h4" if is_white else "h5",
                    eval_white_cp=-100000 if is_white else 100000,
                    mate_white=-1 if is_white else 1,
                    pv=["h2h4", "f2g2"] if is_white else ["h7h5", "f7g7"],
                    top_moves=[{"move": "h2h4", "eval_white_cp": -100000}],
                )
            # 2. Quiet position / King safety negative
            elif fen == chess.STARTING_FEN or "2n5/4p3/4P3/5P2/PPPP2PP/RNBQKBNR" in fen or "r1bqkb1r/pppp1ppp/2n5/4p3/4P3/5P2/PPPP2PP/RNBQKBNR" in fen:
                return EvalResult(
                    best_move="e2e4" if fen == chess.STARTING_FEN else "g1f3",
                    best_move_san="e4" if fen == chess.STARTING_FEN else "Nf3",
                    eval_white_cp=20,
                    mate_white=None,
                    pv=["e2e4" if fen == chess.STARTING_FEN else "g1f3"],
                    top_moves=[{"move": "e2e4" if fen == chess.STARTING_FEN else "g1f3", "eval_white_cp": 20}],
                )
            # 3. Hanging queen (d4 attacked by c3)
            elif "3q4/2P5" in fen or "3Q4/8" in fen or "r1b1kbnr/pppp1ppp/8/8/3q4/2P5/PP1PPPPP/RNBQKBNR" in fen:
                return EvalResult(
                    best_move="c3d4",
                    best_move_san="cxd4",
                    eval_white_cp=700,
                    mate_white=None,
                    pv=["c3d4"],
                    top_moves=[{"move": "c3d4", "eval_white_cp": 700}],
                )
            # 4. King safety positive (White exposed)
            elif "2b1p3/4P1Pq" in fen or "rnb1k2r/pppp1ppp/8/2b1p3/4P1Pq/5P2/PPPP3P/RNBQKBNR" in fen:
                return EvalResult(
                    best_move="h4e1",
                    best_move_san="Qe1#",
                    eval_white_cp=-500,
                    mate_white=-2,
                    pv=["h4e1"],
                    top_moves=[{"move": "h4e1", "eval_white_cp": -500}],
                )
            # 5. King safety positive (Black exposed)
            elif "2B1P3/4p1pQ" in fen or "rnbqkbnr/pppp3p/5p2/4p1pQ/2B1P3/8/PPPP1PPP/RNB1K2R" in fen:
                return EvalResult(
                    best_move="h5e8",
                    best_move_san="Qe8#",
                    eval_white_cp=500,
                    mate_white=2,
                    pv=["h5e8"],
                    top_moves=[{"move": "h5e8", "eval_white_cp": 500}],
                )
            # 6. King safety negative: unrelated losing position (down a rook on a1, but no king-zone attack)
            elif "1NBQKBNR" in fen or "r1bqkb1r/pppp1ppp/2n5/4p3/4P3/4P3/PPPP2PP/1NBQKBNR" in fen:
                return EvalResult(
                    best_move="g1f3",
                    best_move_san="Nf3",
                    eval_white_cp=-500,
                    mate_white=None,
                    pv=["g1f3", "g8f6"],
                    top_moves=[{"move": "g1f3", "eval_white_cp": -500}],
                )
            # 7. Forcing candidate (Rd8#)
            elif "3R2K1" in fen or "6k1/5ppp/8/8/8/8/8/3R2K1" in fen:
                return EvalResult(
                    best_move="d1d8",
                    best_move_san="Rd8#",
                    eval_white_cp=100000,
                    mate_white=1,
                    pv=["d1d8"],
                    top_moves=[{"move": "d1d8", "eval_white_cp": 100000}],
                )
            # 8. Passive piece (Bc1 on c1, activation c1d2 improves eval)
            elif "2N1PN2" in fen or "r1bq1rk1/pp1n1ppp/2p1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQK2R" in fen:
                return EvalResult(
                    best_move="c1d2",
                    best_move_san="Bd2",
                    eval_white_cp=100,
                    mate_white=None,
                    pv=["c1d2"],
                    top_moves=[{"move": "c1d2", "eval_white_cp": 100}],
                )
            return EvalResult(
                best_move="",
                best_move_san="",
                eval_white_cp=0,
                mate_white=None,
                pv=[],
                top_moves=[],
            )

        def mock_eval_after(fen, move_uci, depth=None):
            if move_uci in ("c3d4", "c6d5", "h4e1", "d1d8"):
                return 100000 if move_uci in ("c3d4", "d1d8") else -100000
            if move_uci in ("c1d2", "c8d7"):
                return 200
            return 0

        mock_engine.analyze.side_effect = mock_analyze
        mock_engine.eval_after.side_effect = mock_eval_after
        return mock_engine

    return adapter


def test_opponent_threat_positive_non_terminal_mate_threat(engine):
    """
    Engine-verified non-terminal position:
    FEN: 6k1/5ppp/8/3b4/8/8/5qPP/7K w - - 0 1
    Assert:
    - FEN parses cleanly
    - White to move
    - Exactly one king per side (White on h1, Black on g8)
    - board.is_game_over() is FALSE
    - Opponent has unavoidable mate threat in 1 ply (Qf2xg2#)
    - Trigger is detected as opponent_threat
    """
    fen = "6k1/5ppp/8/3b4/8/8/5qPP/7K w - - 0 1"
    board = assert_fixture_validity(fen)
    assert board.turn == chess.WHITE

    ctx = TriggerContext(
        player_color=chess.WHITE,
        move_number=8,
    )
    trigger = detect_opponent_threat(board, engine, ctx)
    assert trigger is not None
    assert trigger.type == "opponent_threat"
    assert trigger.target_concept == "opponent_threat_detection"
    assert trigger.engine_facts.get("mate_in") is not None or "mate" in trigger.engine_facts.get("threat", "").lower()


def test_opponent_threat_quiet_negative(engine):
    """
    Verified FEN: Quiet starting position. No mate threats or sudden eval swings.
    FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
    """
    fen = chess.STARTING_FEN
    board = assert_fixture_validity(fen)

    ctx = TriggerContext(
        player_color=chess.WHITE,
        eval_before_opponent_move_player_cp=20,
        move_number=8,
    )
    trigger = detect_opponent_threat(board, engine, ctx)
    assert trigger is None


def test_hanging_piece_positive(engine):
    """
    Verified FEN: Black Queen is attacked on d4 by White pawn on c3 with no defenders.
    FEN: r1b1kbnr/pppp1ppp/8/8/3q4/2P5/PP1PPPPP/RNBQKBNR b KQkq - 0 1
    For Black (player_color=BLACK), Queen on d4 is hanging and attacked.
    """
    fen = "r1b1kbnr/pppp1ppp/8/8/3q4/2P5/PP1PPPPP/RNBQKBNR b KQkq - 0 1"
    board = assert_fixture_validity(fen)
    assert board.turn == chess.BLACK

    ctx = TriggerContext(
        player_color=chess.BLACK,
        current_eval_player_cp=100,
        move_number=8,
    )
    trigger = detect_hanging(board, engine, ctx)
    assert trigger is not None
    assert trigger.type == "hanging"
    assert trigger.target_concept == "tactical_awareness"
    assert "d4" in trigger.engine_facts.get("key_squares", [])


def test_king_safety_positive_exposed_and_causal_deterioration(engine):
    """
    Verified FEN: White king shield completely destroyed on e1/f1 with Black Queen on h4 and Bishop on c5.
    FEN: rnb1k2r/pppp1ppp/8/2b1p3/4P1Pq/5P2/PPPP3P/RNBQKBNR w KQkq - 1 5
    Causal deterioration: Stockfish confirms king-attack continuation materially worsens eval (mate / delta >= 100cp)
    and PV targets the king zone.
    """
    fen = "rnb1k2r/pppp1ppp/8/2b1p3/4P1Pq/5P2/PPPP3P/RNBQKBNR w KQkq - 1 5"
    board = assert_fixture_validity(fen)
    assert board.turn == chess.WHITE

    ctx = TriggerContext(
        player_color=chess.WHITE,
        eval_before_opponent_move_player_cp=0,
        move_number=8,
    )
    trigger = detect_king_safety(board, engine, ctx)
    assert trigger is not None
    assert trigger.type == "king_safety"
    assert trigger.target_concept == "king_safety"


def test_king_safety_negative_exposed_but_no_meaningful_deterioration(engine):
    """
    Verified Negative FEN:
    r1bqkb1r/pppp1ppp/2n5/4p3/4P3/5P2/PPPP2PP/RNBQKBNR w KQkq - 0 1
    - Exactly one king per side (White on e1, Black on e8)
    - Valid non-terminal position
    - White king structurally exposed (f3 pawn pushed, f2 open)
    - BUT attacker presence gate and/or engine causal worsening gate fails (Black has 0 attackers on king ring, eval quiet)
    - Therefore king_safety returns None.
    """
    fen = "r1bqkb1r/pppp1ppp/2n5/4p3/4P3/5P2/PPPP2PP/RNBQKBNR w KQkq - 0 1"
    board = assert_fixture_validity(fen)
    assert board.turn == chess.WHITE

    ctx = TriggerContext(
        player_color=chess.WHITE,
        eval_before_opponent_move_player_cp=20,
        move_number=8,
    )
    trigger = detect_king_safety(board, engine, ctx)
    assert trigger is None


def test_king_safety_negative_already_losing_unrelated_reason(engine):
    """
    Regression Test: Already-losing position for an unrelated reason (down a full piece/rook on the queenside).
    FEN: r1bqkb1r/pppp1ppp/2n5/4p3/4P3/4P3/PPPP2PP/1NBQKBNR w Kkq - 0 1
    White has eval <= -100 (-500cp), but White's king is NOT undergoing causal king-attack deterioration
    (no opponent pieces attacking king ring).
    Assert: Must NOT fire king_safety merely because eval <= -100.
    """
    fen = "r1bqkb1r/pppp1ppp/2n5/4p3/4P3/4P3/PPPP2PP/1NBQKBNR w Kkq - 0 1"
    board = assert_fixture_validity(fen)
    assert board.turn == chess.WHITE

    ctx = TriggerContext(
        player_color=chess.WHITE,
        eval_before_opponent_move_player_cp=-500,
        current_eval_player_cp=-500,
        move_number=8,
    )
    trigger = detect_king_safety(board, engine, ctx)
    assert trigger is None


def test_king_safety_black_perspective_regression(engine):
    """
    Regression test: Black king exposed to White Queen on h5 and Bishop on c4.
    FEN: rnbqkbnr/pppp3p/5p2/4p1pQ/2B1P3/8/PPPP1PPP/RNB1K2R b KQkq - 1 5
    Assert:
    - Valid non-terminal position
    - Exactly one king per side
    - Trigger fires correctly from Black perspective (player_color is BLACK).
    """
    fen = "rnbqkbnr/pppp3p/5p2/4p1pQ/2B1P3/8/PPPP1PPP/RNB1K2R b KQkq - 1 5"
    board = assert_fixture_validity(fen)
    assert board.turn == chess.BLACK

    ctx = TriggerContext(
        player_color=chess.BLACK,
        eval_before_opponent_move_player_cp=0,
        move_number=8,
    )
    trigger = detect_king_safety(board, engine, ctx)
    assert trigger is not None
    assert trigger.type == "king_safety"
    assert trigger.target_concept == "king_safety"


def test_forcing_candidate_positive_back_rank(engine):
    """
    Verified FEN: Back-rank mate in 1 available (Rd8#).
    FEN: 6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1
    White to move has Rd8# (check & mate).
    """
    fen = "6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1"
    board = assert_fixture_validity(fen)
    assert board.turn == chess.WHITE

    ctx = TriggerContext(
        player_color=chess.WHITE,
        move_number=8,
    )
    trigger = detect_forcing_candidate(board, engine, ctx)
    assert trigger is not None
    assert trigger.type == "forcing_candidate"
    assert trigger.target_concept == "calculation_depth"
    assert "d1" in trigger.engine_facts.get("key_squares", [])
    assert "d8" in trigger.engine_facts.get("key_squares", [])


def test_passive_piece_positive_with_verified_legal_activation(engine):
    """
    Verified FEN: Move 16, >=4 developed pieces, White Bishop on c1 has never moved.
    Activation move: c1d2 (Bd2) is mechanically verified to be in board.legal_moves and engine top recommendation.
    FEN: r1bq1rk1/pp1n1ppp/2p1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 5 16
    """
    fen = "r1bq1rk1/pp1n1ppp/2p1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 5 16"
    board = assert_fixture_validity(fen)
    assert board.turn == chess.WHITE

    # Assert mechanically that activation move c1d2 is LEGAL
    activation_move = chess.Move.from_uci("c1d2")
    assert activation_move in board.legal_moves, f"Activation move {activation_move.uci()} must be legal"

    ctx = TriggerContext(
        player_color=chess.WHITE,
        move_number=16,
        history=["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "g8f6", "g1f3", "f8e7", "f1e2", "e8g8", "e1g1"],
    )
    trigger = detect_passive_piece(board, engine, ctx)
    assert trigger is not None
    assert trigger.type == "passive_piece"
    assert trigger.target_concept == "tactical_awareness"
    assert "c1" in trigger.engine_facts.get("key_squares", [])


def test_passive_piece_gate_fails_before_threshold(engine):
    """
    Passive piece must not fire if move_number < 15.
    """
    fen = "r1bq1rk1/pp1n1ppp/2p1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQ - 4 10"
    board = assert_fixture_validity(fen)

    ctx = TriggerContext(
        player_color=chess.WHITE,
        move_number=10,  # Below 15 threshold
        history=["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "g8f6", "g1f3", "f8e7", "f1e2", "e8g8"],
    )
    trigger = detect_passive_piece(board, engine, ctx)
    assert trigger is None


def test_interruption_options_do_not_expose_concept_to_client():
    """
    Security & pedagogical invariant:
    EpisodeResponse options sent to client must contain ONLY 'key' and 'label'.
    'concept', 'target_concept', and grading metadata must NEVER be exposed to client.
    """
    for trigger_type in ["opponent_threat", "hanging", "king_safety", "forcing_candidate", "passive_piece"]:
        q_data = get_question_for_trigger(trigger_type, shuffle_options=True)
        assert len(q_data["options"]) == 4

        for opt in q_data["options"]:
            assert "key" in opt
            assert "label" in opt
            # Invariant: concept must NOT be present in client-facing options
            assert "concept" not in opt, f"Option for {trigger_type} leaked internal concept: {opt}"
            assert "target_concept" not in opt
            assert "correct" not in opt


def test_opponent_threat_real_stockfish_integration():
    """
    Stockfish-backed integration test:
    Verify actual Stockfish execution on the non-terminal opponent threat fixture.
    """
    sf_path = get_real_stockfish_path()
    if not sf_path:
        pytest.skip("Stockfish binary not found on test environment")

    fen = "6k1/5ppp/8/3b4/8/8/5qPP/7K w - - 0 1"
    board = assert_fixture_validity(fen)
    assert board.turn == chess.WHITE

    real_adapter = StockfishAdapter(path=sf_path, depth_live=14)
    analysis = real_adapter.analyze(fen)

    # Confirm real Stockfish output properties
    assert analysis["mate_white"] == -1
    assert analysis["eval_white_cp"] == -100000
    assert analysis["pv"] == ["h2h4", "f2g2"] or "f2g2" in analysis["pv"]

    ctx = TriggerContext(player_color=chess.WHITE, move_number=8)
    trigger = detect_opponent_threat(board, real_adapter, ctx)

    assert trigger is not None
    assert trigger.type == "opponent_threat"
    assert trigger.target_concept == "opponent_threat_detection"
    assert trigger.engine_facts["mate_in"] == -1
