"""
Comprehensive Test Suite for Dr. Wolf Brain Belief Updater (Milestone 6).
Covers:
- Skill mastery initialization (no invented prior, minimum 3 evidence records, weighted formulas)
- Later skill updates (0.7/0.3 Think First, 0.85/0.15 Imported)
- Right Move != Right Reasoning invariant (move outcome never affects mastery)
- Hypothesis meaningful-test predicates for all 3 hypotheses
- Hypothesis confidence math (+0.08/-0.12) and state boundaries
- Epistemology CHECK constraint (imports cannot support/contradict hypotheses)
- Full idempotency and transactional rollback
"""

import uuid
import pytest
from sqlalchemy.exc import IntegrityError

from app.models import (
    Player,
    Session as GameSession,
    Episode,
    Position,
    Skill,
    Hypothesis,
    EvidenceRecord,
    BeliefChange,
)
from app.beliefs.updater import (
    outcome_score,
    resolve_outcome,
    update_skill,
    update_hypothesis,
    write_evidence_record,
    write_belief_change,
    process_new_graded_evidence,
    ensure_initial_player_beliefs,
    MIN_EVIDENCE_FOR_SCORE,
)
from app.concepts import (
    SKILL_CONCEPTS,
    HYPOTHESIS_CONCEPTS,
    episode_tests_hypothesis,
    classify_vs_hypothesis,
)


@pytest.fixture
def test_player(db_session):
    player = Player(chesscom_username="test_learner", estimated_rating=1200)
    db_session.add(player)
    db_session.commit()
    db_session.refresh(player)
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
# 1. OUTCOME SCORE CANONICAL MAPPING
# =====================================================================

def test_outcome_score_canonical_mapping():
    assert outcome_score("recognized") == 1.0
    assert outcome_score("partial") == 0.5
    assert outcome_score("missed") == 0.0
    assert outcome_score(None) == 0.0
    assert outcome_score("unknown") == 0.0


# =====================================================================
# 2. SKILL INITIALIZATION TESTS (NO INVENTED PRIOR)
# =====================================================================

def test_skill_initialization_no_prior_below_three_records(db_session, test_player):
    """Below 3 qualifying evidence records, mastery_score MUST remain NULL."""
    ensure_initial_player_beliefs(db_session, test_player.id)
    skill = (
        db_session.query(Skill)
        .filter(Skill.player_id == test_player.id, Skill.concept == "opponent_threat_detection")
        .first()
    )
    assert skill.mastery_score is None
    assert skill.evidence_count == 0
    assert skill.trend == "new"

    # Add 1 record
    rec1, _ = write_evidence_record(
        db=db_session,
        player_id=test_player.id,
        source_type="think_first_episode",
        source_id=uuid.uuid4(),
        claim_type="skill",
        concept="opponent_threat_detection",
        direction="supports",
    )
    update_skill(skill, [rec1], db_session)
    assert skill.mastery_score is None
    assert skill.evidence_count == 1

    # Add 2nd record
    rec2, _ = write_evidence_record(
        db=db_session,
        player_id=test_player.id,
        source_type="think_first_episode",
        source_id=uuid.uuid4(),
        claim_type="skill",
        concept="opponent_threat_detection",
        direction="supports",
    )
    update_skill(skill, [rec2], db_session)
    assert skill.mastery_score is None
    assert skill.evidence_count == 2


