"""
Deterministic Trigger Detectors for Dr. Wolf Brain Think First.
Frozen for v1.1 CANONICAL SPEC.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Set
import chess

from app.concepts import TRIGGER_TO_SKILL
from app.chess.stockfish import StockfishAdapter, eval_for_color

TRIGGER_PRIORITIES = {
    "opponent_threat": 0,
    "hanging": 1,
    "king_safety": 2,
    "forcing_candidate": 3,
    "passive_piece": 4,
}

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 300,
    chess.BISHOP: 320,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000,
}


@dataclass
class TriggerContext:
    player_color: chess.Color
    eval_before_opponent_move_player_cp: Optional[int] = None
    current_eval_player_cp: Optional[int] = None
    move_number: int = 1
    history: List[str] = field(default_factory=list)


@dataclass
class Trigger:
    type: str  # "opponent_threat" | "hanging" | "king_safety" | "forcing_candidate" | "passive_piece"
    target_concept: str
    priority: int
    engine_facts: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "concept": self.target_concept,
            "priority": self.priority,
            "evidence": self.engine_facts,
            "target_concept": self.target_concept,
            "engine_facts": self.engine_facts,
        }


def _get_king_zone(board: chess.Board, king_color: chess.Color) -> Set[chess.Square]:
    king_sq = board.king(king_color)
    if king_sq is None:
        return set()
    zone = {king_sq}
    kr = chess.square_rank(king_sq)
    kf = chess.square_file(king_sq)
    for r in range(max(0, kr - 1), min(8, kr + 2)):
        for f in range(max(0, kf - 1), min(8, kf + 2)):
            zone.add(chess.square(f, r))
    return zone


def _has_pawn_shield_deficiency(board: chess.Board, king_color: chess.Color) -> bool:
    king_sq = board.king(king_color)
    if king_sq is None:
        return False
    kr = chess.square_rank(king_sq)
    kf = chess.square_file(king_sq)

    pawn_count = 0
    adjacent_files = [f for f in [kf - 1, kf, kf + 1] if 0 <= f <= 7]

    for f in adjacent_files:
        has_shield_pawn = False
        for r in range(8):
            piece = board.piece_at(chess.square(f, r))
            if piece and piece.piece_type == chess.PAWN and piece.color == king_color:
                # Check if within 2 ranks of king
                if abs(r - kr) <= 2:
                    has_shield_pawn = True
                    pawn_count += 1
        # Open or semi-open file pointing directly at king
        if not has_shield_pawn:
            return True

    return pawn_count < 2


def _get_moved_squares(history: List[str], player_color: chess.Color) -> Set[chess.Square]:
    moved = set()
    temp_board = chess.Board()
    for uci in history:
        try:
            m = chess.Move.from_uci(uci)
            if temp_board.color_at(m.from_square) == player_color:
                moved.add(m.from_square)
            temp_board.push(m)
        except Exception:
            continue
    return moved


def detect_opponent_threat(
    board: chess.Board,
    engine: StockfishAdapter,
    ctx: TriggerContext,
) -> Optional[Trigger]:
    """Detect opponent mate threats or severe fixed-perspective evaluation deterioration."""
    analysis = engine.analyze(board.fen())
    curr_eval_player = eval_for_color(analysis, ctx.player_color)

    # 1. Mate threat check
    mate_for_player = (
        analysis["mate_white"]
        if ctx.player_color == chess.WHITE
        else (-analysis["mate_white"] if analysis["mate_white"] is not None else None)
    )

    if mate_for_player is not None and mate_for_player < 0 and abs(mate_for_player) <= 10:
        pv_squares = []
        for uci_str in analysis.get("pv", [])[:2]:
            try:
                m = chess.Move.from_uci(uci_str)
                pv_squares.extend([chess.square_name(m.from_square), chess.square_name(m.to_square)])
            except Exception:
                pass

        return Trigger(
            type="opponent_threat",
            target_concept=TRIGGER_TO_SKILL["opponent_threat"],
            priority=TRIGGER_PRIORITIES["opponent_threat"],
            engine_facts={
                "threat": f"Opponent mate threat in {abs(mate_for_player)} plies",
                "key_squares": list(dict.fromkeys(pv_squares)),
                "key_pieces": [],
                "eval_before": ctx.eval_before_opponent_move_player_cp,
                "eval_if_missed": curr_eval_player,
                "mate_in": mate_for_player,
            },
        )

    # 2. Evaluation swing check (> 150cp deterioration from learner perspective)
    if ctx.eval_before_opponent_move_player_cp is not None:
        eval_swing = ctx.eval_before_opponent_move_player_cp - curr_eval_player
        if eval_swing > 150:
            pv_squares = []
            for uci_str in analysis.get("pv", [])[:2]:
                try:
                    m = chess.Move.from_uci(uci_str)
                    pv_squares.extend([chess.square_name(m.from_square), chess.square_name(m.to_square)])
                except Exception:
                    pass

            return Trigger(
                type="opponent_threat",
                target_concept=TRIGGER_TO_SKILL["opponent_threat"],
                priority=TRIGGER_PRIORITIES["opponent_threat"],
                engine_facts={
                    "threat": f"Severe eval swing ({eval_swing}cp) threatening learner position",
                    "key_squares": list(dict.fromkeys(pv_squares)),
                    "key_pieces": [],
                    "eval_before": ctx.eval_before_opponent_move_player_cp,
                    "eval_if_missed": curr_eval_player,
                    "eval_swing": eval_swing,
                },
            )

    return None


def detect_hanging(
    board: chess.Board,
    engine: StockfishAdapter,
    ctx: TriggerContext,
) -> Optional[Trigger]:
    """Detect undefended or inadequately defended player pieces under attack with >= 150cp loss."""
    opponent_color = not ctx.player_color

    # Determine current eval
    if ctx.current_eval_player_cp is not None:
        curr_eval = ctx.current_eval_player_cp
    else:
        curr_eval = eval_for_color(engine.analyze(board.fen()), ctx.player_color)

    # Iterate over all player pieces (excluding King)
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if not piece or piece.color != ctx.player_color or piece.piece_type == chess.KING:
            continue

        attackers = board.attackers(opponent_color, sq)
        if not attackers:
            continue

        defenders = board.attackers(ctx.player_color, sq)

        # v1 approximation for inadequately defended (exact SEE is v2):
        # Piece is inadequately defended if no defenders, OR cheapest defender > captured piece value
        is_inadequately_defended = False
        if not defenders:
            is_inadequately_defended = True
        else:
            cheapest_defender_val = min(
                PIECE_VALUES.get(board.piece_at(d_sq).piece_type, 100)
                for d_sq in defenders
                if board.piece_at(d_sq)
            )
            captured_val = PIECE_VALUES.get(piece.piece_type, 100)
            if cheapest_defender_val > captured_val:
                is_inadequately_defended = True

        if is_inadequately_defended:
            # Confirm with engine: check eval deterioration if opponent captures
            # Evaluate after opponent capture
            worst_delta = 0
            worst_attacker_sq = None

            for att_sq in attackers:
                capture_move = chess.Move(from_square=att_sq, to_square=sq)
                if capture_move in board.legal_moves or not board.is_into_check(capture_move):
                    eval_after_cp = engine.eval_after(board.fen(), capture_move.uci())
                    eval_after_player = (
                        eval_after_cp if ctx.player_color == chess.WHITE else -eval_after_cp
                    )
                    delta = curr_eval - eval_after_player
                    if delta > worst_delta:
                        worst_delta = delta
                        worst_attacker_sq = att_sq

            if worst_delta >= 150:
                sq_name = chess.square_name(sq)
                p_name = chess.piece_name(piece.piece_type)
                return Trigger(
                    type="hanging",
                    target_concept=TRIGGER_TO_SKILL["hanging"],
                    priority=TRIGGER_PRIORITIES["hanging"],
                    engine_facts={
                        "threat": f"Hanging {p_name} on {sq_name}",
                        "key_squares": [sq_name],
                        "key_pieces": [
                            {
                                "type": p_name,
                                "color": "white" if piece.color == chess.WHITE else "black",
                                "square": sq_name,
                            }
                        ],
                        "attacker_square": chess.square_name(worst_attacker_sq) if worst_attacker_sq is not None else None,
                        "eval_before": curr_eval,
                        "eval_if_missed": curr_eval - worst_delta,
                        "delta": worst_delta,
                    },
                )

    return None


def detect_king_safety(
    board: chess.Board,
    engine: StockfishAdapter,
    ctx: TriggerContext,
) -> Optional[Trigger]:
    """Detect severe king safety exposure confirmed by Stockfish eval deterioration >= 100cp targeting the king zone."""
    king_color = ctx.player_color
    opponent_color = not king_color
    king_sq = board.king(king_color)
    if king_sq is None:
        return None

    # Gate 1: Structural king weakness (pawn shield deficiency or open/semi-open file pointing at king)
    shield_deficient = _has_pawn_shield_deficiency(board, king_color)

    # Gate 2: Attacker presence (Opponent queen on board OR >= 2 opponent pieces attacking king ring)
    opponent_queen = bool(board.pieces(chess.QUEEN, opponent_color))
    king_zone = _get_king_zone(board, king_color)

    attacking_pieces = set()
    for z_sq in king_zone:
        attacking_pieces.update(board.attackers(opponent_color, z_sq))

    if not (shield_deficient and (opponent_queen or len(attacking_pieces) >= 2)):
        return None

    # Gate 3 (Engine confirmation):
    # Stockfish confirms the king-attacking continuation materially worsens the learner's evaluation by >=100cp
    # AND confirming PV actually involves the learner king zone.
    # Fixed learner perspective for all values.
    analysis = engine.analyze(board.fen())
    curr_eval = eval_for_color(analysis, ctx.player_color)

    pv = analysis.get("pv", [])
    targets_king_zone = False
    for move_str in pv[:2]:
        try:
            m = chess.Move.from_uci(move_str)
            if m.to_square in king_zone or m.from_square in king_zone:
                targets_king_zone = True
                break
        except Exception:
            continue

    mate_for_player = (
        analysis["mate_white"]
        if ctx.player_color == chess.WHITE
        else (-analysis["mate_white"] if analysis.get("mate_white") is not None else None)
    )
    is_mate_against_player = mate_for_player is not None and mate_for_player < 0

    # Causal deterioration calculation (fixed learner perspective):
    # Case A: If ctx.eval_before_opponent_move_player_cp is provided (opponent move worsened learner position by >= 100cp)
    eval_deterioration = 0
    if ctx.eval_before_opponent_move_player_cp is not None:
        eval_deterioration = ctx.eval_before_opponent_move_player_cp - curr_eval

    # Case B: Opponent's direct attacking moves into king zone causing >= 100cp deterioration
    max_attack_delta = 0
    for att_sq in attacking_pieces:
        for z_sq in king_zone:
            cand_move = chess.Move(from_square=att_sq, to_square=z_sq)
            try:
                eval_after_cp = engine.eval_after(board.fen(), cand_move.uci())
                eval_after_player = (
                    eval_after_cp if ctx.player_color == chess.WHITE else -eval_after_cp
                )
                delta = curr_eval - eval_after_player
                if delta > max_attack_delta:
                    max_attack_delta = delta
                    targets_king_zone = True
            except Exception:
                pass

    has_causal_worsening = (
        (eval_deterioration >= 100 and targets_king_zone)
        or (max_attack_delta >= 100 and targets_king_zone)
        or (is_mate_against_player and targets_king_zone)
    )

    if targets_king_zone and has_causal_worsening:
        return Trigger(
            type="king_safety",
            target_concept=TRIGGER_TO_SKILL["king_safety"],
            priority=TRIGGER_PRIORITIES["king_safety"],
            engine_facts={
                "threat": "King safety vulnerability under direct attack",
                "key_squares": [chess.square_name(s) for s in king_zone],
                "key_pieces": [
                    {
                        "type": "king",
                        "color": "white" if king_color == chess.WHITE else "black",
                        "square": chess.square_name(king_sq),
                    }
                ],
                "eval_before": ctx.eval_before_opponent_move_player_cp if ctx.eval_before_opponent_move_player_cp is not None else curr_eval,
                "eval_if_missed": curr_eval,
                "delta": max(eval_deterioration, max_attack_delta),
                "attacking_pieces_count": len(attacking_pieces),
            },
        )

    return None


def detect_forcing_candidate(
    board: chess.Board,
    engine: StockfishAdapter,
    ctx: TriggerContext,
) -> Optional[Trigger]:
    """Detect when player has a forcing candidate move (check, or winning capture >= 100cp)."""
    if board.turn != ctx.player_color:
        return None

    analysis = engine.analyze(board.fen(), multipv=3)
    curr_eval = eval_for_color(analysis, ctx.player_color)

    # Check top moves
    top_moves = analysis.get("top_moves", [])
    if not top_moves and analysis.get("pv"):
        top_moves = [{"move": analysis["pv"][0], "eval_white_cp": analysis["eval_white_cp"]}]

    for item in top_moves[:3]:
        move_uci = item.get("move")
        if not move_uci:
            continue
        try:
            m = chess.Move.from_uci(move_uci)
            if m not in board.legal_moves:
                continue

            is_check = board.gives_check(m)
            is_capture = board.is_capture(m)

            move_eval_player = (
                item["eval_white_cp"] if ctx.player_color == chess.WHITE else -item["eval_white_cp"]
            )
            eval_gain = move_eval_player - curr_eval

            if is_check or (is_capture and eval_gain >= 100) or (move_eval_player >= 200 and eval_gain >= 150):
                piece = board.piece_at(m.from_square)
                p_name = chess.piece_name(piece.piece_type) if piece else "piece"
                from_name = chess.square_name(m.from_square)
                to_name = chess.square_name(m.to_square)

                return Trigger(
                    type="forcing_candidate",
                    target_concept=TRIGGER_TO_SKILL["forcing_candidate"],
                    priority=TRIGGER_PRIORITIES["forcing_candidate"],
                    engine_facts={
                        "threat": f"Forcing tactical candidate {m.uci()} available",
                        "candidate_move": m.uci(),
                        "is_check": is_check,
                        "is_capture": is_capture,
                        "key_squares": [from_name, to_name],
                        "key_pieces": [
                            {
                                "type": p_name,
                                "color": "white" if ctx.player_color == chess.WHITE else "black",
                                "square": from_name,
                            }
                        ],
                        "eval_before": curr_eval,
                        "eval_after": move_eval_player,
                    },
                )
        except Exception:
            continue

    return None


def detect_passive_piece(
    board: chess.Board,
    engine: StockfishAdapter,
    ctx: TriggerContext,
) -> Optional[Trigger]:
    """LOW PRIORITY detector for unmoved minor/major pieces where activation improves eval >= 80cp."""
    if board.turn != ctx.player_color:
        return None

    # Gate 1: move_number >= 15
    if ctx.move_number < 15:
        return None

    moved_squares = _get_moved_squares(ctx.history, ctx.player_color)

    # Gate 2: >= 4 other pieces developed (moved at least once)
    if len(moved_squares) < 4:
        return None

    # Gate 3: Find a minor piece or rook that has never moved from its starting square
    starting_squares = {
        chess.WHITE: {
            chess.B1: chess.KNIGHT,
            chess.C1: chess.BISHOP,
            chess.F1: chess.BISHOP,
            chess.G1: chess.KNIGHT,
            chess.A1: chess.ROOK,
            chess.H1: chess.ROOK,
        },
        chess.BLACK: {
            chess.B8: chess.KNIGHT,
            chess.C8: chess.BISHOP,
            chess.F8: chess.BISHOP,
            chess.G8: chess.KNIGHT,
            chess.A8: chess.ROOK,
            chess.H8: chess.ROOK,
        },
    }[ctx.player_color]

    analysis = engine.analyze(board.fen(), multipv=3)
    curr_eval = eval_for_color(analysis, ctx.player_color)
    top_moves_uci = [item["move"] for item in analysis.get("top_moves", []) if item.get("move")]
    if not top_moves_uci and analysis.get("best_move"):
        top_moves_uci = [analysis["best_move"]]
    pv_moves = analysis.get("pv", [])

    for sq, p_type in starting_squares.items():
        if sq in moved_squares:
            continue
        piece = board.piece_at(sq)
        if not piece or piece.color != ctx.player_color or piece.piece_type != p_type:
            continue

        # Check if legal moves exist from this square
        piece_legal_moves = [m for m in board.legal_moves if m.from_square == sq]
        for m in piece_legal_moves:
            m_uci = m.uci()
            eval_after_cp = engine.eval_after(board.fen(), m_uci)
            eval_after_player = (
                eval_after_cp if ctx.player_color == chess.WHITE else -eval_after_cp
            )
            is_top_activation = (m_uci in top_moves_uci or m_uci in pv_moves[:3])
            if (eval_after_player - curr_eval >= 80) or is_top_activation or (eval_after_player >= 80 and eval_after_player - curr_eval >= -50):
                sq_name = chess.square_name(sq)
                p_name = chess.piece_name(piece.piece_type)
                return Trigger(
                    type="passive_piece",
                    target_concept=TRIGGER_TO_SKILL["passive_piece"],
                    priority=TRIGGER_PRIORITIES["passive_piece"],
                    engine_facts={
                        "threat": f"Passive {p_name} on {sq_name} can be actively improved",
                        "key_squares": [sq_name],
                        "key_pieces": [
                            {
                                "type": p_name,
                                "color": "white" if piece.color == chess.WHITE else "black",
                                "square": sq_name,
                            }
                        ],
                        "activating_move": m_uci,
                        "eval_before": curr_eval,
                        "eval_after": eval_after_player,
                    },
                )

    return None
