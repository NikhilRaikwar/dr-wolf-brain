import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import func
import chess

from app.db import get_db
from app.models import Session, Player, Episode
from app.schemas import (
    SessionStartRequest,
    SessionStartResponse,
    MoveRequest,
    MoveResponse,
    PositionResponse,
    ReasoningAnswer,
    AnswerResponse,
    EpisodeResponse,
    SessionSummaryResponse,
)
from app.chess.stockfish import StockfishAdapter, EngineUnavailableError, eval_for_color
from app.chess.triggers import TriggerContext
from app.chess.governor import GovernorState, select_interruption
from app.chess.questions import get_question_for_trigger, QUESTION_BANK
from app.grading.grader import grade_committed_episode
from app.llm.client import LLMClient
from app.config import settings

router = APIRouter(prefix="/api/session", tags=["session"])
engine_adapter = StockfishAdapter(
    path=settings.STOCKFISH_PATH,
    depth_live=settings.ENGINE_DEPTH_LIVE,
    min_stockfish_elo=settings.STOCKFISH_MIN_ELO,
)
llm_client = LLMClient()


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
        interruptions_used=0,
        last_interruption_ply=None,
        last_trigger_type=None,
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
    """Fetch the canonical DB-backed board position and active interruption state."""
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

    # Check for active prompted episode
    active_prompted = (
        db.query(Episode)
        .filter(Episode.session_id == session_id, Episode.status == "prompted")
        .order_by(Episode.created_at.desc())
        .first()
    )

    interruption_payload = None
    if active_prompted:
        evidence = active_prompted.trigger_evidence or {}
        q_id = evidence.get("question_id")
        q_entry = QUESTION_BANK.get(q_id) if q_id else None
        if q_entry:
            interruption_payload = EpisodeResponse(
                episode_id=active_prompted.id,
                trigger_type=evidence.get("type", "opponent_threat"),
                question=evidence.get("question_asked", q_entry["question"]),
                options=[{"key": opt["key"], "label": opt["label"]} for opt in q_entry["options"]],
            )

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
        interruption=interruption_payload,
    )


@router.post("/{session_id}/interrupt/{episode_id}/answer", response_model=AnswerResponse)
def answer_interruption(
    session_id: uuid.UUID,
    episode_id: uuid.UUID,
    payload: ReasoningAnswer,
    db: DBSession = Depends(get_db),
):
    """Submit learner reasoning for a prompted Think First episode."""
    # Find the prompted episode
    episode = (
        db.query(Episode)
        .filter(Episode.id == episode_id, Episode.session_id == session_id)
        .first()
    )
    if not episode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Episode {episode_id} not found for session {session_id}",
        )

    if episode.status != "prompted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Episode {episode_id} cannot be answered because its status is '{episode.status}'",
        )

    # Server-side validation of question and options (client cannot spoof question)
    evidence = episode.trigger_evidence or {}
    q_id = evidence.get("question_id")
    q_entry = QUESTION_BANK.get(q_id) if q_id else None
    if not q_entry:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server question definition missing for this episode",
        )

    valid_choices = {opt["key"] for opt in q_entry.get("options", [])}
    if payload.choice not in valid_choices:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid choice '{payload.choice}'. Must be one of: {valid_choices}",
        )

    # Merge server-stored question definition with client answer
    learner_reasoning = {
        "question_id": q_id,
        "question_asked": evidence.get("question_asked", q_entry["question"]),
        "choice": payload.choice,
        "free_text": payload.free_text,
        "squares_highlighted": payload.squares_highlighted,
    }

    episode.learner_reasoning = learner_reasoning
    episode.status = "answered"
    db.commit()
    db.refresh(episode)

    return AnswerResponse(
        ok=True,
        episode_id=episode.id,
        status="answered",
    )