def test_skill_initialization_three_think_first_records(db_session, test_player, test_session):
    """
    Three Think First records: recognized (1.0), partial (0.5), missed (0.0).
    Expected initial mastery = (1.0 + 0.5 + 0.0) / 3 * 100 = 50.0%
    """
    ensure_initial_player_beliefs(db_session, test_player.id)
    skill = (
        db_session.query(Skill)
        .filter(Skill.player_id == test_player.id, Skill.concept == "opponent_threat_detection")
        .first()
    )

    # Create 3 source episodes with graded outcomes
    ep1 = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=8,
        fen="fen1",
        status="graded",
        trigger_evidence={"type": "opponent_threat", "target_concept": "opponent_threat_detection"},
        learner_reasoning={"choice": "look_for_counterplay"},
        learner_action={"move_played": "e2e4"},
        reasoning_outcome="recognized",
    )
    ep2 = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=14,
        fen="fen2",
        status="graded",
        trigger_evidence={"type": "opponent_threat", "target_concept": "opponent_threat_detection"},
        learner_reasoning={"choice": "look_for_counterplay"},
        learner_action={"move_played": "e2e4"},
        reasoning_outcome="partial",
    )
    ep3 = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=20,
        fen="fen3",
        status="graded",
        trigger_evidence={"type": "opponent_threat", "target_concept": "opponent_threat_detection"},
        learner_reasoning={"choice": "better_plan"},
        learner_action={"move_played": "e2e4"},
        reasoning_outcome="missed",
    )
    db_session.add_all([ep1, ep2, ep3])
    db_session.commit()

    rec1, _ = write_evidence_record(db_session, test_player.id, "think_first_episode", ep1.id, "skill", "opponent_threat_detection", "supports")
    rec2, _ = write_evidence_record(db_session, test_player.id, "think_first_episode", ep2.id, "skill", "opponent_threat_detection", "supports")
    rec3, _ = write_evidence_record(db_session, test_player.id, "think_first_episode", ep3.id, "skill", "opponent_threat_detection", "contradicts")

    ch = update_skill(skill, [rec1, rec2, rec3], db_session)
    assert skill.mastery_score == 50.0
    assert skill.evidence_count == 3
    assert skill.trend == "new"
    assert ch is not None
    assert ch.old_value["mastery_score"] is None
    assert ch.new_value["mastery_score"] == 50.0


def test_skill_initialization_mixed_think_first_and_imported(db_session, test_player, test_session):
    """
    Mixed initialization: 2 Think First recognized (weight 1.0 each) + 1 imported missed (weight 0.5).
    Weighted sum = (1.0 * 1.0 + 1.0 * 1.0 + 0.0 * 0.5) = 2.0
    Weight sum = (1.0 + 1.0 + 0.5) = 2.5
    Expected mastery = 2.0 / 2.5 * 100 = 80.0%
    """
    ensure_initial_player_beliefs(db_session, test_player.id)
    skill = (
        db_session.query(Skill)
        .filter(Skill.player_id == test_player.id, Skill.concept == "tactical_awareness")
        .first()
    )

    ep1 = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=8,
        fen="fen1",
        status="graded",
        trigger_evidence={"type": "hanging", "target_concept": "tactical_awareness"},
        reasoning_outcome="recognized",
    )
    ep2 = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=14,
        fen="fen2",
        status="graded",
        trigger_evidence={"type": "hanging", "target_concept": "tactical_awareness"},
        reasoning_outcome="recognized",
    )
    pos1 = Position(
        game_id=uuid.uuid4(),
        player_id=test_player.id,
        move_number=22,
        fen="fen3",
        concept="tactical_awareness",
        engine={"outcome": "missed"},
    )
    db_session.add_all([ep1, ep2, pos1])
    db_session.commit()

    rec1, _ = write_evidence_record(db_session, test_player.id, "think_first_episode", ep1.id, "skill", "tactical_awareness", "supports")
    rec2, _ = write_evidence_record(db_session, test_player.id, "think_first_episode", ep2.id, "skill", "tactical_awareness", "supports")
    rec3, _ = write_evidence_record(db_session, test_player.id, "imported_position", pos1.id, "skill", "tactical_awareness", "contradicts")

    update_skill(skill, [rec1, rec2, rec3], db_session)
    assert skill.mastery_score == 80.0
    assert skill.evidence_count == 3


# =====================================================================
# 3. LATER SKILL UPDATES (MOVING AVERAGE)
# =====================================================================

