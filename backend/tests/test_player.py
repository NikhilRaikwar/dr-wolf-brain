import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_create_anonymous_player(client):
    response = client.post("/api/player", json={})
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["estimated_rating"] == 800
    assert data["chesscom_username"] is None


def test_duplicate_username_creates_distinct_player(client):
    username = "test_player_grandmaster"
    response_a = client.post("/api/player", json={"chesscom_username": username, "estimated_rating": 1400})
    assert response_a.status_code == 201
    player_a_id = response_a.json()["id"]
    assert response_a.json()["chesscom_username"] == username
    assert response_a.json()["estimated_rating"] == 1400

    # Second creation with same username must generate distinct Player UUID (no auth conflation)
    response_b = client.post("/api/player", json={"chesscom_username": username, "estimated_rating": 1200})
    assert response_b.status_code == 201
    player_b_id = response_b.json()["id"]
    assert player_b_id != player_a_id
    assert response_b.json()["chesscom_username"] == username

    # Get players by ID independently
    get_a = client.get(f"/api/player/{player_a_id}")
    assert get_a.status_code == 200
    assert get_a.json()["id"] == player_a_id
    assert get_a.json()["estimated_rating"] == 1400

    get_b = client.get(f"/api/player/{player_b_id}")
    assert get_b.status_code == 200
    assert get_b.json()["id"] == player_b_id
    assert get_b.json()["estimated_rating"] == 1200


def test_two_player_data_isolation_and_brain_empty_state(client):
    """
    Create two players:
    Player A: starts session, creates evidence, runs Dream Cycle.
    Player B: fresh player with no sessions.

    Verify:
    GET /api/brain?player_id=A -> Returns A's real session & evidence
    GET /api/brain?player_id=B -> Returns clean empty state (0 sessions, 0 episodes, null mastery, no fake citations)
    No cross-player contamination.
    """
    from unittest.mock import patch
    from app.routers.session import engine_adapter

    # 1. Create Player A & Player B
    res_a = client.post("/api/player", json={"chesscom_username": "player_alpha", "estimated_rating": 1200})
    assert res_a.status_code == 201
    player_a_id = res_a.json()["id"]

    res_b = client.post("/api/player", json={"chesscom_username": "player_beta", "estimated_rating": 800})
    assert res_b.status_code == 201
    player_b_id = res_b.json()["id"]

    # 2. Player A starts session, plays move, and finishes
    start_res = client.post("/api/session/start", json={"player_id": player_a_id})
    assert start_res.status_code == 200
    session_id = start_res.json()["session_id"]

    with patch.object(engine_adapter, "choose_training_move", return_value="e7e5"):
        client.post(f"/api/session/{session_id}/move", json={"move_uci": "e2e4"})

    # Player A finishes session, requests summary & runs dream cycle
    finish_res = client.post(f"/api/session/{session_id}/finish")
    assert finish_res.status_code == 200
    client.get(f"/api/session/{session_id}/summary")
    client.post("/api/dream-cycle", json={"session_id": session_id})

    # 3. Query Brain for Player A
    brain_a = client.get(f"/api/brain?player_id={player_a_id}")
    assert brain_a.status_code == 200
    data_a = brain_a.json()
    assert data_a["player"]["id"] == player_a_id
    assert data_a["summary"]["sessions_played"] == 1

    # 4. Query Brain for Player B (must be clean empty state)
    brain_b = client.get(f"/api/brain?player_id={player_b_id}")
    assert brain_b.status_code == 200
    data_b = brain_b.json()
    assert data_b["player"]["id"] == player_b_id
    assert data_b["summary"]["sessions_played"] == 0
    assert data_b["summary"]["episodes_analyzed"] == 0
    assert len(data_b["recent_sessions"]) == 0
    assert len(data_b["why_asked"]["evidence_citations"]) == 0
    assert data_b["current_focus"]["board_preview"] is None
    # All skill mastery scores must be None (no evidence)
    for skill in data_b["skills"]:
        assert skill["mastery_score"] is None
        assert skill["evidence_count"] == 0

