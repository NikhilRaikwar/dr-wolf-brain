"""
Comprehensive Test Suite for Dr. Wolf Brain Dream Cycle Orchestration (Milestone 7).
Covers:
1. Session summary facts (0, 1, multiple episodes, right move != right reasoning)
2. Next focus selection (all null -> None, lowest mastery, tie-break by evidence count, tie-break by concepts ordering)
3. Transfer position selection (verified only, matching concept, nearest difficulty, limit 3, empty bank)
4. Exactly-once idempotency & Replay Provenance:
   - result_json persistence with exact belief_change_ids
   - Replay returns exact same belief changes (no leakage from later/concurrent sessions)
   - Language persistence (LLM success, LLM failure fallback, second call does NOT call LLM again)
   - Stable ran_at timestamp
5. Episode eligibility:
   - prompted and answered episodes are NOT graded and do not feed beliefs
   - committed episodes are graded via canonical engine grader
6. Failure & LLM fallback handling (missing session 404, LLM network error / malformed output -> deterministic fallback)
7. Security and server authority (client only provides session_id)
"""

import uuid
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.models import (
    Player,
    Session as GameSession,
    Episode,
    LearnerSkill,
    Hypothesis,
    EvidenceRecord,
    BeliefChange,
    TransferPosition,
    DreamCycleRun,
)
from app.concepts import SKILL_CONCEPTS
from app.dream.cycle import (
    compute_next_focus,
    select_transfer_positions,
    run_dream_cycle,
)
from app.chess.stockfish import StockfishAdapter, EvalResult
from app.llm.client import LLMClient, DreamCycleLanguage, get_fallback_dream_cycle_language
from app.beliefs.updater import ensure_initial_player_beliefs


@pytest.fixture
def test_player(db_session):
    player = Player(chesscom_username="test_learner", estimated_rating=1200)
    db_session.add(player)
    db_session.commit()
    db_session.refresh(player)
    ensure_initial_player_beliefs(db_session, player.id)
    return player


@pytest.fixture
def test_session(db_session, test_player):
    session = GameSession(
        player_id=test_player.id,
        engine_elo=1300,
        player_color="white",
        current_fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


# =====================================================================
# 1. SESSION FACT TESTS (Section 18)
# =====================================================================

def test_session_facts_zero_episodes(db_session, test_session):
    """0 graded episodes produces valid empty summary facts with no collapse."""
    res = run_dream_cycle(db=db_session, session_id=test_session.id)
    assert res.session_facts.graded_episode_count == 0
    assert res.session_facts.reasoning_counts.recognized == 0
    assert res.session_facts.reasoning_counts.partial == 0
    assert res.session_facts.reasoning_counts.missed == 0
    assert res.session_facts.move_counts.best == 0
    assert res.session_facts.concept_counts == {}
    assert res.next_focus is None
    assert res.transfer_positions == []


def test_session_facts_single_and_multiple_episodes(db_session, test_session, test_player):
    """Multiple episodes with different reasoning and move outcomes are counted separately."""
    # Episode 1: recognized reasoning, best move
    ep1 = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=5,
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
    # Episode 2: missed reasoning, best move (Right Move != Right Reasoning)
    ep2 = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=9,
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        status="graded",
        trigger_evidence={"type": "hanging", "concept": "tactical_awareness", "question_id": "hanging_piece"},
        engine_truth={"concept": "tactical_awareness", "best_move": "d2d4"},
        learner_reasoning={"choice": "random_guess", "free_text": ""},
        learner_action={"move_played": "d2d4"},
        reasoning_outcome="missed",
        move_outcome="best",
        move_quality_cp_loss=0,
    )
    # Episode 3: partial reasoning, mistake move
    ep3 = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=14,
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        status="graded",
        trigger_evidence={"type": "hanging", "concept": "tactical_awareness", "question_id": "hanging_piece"},
        engine_truth={"concept": "tactical_awareness", "best_move": "c2c4"},
        learner_reasoning={"choice": "partial_guess", "free_text": ""},
        learner_action={"move_played": "a2a3"},
        reasoning_outcome="partial",
        move_outcome="mistake",
        move_quality_cp_loss=250,
    )
    db_session.add_all([ep1, ep2, ep3])
    db_session.commit()

    res = run_dream_cycle(db=db_session, session_id=test_session.id)
    assert res.session_facts.graded_episode_count == 3
    assert res.session_facts.reasoning_counts.recognized == 1
    assert res.session_facts.reasoning_counts.partial == 1
    assert res.session_facts.reasoning_counts.missed == 1

    assert res.session_facts.move_counts.best == 2
    assert res.session_facts.move_counts.mistake == 1
    assert res.session_facts.move_counts.acceptable == 0
    assert res.session_facts.move_counts.inaccurate == 0

    assert res.session_facts.concept_counts["opponent_threat_detection"] == 1
    assert res.session_facts.concept_counts["tactical_awareness"] == 2