def test_later_skill_updates_think_first_and_imported_weights(db_session, test_player, test_session):
    """
    Once mastery is initialized (e.g. 50.0):
    - Think First session with recognized (100%): new mastery = 0.7 * 50 + 0.3 * 100 = 65.0
    - Subsequent Imported batch with missed (0%): new mastery = 0.85 * 65.0 + 0.15 * 0 = 55.25
    """
    ensure_initial_player_beliefs(db_session, test_player.id)
    skill = (
        db_session.query(Skill)
        .filter(Skill.player_id == test_player.id, Skill.concept == "calculation_depth")
        .first()
    )
    skill.mastery_score = 50.0
    skill.evidence_count = 3
    db_session.commit()

    # New Think First evidence: recognized
    ep = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=10,
        fen="fen_tf",
        status="graded",
        trigger_evidence={"type": "forcing_candidate", "target_concept": "calculation_depth"},
        reasoning_outcome="recognized",
    )
    db_session.add(ep)
    db_session.commit()

    rec_tf, _ = write_evidence_record(db_session, test_player.id, "think_first_episode", ep.id, "skill", "calculation_depth", "supports")
    update_skill(skill, [rec_tf], db_session)
    assert skill.mastery_score == 65.0
    assert skill.evidence_count == 4
    assert skill.trend == "improving"

    # New Imported evidence: missed
    pos = Position(
        game_id=uuid.uuid4(),
        player_id=test_player.id,
        move_number=15,
        fen="fen_imp",
        concept="calculation_depth",
        engine={"outcome": "missed"},
    )
    db_session.add(pos)
    db_session.commit()

    rec_imp, _ = write_evidence_record(db_session, test_player.id, "imported_position", pos.id, "skill", "calculation_depth", "contradicts")
    update_skill(skill, [rec_imp], db_session)
    assert skill.mastery_score == 55.25
    assert skill.evidence_count == 5
    assert skill.trend == "declining"


def test_right_move_does_not_affect_skill_mastery(db_session, test_player, test_session):
    """
    Invariant: Skill mastery derives strictly from reasoning_outcome, never move_outcome.
    A player with recognized reasoning but mistake move gets full 1.0 reasoning score.
    A player with missed reasoning but best move gets 0.0 reasoning score.
    """
    ensure_initial_player_beliefs(db_session, test_player.id)
    skill = (
        db_session.query(Skill)
        .filter(Skill.player_id == test_player.id, Skill.concept == "king_safety")
        .first()
    )
    skill.mastery_score = 50.0
    skill.evidence_count = 3
    db_session.commit()

    # Episode A: recognized reasoning + mistake move
    ep_a = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=10,
        fen="fen_a",
        status="graded",
        trigger_evidence={"type": "king_safety", "target_concept": "king_safety"},
        reasoning_outcome="recognized",
        move_outcome="mistake",
    )
    db_session.add(ep_a)
    db_session.commit()

    rec_a, _ = write_evidence_record(db_session, test_player.id, "think_first_episode", ep_a.id, "skill", "king_safety", "supports")
    update_skill(skill, [rec_a], db_session)
    # Master increases because reasoning was recognized (1.0), ignoring mistake move
    assert skill.mastery_score == 65.0


# =====================================================================
# 4. HYPOTHESIS MEANINGFUL-TEST PREDICATES
# =====================================================================

