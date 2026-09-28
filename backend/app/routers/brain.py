import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import desc

from app.db import get_db
from app.models import (
    Player,
    Skill,
    Hypothesis,
    BeliefChange,
    Session,
    Episode,
    EvidenceRecord,
    DreamCycleRun,
)
from app.concepts import SKILL_CONCEPTS, HYPOTHESIS_CONCEPTS

router = APIRouter(prefix="/api/brain", tags=["brain"])

SKILL_LABELS: Dict[str, str] = {
    "tactical_awareness": "Tactical Awareness",
    "opponent_threat_detection": "Opponent Threat Detection",
    "king_safety": "King Safety Awareness",
    "calculation_depth": "Calculation Depth",
    "endgame_technique": "Endgame Technique",
}

HYPOTHESIS_LABELS: Dict[str, str] = {
    "tunnel_vision_after_attack": "Tunnel vision after finding an attack",
    "stops_calculating_early": "Stops calculating after first candidate",
    "misses_defensive_resources": "Misses defensive resources",
}

STATE_LABELS: Dict[str, str] = {
    "suspected": "Needs evidence",
    "needs_evidence": "Needs evidence",
    "developing": "Developing",
    "well_supported": "Well-supported",
}


@router.get("")
def get_brain_dashboard(
    player_id: uuid.UUID = Query(..., description="UUID of the player whose brain dashboard is requested"),
    db: DBSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Read-only aggregator for Dr. Wolf Brain learner model dashboard.
    Strictly read-only: does not mutate beliefs, evidence, or session state.
    Requires player_id parameter. Returns 404 if player does not exist.
    """
    # 1. Resolve player (explicit scoping only - no fallback to latest player)
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    resolved_player_id = player.id

    # 2. Summary stats
    sessions_query = db.query(Session).filter(Session.player_id == resolved_player_id)
    sessions_played = sessions_query.count()

    episodes_query = db.query(Episode).filter(
        Episode.player_id == resolved_player_id,
        Episode.status == "graded",
    )
    episodes_analyzed = episodes_query.count()

    # 3. Skills state
    persisted_skills = {
        s.concept: s
        for s in db.query(Skill).filter(Skill.player_id == resolved_player_id).all()
    }
    skills_list = []
    for concept in SKILL_CONCEPTS:
        sk = persisted_skills.get(concept)
        skills_list.append({
            "concept": concept,
            "label": SKILL_LABELS.get(concept, concept.replace("_", " ").title()),
            "mastery_score": sk.mastery_score if sk else None,
            "evidence_count": sk.evidence_count if sk else 0,
            "trend": sk.trend if sk else "new",
            "last_updated": sk.last_updated.isoformat() if sk and sk.last_updated else None,
        })

    # 4. Hypotheses state
    persisted_hypotheses = {
        h.concept: h
        for h in db.query(Hypothesis).filter(Hypothesis.player_id == resolved_player_id).all()
    }
    hypotheses_list = []
    for concept, default_desc in HYPOTHESIS_CONCEPTS.items():
        hyp = persisted_hypotheses.get(concept)
        raw_state = hyp.state if hyp else "needs_evidence"
        consumer_state = STATE_LABELS.get(raw_state, "Needs evidence")
        
        # Calculate observed frequency from evidence records
        obs_count = hyp.observed_count if hyp else 0
        ev_count = (
            db.query(EvidenceRecord)
            .filter(
                EvidenceRecord.player_id == resolved_player_id,
                EvidenceRecord.concept == concept,
                EvidenceRecord.claim_type == "hypothesis",
            )
            .count()
        )

        hypotheses_list.append({
            "concept": concept,
            "label": HYPOTHESIS_LABELS.get(concept, concept.replace("_", " ").title()),
            "description": hyp.description if hyp else default_desc,
            "state": raw_state,
            "consumer_state": consumer_state,
            "observed_count": obs_count,
            "evidence_count": ev_count,
            "trend": hyp.trend if hyp else "new",
        })

    # 5. Latest Dream Cycle Run for next_focus and narrative
    latest_run = (
        db.query(DreamCycleRun)
        .join(Session, Session.id == DreamCycleRun.session_id)
        .filter(
            Session.player_id == resolved_player_id,
            DreamCycleRun.status == "complete",
        )
        .order_by(desc(DreamCycleRun.ran_at))
        .first()
    )

    current_focus_concept = None
    current_focus_rationale = None
    current_focus_stage = None
    if latest_run and latest_run.result_json:
        current_focus_concept = latest_run.result_json.get("next_focus")
        if latest_run.language_json:
            current_focus_rationale = latest_run.language_json.get("next_focus_phrase") or latest_run.language_json.get("key_takeaway")

    # If no DreamCycleRun yet, check if any skill has lowest mastery or needs work
    if not current_focus_concept:
        # Fallback to deterministic check: first skill with evidence or None
        skills_with_ev = [s for s in skills_list if s["evidence_count"] > 0]
        if skills_with_ev:
            # pick skill with lowest mastery or most recent
            current_focus_concept = sorted(skills_with_ev, key=lambda s: (s["mastery_score"] if s["mastery_score"] is not None else -1))[0]["concept"]

    current_focus_label = (
        SKILL_LABELS.get(current_focus_concept, current_focus_concept.replace("_", " ").title())
        if current_focus_concept
        else None
    )

    # 6. Board Preview for Focus (from latest relevant episode)
    board_preview = None
    latest_graded_ep = (
        db.query(Episode)
        .filter(
            Episode.player_id == resolved_player_id,
            Episode.status == "graded",
        )
        .order_by(desc(Episode.created_at))
        .first()
    )
    if latest_graded_ep:
        board_preview = {
            "fen": latest_graded_ep.fen,
            "source_label": f"From Episode #{latest_graded_ep.move_number}",
            "episode_id": str(latest_graded_ep.id),
        }

    # 7. "Why did you ask me that?" Provenance Data
    # Find graded episodes with evidence records
    recent_ev_episodes = (
        db.query(Episode)
        .filter(
            Episode.player_id == resolved_player_id,
            Episode.status == "graded",
        )
        .order_by(desc(Episode.created_at))
        .limit(5)
        .all()
    )

    why_citations = []
    for ep in recent_ev_episodes:
        trigger_dict = ep.trigger_evidence or {}
        trig_type = trigger_dict.get("type", "unknown")
        concept = trigger_dict.get("concept") or trig_type
        concept_lbl = SKILL_LABELS.get(concept, concept.replace("_", " ").title())
        why_citations.append({
            "episode_id": str(ep.id),
            "move_number": ep.move_number,
            "fen": ep.fen,
            "trigger_type": trig_type,
            "concept": concept,
            "concept_label": concept_lbl,
            "reasoning_outcome": ep.reasoning_outcome,
            "move_outcome": ep.move_outcome,
            "created_at": ep.created_at.isoformat() if ep.created_at else None,
        })

    why_narrative = None
    if latest_run and latest_run.language_json:
        why_narrative = latest_run.language_json.get("key_takeaway")
    elif len(why_citations) > 0:
        why_narrative = f"Dr. Wolf observed {len(why_citations)} recent Think First moment{'s' if len(why_citations) > 1 else ''} to analyze your calculation depth and threat recognition."

    # 8. Recent Sessions (up to 3)
    recent_sessions_raw = (
        db.query(Session)
        .filter(Session.player_id == resolved_player_id)
        .order_by(desc(Session.started_at))
        .limit(3)
        .all()
    )

    recent_sessions = []
    for s in recent_sessions_raw:
        # Calculate reasoning outcomes for this session
        eps = db.query(Episode).filter(Episode.session_id == s.id, Episode.status == "graded").all()
        rec = sum(1 for e in eps if e.reasoning_outcome == "recognized")
        part = sum(1 for e in eps if e.reasoning_outcome == "partial")
        miss = sum(1 for e in eps if e.reasoning_outcome == "missed")

        # Find session dream cycle run if any
        dc_run = db.query(DreamCycleRun).filter(DreamCycleRun.session_id == s.id).first()
        focus = None
        if dc_run and dc_run.result_json:
            focus = dc_run.result_json.get("next_focus")

        recent_sessions.append({
            "id": str(s.id),
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "engine_elo": s.engine_elo,
            "status": s.status,
            "graded_episode_count": len(eps),
            "reasoning_counts": {
                "recognized": rec,
                "partial": part,
                "missed": miss,
            },
            "focus_concept": focus,
            "focus_concept_label": SKILL_LABELS.get(focus, focus.replace("_", " ").title()) if focus else None,
        })

    # 9. Recent Belief Updates (up to 6)
    recent_changes_raw = (
        db.query(BeliefChange)
        .filter(BeliefChange.player_id == resolved_player_id)
        .order_by(desc(BeliefChange.created_at))
        .limit(6)
        .all()
    )
    recent_belief_updates = []
    for bc in recent_changes_raw:
        concept_lbl = (
            SKILL_LABELS.get(bc.concept)
            or HYPOTHESIS_LABELS.get(bc.concept)
            or bc.concept.replace("_", " ").title()
        )
        recent_belief_updates.append({
            "id": str(bc.id),
            "claim_type": bc.claim_type,
            "concept": bc.concept,
            "concept_label": concept_lbl,
            "old_value": bc.old_value,
            "new_value": bc.new_value,
            "reason": bc.reason,
            "created_at": bc.created_at.isoformat() if bc.created_at else None,
        })

    # 10. Last updated timestamp
    last_updated_candidates = [
        player.created_at,
    ]
    if latest_run and latest_run.ran_at:
        last_updated_candidates.append(latest_run.ran_at)
    for s in skills_list:
        if s["last_updated"]:
            pass
    for bc in recent_changes_raw:
        if bc.created_at:
            last_updated_candidates.append(bc.created_at)
    
    last_updated_ts = max(c for c in last_updated_candidates if c is not None)

    return {
        "player": {
            "id": str(player.id),
            "chesscom_username": player.chesscom_username,
            "estimated_rating": player.estimated_rating,
            "created_at": player.created_at.isoformat() if player.created_at else None,
        },
        "summary": {
            "sessions_played": sessions_played,
            "episodes_analyzed": episodes_analyzed,
            "last_updated": last_updated_ts.isoformat() if last_updated_ts else None,
        },
        "skills": skills_list,
        "hypotheses": hypotheses_list,
        "current_focus": {
            "concept": current_focus_concept,
            "label": current_focus_label,
            "rationale": current_focus_rationale,
            "stage": current_focus_stage,
            "board_preview": board_preview,
        },
        "why_asked": {
            "narrative": why_narrative,
            "evidence_citations": why_citations,
        },
        "recent_sessions": recent_sessions,
        "recent_belief_updates": recent_belief_updates,
    }
