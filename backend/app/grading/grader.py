import logging
from typing import Optional, Dict, Any, List, Tuple
import chess

from app.chess.stockfish import StockfishAdapter, eval_for_color
from app.chess.questions import QUESTION_BANK, TRIGGER_TO_QUESTION_ID
from app.schemas import ReasoningAnswer, GraderDetail
from app.llm.client import LLMClient, FreeTextGrade

logger = logging.getLogger(__name__)


def calculate_cp_loss(best_eval_player: int, played_eval_player: int) -> int:
    """Calculate learner-relative centipawn loss from player's fixed perspective.
    Handles forced mate preservation and mate blunders safely.
    """
    # Case 1: Learner had a forced mate and preserved a forced mate
    if best_eval_player >= 100000 and played_eval_player >= 100000:
        return 0

    # Case 2: Learner had a forced mate but blundered it away into non-mate
    if best_eval_player >= 100000 and played_eval_player < 100000:
        return max(151, best_eval_player - played_eval_player)

    # Case 3: Learner was already in an unavoidable forced mate and remains mated
    if best_eval_player <= -100000 and played_eval_player <= -100000:
        return 0

    # Case 4: Learner blundered into an opponent forced mate
    if best_eval_player > -100000 and played_eval_player <= -100000:
        return max(151, best_eval_player - played_eval_player)

    # Standard centipawn deterioration (positive = loss for learner)
    return max(0, best_eval_player - played_eval_player)


def compute_move_outcome(cp_loss: int) -> str:
    """Determine move outcome band from learner's centipawn loss.
    <= 15: best
    <= 60: acceptable
    <= 150: inaccurate
    > 150: mistake
    """
    if cp_loss <= 15:
        return "best"
    elif cp_loss <= 60:
        return "acceptable"
    elif cp_loss <= 150:
        return "inaccurate"
    else:
        return "mistake"


