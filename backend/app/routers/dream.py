from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.schemas import DreamCycleRequest, DreamCycleResult
from app.dream.cycle import run_dream_cycle

router = APIRouter(prefix="/api/dream-cycle", tags=["dream-cycle"])


@router.post("", response_model=DreamCycleResult)
def trigger_dream_cycle(
    payload: DreamCycleRequest,
    db: DBSession = Depends(get_db),
):
    """Trigger server-authoritative Dream Cycle belief consolidation for a session."""
    return run_dream_cycle(db=db, session_id=payload.session_id)