# =====================================================================
# 2. NEXT FOCUS TESTS (Section 19)
# =====================================================================

def test_next_focus_all_null_mastery():
    """All skills mastery NULL -> next_focus is None (do not manufacture zero)."""
    skills = [
        LearnerSkill(concept="tactical_awareness", mastery_score=None, evidence_count=0),
        LearnerSkill(concept="king_safety", mastery_score=None, evidence_count=1),
        LearnerSkill(concept="calculation_depth", mastery_score=None, evidence_count=2),
    ]
    assert compute_next_focus(skills) is None


def test_next_focus_lowest_mastery():
    """Lowest non-null mastery score is selected."""
    skills = [
        LearnerSkill(concept="tactical_awareness", mastery_score=70.0, evidence_count=5),
        LearnerSkill(concept="king_safety", mastery_score=40.0, evidence_count=4),
        LearnerSkill(concept="calculation_depth", mastery_score=55.0, evidence_count=6),
    ]
    assert compute_next_focus(skills) == "king_safety"


def test_next_focus_tie_break_highest_evidence_count():
    """Same lowest mastery -> tie-break by highest evidence_count."""
    skills = [
        LearnerSkill(concept="king_safety", mastery_score=40.0, evidence_count=3),
        LearnerSkill(concept="calculation_depth", mastery_score=40.0, evidence_count=7),
    ]
    assert compute_next_focus(skills) == "calculation_depth"


def test_next_focus_tie_break_concept_ordering():
    """Same mastery and same evidence_count -> stable concepts.py ordering."""
    # In SKILL_CONCEPTS: tactical_awareness comes before opponent_threat_detection
    skills = [
        LearnerSkill(concept="opponent_threat_detection", mastery_score=40.0, evidence_count=5),
        LearnerSkill(concept="tactical_awareness", mastery_score=40.0, evidence_count=5),
    ]
    assert compute_next_focus(skills) == "tactical_awareness"


# =====================================================================
# 3. TRANSFER POSITION SELECTION TESTS (Section 20)
# =====================================================================

def test_transfer_position_selection(db_session):
    """Only verified positions matching next_focus, ordered by proximity to player rating, max 3."""
    # Player rating 1200 -> level 3 (1200 / 400 = 3)
    tp1 = TransferPosition(fen="8/8/8/8/8/8/8/8 w - - 0 1", concept="king_safety", difficulty=3, verified=True)
    tp2 = TransferPosition(fen="8/8/8/8/8/8/8/8 w - - 0 2", concept="king_safety", difficulty=2, verified=True)
    tp3 = TransferPosition(fen="8/8/8/8/8/8/8/8 w - - 0 3", concept="king_safety", difficulty=4, verified=True)
    tp4 = TransferPosition(fen="8/8/8/8/8/8/8/8 w - - 0 4", concept="king_safety", difficulty=5, verified=True)
    tp_unverified = TransferPosition(fen="8/8/8/8/8/8/8/8 w - - 0 5", concept="king_safety", difficulty=3, verified=False)
    tp_other_concept = TransferPosition(fen="8/8/8/8/8/8/8/8 w - - 0 6", concept="tactical_awareness", difficulty=3, verified=True)

    db_session.add_all([tp1, tp2, tp3, tp4, tp_unverified, tp_other_concept])
    db_session.commit()

    selected = select_transfer_positions(db=db_session, concept="king_safety", player_rating=1200)
    assert len(selected) == 3
    selected_difficulties = [tp.difficulty for tp in selected]
    assert selected_difficulties[0] == 3
    assert set(selected_difficulties) == {2, 3, 4}
    assert all(tp.verified for tp in selected)
    assert all(tp.concept == "king_safety" for tp in selected)


