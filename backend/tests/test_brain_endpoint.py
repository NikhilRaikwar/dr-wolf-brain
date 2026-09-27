import pytest
import uuid
from app.models import Player, Skill, Hypothesis, BeliefChange, Session, Episode, EvidenceRecord, DreamCycleRun

def test_brain_endpoint_empty_db(client):
    """Test /api/brain returns valid shape on fresh/empty DB without throwing errors."""
    res = client.get("/api/brain")
    assert res.status_code == 200
    data = res.json()
    assert "player" in data
    assert "summary" in data
    assert "skills" in data
    assert "hypotheses" in data
    assert "current_focus" in data
    assert "why_asked" in data
    assert "recent_sessions" in data
    assert "recent_belief_updates" in data
    
    # 5 canonical skills must be present
    assert len(data["skills"]) == 5
    assert all(s["mastery_score"] is None for s in data["skills"])
    
    # 3 canonical hypotheses must be present
    assert len(data["hypotheses"]) == 3
    assert all(h["consumer_state"] in ("Needs evidence", "Developing", "Well-supported") for h in data["hypotheses"])


def test_brain_endpoint_with_populated_data(client, db_session):
    """Test /api/brain aggregates skills, hypotheses, belief changes, and Dream Cycle facts."""
    player = Player(estimated_rating=1150)
    db_session.add(player)
    db_session.commit()

    # Add skill
    skill = Skill(
        player_id=player.id,
        concept="opponent_threat_detection",
        mastery_score=62.5,
        evidence_count=5,
        trend="improving",
    )
    db_session.add(skill)

    # Add hypothesis
    hyp = Hypothesis(
        player_id=player.id,
        concept="tunnel_vision_after_attack",
        description="Tends to stop scanning for counterplay after finding an attacking move.",
        confidence=0.75,
        state="developing",
        observed_count=4,
        trend="improving",
    )
    db_session.add(hyp)

    # Add belief change
    bc = BeliefChange(
        player_id=player.id,
        claim_type="skill",
        concept="opponent_threat_detection",
        old_value={"mastery": 55.0},
        new_value={"mastery": 62.5},
        reason="Recognized counterplay in 3 consecutive episodes",
    )
    db_session.add(bc)

    # Add session and episode
    sess = Session(
        player_id=player.id,
        engine_elo=900,
        player_color="white",
        status="completed",
    )
    db_session.add(sess)
    db_session.commit()

    ep = Episode(
        session_id=sess.id,
        player_id=player.id,
        move_number=14,
        fen="r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5",
        status="graded",
        trigger_evidence={"type": "opponent_threat", "concept": "opponent_threat_detection"},
        reasoning_outcome="recognized",
        move_outcome="best",
    )
    db_session.add(ep)

    # Add DreamCycleRun
    dc_run = DreamCycleRun(
        session_id=sess.id,
        status="complete",
        result_json={
            "graded_episode_count": 1,
            "next_focus": "opponent_threat_detection",
            "reasoning_counts": {"recognized": 1, "partial": 0, "missed": 0},
            "move_counts": {"best": 1, "acceptable": 0, "inaccurate": 0, "mistake": 0},
        },
        language_json={
            "session_summary": "Solid focus on defending tactical threats.",
            "key_takeaway": "You spotted the knight jump early and secured your center.",
            "next_focus_phrase": "Continue reinforcing opponent threat detection under attack.",
        },
    )
    db_session.add(dc_run)
    db_session.commit()

    res = client.get(f"/api/brain?player_id={player.id}")
    assert res.status_code == 200
    data = res.json()

    assert data["player"]["estimated_rating"] == 1150
    assert data["summary"]["sessions_played"] == 1
    assert data["summary"]["episodes_analyzed"] == 1

    # Check skill
    threat_skill = next(s for s in data["skills"] if s["concept"] == "opponent_threat_detection")
    assert threat_skill["mastery_score"] == 62.5
    assert threat_skill["evidence_count"] == 5

    # Check hypothesis
    tv_hyp = next(h for h in data["hypotheses"] if h["concept"] == "tunnel_vision_after_attack")
    assert tv_hyp["consumer_state"] == "Developing"
    assert tv_hyp["observed_count"] == 4

    # Check current focus
    assert data["current_focus"]["concept"] == "opponent_threat_detection"
    assert "opponent threat detection" in data["current_focus"]["rationale"].lower()
    assert data["current_focus"]["board_preview"]["fen"] == ep.fen

    # Check why asked citations
    assert len(data["why_asked"]["evidence_citations"]) == 1
    assert data["why_asked"]["evidence_citations"][0]["move_number"] == 14

    # Check recent belief updates
    assert len(data["recent_belief_updates"]) == 1
    assert data["recent_belief_updates"][0]["concept"] == "opponent_threat_detection"
