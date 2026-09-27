import pytest
import chess
from unittest.mock import MagicMock

from app.grading.grader import (
    calculate_cp_loss,
    compute_move_outcome,
    compute_engine_truth,
    grade_reasoning,
    grade_committed_episode,
)
from app.chess.stockfish import StockfishAdapter, EvalResult
from app.schemas import ReasoningAnswer, GraderDetail
from app.llm.client import FreeTextGrade, LLMClient
from app.config import settings


# =====================================================================
# 1. MOVE OUTCOME & CENTIPAWN LOSS TESTS
# =====================================================================

def test_move_outcome_exact_boundaries():
    """Verify exact move outcome threshold boundaries."""
    assert compute_move_outcome(0) == "best"
    assert compute_move_outcome(15) == "best"
    assert compute_move_outcome(16) == "acceptable"
    assert compute_move_outcome(60) == "acceptable"
    assert compute_move_outcome(61) == "inaccurate"
    assert compute_move_outcome(150) == "inaccurate"
    assert compute_move_outcome(151) == "mistake"
    assert compute_move_outcome(500) == "mistake"


def test_cp_loss_white_perspective():
    """White player cp loss = best_eval_player - played_eval_player."""
    best_eval = 200    # +2.00 for White
    played_eval = 140  # +1.40 for White
    loss = calculate_cp_loss(best_eval, played_eval)
    assert loss == 60
    assert compute_move_outcome(loss) == "acceptable"


def test_cp_loss_black_perspective():
    """Black player cp loss = best_eval_player - played_eval_player (fixed perspective)."""
    # From White's perspective: best move eval = -300 (which is +300 for Black)
    # Played move eval from White's perspective = -120 (which is +120 for Black)
    best_eval_black = 300
    played_eval_black = 120
    loss = calculate_cp_loss(best_eval_black, played_eval_black)
    assert loss == 180
    assert compute_move_outcome(loss) == "mistake"


def test_cp_loss_mate_preservation_and_blunders():
    """Forced mate preservation has 0 cp loss; blundering forced mate is a mistake."""
    # Preserved mate in 1
    assert calculate_cp_loss(100000, 100000) == 0
    assert compute_move_outcome(0) == "best"

    # Blundered forced mate into neutral position
    loss_blunder = calculate_cp_loss(100000, 50)
    assert loss_blunder >= 151
    assert compute_move_outcome(loss_blunder) == "mistake"

    # Blundered into opponent forced mate
    loss_mate_blunder = calculate_cp_loss(0, -100000)
    assert loss_mate_blunder >= 151
    assert compute_move_outcome(loss_mate_blunder) == "mistake"

    # Unavoidable opponent mate already present
    assert calculate_cp_loss(-100000, -100000) == 0


# =====================================================================
# 2. DETERMINISTIC REASONING GRADING TESTS
# =====================================================================

def test_reasoning_correct_concept_and_square_match_is_recognized():
    """Correct concept + matching highlighted square -> recognized."""
    reasoning = ReasoningAnswer(
        choice="look_for_counterplay",  # Concept: opponent_threat_detection
        free_text="",
        squares_highlighted=["f2", "g2"],
    )
    engine_facts = {
        "threat": "Opponent mate threat on g2",
        "key_squares": ["g2", "f2"],
        "key_pieces": [],
    }

    outcome, detail = grade_reasoning(
        trigger_type="opponent_threat",
        target_concept="opponent_threat_detection",
        reasoning=reasoning,
        engine_facts=engine_facts,
    )

    assert outcome == "recognized"
    assert detail.concept_match is True
    assert detail.square_match is True