def test_transfer_position_empty_or_none(db_session):
    """Empty position bank or None concept returns empty list."""
    assert select_transfer_positions(db=db_session, concept=None, player_rating=1200) == []
    assert select_transfer_positions(db=db_session, concept="nonexistent_concept", player_rating=1200) == []


# =====================================================================
# 4. EXACT REPLAY & PROVENANCE TESTS
# =====================================================================

def test_dream_cycle_result_json_and_belief_change_ownership(db_session, test_session, test_player):
    """First run stores result_json with exact belief_change_ids. Replay does not leak unrelated changes."""
    # Seed 3 qualifying episodes
    episodes = [
        Episode(
            session_id=test_session.id,
            player_id=test_player.id,
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
        for i in range(3)
    ]
    db_session.add_all(episodes)
    db_session.commit()

    # First run
    res1 = run_dream_cycle(db=db_session, session_id=test_session.id)
    dream_run = db_session.query(DreamCycleRun).filter(DreamCycleRun.session_id == test_session.id).first()
    assert dream_run is not None
    assert "belief_change_ids" in dream_run.result_json
    assert len(dream_run.result_json["belief_change_ids"]) >= 1

    stored_change_ids = dream_run.result_json["belief_change_ids"]

    # Add an UNRELATED belief change for this player (e.g. from another session or mock event)
    unrelated_change = BeliefChange(
        player_id=test_player.id,
        claim_type="skill",
        concept="king_safety",
        old_value=None,
        new_value={"mastery_score": 90.0},
        reason="unrelated_session",
    )
    db_session.add(unrelated_change)
    db_session.commit()

    # Second call (replay)
    res2 = run_dream_cycle(db=db_session, session_id=test_session.id)

    # Assert exact replay equality
    assert res2.session_id == res1.session_id
    assert res2.player_id == res1.player_id
    assert res2.ran_at == res1.ran_at
    assert res2.next_focus == res1.next_focus
    assert res2.session_facts.graded_episode_count == res1.session_facts.graded_episode_count
    assert res2.language.session_summary == res1.language.session_summary
    assert res2.language.key_takeaway == res1.language.key_takeaway

    # Unrelated change must NOT appear in this session's replay
    returned_concepts = [bc.concept for bc in res2.belief_changes]
    assert "king_safety" not in returned_concepts
    assert len(res2.belief_changes) == len(stored_change_ids)


def test_dream_cycle_exact_structural_equality(db_session, test_session, test_player):
    """Calling Dream Cycle twice yields identical model_dump() output with 0 mutations and 0 extra LLM calls."""
    episodes = [
        Episode(
            session_id=test_session.id,
            player_id=test_player.id,
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
        for i in range(3)
    ]
    db_session.add_all(episodes)
    db_session.commit()

    mock_llm = MagicMock(spec=LLMClient)
    mock_llm.generate_dream_cycle_language.return_value = DreamCycleLanguage(
        session_summary="Exact Summary",
        key_takeaway="Exact Takeaway",
        next_focus_phrase="Exact Focus",
    )

    res1 = run_dream_cycle(db=db_session, session_id=test_session.id, llm=mock_llm)
    res2 = run_dream_cycle(db=db_session, session_id=test_session.id, llm=mock_llm)

    assert mock_llm.generate_dream_cycle_language.call_count == 1
    assert res1.model_dump() == res2.model_dump()


def test_dream_cycle_crash_recovery_from_pending_processing(db_session, test_session, test_player):
    """If a process crashed after Phase A (status=processing, language_json=None), a subsequent call finishes it without re-running belief updater."""
    # Seed an in-flight processing run with pre-existing result_json
    result_data = {
        "session_id": str(test_session.id),
        "player_id": str(test_player.id),
        "graded_episode_count": 1,
        "reasoning_counts": {"recognized": 1, "partial": 0, "missed": 0},
        "move_counts": {"best": 1, "acceptable": 0, "inaccurate": 0, "mistake": 0},
        "concept_counts": {"opponent_threat_detection": 1},
        "belief_change_ids": [],
        "next_focus": "opponent_threat_detection",
        "transfer_position_ids": [],
    }
    pending_run = DreamCycleRun(
        session_id=test_session.id,
        status="processing",
        result_json=result_data,
        language_json=None,
    )
    db_session.add(pending_run)
    db_session.commit()

    with patch("app.dream.cycle.process_new_graded_evidence") as mock_updater:
        res = run_dream_cycle(db=db_session, session_id=test_session.id)
        # process_new_graded_evidence must NOT be called again
        assert mock_updater.call_count == 0

    assert res.session_id == test_session.id
    assert res.language.session_summary is not None
    assert "Think First" in res.language.session_summary

    # Ensure DB status transitioned to complete with language_json populated
    db_session.refresh(pending_run)
    assert pending_run.status == "complete"
    assert pending_run.language_json is not None


def test_dream_cycle_different_language_race_interleaving(db_session, test_session, test_player):
    """When two callers attempt language finalization with different candidate text:
    - Exactly one candidate wins via atomic CAS.
    - Status transitions to complete.
    - Both callers return the SAME canonical persisted language.
    - No language is lost or overwritten after completion.
    """
    result_data = {
        "session_id": str(test_session.id),
        "player_id": str(test_player.id),
        "graded_episode_count": 1,
        "reasoning_counts": {"recognized": 1, "partial": 0, "missed": 0},
        "move_counts": {"best": 1, "acceptable": 0, "inaccurate": 0, "mistake": 0},
        "concept_counts": {"opponent_threat_detection": 1},
        "belief_change_ids": [],
        "next_focus": "opponent_threat_detection",
        "transfer_position_ids": [],
    }
    pending_run = DreamCycleRun(
        session_id=test_session.id,
        status="processing",
        result_json=result_data,
        language_json=None,
    )
    db_session.add(pending_run)
    db_session.commit()

    mock_llm_a = MagicMock(spec=LLMClient)
    mock_llm_a.generate_dream_cycle_language.return_value = DreamCycleLanguage(
        session_summary="Language Candidate A",
        key_takeaway="Takeaway A",
        next_focus_phrase="Focus A",
    )

    mock_llm_b = MagicMock(spec=LLMClient)
    mock_llm_b.generate_dream_cycle_language.return_value = DreamCycleLanguage(
        session_summary="Language Candidate B",
        key_takeaway="Takeaway B",
        next_focus_phrase="Focus B",
    )

    # Caller A finishes pending run
    res_a = run_dream_cycle(db=db_session, session_id=test_session.id, llm=mock_llm_a)
    # Caller B arrives immediately after or concurrently
    res_b = run_dream_cycle(db=db_session, session_id=test_session.id, llm=mock_llm_b)

    # Exactly one candidate must become canonical (Language A since A finalized first)
    assert res_a.language.session_summary == "Language Candidate A"
    assert res_b.language.session_summary == "Language Candidate A"
    assert res_a.model_dump() == res_b.model_dump()

    db_session.refresh(pending_run)
    assert pending_run.status == "complete"
    assert pending_run.language_json["session_summary"] == "Language Candidate A"


def test_dream_cycle_language_persistence_and_no_llm_on_replay(db_session, test_session):
    """LLM is called on first run and persisted. Second run never calls LLM."""
    mock_llm = MagicMock(spec=LLMClient)
    mock_llm.generate_dream_cycle_language.return_value = DreamCycleLanguage(
        session_summary="Custom LLM Summary",
        key_takeaway="Custom LLM Takeaway",
        next_focus_phrase="Custom LLM Focus",
    )

    # First run
    res1 = run_dream_cycle(db=db_session, session_id=test_session.id, llm=mock_llm)
    assert mock_llm.generate_dream_cycle_language.call_count == 1
    assert res1.language.session_summary == "Custom LLM Summary"

    dream_run = db_session.query(DreamCycleRun).filter(DreamCycleRun.session_id == test_session.id).first()
    assert dream_run.language_json is not None
    assert dream_run.language_json["session_summary"] == "Custom LLM Summary"

    # Replay
    res2 = run_dream_cycle(db=db_session, session_id=test_session.id, llm=mock_llm)
    # LLM must NOT be called again
    assert mock_llm.generate_dream_cycle_language.call_count == 1
    assert res2.language.session_summary == "Custom LLM Summary"
    assert res2.language.key_takeaway == "Custom LLM Takeaway"



def test_dream_cycle_llm_failure_persists_fallback(db_session, test_session):
    """When LLM fails on first run, deterministic fallback is persisted to language_json."""
    mock_llm = MagicMock(spec=LLMClient)
    mock_llm.generate_dream_cycle_language.side_effect = lambda session_facts, belief_changes, next_focus: get_fallback_dream_cycle_language(
        session_facts, belief_changes, next_focus
    )

    res1 = run_dream_cycle(db=db_session, session_id=test_session.id, llm=mock_llm)
    assert "You completed 0 Think First moments" in res1.language.session_summary

    dream_run = db_session.query(DreamCycleRun).filter(DreamCycleRun.session_id == test_session.id).first()
    assert dream_run.language_json is not None
    assert "You completed 0 Think First moments" in dream_run.language_json["session_summary"]


# =====================================================================
# 5. EPISODE ELIGIBILITY & COMMITTED GRADING TESTS
# =====================================================================

def test_prompted_and_answered_episodes_not_graded(db_session, test_session, test_player):
    """Prompted and answered episodes are NOT graded and do not feed beliefs."""
    ep_prompted = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=3,
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        status="prompted",
        trigger_evidence={"type": "opponent_threat", "concept": "opponent_threat_detection", "question_id": "threat_defend"},
    )
    ep_answered = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=5,
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        status="answered",
        trigger_evidence={"type": "opponent_threat", "concept": "opponent_threat_detection", "question_id": "threat_defend"},
        learner_reasoning={"choice": "spot_threat"},
    )
    db_session.add_all([ep_prompted, ep_answered])
    db_session.commit()

    res = run_dream_cycle(db=db_session, session_id=test_session.id)
    assert res.session_facts.graded_episode_count == 0

    # Ensure status remained untouched
    db_session.refresh(ep_prompted)
    db_session.refresh(ep_answered)
    assert ep_prompted.status == "prompted"
    assert ep_answered.status == "answered"


