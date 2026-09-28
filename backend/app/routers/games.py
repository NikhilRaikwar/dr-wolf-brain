import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import desc

from app.db import get_db
from app.models import Player, Game, Position

router = APIRouter(prefix="/api/games", tags=["games"])


@router.get("")
def list_player_games(
    player_id: Optional[uuid.UUID] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: DBSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    """List imported games for a player with analyzed position count and metadata."""
    if not player_id:
        return []

    games_raw = (
        db.query(Game)
        .filter(Game.player_id == player_id)
        .order_by(desc(Game.played_at), desc(Game.created_at))
        .limit(limit)
        .all()
    )

    results = []
    for g in games_raw:
        positions_count = (
            db.query(Position).filter(Position.game_id == g.id).count()
        )
        # Sample position to get opponent/opening if stored in engine dict
        sample_pos = (
            db.query(Position).filter(Position.game_id == g.id).first()
        )
        sample_engine = sample_pos.engine if sample_pos else {}
        opponent = sample_engine.get("opponent", "Opponent")
        opening = sample_engine.get("opening", "Standard Chess")
        player_color = sample_engine.get("player_color", "white")

        results.append({
            "id": str(g.id),
            "player_id": str(g.player_id),
            "source": g.source,
            "external_ref": g.external_ref,
            "played_at": g.played_at.isoformat() if g.played_at else None,
            "result": g.result,
            "opponent": opponent,
            "opening": opening,
            "player_color": player_color,
            "positions_analyzed_count": positions_count,
            "created_at": g.created_at.isoformat() if g.created_at else None,
        })

    return results


@router.get("/{game_id}")
def get_game_detail(
    game_id: uuid.UUID,
    player_id: Optional[uuid.UUID] = Query(None),
    db: DBSession = Depends(get_db),
) -> Dict[str, Any]:
    """Get full details of an imported game including all key analyzed positions.
    Enforces ownership isolation: if player_id is provided, returns 404 if game belongs to another player.
    """
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if player_id and game.player_id != player_id:
        raise HTTPException(status_code=404, detail="Game not found")

    positions = (
        db.query(Position)
        .filter(Position.game_id == game.id)
        .order_by(Position.move_number.asc())
        .all()
    )

    pos_list = []
    for p in positions:
        pos_list.append({
            "id": str(p.id),
            "move_number": p.move_number,
            "fen": p.fen,
            "concept": p.concept,
            "engine": p.engine,
            "observed_at": p.observed_at.isoformat() if p.observed_at else None,
        })

    return {
        "id": str(game.id),
        "player_id": str(game.player_id),
        "source": game.source,
        "external_ref": game.external_ref,
        "played_at": game.played_at.isoformat() if game.played_at else None,
        "result": game.result,
        "created_at": game.created_at.isoformat() if game.created_at else None,
        "positions": pos_list,
    }