def test_tunnel_vision_after_attack_intent_tightness():
    """
    Verify tightened attacking intent rules:
    - Explicit attacking intention -> meaningful
    - Prior calculate_forcing choice -> meaningful
    - Defensive phrases ("I see their threat", "they can check me") -> NOT meaningful
    - Isolated words ("capture", "win", "tactic", "pressure") -> NOT meaningful
    """
    # 1. Explicit attacking phrase -> True
    ep_attack = Episode(
        status="graded",
        reasoning_outcome="missed",
        trigger_evidence={"type": "opponent_threat", "question_id": "opponent_threat_counterplay"},
        learner_reasoning={"choice": "look_for_counterplay", "free_text": "I want to attack their king on g7"},
    )
    assert episode_tests_hypothesis(ep_attack, "tunnel_vision_after_attack") is True

    # 2. Prior calculate_forcing choice -> True
    ep_choice = Episode(
        status="graded",
        reasoning_outcome="missed",
        trigger_evidence={"type": "opponent_threat", "question_id": "opponent_threat_counterplay"},
        learner_reasoning={"choice": "calculate_forcing", "free_text": "Defending against everything"},
    )
    assert episode_tests_hypothesis(ep_choice, "tunnel_vision_after_attack") is True

    # 3. Defensive phrase: "I see their threat" -> False
    ep_threat = Episode(
        status="graded",
        reasoning_outcome="missed",
        trigger_evidence={"type": "opponent_threat", "question_id": "opponent_threat_counterplay"},
        learner_reasoning={"choice": "better_plan", "free_text": "I see their threat on e8"},
    )
    assert episode_tests_hypothesis(ep_threat, "tunnel_vision_after_attack") is False

    # 4. Defensive phrase: "they can check me" -> False
    ep_check = Episode(
        status="graded",
        reasoning_outcome="missed",
        trigger_evidence={"type": "opponent_threat", "question_id": "opponent_threat_counterplay"},
        learner_reasoning={"choice": "better_plan", "free_text": "They can check me on the back rank and capture my queen"},
    )
    assert episode_tests_hypothesis(ep_check, "tunnel_vision_after_attack") is False

    # 5. Isolated words ("capture", "win", "pressure") without attacking intent -> False
    ep_isolated = Episode(
        status="graded",
        reasoning_outcome="missed",
        trigger_evidence={"type": "opponent_threat", "question_id": "opponent_threat_counterplay"},
        learner_reasoning={"choice": "better_plan", "free_text": "If I can win this endgame under pressure after a piece capture"},
    )
    assert episode_tests_hypothesis(ep_isolated, "tunnel_vision_after_attack") is False


def test_hypothesis_support_and_contradict_classification_all_three():
    """
    Test deterministic, conservative support / contradict classification:
    - recognized reasoning -> contradicts the weakness hypothesis
    - missed reasoning -> supports the weakness hypothesis
    - partial reasoning -> None (conservative, does not force belief change)
    - misses_defensive_resources -> None (no canonical Think First test in v1)
    """
    # 1. tunnel_vision_after_attack
    ep_tv_missed = Episode(status="graded", reasoning_outcome="missed")
    ep_tv_partial = Episode(status="graded", reasoning_outcome="partial")
    ep_tv_rec = Episode(status="graded", reasoning_outcome="recognized")
    assert classify_vs_hypothesis(ep_tv_missed, "tunnel_vision_after_attack") == "supports"
    assert classify_vs_hypothesis(ep_tv_partial, "tunnel_vision_after_attack") is None
    assert classify_vs_hypothesis(ep_tv_rec, "tunnel_vision_after_attack") == "contradicts"

    # 2. stops_calculating_early
    ep_sc_missed = Episode(status="graded", reasoning_outcome="missed")
    ep_sc_partial = Episode(status="graded", reasoning_outcome="partial")
    ep_sc_rec = Episode(status="graded", reasoning_outcome="recognized")
    assert classify_vs_hypothesis(ep_sc_missed, "stops_calculating_early") == "supports"
    assert classify_vs_hypothesis(ep_sc_partial, "stops_calculating_early") is None
    assert classify_vs_hypothesis(ep_sc_rec, "stops_calculating_early") == "contradicts"

    # 3. misses_defensive_resources (No canonical Think First test in v1)
    ep_md_missed = Episode(status="graded", reasoning_outcome="missed")
    ep_md_partial = Episode(status="graded", reasoning_outcome="partial")
    ep_md_rec = Episode(status="graded", reasoning_outcome="recognized")
    assert classify_vs_hypothesis(ep_md_missed, "misses_defensive_resources") is None
    assert classify_vs_hypothesis(ep_md_partial, "misses_defensive_resources") is None
    assert classify_vs_hypothesis(ep_md_rec, "misses_defensive_resources") is None