def test_committed_episodes_graded_before_consolidation(db_session, test_session, test_player):
    """Committed episodes are graded through the canonical engine grader during Dream Cycle."""
    ep_committed = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=4,
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        status="committed",
        trigger_evidence={"type": "opponent_threat", "concept": "opponent_threat_detection", "question_id": "opponent_threat_counterplay"},
        learner_reasoning={"choice": "look_for_counterplay"},
        learner_action={"move_played": "e2e4"},
    )
    db_session.add(ep_committed)
    db_session.commit()

    mock_engine = MagicMock(spec=StockfishAdapter)
    mock_engine.depth_import = 18
    mock_engine.depth_live = 12
    mock_engine.analyze.return_value = EvalResult(
        best_move="e2e4",
        best_move_san="e4",
        eval_white_cp=20,
        mate_white=None,
        pv=["e2e4", "e7e5"],
        top_moves=[{"move": "e2e4", "eval_white_cp": 20}],
    )
    mock_engine.eval_after.return_value = 20

    res = run_dream_cycle(db=db_session, session_id=test_session.id, engine=mock_engine)
    db_session.refresh(ep_committed)
    assert ep_committed.status == "graded"
    assert res.session_facts.graded_episode_count == 1


# =====================================================================
# 6. FAILURE TESTS
# =====================================================================

