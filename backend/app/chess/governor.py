"""
Interruption Governor for Dr. Wolf Brain Think First.
Frozen for v1.1 CANONICAL SPEC.
"""

from dataclasses import dataclass
from typing import Optional, List, Any
import chess

from app.chess.triggers import (
    Trigger,
    TriggerContext,
    TRIGGER_PRIORITIES,
    detect_opponent_threat,
    detect_hanging,
    detect_king_safety,
    detect_forcing_candidate,
    detect_passive_piece,
)
from app.chess.stockfish import StockfishAdapter


@dataclass
class GovernorState:
    interruptions_used: int = 0
    last_interruption_move: Optional[int] = None
    last_trigger_type: Optional[str] = None


def is_dead_drawn(board: chess.Board) -> bool:
    """Check if the position is functionally or theoretically dead/drawn."""
    if board.is_insufficient_material() or board.is_fifty_moves() or board.is_repetition(3):
        return True
    # Simplified material check: Bare kings, or K+N vs K, K+B vs K, K+B vs K+B (same color)
    piece_count = len(board.piece_map())
    if piece_count <= 2:
        return True
    return False


def governor_allows(
    trigger: Trigger,
    move_number: int,
    state: GovernorState,
    board: chess.Board,
) -> bool:
    """Deterministic governor gates. Returns True only if all conditions pass."""
    # Gate 1: Max 5 interruptions per session
    if state.interruptions_used >= 5:
        return False

    # Gate 2: No interruptions in early opening (< move 8)
    if move_number < 8:
        return False

    # Gate 3: Minimum spacing of 6 moves between interruptions
    if state.last_interruption_move is not None:
        if move_number - state.last_interruption_move < 6:
            return False

    # Gate 4: Do not repeat the same trigger type consecutively
    if state.last_trigger_type and trigger.type == state.last_trigger_type:
        return False

    # Gate 5: Skip terminal or dead/drawn positions
    if board.is_game_over() or is_dead_drawn(board):
        return False

    return True


def select_interruption(
    board: chess.Board,
    engine: StockfishAdapter,
    ctx: TriggerContext,
    governor_state: GovernorState,
    player_state: Optional[Any] = None,
) -> Optional[Trigger]:
    """Run all trigger detectors, filter by governor, and select the highest-priority trigger."""
    detectors = [
        detect_opponent_threat,
        detect_hanging,
        detect_king_safety,
        detect_forcing_candidate,
        detect_passive_piece,
    ]

    eligible_triggers: List[Trigger] = []

    for detect_fn in detectors:
        try:
            trig = detect_fn(board, engine, ctx)
            if trig:
                eligible_triggers.append(trig)
        except Exception:
            # Engine failure fails closed for individual detectors
            continue

    if not eligible_triggers:
        return None

    # Filter by governor rules
    allowed_triggers = [
        t for t in eligible_triggers
        if governor_allows(t, ctx.move_number, governor_state, board)
    ]

    if not allowed_triggers:
        return None

    # Rank among eligible:
    # Priority sorting: learner_weakness_score (0.0 for this milestone) followed by static priority
    allowed_triggers.sort(
        key=lambda t: (
            0.0,  # learner_weakness_score placeholder (no fake data)
            TRIGGER_PRIORITIES.get(t.type, 99),
        )
    )

    return allowed_triggers[0]
