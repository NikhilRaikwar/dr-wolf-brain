import uuid
import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import func, update, and_
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models import (
    Session,
    Player,
    Episode,
    LearnerSkill,
    BeliefChange,
    TransferPosition,
    DreamCycleRun,
)
from app.concepts import SKILL_CONCEPTS, TRIGGER_TO_SKILL
from app.beliefs.updater import process_new_graded_evidence
from app.grading.grader import grade_committed_episode
from app.chess.stockfish import StockfishAdapter
from app.llm.client import LLMClient
from app.config import settings
from app.schemas import (
    DreamCycleResult,
    SessionFacts,
    ReasoningCounts,
    MoveCounts,
    BeliefChangeItem,
    TransferPositionItem,
    DreamCycleLanguage,
)


def compute_next_focus(skills: List[LearnerSkill]) -> Optional[str]:
    """Canonical next_focus selection:
    1. Only consider skills with non-null mastery_score.
    2. Lowest mastery_score.
    3. Tie-break 1: highest evidence_count.
    4. Tie-break 2: stable concept ordering from SKILL_CONCEPTS.
    If no skills have non-null mastery_score, return None.
    """
    valid_skills = [s for s in skills if s.mastery_score is not None]
    if not valid_skills:
        return None

    def skill_sort_key(s: LearnerSkill):
        mastery = s.mastery_score if s.mastery_score is not None else 100.0
        ev_count = s.evidence_count or 0
        concept_idx = SKILL_CONCEPTS.index(s.concept) if s.concept in SKILL_CONCEPTS else 999
        return (mastery, -ev_count, concept_idx)

    sorted_skills = sorted(valid_skills, key=skill_sort_key)
    return sorted_skills[0].concept


def select_transfer_positions(
    db: DBSession,
    concept: Optional[str],
    player_rating: Optional[int],
) -> List[TransferPosition]:
    """Curated transfer positions only.
    - Verified only (verified == True)
    - concept == next_focus
    - Ordered by ABS(difficulty - player_level), difficulty ASC, id ASC
    - Limit 3
    - If concept is None or no verified positions exist, returns empty list.
    """
    if not concept:
        return []

    rating = player_rating if player_rating is not None else settings.DEFAULT_RATING
    player_level = max(1, min(5, round(rating / 400)))

    positions = (
        db.query(TransferPosition)
        .filter(
            TransferPosition.concept == concept,
            TransferPosition.verified == True,  # noqa: E712
        )
        .order_by(
            func.abs(TransferPosition.difficulty - player_level).asc(),
            TransferPosition.difficulty.asc(),
            TransferPosition.id.asc(),
        )
        .limit(3)
        .all()
    )
    return positions


def _finalize_run_language_atomic(
    db: DBSession,
    session_id: uuid.UUID,
    candidate_language: DreamCycleLanguage,
) -> DreamCycleRun:
    """Atomic compare-and-set finalization.
    If multiple callers race to finalize language, exactly one wins (rowcount == 1).
    Losing caller does NOT overwrite (rowcount == 0).
    Re-raises unexpected DB exceptions without swallowing.
    Always verifies and returns the canonical persisted DreamCycleRun from DB after commit.
    """
    stmt = (
        update(DreamCycleRun)
        .where(
            and_(
                DreamCycleRun.session_id == session_id,
                DreamCycleRun.status == "processing",
                DreamCycleRun.language_json.is_(None),
            )
        )
        .values(
            language_json=candidate_language.model_dump(),
            status="complete",
        )
    )
    try:
        result = db.execute(stmt)
        db.commit()
    except Exception:
        db.rollback()
        raise

    # Expire ORM cache and reload canonical persisted row from DB state
    db.expire_all()
    persisted = (
        db.query(DreamCycleRun)
        .filter(DreamCycleRun.session_id == session_id)
        .first()
    )
    if not persisted:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="DreamCycleRun not found after finalization",
        )
    if persisted.status != "complete" or persisted.language_json is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="DreamCycleRun failed to finalize into complete state",
        )
    return persisted