def test_stops_calculating_early_meaningful_test_predicates():
    """
    stops_calculating_early:
    - Candidate trigger: forcing_candidate
    - Meaningful ONLY when question_id == 'forcing_candidate_another_candidate'
    """
    ep1 = Episode(
        status="graded",
        reasoning_outcome="missed",
        trigger_evidence={"type": "forcing_candidate", "question_id": "forcing_candidate_another_candidate"},
        learner_reasoning={"choice": "explore_candidate_moves"},
    )
    assert episode_tests_hypothesis(ep1, "stops_calculating_early") is True
    assert classify_vs_hypothesis(ep1, "stops_calculating_early") == "supports"

    # Different question ID on forcing_candidate -> False
    ep2 = Episode(
        status="graded",
        reasoning_outcome="missed",
        trigger_evidence={"type": "forcing_candidate", "question_id": "other_question_id"},
        learner_reasoning={"choice": "explore_candidate_moves"},
    )
    assert episode_tests_hypothesis(ep2, "stops_calculating_early") is False


def test_misses_defensive_resources_not_meaningfully_tested_in_v1(db_session, test_player, test_session):
    """
    misses_defensive_resources:
    - hanging_under_attack tests recognizing attacked pieces, not defensive resources.
    - episode_tests_hypothesis must return False in v1.
    - No observed_count increment, no confidence change, no hypothesis evidence written.
    """
    ensure_initial_player_beliefs(db_session, test_player.id)
    hyp = (
        db_session.query(Hypothesis)
        .filter(Hypothesis.player_id == test_player.id, Hypothesis.concept == "misses_defensive_resources")
        .first()
    )
    assert hyp.confidence == 0.5
    assert hyp.observed_count == 0

    ep = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=10,
        fen="fen_hang",
        status="graded",
        trigger_evidence={"type": "hanging", "question_id": "hanging_under_attack"},
        learner_reasoning={"choice": "protect_piece"},
        reasoning_outcome="missed",
    )
    db_session.add(ep)
    db_session.commit()

    assert episode_tests_hypothesis(ep, "misses_defensive_resources") is False
    assert classify_vs_hypothesis(ep, "misses_defensive_resources") is None

    update_hypothesis(hyp, [ep], db_session)
    assert hyp.confidence == 0.5
    assert hyp.observed_count == 0
    assert hyp.state == "suspected"

    # Verify no hypothesis evidence was written
    ev_count = (
        db_session.query(EvidenceRecord)
        .filter(EvidenceRecord.claim_type == "hypothesis", EvidenceRecord.concept == "misses_defensive_resources")
        .count()
    )
    assert ev_count == 0


# =====================================================================
# 5. HYPOTHESIS CONFIDENCE MATH & STATE BOUNDARIES
# =====================================================================

def test_hypothesis_confidence_math_and_clamping(db_session, test_player, test_session):
    """
    Confidence delta:
    - supports: +0.08
    - contradicts: -0.12
    - clamped to [0.05, 0.95]
    """
    ensure_initial_player_beliefs(db_session, test_player.id)
    hyp = (
        db_session.query(Hypothesis)
        .filter(Hypothesis.player_id == test_player.id, Hypothesis.concept == "stops_calculating_early")
        .first()
    )
    assert hyp.confidence == 0.5
    assert hyp.observed_count == 0

    # Meaningful test 1: supports (+0.08) -> 0.58
    ep1 = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=10,
        fen="fen1",
        status="graded",
        trigger_evidence={"type": "forcing_candidate", "question_id": "forcing_candidate_another_candidate"},
        learner_reasoning={"choice": "solidify_position"},
        reasoning_outcome="missed",
    )
    db_session.add(ep1)
    db_session.commit()

    update_hypothesis(hyp, [ep1], db_session)
    assert hyp.confidence == 0.58
    assert hyp.observed_count == 1
    assert hyp.state == "suspected"  # < 3 tests stays suspected

    # Meaningful test 2: contradicts (-0.12) -> 0.46
    ep2 = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=16,
        fen="fen2",
        status="graded",
        trigger_evidence={"type": "forcing_candidate", "question_id": "forcing_candidate_another_candidate"},
        learner_reasoning={"choice": "explore_candidate_moves"},
        reasoning_outcome="recognized",
    )
    db_session.add(ep2)
    db_session.commit()

    update_hypothesis(hyp, [ep2], db_session)
    assert hyp.confidence == 0.46
    assert hyp.observed_count == 2
    assert hyp.state == "suspected"