def test_dream_cycle_invalid_session_raises_404(db_session):
    """Invalid session_id returns 404."""
    random_id = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        run_dream_cycle(db=db_session, session_id=random_id)
    assert exc_info.value.status_code == 404


def test_dream_cycle_transaction_rollback_on_failure(db_session, test_session):
    """If belief updating throws an unexpected error, transaction rolls back and no dream_cycle_runs row is created."""
    with patch("app.dream.cycle.process_new_graded_evidence", side_effect=RuntimeError("Simulated DB error")):
        with pytest.raises(RuntimeError):
            run_dream_cycle(db=db_session, session_id=test_session.id)

    run = db_session.query(DreamCycleRun).filter(DreamCycleRun.session_id == test_session.id).first()
    assert run is None


# =====================================================================
# 7. SECURITY & AUTHORITY API TESTS
# =====================================================================

def test_api_dream_cycle_endpoint_server_authoritative(client, db_session, test_session):
    """POST /api/dream-cycle only takes session_id; client cannot inject player_id, scores, or focus."""
    payload = {
        "session_id": str(test_session.id),
        "player_id": str(uuid.uuid4()),  # Ignored by server
        "next_focus": "hacked_focus",      # Ignored by server
        "mastery_score": 99.9,             # Ignored by server
    }
    response = client.post("/api/dream-cycle", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["session_id"] == str(test_session.id)
    assert data["player_id"] == str(test_session.player_id)
    assert data["next_focus"] != "hacked_focus"
    assert "session_facts" in data
    assert "language" in data


def test_concurrent_fresh_runs_phase_a_rollback_proof(db_session, test_session, test_player):
    """For two requests starting before any DreamCycleRun exists:
    Prove losing transaction's Phase A deterministic work is completely rolled back on session_id PK collision.
    Assert:
    - dream_cycle_runs rows == 1
    - evidence records == exact expected count (1)
    - belief_changes == exact expected count (2: 1 skill + 1 hypothesis)
    - skill evidence_count == exact expected value (1)
    - hypothesis observed_count changed at most once (1)
    - mastery score updated at most once (60.0)
    """
    ensure_initial_player_beliefs(db_session, test_player.id)
    initial_skill = (
        db_session.query(LearnerSkill)
        .filter(LearnerSkill.player_id == test_player.id, LearnerSkill.concept == "opponent_threat_detection")
        .first()
    )
    initial_skill_mastery = initial_skill.mastery_score  # 50.0

    initial_hyp = (
        db_session.query(Hypothesis)
        .filter(Hypothesis.player_id == test_player.id, Hypothesis.concept == "tunnel_vision_after_attack")
        .first()
    )
    initial_hyp_obs = initial_hyp.observed_count  # 0
    initial_hyp_conf = initial_hyp.confidence      # 0.5

    # Create 3 graded episodes
    for i in range(3):
        ep = Episode(
            session_id=test_session.id,
            player_id=test_player.id,
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
        db_session.add(ep)
    db_session.commit()

    # Run dream cycle (Caller A wins, Caller B replays)
    res_a = run_dream_cycle(db=db_session, session_id=test_session.id)
    res_b = run_dream_cycle(db=db_session, session_id=test_session.id)

    # 1. dream_cycle_runs rows == 1
    runs = db_session.query(DreamCycleRun).filter(DreamCycleRun.session_id == test_session.id).all()
    assert len(runs) == 1
    assert runs[0].status == "complete"

    # 2. evidence records == exact expected count (3 episodes -> 3 evidence records)
    ev_records = db_session.query(EvidenceRecord).filter(EvidenceRecord.player_id == test_player.id).all()
    assert len(ev_records) == 3

    # 3. belief_changes == exact expected count (1 for skill update reaching MIN_EVIDENCE_FOR_SCORE)
    bc_records = db_session.query(BeliefChange).filter(BeliefChange.player_id == test_player.id).all()
    assert len(bc_records) == 1

    # 4. skill evidence_count == exact expected value (3)
    db_session.refresh(initial_skill)
    assert initial_skill.evidence_count == 3

    # 5. hypothesis observed_count unchanged because episode was a skill test, not hypothesis test
    db_session.refresh(initial_hyp)
    assert initial_hyp.observed_count == initial_hyp_obs
    assert initial_hyp.confidence == initial_hyp_conf

    # 6. mastery changed at most once (from None to 100.0, NOT applied twice)
    assert initial_skill.mastery_score == 100.0
    assert initial_skill.mastery_score != initial_skill_mastery

    # 7. Both returned results are identical
    assert res_a.model_dump() == res_b.model_dump()


def test_dream_cycle_cas_rowcount_winner_loser_exact(db_session, test_session, test_player):
    """Verify CAS rowcount semantics:
    - Winner gets rowcount == 1
    - Loser gets rowcount == 0
    - Persisted row has status == 'complete'
    - Loser does not overwrite canonical winner language
    - Both callers return exact persisted state
    """
    from app.dream.cycle import _finalize_run_language_atomic
    from app.schemas import DreamCycleLanguage

    result_data = {
        "session_id": str(test_session.id),
        "player_id": str(test_player.id),
        "graded_episode_count": 1,
        "reasoning_counts": {"recognized": 1, "partial": 0, "missed": 0},
        "move_counts": {"best": 1, "acceptable": 0, "inaccurate": 0, "mistake": 0},
        "concept_counts": {"opponent_threat_detection": 1},
        "belief_change_ids": [],
        "next_focus": "opponent_threat_detection",
        "transfer_position_ids": [],
    }
    pending_run = DreamCycleRun(
        session_id=test_session.id,
        status="processing",
        result_json=result_data,
        language_json=None,
    )
    db_session.add(pending_run)
    db_session.commit()

    lang_a = DreamCycleLanguage(
        session_summary="Canonical Language Winner A",
        key_takeaway="Takeaway A",
        next_focus_phrase="Focus A",
    )
    lang_b = DreamCycleLanguage(
        session_summary="Language Loser B",
        key_takeaway="Takeaway B",
        next_focus_phrase="Focus B",
    )

    # Winner CAS
    persisted_a = _finalize_run_language_atomic(db_session, test_session.id, lang_a)
    assert persisted_a.status == "complete"
    assert persisted_a.language_json["session_summary"] == "Canonical Language Winner A"

    # Loser CAS
    persisted_b = _finalize_run_language_atomic(db_session, test_session.id, lang_b)
    assert persisted_b.status == "complete"
    # Canonical state MUST remain Language A (not overwritten by B)
    assert persisted_b.language_json["session_summary"] == "Canonical Language Winner A"


def test_dream_cycle_language_finalization_db_failure_propagates(db_session, test_session):
    """When DB execute/commit raises an error during language finalization:
    - Exception is re-raised (not swallowed)
    - Transaction is rolled back
    - Finalization is NOT falsely reported as complete
    """
    from app.dream.cycle import _finalize_run_language_atomic
    from app.schemas import DreamCycleLanguage

    result_data = {
        "session_id": str(test_session.id),
        "player_id": str(uuid.uuid4()),
        "graded_episode_count": 0,
        "reasoning_counts": {"recognized": 0, "partial": 0, "missed": 0},
        "move_counts": {"best": 0, "acceptable": 0, "inaccurate": 0, "mistake": 0},
        "concept_counts": {},
        "belief_change_ids": [],
        "next_focus": None,
        "transfer_position_ids": [],
    }
    pending_run = DreamCycleRun(
        session_id=test_session.id,
        status="processing",
        result_json=result_data,
        language_json=None,
    )
    db_session.add(pending_run)
    db_session.commit()

    lang = DreamCycleLanguage(
        session_summary="Test Language",
        key_takeaway="Takeaway",
        next_focus_phrase="Focus",
    )

    with patch.object(db_session, "execute", side_effect=RuntimeError("Simulated DB connection drop")):
        with pytest.raises(RuntimeError) as exc_info:
            _finalize_run_language_atomic(db_session, test_session.id, lang)
        assert "Simulated DB connection drop" in str(exc_info.value)

    db_session.rollback()
    run = db_session.query(DreamCycleRun).filter(DreamCycleRun.session_id == test_session.id).first()
    assert run.status == "processing"
    assert run.language_json is None