def test_reasoning_correct_concept_only_is_partial_anti_click_farming():
    """Anti-click-farming: Correct option alone without concrete evidence produces partial, never recognized."""
    reasoning = ReasoningAnswer(
        choice="look_for_counterplay",  # Concept: opponent_threat_detection
        free_text="",
        squares_highlighted=[],  # No squares
    )
    engine_facts = {
        "threat": "Opponent mate threat on g2",
        "key_squares": ["g2", "f2"],
        "key_pieces": [],
    }

    outcome, detail = grade_reasoning(
        trigger_type="opponent_threat",
        target_concept="opponent_threat_detection",
        reasoning=reasoning,
        engine_facts=engine_facts,
    )

    assert outcome == "partial"
    assert detail.concept_match is True
    assert detail.square_match is False
    assert detail.piece_match is False


def test_reasoning_wrong_concept_no_evidence_is_missed():
    """Wrong concept and no concrete evidence -> missed."""
    reasoning = ReasoningAnswer(
        choice="better_plan",  # Concept: tactical_awareness (distractor for opponent_threat)
        free_text="",
        squares_highlighted=[],
    )
    engine_facts = {
        "threat": "Opponent mate threat on g2",
        "key_squares": ["g2"],
    }

    outcome, detail = grade_reasoning(
        trigger_type="opponent_threat",
        target_concept="opponent_threat_detection",
        reasoning=reasoning,
        engine_facts=engine_facts,
    )

    assert outcome == "missed"
    assert detail.concept_match is False


def test_reasoning_contradiction_forces_missed_even_if_square_matches():
    """If free text contradicts engine truth, outcome must be missed even if square matches."""
    reasoning = ReasoningAnswer(
        choice="look_for_counterplay",
        free_text="My king on h1 is completely safe and there are no threats.",
        squares_highlighted=["g2"],
    )
    engine_facts = {
        "threat": "Mate in 1 on g2",
        "key_squares": ["g2"],
    }

    mock_llm = MagicMock(spec=LLMClient)
    mock_llm.grade_free_text.return_value = FreeTextGrade(
        supports_engine_concept=False,
        contradicts_engine_truth=True,  # Contradiction flagged
        identified_concrete_threat=False,
        identified_relevant_piece=False,
    )

    outcome, detail = grade_reasoning(
        trigger_type="opponent_threat",
        target_concept="opponent_threat_detection",
        reasoning=reasoning,
        engine_facts=engine_facts,
        llm=mock_llm,
    )

    assert outcome == "missed"
    assert detail.square_match is True
    assert detail.llm["contradicts_engine_truth"] is True


def test_reasoning_key_piece_explicit_match_counts_as_concrete():
    """Key piece structured square match counts as concrete evidence."""
    reasoning = ReasoningAnswer(
        choice="look_for_counterplay",
        free_text="",
        squares_highlighted=["f2"],
    )
    engine_facts = {
        "threat": "Queen attacking on f2",
        "key_squares": [],  # Empty key_squares to isolate piece match
        "key_pieces": [{"type": "queen", "color": "black", "square": "f2"}],
    }

    outcome, detail = grade_reasoning(
        trigger_type="opponent_threat",
        target_concept="opponent_threat_detection",
        reasoning=reasoning,
        engine_facts=engine_facts,
    )

    assert detail.piece_match is True
    assert outcome == "recognized"


def test_reasoning_unrelated_squares_do_not_count():
    """Highlighting random unrelated squares (e.g. a8, b8) does not count as concrete match."""
    reasoning = ReasoningAnswer(
        choice="look_for_counterplay",
        free_text="",
        squares_highlighted=["a8", "h8"],
    )
    engine_facts = {
        "threat": "Queen attacking on f2",
        "key_squares": ["f2", "g2"],
        "key_pieces": [{"type": "queen", "color": "black", "square": "f2"}],
    }

    outcome, detail = grade_reasoning(
        trigger_type="opponent_threat",
        target_concept="opponent_threat_detection",
        reasoning=reasoning,
        engine_facts=engine_facts,
    )

    assert detail.square_match is False
    assert detail.piece_match is False
    assert outcome == "partial"  # concept_match only


# =====================================================================
# 3. CASE A / CASE B PRODUCT THESIS TESTS
# =====================================================================

