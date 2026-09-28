"""
Belief Updater Module — Dr. Wolf Brain
Implements PRD §7 and BUILD_SPEC §8 canonical belief updates.
Deterministic authority for skill mastery, hypothesis confidence, and belief changelog.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session

from app.models import (
    Skill,
    Hypothesis,
    EvidenceRecord,
    BeliefChange,
    Episode,
    Position,
)
from app.concepts import (
    SKILL_CONCEPTS,
    HYPOTHESIS_CONCEPTS,
    TRIGGER_TO_SKILL,
    episode_tests_hypothesis,
    classify_vs_hypothesis,
)

logger = logging.getLogger(__name__)

MIN_EVIDENCE_FOR_SCORE = 3


def outcome_score(resolved_outcome: Optional[str]) -> float:
    """Canonical mapping from reasoning outcome to numeric score for Think First episodes.
    recognized -> 1.0, partial -> 0.5, missed -> 0.0.
    """
    if not resolved_outcome:
        return 0.0
    mapping = {"recognized": 1.0, "partial": 0.5, "missed": 0.0}
    return mapping.get(resolved_outcome, 0.0)


def resolve_outcome(record: EvidenceRecord, db: Session) -> Optional[str]:
    """Resolve reasoning outcome for Think First episode records."""
    if record.source_type == "think_first_episode":
        ep = db.query(Episode).filter(Episode.id == record.source_id).first()
        return ep.reasoning_outcome if ep else None
    return None


def resolve_evidence_score(record: EvidenceRecord, db: Session) -> float:
    """Resolve numeric skill score [0.0..1.0] from the source record.

    Think First evidence:
      Episode.reasoning_outcome -> "recognized": 1.0, "partial": 0.5, "missed": 0.0

    Imported position evidence:
      Position.engine["concept_observation"]["score"] -> float [0.0..1.0]
      (Derived strictly from concept-specific observable predicates;
       NEVER routed through reasoning outcomes).
    """
    if record.source_type == "think_first_episode":
        ep = db.query(Episode).filter(Episode.id == record.source_id).first()
        if ep and ep.reasoning_outcome:
            return outcome_score(ep.reasoning_outcome)
        return 0.0
    elif record.source_type == "imported_position":
        pos = db.query(Position).filter(Position.id == record.source_id).first()
        if pos:
            engine_dict = pos.engine or {}
            obs = engine_dict.get("concept_observation")
            if isinstance(obs, dict) and "score" in obs:
                try:
                    return float(obs["score"])
                except (ValueError, TypeError):
                    pass
            if "skill_score" in engine_dict:
                try:
                    return float(engine_dict["skill_score"])
                except (ValueError, TypeError):
                    pass
        return 0.0
    return 0.0


def write_evidence_record(
    db: Session,
    player_id: uuid.UUID,
    source_type: str,
    source_id: uuid.UUID,
    claim_type: str,
    concept: str,
    direction: str,
) -> Tuple[EvidenceRecord, bool]:
    """Write an evidence record concurrency-safely and idempotently.
    Enforces DB-level uniqueness on (source_type, source_id, claim_type, concept).
    Uses a SAVEPOINT (begin_nested) so duplicate-race integrity errors roll back
    only the savepoint, leaving the outer transaction intact.
    Returns (EvidenceRecord, created_new: bool).
    """
    existing = (
        db.query(EvidenceRecord)
        .filter(
            EvidenceRecord.source_type == source_type,
            EvidenceRecord.source_id == source_id,
            EvidenceRecord.claim_type == claim_type,
            EvidenceRecord.concept == concept,
        )
        .first()
    )
    if existing:
        return existing, False

    record = EvidenceRecord(
        player_id=player_id,
        source_type=source_type,
        source_id=source_id,
        claim_type=claim_type,
        concept=concept,
        direction=direction,
    )
    from sqlalchemy.exc import IntegrityError

    savepoint = db.begin_nested()
    try:
        db.add(record)
        db.flush()
        savepoint.commit()
        return record, True
    except IntegrityError as exc:
        savepoint.rollback()
        # Check if the duplicate was caused by another concurrent insert of the same unique key
        existing = (
            db.query(EvidenceRecord)
            .filter(
                EvidenceRecord.source_type == source_type,
                EvidenceRecord.source_id == source_id,
                EvidenceRecord.claim_type == claim_type,
                EvidenceRecord.concept == concept,
            )
            .first()
        )
        if existing:
            return existing, False
        # If unrelated IntegrityError (e.g. check constraint failure), re-raise
        raise exc


def write_belief_change(
    db: Session,
    player_id: uuid.UUID,
    claim_type: str,
    concept: str,
    old_value: Optional[Dict[str, Any]],
    new_value: Optional[Dict[str, Any]],
    reason: str,
) -> Optional[BeliefChange]:
    """Write a structured, auditable belief_changes row whenever a belief changes.
    Does not write when old_value == new_value.
    """
    if old_value == new_value:
        return None

    change = BeliefChange(
        player_id=player_id,
        claim_type=claim_type,
        concept=concept,
        old_value=old_value,
        new_value=new_value,
        reason=reason,
    )
    db.add(change)
    db.flush()
    return change


def ensure_initial_player_beliefs(db: Session, player_id: uuid.UUID) -> None:
    """Ensure all canonical skill and hypothesis rows exist for a player idempotently.
    Skills start with mastery_score=NULL, evidence_count=0, trend='new'.
    Hypotheses start with confidence=0.5, state='suspected', observed_count=0, trend='new'.
    """
    # 1. Skills
    existing_skills = {
        s.concept for s in db.query(Skill).filter(Skill.player_id == player_id).all()
    }
    for concept in SKILL_CONCEPTS:
        if concept not in existing_skills:
            skill = Skill(
                player_id=player_id,
                concept=concept,
                mastery_score=None,
                evidence_count=0,
                trend="new",
            )
            db.add(skill)

    # 2. Hypotheses
    existing_hyps = {
        h.concept
        for h in db.query(Hypothesis).filter(Hypothesis.player_id == player_id).all()
    }
    for concept, description in HYPOTHESIS_CONCEPTS.items():
        if concept not in existing_hyps:
            hyp = Hypothesis(
                player_id=player_id,
                concept=concept,
                description=description,
                confidence=0.5,
                state="suspected",
                observed_count=0,
                trend="new",
            )
            db.add(hyp)

    db.flush()


def update_skill(
    skill: Skill, new_evidence: List[EvidenceRecord], db: Session
) -> Optional[BeliefChange]:
    """Update skill mastery score and evidence count deterministically.
    - If mastery_score is NULL: initialize once total evidence count >= 3 using weighted average.
      (Think First = 1.0, Imported = 0.5).
    - If mastery_score is non-null: apply moving average (0.7*old + 0.3*session for Think First,
      0.85*old + 0.15*import for imported).
    """
    if not new_evidence:
        return None

    old_mastery = skill.mastery_score
    old_count = skill.evidence_count
    old_trend = skill.trend

    old_val = {
        "mastery_score": old_mastery,
        "evidence_count": old_count,
        "trend": old_trend,
    }

    thinkfirst = [e for e in new_evidence if e.source_type == "think_first_episode"]
    imported = [e for e in new_evidence if e.source_type == "imported_position"]

    # Check all historical qualifying evidence records for this skill
    all_evidence = (
        db.query(EvidenceRecord)
        .filter(
            EvidenceRecord.player_id == skill.player_id,
            EvidenceRecord.claim_type == "skill",
            EvidenceRecord.concept == skill.concept,
        )
        .all()
    )
    total_count = len(all_evidence)

    if skill.mastery_score is None:
        # Initialization rule: need at least MIN_EVIDENCE_FOR_SCORE (3) records
        if total_count >= MIN_EVIDENCE_FOR_SCORE:
            all_tf = [e for e in all_evidence if e.source_type == "think_first_episode"]
            all_imp = [e for e in all_evidence if e.source_type == "imported_position"]

            weighted_sum = (
                sum(resolve_evidence_score(e, db) * 1.0 for e in all_tf)
                + sum(resolve_evidence_score(e, db) * 0.5 for e in all_imp)
            )
            weight_sum = (len(all_tf) * 1.0) + (len(all_imp) * 0.5)

            new_mastery = (weighted_sum / weight_sum) * 100.0 if weight_sum > 0 else None
            skill.mastery_score = round(new_mastery, 2) if new_mastery is not None else None
            skill.trend = "new"
            skill.evidence_count = total_count
            skill.last_updated = datetime.now(timezone.utc)
            reason = f"Initialized mastery score to {skill.mastery_score}% from {total_count} qualifying evidence records"
        else:
            skill.evidence_count = total_count
            skill.trend = "new"
            skill.last_updated = datetime.now(timezone.utc)
            reason = f"Evidence count incremented to {total_count} (minimum {MIN_EVIDENCE_FOR_SCORE} required for mastery score)"
    else:
        # Ongoing update rule
        current_mastery = skill.mastery_score

        if thinkfirst:
            tf_scores = [resolve_evidence_score(e, db) for e in thinkfirst]
            session_score = (sum(tf_scores) / len(tf_scores)) * 100.0
            current_mastery = max(0.0, min(100.0, 0.7 * current_mastery + 0.3 * session_score))

        if imported:
            imp_scores = [resolve_evidence_score(e, db) for e in imported]
            import_score = (sum(imp_scores) / len(imp_scores)) * 100.0
            current_mastery = max(0.0, min(100.0, 0.85 * current_mastery + 0.15 * import_score))

        new_mastery_val = round(current_mastery, 2)

        # Compute deterministic trend
        if new_mastery_val > (old_mastery + 1.0):
            new_trend = "improving"
        elif new_mastery_val < (old_mastery - 1.0):
            new_trend = "declining"
        else:
            new_trend = "stable"

        skill.mastery_score = new_mastery_val
        skill.evidence_count = old_count + len(new_evidence)
        skill.trend = new_trend
        skill.last_updated = datetime.now(timezone.utc)
        reason = f"Updated mastery score to {skill.mastery_score}% from {len(new_evidence)} new evidence records"

    new_val = {
        "mastery_score": skill.mastery_score,
        "evidence_count": skill.evidence_count,
        "trend": skill.trend,
    }

    return write_belief_change(
        db=db,
        player_id=skill.player_id,
        claim_type="skill",
        concept=skill.concept,
        old_value=old_val,
        new_value=new_val,
        reason=reason,
    )


def update_hypothesis(
    hyp: Hypothesis,
    episodes: List[Episode],
    db: Session,
    session_choices: Optional[List[str]] = None,
) -> Optional[BeliefChange]:
    """Update thinking-pattern hypothesis confidence and state from meaningful Think First tests only.
    - Meaningful test check: episode_tests_hypothesis()
    - Confidence delta: +0.08 for support, -0.12 for contradict, clamped to [0.05, 0.95].
    - State transitions: <3 -> 'suspected', <0.25 -> 'needs_evidence', <=0.60 -> 'developing', >0.60 -> 'well_supported'.
    """
    old_conf = hyp.confidence
    old_count = hyp.observed_count
    old_state = hyp.state
    old_trend = hyp.trend

    old_val = {
        "confidence": old_conf,
        "observed_count": old_count,
        "state": old_state,
        "trend": old_trend,
    }

    meaningful_tests_found = 0

    for ep in episodes:
        if not episode_tests_hypothesis(ep, hyp.concept, session_choices):
            continue

        # Check if this meaningful test was already recorded
        existing_rec = (
            db.query(EvidenceRecord)
            .filter(
                EvidenceRecord.player_id == hyp.player_id,
                EvidenceRecord.source_type == "think_first_episode",
                EvidenceRecord.source_id == ep.id,
                EvidenceRecord.claim_type == "hypothesis",
                EvidenceRecord.concept == hyp.concept,
            )
            .first()
        )
        if existing_rec:
            continue

        direction = classify_vs_hypothesis(ep, hyp.concept)
        if direction not in ("supports", "contradicts"):
            continue

        write_evidence_record(
            db=db,
            player_id=hyp.player_id,
            source_type="think_first_episode",
            source_id=ep.id,
            claim_type="hypothesis",
            concept=hyp.concept,
            direction=direction,
        )

        delta = 0.08 if direction == "supports" else -0.12
        hyp.confidence = round(max(0.05, min(0.95, hyp.confidence + delta)), 4)
        hyp.observed_count += 1
        meaningful_tests_found += 1

    if meaningful_tests_found == 0 and old_count == hyp.observed_count:
        return None

    # Compute State Transitions
    if hyp.observed_count < 3:
        hyp.state = "suspected"
    elif hyp.confidence < 0.25:
        hyp.state = "needs_evidence"
    elif hyp.confidence <= 0.60:
        hyp.state = "developing"
    else:
        hyp.state = "well_supported"

    # Compute Trend
    if hyp.observed_count < 3:
        hyp.trend = "new"
    elif hyp.confidence > (old_conf + 0.01):
        hyp.trend = "improving"
    elif hyp.confidence < (old_conf - 0.01):
        hyp.trend = "declining"
    else:
        hyp.trend = "stable"

    hyp.updated_at = datetime.now(timezone.utc)

    new_val = {
        "confidence": hyp.confidence,
        "observed_count": hyp.observed_count,
        "state": hyp.state,
        "trend": hyp.trend,
    }

    reason = (
        f"Hypothesis {hyp.concept} updated after {meaningful_tests_found} meaningful tests: "
        f"confidence={hyp.confidence}, state={hyp.state}"
    )

    return write_belief_change(
        db=db,
        player_id=hyp.player_id,
        claim_type="hypothesis",
        concept=hyp.concept,
        old_value=old_val,
        new_value=new_val,
        reason=reason,
    )


def process_new_graded_evidence(
    db: Session,
    player_id: uuid.UUID,
    episode_ids: Optional[List[uuid.UUID]] = None,
) -> Dict[str, Any]:
    """Transactionally process newly graded Think First episodes for a player:
    1. Writes skill evidence records idempotently.
    2. Updates affected skills (mastery score, evidence count, trend).
    3. Identifies meaningful hypothesis tests and writes hypothesis evidence records.
    4. Updates hypotheses (confidence, observed_count, state, trend).
    5. Writes belief_changes records.
    """
    ensure_initial_player_beliefs(db, player_id)

    # 1. Fetch graded episodes
    if episode_ids is not None:
        if len(episode_ids) == 0:
            episodes = []
        else:
            episodes = (
                db.query(Episode)
                .filter(Episode.player_id == player_id, Episode.status == "graded", Episode.id.in_(episode_ids))
                .order_by(Episode.created_at.asc())
                .all()
            )
    else:
        episodes = (
            db.query(Episode)
            .filter(Episode.player_id == player_id, Episode.status == "graded")
            .order_by(Episode.created_at.asc())
            .all()
        )

    skill_changes = []
    hypothesis_changes = []
    new_skill_evidence_count = 0

    # Collect session choices
    session_choices = []
    for ep in episodes:
        lr = ep.learner_reasoning or {}
        ch = lr.get("choice")
        if ch:
            session_choices.append(ch)

    # 2. Process skill evidence
    episodes_by_skill: Dict[str, List[Episode]] = {}
    for ep in episodes:
        trig_ev = ep.trigger_evidence or {}
        trig_type = trig_ev.get("type", "")
        concept = trig_ev.get("target_concept") or TRIGGER_TO_SKILL.get(trig_type)
        if not concept or not ep.reasoning_outcome:
            continue

        direction = (
            "supports"
            if ep.reasoning_outcome in ("recognized", "partial")
            else "contradicts"
        )
        _, created_new = write_evidence_record(
            db=db,
            player_id=player_id,
            source_type="think_first_episode",
            source_id=ep.id,
            claim_type="skill",
            concept=concept,
            direction=direction,
        )
        if created_new:
            new_skill_evidence_count += 1
            episodes_by_skill.setdefault(concept, []).append(ep)

    # Update skills that received new evidence
    for concept, eps in episodes_by_skill.items():
        skill = (
            db.query(Skill)
            .filter(Skill.player_id == player_id, Skill.concept == concept)
            .first()
        )
        if skill:
            new_ev_records = (
                db.query(EvidenceRecord)
                .filter(
                    EvidenceRecord.player_id == player_id,
                    EvidenceRecord.claim_type == "skill",
                    EvidenceRecord.concept == concept,
                    EvidenceRecord.source_id.in_([e.id for e in eps]),
                )
                .all()
            )
            ch = update_skill(skill, new_ev_records, db)
            if ch:
                skill_changes.append(ch)

    # 3. Process hypothesis evidence
    for hyp_concept in HYPOTHESIS_CONCEPTS:
        hyp = (
            db.query(Hypothesis)
            .filter(Hypothesis.player_id == player_id, Hypothesis.concept == hyp_concept)
            .first()
        )
        if hyp:
            ch = update_hypothesis(
                hyp, episodes, db, session_choices=session_choices
            )
            if ch:
                hypothesis_changes.append(ch)

    db.flush()

    return {
        "new_evidence_count": new_skill_evidence_count,
        "skill_changes": len(skill_changes),
        "hypothesis_changes": len(hypothesis_changes),
        "belief_changes": skill_changes + hypothesis_changes,
    }