def find_option(trigger_type: str, choice_key: str, question_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Resolve option dictionary from canonical server QUESTION_BANK."""
    q_id = question_id or TRIGGER_TO_QUESTION_ID.get(trigger_type, trigger_type)
    bank_entry = QUESTION_BANK.get(q_id) or QUESTION_BANK.get(trigger_type)
    if not bank_entry:
        return None
    bank_options = bank_entry.get("options", [])
    return next((opt for opt in bank_options if opt.get("key") == choice_key), None)


def compute_engine_truth(
    fen: str,
    player_color: chess.Color,
    played_move_uci: str,
    trigger_type: str,
    target_concept: str,
    key_squares: List[str],
    key_pieces: List[Dict[str, Any]],
    engine: StockfishAdapter,
) -> Tuple[Dict[str, Any], int, str]:
    """Capture authoritative engine truth using StockfishAdapter.
    Persists White-relative evaluations, computes learner-normalized cp_loss,
    and unambiguously disambiguates trigger_type vs target_concept.
    """
    analysis = engine.analyze(fen, depth=engine.depth_import, multipv=1)
    best_move = analysis.get("best_move", "")
    best_move_san = analysis.get("best_move_san", "")
    best_eval_white_cp = analysis.get("eval_white_cp", 0)

    best_eval_player = eval_for_color(analysis, player_color)

    played_eval_white_cp = engine.eval_after(fen, played_move_uci, depth=engine.depth_import)
    played_eval_player = (
        played_eval_white_cp if player_color == chess.WHITE else -played_eval_white_cp
    )

    cp_loss = calculate_cp_loss(best_eval_player, played_eval_player)
    move_outcome = compute_move_outcome(cp_loss)

    engine_truth = {
        "best_move": best_move,
        "best_move_san": best_move_san,
        "best_eval_white_cp": best_eval_white_cp,
        "played_move": played_move_uci,
        "played_eval_white_cp": played_eval_white_cp,
        "cp_loss": cp_loss,
        "trigger_type": trigger_type,
        "target_concept": target_concept,
        "concept": target_concept,  # Canonical alias: explicitly defined as target skill concept
        "key_squares": key_squares,
        "key_pieces": key_pieces,
        "pv": analysis.get("pv", []),
    }

    return engine_truth, cp_loss, move_outcome


def grade_reasoning(
    trigger_type: str,
    target_concept: str,
    reasoning: ReasoningAnswer,
    engine_facts: Dict[str, Any],
    llm: Optional[LLMClient] = None,
    question_id: Optional[str] = None,
) -> Tuple[str, GraderDetail]:
    """Grade learner reasoning using deterministic checks first and constrained LLM second.
    Anti-click-farming rule: concept_match alone produces at most 'partial', never 'recognized'.
    Fails safely with ValueError if an unknown option key is provided.
    """
    key_squares = set(engine_facts.get("key_squares", []))
    key_pieces = engine_facts.get("key_pieces", [])

    # --- Layer 1: Deterministic resolution ---
    q_id = question_id or TRIGGER_TO_QUESTION_ID.get(trigger_type, trigger_type)
    chosen_opt = find_option(trigger_type, reasoning.choice, question_id=q_id)
    if not chosen_opt:
        raise ValueError(
            f"Invalid or unknown option key '{reasoning.choice}' for trigger '{trigger_type}' / question '{q_id}'"
        )

    chosen_concept = chosen_opt.get("concept", "")
    concept_match = bool(chosen_concept and target_concept and chosen_concept == target_concept)

    # Square match: intersection of highlighted squares and engine key squares
    highlighted_squares = set(reasoning.squares_highlighted or [])
    square_match = bool(highlighted_squares & key_squares)

    # Piece match: structured match where highlighted square matches a known key piece square
    piece_match = False
    for kp in key_pieces:
        if isinstance(kp, dict) and kp.get("square") in highlighted_squares:
            piece_match = True
            break

    # --- Layer 2: Constrained LLM interpretation of free text ---
    if llm and reasoning.free_text and reasoning.free_text.strip():
        bank_entry = QUESTION_BANK.get(q_id) or QUESTION_BANK.get(trigger_type, {})
        question_text = bank_entry.get("question", "What do you see in this position?")
        llm_out = llm.grade_free_text(
            question=question_text,
            free_text=reasoning.free_text,
            engine_facts=engine_facts,
        )
    else:
        llm_out = FreeTextGrade()

    # --- Final Grade Synthesis ---
    contradicts = llm_out.contradicts_engine_truth
    concrete = (
        square_match
        or piece_match
        or llm_out.identified_concrete_threat
        or llm_out.identified_relevant_piece
    )

    if contradicts:
        reasoning_outcome = "missed"
    elif concept_match and concrete:
        reasoning_outcome = "recognized"
    elif concept_match or llm_out.supports_engine_concept:
        reasoning_outcome = "partial"
    else:
        reasoning_outcome = "missed"

    grader_detail = GraderDetail(
        concept_match=concept_match,
        square_match=square_match,
        piece_match=piece_match,
        llm=llm_out.model_dump(),
    )

    return reasoning_outcome, grader_detail


def grade_committed_episode(
    episode: Any,
    player_color_str: str,
    engine: StockfishAdapter,
    llm: Optional[LLMClient] = None,
) -> Tuple[str, str, int, Dict[str, Any], GraderDetail]:
    """Full grading coordinator for a committed episode.
    Returns: (reasoning_outcome, move_outcome, cp_loss, engine_truth, grader_detail)
    """
    player_color = chess.WHITE if player_color_str == "white" else chess.BLACK
    trigger_evidence = episode.trigger_evidence or {}
    trigger_type = trigger_evidence.get("type", "")
    target_concept = trigger_evidence.get("target_concept") or trigger_evidence.get("concept", "")
    engine_facts = trigger_evidence.get("engine_facts", {})
    key_squares = engine_facts.get("key_squares", [])
    key_pieces = engine_facts.get("key_pieces", [])

    learner_action = episode.learner_action or {}
    played_move_uci = learner_action.get("move_played", "")

    # 1. Compute authoritative engine truth and move outcome
    engine_truth, cp_loss, move_outcome = compute_engine_truth(
        fen=episode.fen,
        player_color=player_color,
        played_move_uci=played_move_uci,
        trigger_type=trigger_type,
        target_concept=target_concept,
        key_squares=key_squares,
        key_pieces=key_pieces,
        engine=engine,
    )

    # 2. Grade reasoning
    learner_reasoning_dict = episode.learner_reasoning or {}
    reasoning = ReasoningAnswer(
        choice=learner_reasoning_dict.get("choice", ""),
        free_text=learner_reasoning_dict.get("free_text"),
        squares_highlighted=learner_reasoning_dict.get("squares_highlighted", []),
    )

    reasoning_outcome, grader_detail = grade_reasoning(
        trigger_type=trigger_type,
        target_concept=target_concept,
        reasoning=reasoning,
        engine_facts=engine_facts,
        llm=llm,
        question_id=trigger_evidence.get("question_id"),
    )

    return reasoning_outcome, move_outcome, cp_loss, engine_truth, grader_detail