@router.post("/{session_id}/move", response_model=MoveResponse)
def make_move(
    session_id: uuid.UUID,
    payload: MoveRequest,
    db: DBSession = Depends(get_db),
):
    """Validate player move, commit answered episodes, generate engine reply, evaluate triggers, and persist state."""
    # Load session with write lock
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

    # 1. Reject move if there is an un-answered prompted interruption
    active_prompted = (
        db.query(Episode)
        .filter(Episode.session_id == session_id, Episode.status == "prompted")
        .first()
    )
    if active_prompted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A Think First interruption is active. Please submit your answer before playing a move.",
        )

    board = chess.Board(session.current_fen)
    if board.is_game_over():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game is already over",
        )

    # 2. Validate Player Move
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

    # 3. If there is an active 'answered' episode, commit the player's move to it
    answered_episode = (
        db.query(Episode)
        .filter(Episode.session_id == session_id, Episode.status == "answered")
        .order_by(Episode.created_at.desc())
        .first()
    )
    if answered_episode:
        answered_episode.learner_action = {"move_played": player_move.uci()}
        answered_episode.status = "committed"

    # 4. Apply Player Move
    board.push(player_move)
    moves = list(session.moves_uci) if isinstance(session.moves_uci, list) else []
    moves.append(player_move.uci())
    ply_count = session.ply_count + 1

    # Record eval before opponent move if engine available
    eval_before_opp_player_cp = None
    try:
        player_color = chess.WHITE if session.player_color == "white" else chess.BLACK
        pre_eval = engine_adapter.analyze(board.fen())
        eval_before_opp_player_cp = eval_for_color(pre_eval, player_color)
    except Exception:
        pass

    # 5. Check if player move ended the game
    game_over = board.is_game_over()
    engine_move_uci: Optional[str] = None

    # 6. Generate Training Engine response strictly via StockfishAdapter
    if not game_over:
        strength = engine_adapter.configure_limited(session.engine_elo)
        try:
            engine_move_uci = engine_adapter.choose_training_move(board.fen(), strength)
            if not engine_move_uci:
                raise EngineUnavailableError("Engine failed to choose a move.")

            engine_move = chess.Move.from_uci(engine_move_uci)
            if engine_move not in board.legal_moves:
                raise EngineUnavailableError(f"Engine suggested illegal move: {engine_move_uci}")

            board.push(engine_move)
            moves.append(engine_move.uci())
            ply_count += 1
        except EngineUnavailableError:
            # Roll back transaction
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Training engine is temporarily unavailable.",
            )

    # 7. Check final game status
    final_game_over = board.is_game_over()
    result = board.result() if final_game_over else None

    # 8. Trigger Detection & Governor Pipeline
    interruption_response: Optional[EpisodeResponse] = None
    if not final_game_over:
        player_color = chess.WHITE if session.player_color == "white" else chess.BLACK
        move_number = (ply_count // 2) + 1

        trigger_ctx = TriggerContext(
            player_color=player_color,
            eval_before_opponent_move_player_cp=eval_before_opp_player_cp,
            move_number=move_number,
            history=moves,
        )

        governor_state = GovernorState(
            interruptions_used=session.interruptions_used or 0,
            last_interruption_move=session.last_interruption_ply,
            last_trigger_type=session.last_trigger_type,
        )

        selected_trigger = select_interruption(
            board=board,
            engine=engine_adapter,
            ctx=trigger_ctx,
            governor_state=governor_state,
        )

        if selected_trigger:
            q_data = get_question_for_trigger(selected_trigger.type, shuffle_options=True)

            new_episode = Episode(
                session_id=session.id,
                player_id=session.player_id,
                move_number=move_number,
                fen=board.fen(),
                status="prompted",
                trigger_evidence={
                    "type": selected_trigger.type,
                    "target_concept": selected_trigger.target_concept,
                    "detected_by": "deterministic",
                    "question_id": q_data["question_id"],
                    "question_asked": q_data["question"],
                    "engine_facts": selected_trigger.engine_facts,
                },
                learner_reasoning=None,
                learner_action=None,
                engine_truth=None,
            )
            db.add(new_episode)

            # Update session governor state
            session.interruptions_used = (session.interruptions_used or 0) + 1
            session.last_interruption_ply = move_number
            session.last_trigger_type = selected_trigger.type

            db.flush()

            interruption_response = EpisodeResponse(
                episode_id=new_episode.id,
                trigger_type=selected_trigger.type,
                question=q_data["question"],
                options=q_data["options"],
            )

    # 9. Persist session state transactionally
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
        interruption=interruption_response,
    )


