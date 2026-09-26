import pytest
import chess

from app.chess.triggers import Trigger
from app.chess.governor import GovernorState, governor_allows, select_interruption
from app.chess.stockfish import StockfishAdapter
from app.config import settings

@pytest.fixture
def dummy_trigger():
    return Trigger(
        type="opponent_threat",
        target_concept="opponent_threat_detection",
        priority=0,
        engine_facts={"threat": "test threat"},
    )

def test_governor_rejects_early_game(dummy_trigger):
    """Governor must reject interruptions before move 8."""
    board = chess.Board()
    state = GovernorState(interruptions_used=0)
    assert not governor_allows(dummy_trigger, move_number=7, state=state, board=board)
    assert governor_allows(dummy_trigger, move_number=8, state=state, board=board)

def test_governor_enforces_max_five_interruptions(dummy_trigger):
    """Governor must reject if interruptions_used >= 5."""
    board = chess.Board()
    state_4 = GovernorState(interruptions_used=4, last_interruption_move=8)
    assert governor_allows(dummy_trigger, move_number=15, state=state_4, board=board)

    state_5 = GovernorState(interruptions_used=5, last_interruption_move=8)
    assert not governor_allows(dummy_trigger, move_number=15, state=state_5, board=board)

def test_governor_enforces_six_move_spacing(dummy_trigger):
    """Governor must enforce at least 6 moves between interruptions."""
    board = chess.Board()
    state = GovernorState(interruptions_used=1, last_interruption_move=10, last_trigger_type="hanging")
    
    # Move 15 is 5 moves away -> Reject
    assert not governor_allows(dummy_trigger, move_number=15, state=state, board=board)
    # Move 16 is 6 moves away -> Allow
    assert governor_allows(dummy_trigger, move_number=16, state=state, board=board)

def test_governor_rejects_consecutive_same_trigger(dummy_trigger):
    """Governor must reject repeating the same trigger type consecutively."""
    board = chess.Board()
    state = GovernorState(interruptions_used=1, last_interruption_move=8, last_trigger_type="opponent_threat")
    
    # Same trigger 'opponent_threat' -> Reject
    assert not governor_allows(dummy_trigger, move_number=15, state=state, board=board)
    
    # Different trigger -> Allow
    diff_trigger = Trigger(
        type="hanging",
        target_concept="tactical_awareness",
        priority=1,
        engine_facts={},
    )
    assert governor_allows(diff_trigger, move_number=15, state=state, board=board)

def test_governor_rejects_terminal_and_dead_positions(dummy_trigger):
    """Governor must reject positions that are game over or dead drawn."""
    # Checkmated board (Scholar's mate)
    mate_board = chess.Board("r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4")
    state = GovernorState(interruptions_used=0)
    assert not governor_allows(dummy_trigger, move_number=10, state=state, board=mate_board)

    # Insufficient material (bare kings)
    bare_board = chess.Board("8/8/8/4k3/8/8/4K3/8 w - - 0 1")
    assert not governor_allows(dummy_trigger, move_number=10, state=state, board=bare_board)