def test_case_a_recognized_reasoning_mistake_move():
    """
    CASE A: Right reasoning, bad move.
    Learner correctly spotted the opponent threat and highlighted the danger squares,
    but blundered a piece or played a terrible move.
    Expected: reasoning_outcome='recognized', move_outcome='mistake'.
    """
    mock_engine = MagicMock(spec=StockfishAdapter)
    mock_engine.depth_import = 14
    mock_engine.analyze.return_value = {
        "best_move": "h2h3",
        "best_move_san": "h3",
        "eval_white_cp": 50,
        "pv": ["h2h3"],
    }
    # Played move blunders into -400cp
    mock_engine.eval_after.return_value = -350

    episode_mock = MagicMock()
    episode_mock.fen = "6k1/5ppp/8/8/8/5q2/8/4K2R w K - 0 1"
    episode_mock.trigger_evidence = {
        "type": "opponent_threat",
        "target_concept": "opponent_threat_detection",
        "engine_facts": {
            "threat": "Mate threat",
            "key_squares": ["f3", "e2"],
            "key_pieces": [],
        },
    }
    episode_mock.learner_reasoning = {
        "choice": "look_for_counterplay",
        "squares_highlighted": ["f3", "e2"],
    }
    episode_mock.learner_action = {
        "move_played": "h1g1",
    }

    r_outcome, m_outcome, cp_loss, engine_truth, detail = grade_committed_episode(
        episode=episode_mock,
        player_color_str="white",
        engine=mock_engine,
    )

    assert r_outcome == "recognized", f"Reasoning should be recognized, got {r_outcome}"
    assert m_outcome == "mistake", f"Move should be a mistake, got {m_outcome}"
    assert cp_loss == 400


def test_case_b_missed_reasoning_best_move():
    """
    CASE B: Wrong/missed reasoning, lucky best move.
    Learner picked an irrelevant distractor concept and highlighted nothing,
    but accidentally played Stockfish's top recommendation.
    Expected: reasoning_outcome='missed', move_outcome='best'.
    """
    mock_engine = MagicMock(spec=StockfishAdapter)
    mock_engine.depth_import = 14
    mock_engine.analyze.return_value = {
        "best_move": "h2h4",
        "best_move_san": "h4",
        "eval_white_cp": -100000,
        "pv": ["h2h4"],
    }
    mock_engine.eval_after.return_value = -100000

    episode_mock = MagicMock()
    episode_mock.fen = "6k1/5ppp/8/3b4/8/8/5qPP/7K w - - 0 1"
    episode_mock.trigger_evidence = {
        "type": "opponent_threat",
        "target_concept": "opponent_threat_detection",
        "engine_facts": {
            "threat": "Mate in 1",
            "key_squares": ["f2", "g2"],
            "key_pieces": [],
        },
    }
    episode_mock.learner_reasoning = {
        "choice": "better_plan",  # Irrelevant distractor
        "squares_highlighted": [],
    }
    episode_mock.learner_action = {
        "move_played": "h2h4",  # Engine's top move
    }

    r_outcome, m_outcome, cp_loss, engine_truth, detail = grade_committed_episode(
        episode=episode_mock,
        player_color_str="white",
        engine=mock_engine,
    )

    assert r_outcome == "missed", f"Reasoning should be missed, got {r_outcome}"
    assert m_outcome == "best", f"Move should be best, got {m_outcome}"
    assert cp_loss == 0


# =====================================================================
# 4. INVARIANTS, RESOLUTION & SECURITY AUTHORITY
# =====================================================================

def test_concept_match_resolution_true_for_valid_key():
    """Choice 'look_for_counterplay' resolves to 'opponent_threat_detection' matching target concept."""
    reasoning = ReasoningAnswer(
        choice="look_for_counterplay",
        free_text="",
        squares_highlighted=[],
    )
    outcome, detail = grade_reasoning(
        trigger_type="opponent_threat",
        target_concept="opponent_threat_detection",
        reasoning=reasoning,
        engine_facts={},
        question_id="opponent_threat_counterplay",
    )
    assert detail.concept_match is True
    assert outcome == "partial"  # concept match alone is partial (anti-click-farming)