def reconstruct_dream_cycle_result(
    db: DBSession,
    session: Session,
    dream_run: DreamCycleRun,
    llm: Optional[LLMClient] = None,
) -> DreamCycleResult:
    """Construct canonical idempotent replay response from persisted DB state."""
    # Ensure run is in complete state
    if dream_run.status != "complete" or not dream_run.language_json:
        result_json = dream_run.result_json or {}
        bc_ids_raw = result_json.get("belief_change_ids", [])
        bc_ids = [uuid.UUID(str(bid)) for bid in bc_ids_raw if bid]
        belief_changes = (
            db.query(BeliefChange).filter(BeliefChange.id.in_(bc_ids)).all() if bc_ids else []
        )
        belief_change_items = [
            BeliefChangeItem(
                claim_type=bc.claim_type,
                concept=bc.concept,
                old_value=bc.old_value,
                new_value=bc.new_value,
                reason=bc.reason,
                created_at=bc.created_at.isoformat() if bc.created_at else None,
            )
            for bc in belief_changes
        ]
        next_focus = result_json.get("next_focus")
        tp_ids_raw = result_json.get("transfer_position_ids", [])
        tp_ids = [uuid.UUID(str(tid)) for tid in tp_ids_raw if tid]
        facts = SessionFacts(
            session_id=session.id,
            player_id=session.player_id,
            graded_episode_count=result_json.get("graded_episode_count", 0),
            reasoning_counts=ReasoningCounts(**result_json.get("reasoning_counts", {})),
            move_counts=MoveCounts(**result_json.get("move_counts", {})),
            concept_counts=result_json.get("concept_counts", {}),
            belief_changes=belief_change_items,
            next_focus=next_focus,
            transfer_position_ids=tp_ids,
        )
        llm_client = llm or LLMClient()
        candidate = llm_client.generate_dream_cycle_language(
            session_facts=facts.model_dump(),
            belief_changes=belief_change_items,
            next_focus=next_focus,
        )
        dream_run = _finalize_run_language_atomic(db, session.id, candidate)

    result_json = dream_run.result_json or {}

    # Exact belief change IDs owned by this run
    bc_ids_raw = result_json.get("belief_change_ids", [])
    bc_ids = [uuid.UUID(str(bid)) for bid in bc_ids_raw if bid]
    if bc_ids:
        belief_changes = (
            db.query(BeliefChange)
            .filter(BeliefChange.id.in_(bc_ids))
            .order_by(BeliefChange.created_at.asc())
            .all()
        )
    else:
        belief_changes = []

    # Exact transfer position IDs selected for this run
    tp_ids_raw = result_json.get("transfer_position_ids", [])
    tp_ids = [uuid.UUID(str(tid)) for tid in tp_ids_raw if tid]
    if tp_ids:
        transfer_positions = (
            db.query(TransferPosition)
            .filter(TransferPosition.id.in_(tp_ids))
            .all()
        )
    else:
        transfer_positions = []

    belief_change_items = [
        BeliefChangeItem(
            claim_type=bc.claim_type,
            concept=bc.concept,
            old_value=bc.old_value,
            new_value=bc.new_value,
            reason=bc.reason,
            created_at=bc.created_at.isoformat() if bc.created_at else None,
        )
        for bc in belief_changes
    ]

    tp_items = [
        TransferPositionItem(
            id=tp.id,
            fen=tp.fen,
            concept=tp.concept,
            difficulty=tp.difficulty,
            tactical_theme=tp.tactical_theme,
            source=tp.source,
            verified=tp.verified,
        )
        for tp in transfer_positions
    ]

    next_focus = result_json.get("next_focus")

    facts = SessionFacts(
        session_id=session.id,
        player_id=session.player_id,
        graded_episode_count=result_json.get("graded_episode_count", 0),
        reasoning_counts=ReasoningCounts(**result_json.get("reasoning_counts", {})),
        move_counts=MoveCounts(**result_json.get("move_counts", {})),
        concept_counts=result_json.get("concept_counts", {}),
        belief_changes=belief_change_items,
        next_focus=next_focus,
        transfer_position_ids=[tp.id for tp in transfer_positions],
    )

    language = DreamCycleLanguage.model_validate(dream_run.language_json)

    return DreamCycleResult(
        session_id=session.id,
        player_id=session.player_id,
        ran_at=dream_run.ran_at.isoformat() if dream_run.ran_at else datetime.datetime.now(datetime.timezone.utc).isoformat(),
        session_facts=facts,
        language=language,
        next_focus=next_focus,
        transfer_positions=tp_items,
        belief_changes=belief_change_items,
    )