@router.get("/{session_id}/summary", response_model=SessionSummaryResponse)
def get_session_summary(
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
):
    """Grade all committed episodes in the session and return session summary data.
    Requires session to be completed (via natural chess game_over or explicit POST /finish).
    """
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    if session.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is still active. Finish the session before requesting summary.",
        )

    episodes = (
        db.query(Episode)
        .filter(Episode.session_id == session_id)
        .order_by(Episode.move_number.asc())
        .all()
    )

    # Grade any committed episodes
    has_graded = False
    for ep in episodes:
        if ep.status == "committed":
            try:
                r_outcome, m_outcome, cp_loss, engine_truth, grader_detail = grade_committed_episode(
                    episode=ep,
                    player_color_str=session.player_color,
                    engine=engine_adapter,
                    llm=llm_client,
                )
                ep.engine_truth = engine_truth
                ep.reasoning_outcome = r_outcome
                ep.move_outcome = m_outcome
                ep.move_quality_cp_loss = cp_loss
                ep.status = "graded"
                has_graded = True
            except EngineUnavailableError as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Training engine is temporarily unavailable.",
                ) from e
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to grade episode: {e}",
                ) from e

    if has_graded:
        db.commit()
        for ep in episodes:
            db.refresh(ep)

    # Compute summary stats across all graded episodes
    graded_episodes = [ep for ep in episodes if ep.status == "graded"]
    positions_faced = len(graded_episodes)
    recognized_count = sum(1 for ep in graded_episodes if ep.reasoning_outcome == "recognized")
    partial_count = sum(1 for ep in graded_episodes if ep.reasoning_outcome == "partial")
    missed_count = sum(1 for ep in graded_episodes if ep.reasoning_outcome == "missed")

    review_cards = []
    for ep in graded_episodes:
        lr = ep.learner_reasoning or {}
        la = ep.learner_action or {}
        et = ep.engine_truth or {}
        review_cards.append({
            "episode_id": str(ep.id),
            "move_number": ep.move_number,
            "your_thinking": lr.get("choice", ""),
            "your_move": la.get("move_played", ""),
            "reasoning_outcome": ep.reasoning_outcome,
            "move_outcome": ep.move_outcome,
            "key_idea": et.get("concept", ""),
            "best_move": et.get("best_move_san") or et.get("best_move", ""),
            "cp_loss": ep.move_quality_cp_loss,
            "engine_lines": et.get("pv", []),
        })

    takeaway = "Great work thinking before each critical move."
    if positions_faced > 0:
        if recognized_count == positions_faced:
            takeaway = "Exceptional tactical recognition throughout the session."
        elif missed_count > 0:
            takeaway = f"You recognized {recognized_count} of {positions_faced} tactical patterns. Review the key ideas below."

    return SessionSummaryResponse(
        session_id=session.id,
        stats={
            "positions_faced": positions_faced,
            "recognized": recognized_count,
            "partial": partial_count,
            "missed": missed_count,
            "duration_s": 0,
        },
        skill_updates=[],
        takeaway=takeaway,
        review_cards=review_cards,
    )


@router.post("/{session_id}/finish")
def finish_session(
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
):
    """Explicitly finish and close a chess session (idempotent), preventing further moves."""
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )
    if session.status == "active":
        session.status = "completed"
        session.ended_at = func.now()
        db.commit()
        db.refresh(session)
    return {"session_id": str(session.id), "status": session.status}


