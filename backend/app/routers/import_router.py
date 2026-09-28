import uuid
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File, Form
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.models import Player
from app.schemas import ChesscomImportRequest, PGNImportRequest, ImportJobResponse, ImportFailureItem
from app.config import settings
from app.chess.stockfish import StockfishAdapter, EngineUnavailableError
from app.chess.import_analysis import (
    fetch_chesscom_monthly_games,
    parse_pgn_text,
    compute_pgn_external_ref,
    resolve_pgn_player_color,
    AttributionError,
    import_game_record,
    MAX_CHESSCOM_GAMES,
    MIN_IMPORT_GAMES,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/import", tags=["import"])

engine_adapter = StockfishAdapter(
    path=settings.STOCKFISH_PATH,
    depth_import=settings.ENGINE_DEPTH_IMPORT,
    depth_live=settings.ENGINE_DEPTH_LIVE,
    min_stockfish_elo=settings.STOCKFISH_MIN_ELO,
)


@router.post("/chesscom", response_model=ImportJobResponse)
def import_chesscom_games(
    req: ChesscomImportRequest,
    db: DBSession = Depends(get_db),
) -> Dict[str, Any]:
    """Import recent historical games for a player from Chess.com public API."""
    # 1. Verify Player
    player = db.query(Player).filter(Player.id == req.player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # 2. Check Stockfish availability
    if not engine_adapter._binary_available:
        raise HTTPException(
            status_code=503,
            detail="Stockfish chess engine is unavailable for game analysis.",
        )

    # 3. Fetch recent games from Chess.com
    bounded_max = max(MIN_IMPORT_GAMES, min(req.max_games, MAX_CHESSCOM_GAMES))
    fetched_games = fetch_chesscom_monthly_games(req.username, max_games=bounded_max)

    games_found = len(fetched_games)
    games_imported = 0
    games_skipped = 0
    games_failed = 0
    positions_analyzed_total = 0
    evidence_created_total = 0
    all_seeded_hypotheses: List[str] = []
    failures: List[ImportFailureItem] = []

    # 4. Parse and import each game with Option B (per-game savepoint atomicity + factual partial success)
    for raw_game in fetched_games:
        pgn_str = raw_game.get("pgn", "")
        raw_url = raw_game.get("url") or "unknown_chesscom_game"

        if not pgn_str:
            games_failed += 1
            failures.append(ImportFailureItem(game_identifier=raw_url, reason="Game missing PGN data"))
            continue

        try:
            parsed_games = parse_pgn_text(pgn_str, max_games=1)
            if not parsed_games:
                games_failed += 1
                failures.append(ImportFailureItem(game_identifier=raw_url, reason="No parseable chess game in PGN"))
                continue
            game_obj = parsed_games[0]
        except Exception as e:
            logger.warning(f"Skipping malformed PGN from Chess.com: {e}")
            games_failed += 1
            failures.append(ImportFailureItem(game_identifier=raw_url, reason=f"Malformed PGN: {str(e)}"))
            continue

        external_ref = raw_game.get("url") or compute_pgn_external_ref(game_obj)

        savepoint = db.begin_nested()
        try:
            player_color = resolve_pgn_player_color(game_obj, learner_name=req.username)
            res = import_game_record(
                db=db,
                player_id=player.id,
                source="chesscom",
                external_ref=external_ref,
                game=game_obj,
                engine=engine_adapter,
                player_color=player_color,
                played_at_override=None,
            )
            savepoint.commit()

            if res["status"] == "skipped_existing":
                games_skipped += 1
            else:
                games_imported += 1
                positions_analyzed_total += res["positions_analyzed"]
                evidence_created_total += res["evidence_created"]
                for hyp in res["seeded_hypotheses"]:
                    if hyp not in all_seeded_hypotheses:
                        all_seeded_hypotheses.append(hyp)

        except AttributionError as exc:
            savepoint.rollback()
            games_failed += 1
            failures.append(ImportFailureItem(game_identifier=external_ref, reason=str(exc)))
        except EngineUnavailableError as exc:
            savepoint.rollback()
            games_failed += 1
            failures.append(ImportFailureItem(game_identifier=external_ref, reason=f"Engine analysis failed: {str(exc)}"))
        except Exception as exc:
            logger.error(f"Error importing Chess.com game {external_ref}: {exc}")
            savepoint.rollback()
            games_failed += 1
            failures.append(ImportFailureItem(game_identifier=external_ref, reason=f"Import failed: {str(exc)}"))

    db.commit()

    return {
        "player_id": player.id,
        "source": "chesscom",
        "games_found": games_found,
        "games_imported": games_imported,
        "games_skipped_existing": games_skipped,
        "games_failed": games_failed,
        "positions_analyzed": positions_analyzed_total,
        "evidence_records_created": evidence_created_total,
        "seeded_hypotheses": all_seeded_hypotheses,
        "failures": [f.model_dump() for f in failures],
    }


@router.post("/pgn", response_model=ImportJobResponse)
def import_pgn_games(
    req: PGNImportRequest,
    db: DBSession = Depends(get_db),
) -> Dict[str, Any]:
    """Import and analyze one or more chess games from a PGN text string."""
    # 1. Verify Player
    player = db.query(Player).filter(Player.id == req.player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # 2. Check Stockfish availability
    if not engine_adapter._binary_available:
        raise HTTPException(
            status_code=503,
            detail="Stockfish chess engine is unavailable for game analysis.",
        )

    # 3. Parse PGN
    bounded_max = max(MIN_IMPORT_GAMES, min(req.max_games, MAX_CHESSCOM_GAMES))
    parsed_games = parse_pgn_text(req.pgn, max_games=bounded_max)
    total_games = len(parsed_games)

    # Multi-game contract: learner_name is REQUIRED, learner_color is FORBIDDEN
    if total_games > 1:
        if req.learner_color is not None:
            raise HTTPException(
                status_code=400,
                detail="Multi-game PGN import requires 'learner_name'. 'learner_color' cannot be used because colors may alternate across games.",
            )
        if not req.learner_name or not req.learner_name.strip():
            raise HTTPException(
                status_code=400,
                detail="Multi-game PGN import requires 'learner_name' to attribute games deterministically.",
            )

    # Single-game contract: require learner_name or learner_color, and validate agreement if both supplied
    if total_games == 1:
        if not req.learner_name and not req.learner_color:
            raise HTTPException(
                status_code=400,
                detail="PGN import requires 'learner_name' or 'learner_color' for learner-side attribution.",
            )
        if req.learner_name and req.learner_color:
            g = parsed_games[0]
            try:
                resolve_pgn_player_color(
                    game=g,
                    learner_name=req.learner_name,
                    learner_color=req.learner_color,
                )
            except AttributionError as e:
                raise HTTPException(
                    status_code=400,
                    detail=str(e),
                )

    games_found = len(parsed_games)
    games_imported = 0
    games_skipped = 0
    games_failed = 0
    positions_analyzed_total = 0
    evidence_created_total = 0
    all_seeded_hypotheses: List[str] = []
    failures: List[ImportFailureItem] = []

    # 4. Import and analyze each game with Option B (per-game savepoint atomicity + factual partial success)
    for game_obj in parsed_games:
        external_ref = compute_pgn_external_ref(game_obj)

        savepoint = db.begin_nested()
        try:
            player_color = resolve_pgn_player_color(
                game=game_obj,
                learner_name=req.learner_name,
                learner_color=req.learner_color,
            )
            res = import_game_record(
                db=db,
                player_id=player.id,
                source="pgn",
                external_ref=external_ref,
                game=game_obj,
                engine=engine_adapter,
                player_color=player_color,
            )
            savepoint.commit()

            if res["status"] == "skipped_existing":
                games_skipped += 1
            else:
                games_imported += 1
                positions_analyzed_total += res["positions_analyzed"]
                evidence_created_total += res["evidence_created"]
                for hyp in res["seeded_hypotheses"]:
                    if hyp not in all_seeded_hypotheses:
                        all_seeded_hypotheses.append(hyp)

        except AttributionError as exc:
            savepoint.rollback()
            games_failed += 1
            failures.append(ImportFailureItem(game_identifier=external_ref, reason=str(exc)))
        except EngineUnavailableError as exc:
            savepoint.rollback()
            games_failed += 1
            failures.append(ImportFailureItem(game_identifier=external_ref, reason=f"Engine analysis failed: {str(exc)}"))
        except Exception as exc:
            logger.error(f"Error importing PGN game {external_ref}: {exc}")
            savepoint.rollback()
            games_failed += 1
            failures.append(ImportFailureItem(game_identifier=external_ref, reason=f"Import failed: {str(exc)}"))

    db.commit()

    return {
        "player_id": player.id,
        "source": "pgn",
        "games_found": games_found,
        "games_imported": games_imported,
        "games_skipped_existing": games_skipped,
        "games_failed": games_failed,
        "positions_analyzed": positions_analyzed_total,
        "evidence_records_created": evidence_created_total,
        "seeded_hypotheses": all_seeded_hypotheses,
        "failures": [f.model_dump() for f in failures],
    }