def finish_pending_run(
    db: DBSession,
    session: Session,
    dream_run: DreamCycleRun,
    llm: Optional[LLMClient] = None,
) -> DreamCycleResult:
    """Safely finish a pending (status=processing) run without re-running belief updates.
    Handles process crash recovery and concurrent caller finalization via atomic CAS.
    """
    if dream_run.status == "complete" and dream_run.language_json:
        return reconstruct_dream_cycle_result(db, session, dream_run, llm)

    result_json = dream_run.result_json or {}
    bc_ids_raw = result_json.get("belief_change_ids", [])
    bc_ids = [uuid.UUID(str(bid)) for bid in bc_ids_raw if bid]
    belief_changes = (
        db.query(BeliefChange).filter(BeliefChange.id.in_(bc_ids)).all() if bc_ids else []
    )
    belief_change_items = [
        BeliefChangeItem(
            claim_type=bc.claim_type,
            concept=bc.concept,
            old_value=bc.old_value,
            new_value=bc.new_value,
            reason=bc.reason,
            created_at=bc.created_at.isoformat() if bc.created_at else None,
        )
        for bc in belief_changes
    ]

    facts = SessionFacts(
        session_id=session.id,
        player_id=session.player_id,
        graded_episode_count=result_json.get("graded_episode_count", 0),
        reasoning_counts=ReasoningCounts(**result_json.get("reasoning_counts", {})),
        move_counts=MoveCounts(**result_json.get("move_counts", {})),
        concept_counts=result_json.get("concept_counts", {}),
        belief_changes=belief_change_items,
        next_focus=result_json.get("next_focus"),
        transfer_position_ids=[uuid.UUID(str(t)) for t in result_json.get("transfer_position_ids", [])],
    )

    llm_client = llm or LLMClient()
    candidate_language = llm_client.generate_dream_cycle_language(
        session_facts=facts.model_dump(),
        belief_changes=belief_change_items,
        next_focus=result_json.get("next_focus"),
    )

    # Atomic CAS update and reload canonical persisted run (raises on unexpected DB error)
    persisted_run = _finalize_run_language_atomic(db, session.id, candidate_language)
    return reconstruct_dream_cycle_result(db, session, persisted_run, llm)


