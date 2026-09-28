import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import func

from app.db import get_db
from app.models import Player
from app.schemas import PlayerCreateRequest, PlayerResponse
from app.config import settings

router = APIRouter(prefix="/api/player", tags=["player"])


@router.post("", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
def create_player(
    payload: Optional[PlayerCreateRequest] = None,
    db: DBSession = Depends(get_db),
):
    """
    Register a new player identity.
    Always generates a fresh unique Player row with a distinct UUID.
    Chess.com username is metadata / future import source, not an authentication identifier.
    """
    username = payload.chesscom_username.strip() if (payload and payload.chesscom_username) else None
    rating = payload.estimated_rating if (payload and payload.estimated_rating) else settings.DEFAULT_RATING

    new_player = Player(
        chesscom_username=username,
        estimated_rating=rating,
    )
    db.add(new_player)
    db.commit()
    db.refresh(new_player)

    return PlayerResponse(
        id=new_player.id,
        chesscom_username=new_player.chesscom_username,
        estimated_rating=new_player.estimated_rating,
        created_at=new_player.created_at.isoformat() if new_player.created_at else None,
    )


@router.get("/{player_id}", response_model=PlayerResponse)
def get_player(
    player_id: uuid.UUID,
    db: DBSession = Depends(get_db),
):
    """Retrieve real player record by ID."""
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    return PlayerResponse(
        id=player.id,
        chesscom_username=player.chesscom_username,
        estimated_rating=player.estimated_rating,
        created_at=player.created_at.isoformat() if player.created_at else None,
    )