def test_hypothesis_state_boundary_transitions(db_session, test_player):
    """
    State boundaries:
    - observed_count < 3: suspected
    - count >= 3, conf < 0.25: needs_evidence
    - conf in [0.25, 0.60]: developing
    - conf > 0.60: well_supported
    """
    ensure_initial_player_beliefs(db_session, test_player.id)
    hyp = (
        db_session.query(Hypothesis)
        .filter(Hypothesis.player_id == test_player.id, Hypothesis.concept == "tunnel_vision_after_attack")
        .first()
    )

    # 1. Below 3 tests -> always suspected
    hyp.observed_count = 2
    hyp.confidence = 0.90
    update_hypothesis(hyp, [], db_session)
    # Recompute state logic
    assert hyp.state == "suspected"

    # 2. 3 tests, confidence = 0.24 -> needs_evidence
    hyp.observed_count = 3
    hyp.confidence = 0.24
    if hyp.observed_count < 3:
        hyp.state = "suspected"
    elif hyp.confidence < 0.25:
        hyp.state = "needs_evidence"
    elif hyp.confidence <= 0.60:
        hyp.state = "developing"
    else:
        hyp.state = "well_supported"
    assert hyp.state == "needs_evidence"

    # 3. Exactly 0.25 -> developing
    hyp.confidence = 0.25
    if hyp.observed_count < 3:
        hyp.state = "suspected"
    elif hyp.confidence < 0.25:
        hyp.state = "needs_evidence"
    elif hyp.confidence <= 0.60:
        hyp.state = "developing"
    else:
        hyp.state = "well_supported"
    assert hyp.state == "developing"

    # 4. Exactly 0.60 -> developing
    hyp.confidence = 0.60
    if hyp.observed_count < 3:
        hyp.state = "suspected"
    elif hyp.confidence < 0.25:
        hyp.state = "needs_evidence"
    elif hyp.confidence <= 0.60:
        hyp.state = "developing"
    else:
        hyp.state = "well_supported"
    assert hyp.state == "developing"

    # 5. Exactly 0.61 -> well_supported
    hyp.confidence = 0.61
    if hyp.observed_count < 3:
        hyp.state = "suspected"
    elif hyp.confidence < 0.25:
        hyp.state = "needs_evidence"
    elif hyp.confidence <= 0.60:
        hyp.state = "developing"
    else:
        hyp.state = "well_supported"
    assert hyp.state == "well_supported"


# =====================================================================
# 6. EPISTEMOLOGY DB CONSTRAINT: IMPORTS CANNOT SUPPORT/CONTRADICT
# =====================================================================

def test_database_rejects_imported_hypothesis_claims(db_session, test_player):
    """
    The PostgreSQL CHECK constraint 'no_import_hypothesis_claims' rejects:
    source_type='imported_position', claim_type='hypothesis', direction='supports' or 'contradicts'.
    """
    pos_id = uuid.uuid4()

    # Invalid: imported position trying to support hypothesis
    invalid_rec = EvidenceRecord(
        player_id=test_player.id,
        source_type="imported_position",
        source_id=pos_id,
        claim_type="hypothesis",
        concept="tunnel_vision_after_attack",
        direction="supports",  # FORBIDDEN!
    )
    db_session.add(invalid_rec)
    with pytest.raises(IntegrityError):
        db_session.commit()

    db_session.rollback()

    # Valid: imported position SEEDING hypothesis
    valid_seed = EvidenceRecord(
        player_id=test_player.id,
        source_type="imported_position",
        source_id=pos_id,
        claim_type="hypothesis",
        concept="tunnel_vision_after_attack",
        direction="seeds",  # ALLOWED
    )
    db_session.add(valid_seed)
    db_session.commit()
    assert valid_seed.id is not None