def run_dream_cycle(
    db: DBSession,
    session_id: uuid.UUID,
    engine: Optional[StockfishAdapter] = None,
    llm: Optional[LLMClient] = None,
) -> DreamCycleResult:
    """Canonical Dream Cycle pipeline:
    1. Validate/load session.
    2. Check run state:
       - status == 'complete': return canonical replay immediately.
       - status == 'processing': safely finish pending run without re-running beliefs.
    3. Grade awaiting committed episodes (prompted/answered episodes are not graded).
    4. Phase A (Deterministic Transaction):
       - Run belief updater (process_new_graded_evidence).
       - Persist exact belief_change_ids.
       - Compute next_focus & select transfer positions.
       - Persist result_json with status='processing'.
       - Commit deterministic DB state.
    5. Phase B (Language & Finalization):
       - Generate language outside long DB transaction.
       - Persist language_json, mark status='complete', commit via atomic CAS.
    6. Return canonical DreamCycleResult reconstructed from DB state.
    """
    # 1. Validate session
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    player = db.query(Player).filter(Player.id == session.player_id).first()
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player for session {session_id} not found",
        )

    # 2. Idempotency & Lifecycle check
    existing_run = (
        db.query(DreamCycleRun)
        .filter(DreamCycleRun.session_id == session_id)
        .first()
    )
    if existing_run:
        if existing_run.status == "complete" and existing_run.language_json:
            return reconstruct_dream_cycle_result(db, session, existing_run, llm)
        else:
            return finish_pending_run(db, session, existing_run, llm)

    # 3. Ensure eligible committed episodes are graded (prompted/answered are not graded)
    episodes = (
        db.query(Episode)
        .filter(Episode.session_id == session_id)
        .order_by(Episode.move_number.asc())
        .all()
    )

    engine_adapter = engine or StockfishAdapter(
        path=settings.STOCKFISH_PATH,
        depth_live=settings.ENGINE_DEPTH_LIVE,
        min_stockfish_elo=settings.STOCKFISH_MIN_ELO,
    )
    llm_client = llm or LLMClient()

    has_graded = False
    for ep in episodes:
        if ep.status == "committed":
            r_out, m_out, cp_loss, e_truth, _ = grade_committed_episode(
                episode=ep,
                player_color_str=session.player_color,
                engine=engine_adapter,
                llm=llm_client,
            )
            ep.engine_truth = e_truth
            ep.reasoning_outcome = r_out
            ep.move_outcome = m_out
            ep.move_quality_cp_loss = cp_loss
            ep.status = "graded"
            has_graded = True

    if has_graded:
        db.flush()

    graded_episodes = [ep for ep in episodes if ep.status == "graded"]

    # 4. Phase A: Deterministic consolidation transaction
    try:
        belief_res = process_new_graded_evidence(
            db=db,
            player_id=session.player_id,
            episode_ids=[ep.id for ep in graded_episodes],
        )
        raw_belief_changes = belief_res.get("belief_changes", [])

        skills = (
            db.query(LearnerSkill)
            .filter(LearnerSkill.player_id == session.player_id)
            .all()
        )
        next_focus = compute_next_focus(skills)

        transfer_positions = select_transfer_positions(
            db=db,
            concept=next_focus,
            player_rating=player.estimated_rating,
        )

        rec_count = sum(1 for ep in graded_episodes if ep.reasoning_outcome == "recognized")
        par_count = sum(1 for ep in graded_episodes if ep.reasoning_outcome == "partial")
        mis_count = sum(1 for ep in graded_episodes if ep.reasoning_outcome == "missed")

        best_count = sum(1 for ep in graded_episodes if ep.move_outcome == "best")
        acc_count = sum(1 for ep in graded_episodes if ep.move_outcome == "acceptable")
        inac_count = sum(1 for ep in graded_episodes if ep.move_outcome == "inaccurate")
        mist_count = sum(1 for ep in graded_episodes if ep.move_outcome == "mistake")

        concept_counts: Dict[str, int] = {}
        for ep in graded_episodes:
            c = (
                (ep.trigger_evidence or {}).get("concept")
                or (ep.engine_truth or {}).get("concept")
                or TRIGGER_TO_SKILL.get((ep.trigger_evidence or {}).get("type", ""))
            )
            if c:
                concept_counts[c] = concept_counts.get(c, 0) + 1

        result_data = {
            "session_id": str(session.id),
            "player_id": str(session.player_id),
            "graded_episode_count": len(graded_episodes),
            "reasoning_counts": {
                "recognized": rec_count,
                "partial": par_count,
                "missed": mis_count,
            },
            "move_counts": {
                "best": best_count,
                "acceptable": acc_count,
                "inaccurate": inac_count,
                "mistake": mist_count,
            },
            "concept_counts": concept_counts,
            "belief_change_ids": [str(bc.id) for bc in raw_belief_changes],
            "next_focus": next_focus,
            "transfer_position_ids": [str(tp.id) for tp in transfer_positions],
        }

        dream_run = DreamCycleRun(
            session_id=session.id,
            status="processing",
            result_json=result_data,
            language_json=None,
        )
        db.add(dream_run)
        db.commit()
        db.refresh(dream_run)

    except IntegrityError:
        db.rollback()
        existing_run = (
            db.query(DreamCycleRun)
            .filter(DreamCycleRun.session_id == session_id)
            .first()
        )
        if existing_run:
            if existing_run.status == "complete" and existing_run.language_json:
                return reconstruct_dream_cycle_result(db, session, existing_run, llm)
            else:
                return finish_pending_run(db, session, existing_run, llm)
        raise

    except Exception:
        db.rollback()
        raise

    # 5. Phase B: Language generation & finalization
    belief_change_items = [
        BeliefChangeItem(
            claim_type=bc.claim_type,
            concept=bc.concept,
            old_value=bc.old_value,
            new_value=bc.new_value,
            reason=bc.reason,
            created_at=bc.created_at.isoformat() if bc.created_at else None,
        )
        for bc in raw_belief_changes
    ]

    facts = SessionFacts(
        session_id=session.id,
        player_id=session.player_id,
        graded_episode_count=len(graded_episodes),
        reasoning_counts=ReasoningCounts(
            recognized=rec_count,
            partial=par_count,
            missed=mis_count,
        ),
        move_counts=MoveCounts(
            best=best_count,
            acceptable=acc_count,
            inaccurate=inac_count,
            mistake=mist_count,
        ),
        concept_counts=concept_counts,
        belief_changes=belief_change_items,
        next_focus=next_focus,
        transfer_position_ids=[tp.id for tp in transfer_positions],
    )

    language = llm_client.generate_dream_cycle_language(
        session_facts=facts.model_dump(),
        belief_changes=belief_change_items,
        next_focus=next_focus,
    )

    persisted_run = _finalize_run_language_atomic(db, session.id, language)
    return reconstruct_dream_cycle_result(db, session, persisted_run, llm)