def test_concept_match_resolution_false_for_distractor_key():
    """Distractor choice resolves to a non-matching concept, yielding concept_match=False."""
    reasoning = ReasoningAnswer(
        choice="check_king_safety",  # concept: king_safety (distractor for opponent_threat)
        free_text="",
        squares_highlighted=[],
    )
    outcome, detail = grade_reasoning(
        trigger_type="opponent_threat",
        target_concept="opponent_threat_detection",
        reasoning=reasoning,
        engine_facts={},
        question_id="opponent_threat_counterplay",
    )
    assert detail.concept_match is False
    assert outcome == "missed"


def test_concept_match_resolution_unknown_key_fails_safely():
    """Unknown option key must fail safely with ValueError, never silently grading."""
    reasoning = ReasoningAnswer(
        choice="arbitrary_fabricated_key_123",
        free_text="",
        squares_highlighted=[],
    )
    with pytest.raises(ValueError, match="Invalid or unknown option key"):
        grade_reasoning(
            trigger_type="opponent_threat",
            target_concept="opponent_threat_detection",
            reasoning=reasoning,
            engine_facts={},
            question_id="opponent_threat_counterplay",
        )


def test_security_authority_client_choice_resolved_server_side_only():
    """
    Regression Test: Authority of Concept Resolution.
    Proves:
    1. Client provides ONLY the choice key string (e.g. 'look_for_counterplay').
    2. Server resolves QUESTION_BANK to extract option concept ('opponent_threat_detection').
    3. Server deterministically compares against trigger target_concept.
    4. Client has no way to supply or forge concept metadata or grades.
    """
    # 1. Client schema has only choice, free_text, squares_highlighted
    client_payload = ReasoningAnswer(
        choice="look_for_counterplay",
        free_text="Black bishop and queen threaten mate",
        squares_highlighted=["f2"],
    )
    assert not hasattr(client_payload, "concept")
    assert not hasattr(client_payload, "reasoning_outcome")
    assert not hasattr(client_payload, "move_outcome")

    # 2. Server processes it strictly through canonical QUESTION_BANK
    mock_engine = MagicMock(spec=StockfishAdapter)
    mock_engine.depth_import = 14
    mock_engine.analyze.return_value = {
        "best_move": "f1e1",
        "best_move_san": "Re1",
        "eval_white_cp": 50,
        "pv": ["f1e1"],
    }
    mock_engine.eval_after.return_value = 50

    episode_mock = MagicMock()
    episode_mock.fen = "r3k2r/8/8/8/8/8/5q2/4K2R w K - 0 1"
    episode_mock.trigger_evidence = {
        "type": "opponent_threat",
        "target_concept": "opponent_threat_detection",
        "question_id": "opponent_threat_counterplay",
        "engine_facts": {
            "key_squares": ["f2"],
            "key_pieces": [],
        },
    }
    episode_mock.learner_reasoning = client_payload.model_dump()
    episode_mock.learner_action = {"move_played": "f1e1"}

    r_outcome, m_outcome, cp_loss, engine_truth, detail = grade_committed_episode(
        episode=episode_mock,
        player_color_str="white",
        engine=mock_engine,
    )

    # 3. Server deterministic resolution outcome
    assert detail.concept_match is True
    assert r_outcome == "recognized"
    assert m_outcome == "best"
    assert cp_loss == 0
    assert engine_truth["trigger_type"] == "opponent_threat"
    assert engine_truth["target_concept"] == "opponent_threat_detection"
    assert engine_truth["concept"] == "opponent_threat_detection"


def test_no_line_match_in_grader_detail_or_schema():
    """Invariant: v1 spec has no line_match field or line-entry parsing."""
    detail = GraderDetail(
        concept_match=True,
        square_match=True,
        piece_match=False,
        llm={"supports_engine_concept": True},
    )
    detail_dict = detail.model_dump()
    assert "line_match" not in detail_dict
    assert not hasattr(detail, "line_match")

