import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import func
import chess

from app.db import get_db
from app.models import Session, Player
from app.schemas import (
    SessionStartRequest,
    SessionStartResponse,
    MoveRequest,
    MoveResponse,
    PositionResponse,
)
from app.chess.stockfish import StockfishAdapter
from app.config import settings

router = APIRouter(prefix="/api/session", tags=["session"])
engine_adapter = StockfishAdapter(
    path=settings.STOCKFISH_PATH,
    depth_live=settings.ENGINE_DEPTH_LIVE,
    min_stockfish_elo=settings.STOCKFISH_MIN_ELO,
)

@router.post("/start", response_model=SessionStartResponse)
def start_session(
    payload: Optional[SessionStartRequest] = None,
    db: DBSession = Depends(get_db),
):
    """Start a canonical server-authoritative chess session."""
    player_id = payload.player_id if payload else None

    player = None
    if player_id:
        player = db.query(Player).filter(Player.id == player_id).first()

    if not player:
        # Auto-create default player for demo / initial session
        player = Player(
            estimated_rating=settings.DEFAULT_RATING,
        )
        db.add(player)
        db.commit()
        db.refresh(player)

    requested_elo = player.estimated_rating + 100
    strength = engine_adapter.configure_limited(requested_elo)

    starting_fen = chess.STARTING_FEN

    session = Session(
        player_id=player.id,
        engine_elo=requested_elo,
        player_color="white",
        current_fen=starting_fen,
        moves_uci=[],
        ply_count=0,
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return SessionStartResponse(
        session_id=session.id,
        requested_engine_elo=strength["requested_elo"],
        effective_engine_elo=strength.get("effective_elo"),
        engine_mode=strength["mode"],
        color="white",
        fen=starting_fen,
    )


@router.get("/{session_id}/position", response_model=PositionResponse)
def get_session_position(
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
):
    """Fetch the canonical DB-backed board position and state."""
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    board = chess.Board(session.current_fen)
    game_over = board.is_game_over()
    game_result = board.result() if game_over else None

    moves_list = list(session.moves_uci) if isinstance(session.moves_uci, list) else []

    return PositionResponse(
        session_id=session.id,
        fen=session.current_fen,
        turn="white" if board.turn == chess.WHITE else "black",
        legal_moves=[m.uci() for m in board.legal_moves],
        moves_uci=moves_list,
        ply_count=session.ply_count,
        player_color=session.player_color,
        game_over=game_over,
        result=game_result,
        interruption=None,
    )


@router.post("/{session_id}/move", response_model=MoveResponse)
def make_move(
    session_id: uuid.UUID,
    payload: MoveRequest,
    db: DBSession = Depends(get_db),
):
    """Validate player move, apply canonical engine response, and persist state transactionally."""
    # Load session with write intent
    query = db.query(Session).filter(Session.id == session_id)
    if db.bind and hasattr(db.bind, "dialect") and db.bind.dialect.name == "postgresql":
        query = query.with_for_update()
    session = query.first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    if session.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session {session_id} is already {session.status}",
        )

    board = chess.Board(session.current_fen)
    if board.is_game_over():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game is already over",
        )

    # 1. Validate Player Move
    try:
        player_move = chess.Move.from_uci(payload.move_uci.strip())
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed move UCI: {payload.move_uci}",
        )

    if player_move not in board.legal_moves:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Illegal move {payload.move_uci} for current position",
        )

    # 2. Apply Player Move
    board.push(player_move)
    moves = list(session.moves_uci) if isinstance(session.moves_uci, list) else []
    moves.append(player_move.uci())
    ply_count = session.ply_count + 1

    # 3. Check if player move ended the game
    game_over = board.is_game_over()
    engine_move_uci: Optional[str] = None

    # 4. If game continues, generate Training Engine move
    if not game_over:
        strength = engine_adapter.configure_limited(session.engine_elo)
        engine_move_uci = engine_adapter.choose_training_move(board.fen(), strength)
        if engine_move_uci:
            try:
                engine_move = chess.Move.from_uci(engine_move_uci)
                if engine_move in board.legal_moves:
                    board.push(engine_move)
                    moves.append(engine_move.uci())
                    ply_count += 1
                else:
                    # Fallback to any legal move
                    first_legal = next(iter(board.legal_moves), None)
                    if first_legal:
                        board.push(first_legal)
                        engine_move_uci = first_legal.uci()
                        moves.append(engine_move_uci)
                        ply_count += 1
            except Exception:
                first_legal = next(iter(board.legal_moves), None)
                if first_legal:
                    board.push(first_legal)
                    engine_move_uci = first_legal.uci()
                    moves.append(engine_move_uci)
                    ply_count += 1

    # 5. Check final game status
    final_game_over = board.is_game_over()
    result = board.result() if final_game_over else None

    # 6. Persist session state transactionally
    session.current_fen = board.fen()
    session.moves_uci = moves
    session.ply_count = ply_count
    if final_game_over:
        session.status = "completed"
        session.ended_at = func.now()

    db.commit()
    db.refresh(session)

    return MoveResponse(
        player_move=player_move.uci(),
        engine_move=engine_move_uci,
        fen=board.fen(),
        game_over=final_game_over,
        result=result,
        interruption=None,
    )