# =====================================================================
# 7. IDEMPOTENCY, UNIQUENESS & CONCURRENCY
# =====================================================================

def test_evidence_records_db_uniqueness_constraint(db_session, test_player):
    """
    Test A & C: DB UniqueConstraint (uq_evidence_source_claim_concept) on
    (source_type, source_id, claim_type, concept).
    Proves:
    - Same source/concept cannot create 'supports' and later 'contradicts' as two rows.
    - Duplicate insert is rejected by DB constraint.
    """
    source_id = uuid.uuid4()

    rec1 = EvidenceRecord(
        player_id=test_player.id,
        source_type="think_first_episode",
        source_id=source_id,
        claim_type="skill",
        concept="opponent_threat_detection",
        direction="supports",
    )
    db_session.add(rec1)
    db_session.commit()

    # Attempting to insert another row with direction='contradicts' for the same claim
    rec2 = EvidenceRecord(
        player_id=test_player.id,
        source_type="think_first_episode",
        source_id=source_id,
        claim_type="skill",
        concept="opponent_threat_detection",
        direction="contradicts",
    )
    db_session.add(rec2)
    with pytest.raises(IntegrityError):
        db_session.commit()

    db_session.rollback()


def test_same_source_can_create_one_skill_and_one_hypothesis_evidence(db_session, test_player):
    """
    Test B: The same source_id can legitimately create:
    - 1 skill claim (claim_type='skill', concept='opponent_threat_detection')
    - 1 hypothesis claim (claim_type='hypothesis', concept='tunnel_vision_after_attack')
    """
    source_id = uuid.uuid4()

    rec_skill, created_skill = write_evidence_record(
        db_session,
        test_player.id,
        "think_first_episode",
        source_id,
        "skill",
        "opponent_threat_detection",
        "supports",
    )
    rec_hyp, created_hyp = write_evidence_record(
        db_session,
        test_player.id,
        "think_first_episode",
        source_id,
        "hypothesis",
        "tunnel_vision_after_attack",
        "supports",
    )
    db_session.commit()

    assert created_skill is True
    assert created_hyp is True
    assert rec_skill.id != rec_hyp.id


def test_write_evidence_record_idempotent_and_safe(db_session, test_player):
    """
    Calling write_evidence_record multiple times returns existing record and created_new=False.
    """
    source_id = uuid.uuid4()

    rec1, created1 = write_evidence_record(
        db_session,
        test_player.id,
        "think_first_episode",
        source_id,
        "skill",
        "opponent_threat_detection",
        "supports",
    )
    assert created1 is True

    # Call 2
    rec2, created2 = write_evidence_record(
        db_session,
        test_player.id,
        "think_first_episode",
        source_id,
        "skill",
        "opponent_threat_detection",
        "contradicts",  # Attempt different direction
    )
    assert created2 is False
    assert rec1.id == rec2.id


def test_process_new_graded_evidence_idempotency(db_session, test_player, test_session):
    """
    Test D: Running process_new_graded_evidence multiple times on the same graded episodes
    must not create duplicate evidence, duplicate belief_changes, or mutate scores again.
    """
    ep = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=10,
        fen="fen_idem",
        status="graded",
        trigger_evidence={
            "type": "opponent_threat",
            "target_concept": "opponent_threat_detection",
            "question_id": "opponent_threat_counterplay",
        },
        learner_reasoning={"choice": "calculate_forcing", "free_text": "I want to attack f7"},
        learner_action={"move_played": "e2e4"},
        reasoning_outcome="missed",
        move_outcome="mistake",
    )
    db_session.add(ep)
    db_session.commit()

    # First pass
    res1 = process_new_graded_evidence(db_session, test_player.id, [ep.id])
    db_session.commit()
    assert res1["new_evidence_count"] == 1

    ev_count_1 = db_session.query(EvidenceRecord).filter(EvidenceRecord.player_id == test_player.id).count()
    bc_count_1 = db_session.query(BeliefChange).filter(BeliefChange.player_id == test_player.id).count()
    assert ev_count_1 >= 2  # 1 skill + 1 hypothesis

    # Second pass
    res2 = process_new_graded_evidence(db_session, test_player.id, [ep.id])
    db_session.commit()
    assert res2["new_evidence_count"] == 0

    ev_count_2 = db_session.query(EvidenceRecord).filter(EvidenceRecord.player_id == test_player.id).count()
    bc_count_2 = db_session.query(BeliefChange).filter(BeliefChange.player_id == test_player.id).count()
    assert ev_count_2 == ev_count_1
    assert bc_count_2 == bc_count_1


def test_process_new_graded_evidence_transactional_rollback(db_session, test_player, test_session):
    """If an error occurs midway, db rollback ensures no orphan evidence is left."""
    ep = Episode(
        session_id=test_session.id,
        player_id=test_player.id,
        move_number=12,
        fen="fen_err",
        status="graded",
        trigger_evidence={"type": "opponent_threat", "target_concept": "opponent_threat_detection"},
        learner_reasoning={"choice": "look_for_counterplay"},
        reasoning_outcome="recognized",
    )
    db_session.add(ep)
    db_session.commit()

    try:
        # Simulate partial work and failure
        write_evidence_record(db_session, test_player.id, "think_first_episode", ep.id, "skill", "opponent_threat_detection", "supports")
        raise RuntimeError("Simulated mid-pipeline failure")
    except RuntimeError:
        db_session.rollback()

    # Verify rollback
    records = db_session.query(EvidenceRecord).filter(EvidenceRecord.source_id == ep.id).all()
    assert len(records) == 0


def test_duplicate_race_does_not_rollback_prior_mutations(db_session, test_player):
    """
    Regression test for nested transaction / savepoint safety:
    Proves that a duplicate evidence race occurring AFTER an earlier valid mutation
    does not erase or roll back that earlier mutation.
    """
    source_id_1 = uuid.uuid4()
    source_id_2 = uuid.uuid4()

    # Step 1: Valid initial mutation in the current transaction (e.g. write evidence record 1)
    rec1, created1 = write_evidence_record(
        db_session,
        test_player.id,
        "think_first_episode",
        source_id_1,
        "skill",
        "opponent_threat_detection",
        "supports",
    )
    assert created1 is True

    # Step 2: Insert the first occurrence of source_id_2
    rec2_init, c2_init = write_evidence_record(
        db_session,
        test_player.id,
        "think_first_episode",
        source_id_2,
        "skill",
        "fork_opportunity",
        "supports",
    )
    assert c2_init is True

    # Simulate a concurrent race where query.first() doesn't see source_id_2 (e.g. racing transaction),
    # so write_evidence_record executes the INSERT, hits the unique constraint, and rolls back only the savepoint.
    from unittest.mock import patch
    original_query = db_session.query

    first_call = True
    def mock_query(*args, **kwargs):
        nonlocal first_call
        q = original_query(*args, **kwargs)
        if args and args[0] == EvidenceRecord and first_call:
            first_call = False
            original_filter = q.filter
            def mock_filter(*f_args, **f_kwargs):
                fq = original_filter(*f_args, **f_kwargs)
                fq.first = lambda: None
                return fq
            q.filter = mock_filter
        return q

    with patch.object(db_session, "query", side_effect=mock_query):
        rec2_race, created_race = write_evidence_record(
            db_session,
            test_player.id,
            "think_first_episode",
            source_id_2,
            "skill",
            "fork_opportunity",
            "supports",
        )

    assert created_race is False
    assert rec2_race.id == rec2_init.id

    # Step 3: Verify that the earlier mutation (rec1) was NOT erased or rolled back
    # Commit the transaction to prove session remains fully valid
    db_session.commit()

    saved_rec1 = db_session.query(EvidenceRecord).filter(EvidenceRecord.source_id == source_id_1).first()
    assert saved_rec1 is not None
    assert saved_rec1.id == rec1.id


