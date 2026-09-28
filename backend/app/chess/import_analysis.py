"""
Import Analysis Pipeline for Dr. Wolf Brain
Implements PRD §8 and BUILD_SPEC §1-8 historical game & PGN import.
Bounded Stockfish analysis, idempotent persistence, and epistemically valid evidence.
"""

import io
import re
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID

import chess
import chess.pgn
import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session as DBSession

from app.models import Player, Game, Position, EvidenceRecord, Skill
from app.chess.stockfish import StockfishAdapter, EngineUnavailableError, eval_for_color
from app.concepts import SKILL_CONCEPTS, HYPOTHESIS_CONCEPTS
from app.beliefs.updater import (
    ensure_initial_player_beliefs,
    write_evidence_record,
    update_skill,
)

logger = logging.getLogger(__name__)

# Max positions analyzed per imported game
MAX_POSITIONS_PER_GAME = 12
DEFAULT_IMPORT_STOCKFISH_DEPTH = 18
MAX_CHESSCOM_GAMES = 50
MIN_IMPORT_GAMES = 1
MAX_ARCHIVES_TO_FETCH = 12


class AttributionError(ValueError):
    """Raised when a PGN game cannot be deterministically attributed to a learner."""
    pass


PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 300,
    chess.BISHOP: 320,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000,
}


def sanitize_username(username: str) -> str:
    """Validate and sanitize Chess.com username."""
    cleaned = username.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    if len(cleaned) > 50:
        raise HTTPException(status_code=400, detail="Username is too long")
    if not re.match(r"^[a-zA-Z0-9_\-]+$", cleaned):
        raise HTTPException(
            status_code=400,
            detail="Username contains invalid characters (letters, numbers, underscore, hyphen only)",
        )
    return cleaned


def fetch_chesscom_monthly_games(
    username: str, max_games: int = 10, timeout_seconds: float = 12.0
) -> List[Dict[str, Any]]:
    """Fetch recent standard chess games from Chess.com public API.
    Bounded archive fetching (max 12 monthly archives) with proper User-Agent header.
    """
    clean_user = sanitize_username(username).lower()
    headers = {
        "User-Agent": "DrWolfBrain/1.0 (chess-coach-agent; contact@drwolfbrain.local)",
        "Accept": "application/json",
    }

    archives_url = f"https://api.chess.com/pub/player/{clean_user}/games/archives"

    try:
        with httpx.Client(timeout=timeout_seconds, headers=headers) as client:
            resp = client.get(archives_url)
            if resp.status_code == 404:
                raise HTTPException(
                    status_code=404,
                    detail=f"Chess.com user '{username}' was not found.",
                )
            if resp.status_code == 429:
                raise HTTPException(
                    status_code=429,
                    detail="Chess.com API rate limit reached. Please try again in a few moments.",
                )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Chess.com API returned unexpected status {resp.status_code}.",
                )

            data = resp.json()
            archives = data.get("archives", [])
            if not archives:
                return []

            collected_games: List[Dict[str, Any]] = []

            # Traverse archives in reverse chronological order (newest first), bounded by MAX_ARCHIVES_TO_FETCH
            recent_archives = list(reversed(archives))[:MAX_ARCHIVES_TO_FETCH]
            for archive_url in recent_archives:
                if len(collected_games) >= max_games:
                    break

                month_resp = client.get(archive_url)
                if month_resp.status_code != 200:
                    continue

                month_data = month_resp.json()
                month_games = month_data.get("games", [])

                # Reverse month games to get newest first
                for g in reversed(month_games):
                    if len(collected_games) >= max_games:
                        break
                    # Only standard chess games with PGN
                    if g.get("rules") == "chess" and g.get("pgn"):
                        collected_games.append(g)

            return collected_games

    except httpx.RequestError as exc:
        logger.error(f"Network error communicating with Chess.com: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"Network error communicating with Chess.com API: {str(exc)}",
        )


def parse_pgn_text(pgn_text: str, max_games: int = 30) -> List[chess.pgn.Game]:
    """Parse single or multi-game PGN string safely into python-chess Game objects."""
    if not pgn_text or not pgn_text.strip():
        raise HTTPException(status_code=400, detail="PGN content is empty")

    if len(pgn_text.encode("utf-8")) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PGN text exceeds 2MB limit")

    pgn_io = io.StringIO(pgn_text)
    games: List[chess.pgn.Game] = []

    while len(games) < max_games:
        try:
            g = chess.pgn.read_game(pgn_io)
            if g is None:
                break
            # Validate that the game has at least headers or moves
            if not g.headers and not list(g.mainline_moves()):
                continue
            games.append(g)
        except Exception as e:
            logger.warning(f"Error parsing PGN segment: {e}")
            break

    if not games:
        raise HTTPException(
            status_code=400,
            detail="Failed to parse valid chess game from the provided PGN.",
        )

    return games


def compute_pgn_external_ref(game: chess.pgn.Game) -> str:
    """Generate a canonical, formatting-invariant external_ref identifier for a PGN game.
    Uses canonical mainline UCI moves + normalized player identities.
    Whitespace, comments, NAGs, and annotations do not affect the signature.
    """
    site = game.headers.get("Site", "").strip()
    link = game.headers.get("Link", "").strip()
    if link and "/game/" in link:
        return link
    if site and site.startswith("http") and "/game/" in site:
        return site

    # Extract pure canonical UCI moves sequence (ignores comments, NAGs, variations)
    moves_str = " ".join(m.uci() for m in game.mainline_moves())
    white = game.headers.get("White", "").strip().lower()
    black = game.headers.get("Black", "").strip().lower()
    date = game.headers.get("Date", "").strip()
    raw_sig = f"{white}|{black}|{date}|{moves_str}"
    return f"pgn_{hashlib.sha256(raw_sig.encode('utf-8')).hexdigest()[:24]}"


def resolve_pgn_player_color(
    game: chess.pgn.Game,
    learner_name: Optional[str] = None,
    learner_color: Optional[str] = None,
    fallback_username: Optional[str] = None,
) -> chess.Color:
    """Deterministically resolve which board side belongs to the learner.

    Contract:
    1. If both learner_name and learner_color are provided:
       - Compare learner_name case-insensitively against White and Black headers.
       - Must agree with learner_color without conflict.
       - If learner_name matches White but learner_color != 'white' -> raise AttributionError conflict.
       - If learner_name matches Black but learner_color != 'black' -> raise AttributionError conflict.
       - If neither matches -> raise AttributionError conflict.
    2. If learner_name is provided (and learner_color omitted):
       - Compare case-insensitively against White and Black headers.
       - If both match -> raise AttributionError (ambiguous attribution).
       - If White matches -> return chess.WHITE.
       - If Black matches -> return chess.BLACK.
       - If neither matches -> raise AttributionError (unmatched learner name).
    3. If learner_name is not provided:
       - If learner_color is provided ('white' or 'black'), return that color.
       - If fallback_username is provided (e.g. Chess.com import flow), resolve using fallback_username.
       - Else -> raise AttributionError (missing attribution).
    """
    white_header = game.headers.get("White", "").strip()
    black_header = game.headers.get("Black", "").strip()

    target_name = (learner_name or "").strip().lower()
    target_color = (learner_color or "").strip().lower()

    if target_name and target_color:
        white_match = (white_header.lower() == target_name)
        black_match = (black_header.lower() == target_name)

        if white_match and black_match:
            raise AttributionError(
                f"Ambiguous attribution: learner_name '{learner_name}' matches both White and Black headers."
            )
        if white_match:
            if target_color not in ("white", "w"):
                raise AttributionError(
                    f"Attribution conflict: learner_name '{learner_name}' matches White ('{white_header}'), but learner_color is '{learner_color}'."
                )
            return chess.WHITE
        if black_match:
            if target_color not in ("black", "b"):
                raise AttributionError(
                    f"Attribution conflict: learner_name '{learner_name}' matches Black ('{black_header}'), but learner_color is '{learner_color}'."
                )
            return chess.BLACK

        raise AttributionError(
            f"Attribution conflict: learner_name '{learner_name}' matches neither White ('{white_header}') nor Black ('{black_header}') headers."
        )

    if target_name:
        white_match = (white_header.lower() == target_name)
        black_match = (black_header.lower() == target_name)

        if white_match and black_match:
            raise AttributionError(
                f"Ambiguous attribution: learner_name '{learner_name}' matches both White ('{white_header}') and Black ('{black_header}') headers."
            )
        if white_match:
            return chess.WHITE
        if black_match:
            return chess.BLACK

        raise AttributionError(
            f"Attribution error: learner_name '{learner_name}' matches neither White ('{white_header}') nor Black ('{black_header}') headers."
        )

    if target_color:
        if target_color in ("white", "w"):
            return chess.WHITE
        if target_color in ("black", "b"):
            return chess.BLACK

    if fallback_username:
        return resolve_pgn_player_color(game, learner_name=fallback_username)

    raise AttributionError(
        "Attribution error: PGN import requires 'learner_name' or 'learner_color' for deterministic learner-side attribution."
    )


def determine_player_color(
    game: chess.pgn.Game,
    known_username: Optional[str] = None,
    preferred_color: Optional[str] = None,
) -> chess.Color:
    """Deprecated alias for resolve_pgn_player_color with backward-compatible defaults."""
    try:
        return resolve_pgn_player_color(
            game=game,
            learner_name=known_username,
            learner_color=preferred_color,
        )
    except AttributionError:
        return chess.WHITE


def parse_played_at(game: chess.pgn.Game, fallback_ts: Optional[int] = None) -> datetime:
    """Parse game date into UTC datetime."""
    if fallback_ts:
        try:
            return datetime.fromtimestamp(fallback_ts, tz=timezone.utc)
        except Exception:
            pass

    date_str = game.headers.get("UTCDate") or game.headers.get("Date", "")
    time_str = game.headers.get("UTCTime") or game.headers.get("Time", "00:00:00")

    try:
        if date_str and "?" not in date_str:
            clean_date = date_str.replace(".", "-")
            clean_time = time_str.replace(".", ":")
            dt = datetime.fromisoformat(f"{clean_date}T{clean_time}")
            return dt.replace(tzinfo=timezone.utc)
    except Exception:
        pass

    return datetime.now(timezone.utc)


def _cheap_tactical_prefilter(
    board: chess.Board,
    move: chess.Move,
    player_color: chess.Color,
    move_number: int,
    prev_move: Optional[chess.Move],
) -> Tuple[int, Optional[str]]:
    """Fast, deterministic, zero-engine chess prefilter.
    Returns (priority, candidate_heuristic_concept).
    Priorities: 1 (highest urgency) to 5 (general sample).
    """
    opponent_color = not player_color

    # 1. Opponent check or capture on preceding move
    if prev_move and (board.is_check() or board.is_capture(prev_move)):
        return 1, "opponent_threat_detection"

    # 2. Player made check or capture or pawn promotion
    if board.gives_check(move) or board.is_capture(move) or move.promotion is not None:
        return 2, "calculation_depth"

    # 3. Hanging / exposed player piece check (pure board geometry)
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece and piece.color == player_color and piece.piece_type != chess.KING:
            attackers = board.attackers(opponent_color, sq)
            if attackers:
                defenders = board.attackers(player_color, sq)
                if not defenders:
                    return 2, "tactical_awareness"
                cheapest_def = min(PIECE_VALUES.get(board.piece_at(d).piece_type, 100) for d in defenders if board.piece_at(d))
                if cheapest_def > PIECE_VALUES.get(piece.piece_type, 100):
                    return 2, "tactical_awareness"

    # 4. King safety structural weakness
    king_sq = board.king(player_color)
    if king_sq is not None:
        kr = chess.square_rank(king_sq)
        kf = chess.square_file(king_sq)
        adjacent_files = [f for f in [kf - 1, kf, kf + 1] if 0 <= f <= 7]
        open_files = 0
        for f in adjacent_files:
            pawns = [
                board.piece_at(chess.square(f, r))
                for r in range(8)
                if board.piece_at(chess.square(f, r)) and board.piece_at(chess.square(f, r)).piece_type == chess.PAWN
            ]
            if not pawns:
                open_files += 1
        if open_files >= 1 and board.pieces(chess.QUEEN, opponent_color):
            return 3, "king_safety"

    # 5. Piece development in middlegame
    if move_number >= 15:
        return 4, "tactical_awareness"

    # 6. Periodic baseline sampling (moves 8, 12, 18, 24...)
    if move_number in (8, 12, 18, 24, 30, 36, 42, 48):
        return 5, "tactical_awareness"

    return 99, None


def classify_move_outcome(cp_loss: int) -> str:
    """Canonical frozen objective move bands.
    best: cp_loss <= 15
    acceptable: cp_loss <= 60
    inaccurate: cp_loss <= 150
    mistake: cp_loss > 150
    """
    if cp_loss <= 15:
        return "best"
    elif cp_loss <= 60:
        return "acceptable"
    elif cp_loss <= 150:
        return "inaccurate"
    else:
        return "mistake"


def evaluate_concept_observation(
    board: chess.Board,
    move: chess.Move,
    player_color: chess.Color,
    move_number: int,
    prev_move: Optional[chess.Move],
    best_move_uci: str,
    cp_loss: int,
    mate_white: Optional[int],
    mate_white_after: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Conservatively evaluate whether an imported position exhibits a concrete,
    defensible concept-specific observation for v1 importable skills.

    V1 Importable Skills:
    - tactical_awareness: Concrete hanging/tactical feature resolved or missed by interacting with the exact target.
    - opponent_threat_detection: Concrete check or mate threat parried or failed.
    - king_safety: Think-First-only in v1 (returns None).
    - calculation_depth: Think-First-only in v1 (returns None).
    - endgame_technique: Think-First-only in v1 (returns None).

    Returns Dict with {'concept', 'score', 'basis'} or None.
    """
    opponent_color = not player_color
    move_uci = move.uci()

    # 1. OPPONENT THREAT DETECTION PREDICATE
    has_check_threat = (prev_move is not None and board.is_check())
    has_mate_threat = (
        mate_white is not None
        and (
            (player_color == chess.WHITE and mate_white < 0 and mate_white >= -4)
            or (player_color == chess.BLACK and mate_white > 0 and mate_white <= 4)
        )
    )

    if has_check_threat:
        # Physical check was present. Any legal chess move resolves physical check.
        # Support if parried with reasonable quality (cp_loss <= 60).
        # DO NOT create contradiction from generic cp_loss after a legal check response.
        if cp_loss <= 60:
            return {
                "concept": "opponent_threat_detection",
                "score": 1.0,
                "basis": "parried_check",
            }
        return None

    if has_mate_threat:
        # Check if mate threat still exists after learner move
        threat_persists = (
            mate_white_after is not None
            and (
                (player_color == chess.WHITE and mate_white_after < 0 and mate_white_after >= -4)
                or (player_color == chess.BLACK and mate_white_after > 0 and mate_white_after <= 4)
            )
        )

        if not threat_persists and cp_loss <= 60:
            return {
                "concept": "opponent_threat_detection",
                "score": 1.0,
                "basis": "neutralized_mate_threat",
            }
        elif threat_persists and cp_loss > 150:
            return {
                "concept": "opponent_threat_detection",
                "score": 0.0,
                "basis": "failed_threat_parry",
            }
        return None

    # 2. TACTICAL AWARENESS PREDICATE
    # Collect all concrete hanging targets (attacked with 0 defenders or cheaper attacker)
    opp_hanging_targets: List[Dict[str, Any]] = []
    player_hanging_targets: List[Dict[str, Any]] = []

    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if not piece or piece.piece_type == chess.KING:
            continue
        p_val = PIECE_VALUES.get(piece.piece_type, 100)

        if piece.color == opponent_color:
            player_atts = board.attackers(player_color, sq)
            if player_atts:
                opp_defs = board.attackers(opponent_color, sq)
                if not opp_defs:
                    opp_hanging_targets.append({
                        "square": sq,
                        "piece_type": piece.piece_type,
                        "value": p_val,
                        "attackers": set(player_atts),
                    })
                else:
                    cheapest_att = min(
                        PIECE_VALUES.get(board.piece_at(a).piece_type, 100)
                        for a in player_atts
                        if board.piece_at(a)
                    )
                    cheapest_def = min(
                        PIECE_VALUES.get(board.piece_at(d).piece_type, 100)
                        for d in opp_defs
                        if board.piece_at(d)
                    )
                    if cheapest_att < p_val and cheapest_att < cheapest_def:
                        opp_hanging_targets.append({
                            "square": sq,
                            "piece_type": piece.piece_type,
                            "value": p_val,
                            "attackers": set(player_atts),
                        })

        elif piece.color == player_color:
            opp_atts = board.attackers(opponent_color, sq)
            if opp_atts:
                player_defs = board.attackers(player_color, sq)
                if not player_defs:
                    player_hanging_targets.append({
                        "square": sq,
                        "piece_type": piece.piece_type,
                        "value": p_val,
                        "attackers": set(opp_atts),
                        "defenders": set(),
                    })
                else:
                    cheapest_opp_att = min(
                        PIECE_VALUES.get(board.piece_at(a).piece_type, 100)
                        for a in opp_atts
                        if board.piece_at(a)
                    )
                    cheapest_player_def = min(
                        PIECE_VALUES.get(board.piece_at(d).piece_type, 100)
                        for d in player_defs
                        if board.piece_at(d)
                    )
                    if cheapest_player_def > p_val and cheapest_opp_att <= p_val:
                        player_hanging_targets.append({
                            "square": sq,
                            "piece_type": piece.piece_type,
                            "value": p_val,
                            "attackers": set(opp_atts),
                            "defenders": set(player_defs),
                        })

    # Sort targets by piece value descending
    opp_hanging_targets.sort(key=lambda t: t["value"], reverse=True)
    player_hanging_targets.sort(key=lambda t: t["value"], reverse=True)

    # Positive Support check:
    # A. Did learner capture an opponent hanging target?
    for opp_target in opp_hanging_targets:
        if move.to_square == opp_target["square"] and cp_loss <= 60:
            return {
                "concept": "tactical_awareness",
                "score": 1.0,
                "basis": "captured_hanging_piece",
            }

    # B. Did learner defend/resolve an own hanging target?
    board_after = board.copy(stack=False)
    board_after.push(move)

    if player_hanging_targets:
        for pl_target in player_hanging_targets:
            target_sq = pl_target["square"]
            is_moved_away = (move.from_square == target_sq)
            is_attacker_captured = (move.to_square in pl_target["attackers"])

            opp_atts_after = board_after.attackers(opponent_color, target_sq)
            is_attack_blocked = len(opp_atts_after) < len(pl_target["attackers"])

            player_defs_after = board_after.attackers(player_color, target_sq)
            is_new_defender_added = (
                len(player_defs_after) > len(pl_target["defenders"])
                if pl_target["defenders"]
                else len(player_defs_after) > 0
            )

            if (is_moved_away or is_attacker_captured or is_attack_blocked or is_new_defender_added) and cp_loss <= 60:
                return {
                    "concept": "tactical_awareness",
                    "score": 1.0,
                    "basis": "defended_hanging_piece",
                }

    # Negative Contradiction check:
    # Contradiction requires deterministic proof that the exact activated feature was failed/lost.
    # 1. For own hanging pieces: the exact piece was NOT resolved, remains hanging on board_after, and cp_loss > 150.
    if player_hanging_targets and cp_loss > 150:
        for pl_target in player_hanging_targets:
            target_sq = pl_target["square"]
            is_moved_away = (move.from_square == target_sq)
            is_attacker_captured = (move.to_square in pl_target["attackers"])
            opp_atts_after = board_after.attackers(opponent_color, target_sq)

            # If piece remains on target_sq and opponent still attacks it without sufficient defense:
            if not is_moved_away and not is_attacker_captured and len(opp_atts_after) > 0:
                return {
                    "concept": "tactical_awareness",
                    "score": 0.0,
                    "basis": "lost_hanging_piece",
                }

    # 2. For opponent hanging pieces: learner failed to exploit the target, the tactical opportunity
    # was objectively forfeited (e.g. learner moved attacking piece away / blocked own attack on board_after), and cp_loss > 150.
    if opp_hanging_targets and cp_loss > 150:
        for opp_target in opp_hanging_targets:
            target_sq = opp_target["square"]
            if move.to_square != target_sq:
                # Check if the player's attack on target_sq was forfeited/disappeared
                player_atts_after = board_after.attackers(player_color, target_sq)
                opportunity_forfeited = (len(player_atts_after) < len(opp_target["attackers"]))
                if opportunity_forfeited:
                    return {
                        "concept": "tactical_awareness",
                        "score": 0.0,
                        "basis": "missed_hanging_piece",
                    }

    # 3. KING SAFETY, CALCULATION DEPTH, ENDGAME TECHNIQUE:
    # Strictly Think-First-only in v1. No defensible PGN-only predicate without reasoning intent.
    return None


def select_candidate_positions_bounded(
    game: chess.pgn.Game,
    player_color: chess.Color,
    max_positions: int = MAX_POSITIONS_PER_GAME,
) -> List[Dict[str, Any]]:
    """Fast deterministic preselection of at most `max_positions` candidate decision positions.
    NO STOCKFISH ENGINE CALLS are made in this preselection phase.
    """
    board = game.board()
    moves = list(game.mainline_moves())
    if not moves:
        return []

    candidates: List[Dict[str, Any]] = []
    prev_move: Optional[chess.Move] = None

    for ply_idx, move in enumerate(moves):
        is_player_turn = (board.turn == player_color)
        move_number = (ply_idx // 2) + 1
        current_fen = board.fen()

        if is_player_turn:
            priority, heuristic_concept = _cheap_tactical_prefilter(
                board=board,
                move=move,
                player_color=player_color,
                move_number=move_number,
                prev_move=prev_move,
            )

            if priority <= 10:
                candidates.append({
                    "move_number": move_number,
                    "fen": current_fen,
                    "played_move": move.uci(),
                    "priority": priority,
                    "heuristic_concept": heuristic_concept or "tactical_awareness",
                    "prev_move_uci": prev_move.uci() if prev_move else None,
                })

        prev_move = move
        board.push(move)

    candidates.sort(key=lambda c: (c["priority"], c["move_number"]))
    selected = candidates[:max_positions]
    selected.sort(key=lambda c: c["move_number"])
    return selected


def analyze_candidate_positions(
    game: chess.pgn.Game,
    player_color: chess.Color,
    engine: StockfishAdapter,
    max_positions: int = MAX_POSITIONS_PER_GAME,
    depth: int = DEFAULT_IMPORT_STOCKFISH_DEPTH,
) -> List[Dict[str, Any]]:
    """Analyze preselected candidate positions with bounded Stockfish.
    Number of Stockfish calls is strictly bounded by 2 * max_positions (at most 24 calls per game).
    Computes canonical move_outcome ('best'|'acceptable'|'inaccurate'|'mistake') and concept_observation.
    DOES NOT emit reasoning outcomes (recognized/partial/missed).
    """
    selected_candidates = select_candidate_positions_bounded(
        game=game,
        player_color=player_color,
        max_positions=max_positions,
    )

    if not selected_candidates:
        return []

    analyzed_positions: List[Dict[str, Any]] = []

    for item in selected_candidates:
        fen = item["fen"]
        actual_move_uci = item["played_move"]
        heuristic_concept = item["heuristic_concept"]

        # Run Stockfish analysis at depth=18
        analysis = engine.analyze(fen, depth=depth, multipv=3)
        eval_white_cp = analysis["eval_white_cp"]
        mate_white = analysis["mate_white"]
        best_move_uci = analysis["best_move"]
        pv = analysis.get("pv", [])

        # Evaluate move actually played by learner
        after_analysis = engine.analyze_after(fen, actual_move_uci, depth=depth)
        eval_after_cp = after_analysis["eval_white_cp"] if after_analysis else 0
        mate_white_after = after_analysis["mate_white"] if after_analysis else None
        best_eval_player = eval_for_color(analysis, player_color)
        played_eval_player = eval_after_cp if player_color == chess.WHITE else -eval_after_cp
        cp_loss = max(0, best_eval_player - played_eval_player)

        # Canonical move outcome bands (move quality only)
        move_outcome = classify_move_outcome(cp_loss)

        # Evaluate concept-specific observable predicate
        board = chess.Board(fen)
        actual_move = chess.Move.from_uci(actual_move_uci)
        prev_move = (
            chess.Move.from_uci(item["prev_move_uci"])
            if item.get("prev_move_uci")
            else None
        )

        concept_obs = evaluate_concept_observation(
            board=board,
            move=actual_move,
            player_color=player_color,
            move_number=item["move_number"],
            prev_move=prev_move,
            best_move_uci=best_move_uci,
            cp_loss=cp_loss,
            mate_white=mate_white,
            mate_white_after=mate_white_after,
        )

        facts = {
            "threat": f"Move analyzed with {cp_loss}cp loss" if cp_loss > 0 else "Best continuation found",
            "cp_loss": cp_loss,
            "best_move": best_move_uci,
            "move_outcome": move_outcome,
        }

        engine_data = {
            "best_move": best_move_uci,
            "eval_white_cp": eval_white_cp,
            "mate_white": mate_white,
            "cp_loss": cp_loss,
            "move_outcome": move_outcome,
            "played_move": actual_move_uci,
            "concept_observation": concept_obs,
            "facts": facts,
            "pv": pv,
        }

        analyzed_positions.append({
            "move_number": item["move_number"],
            "fen": fen,
            "concept": concept_obs["concept"] if concept_obs else heuristic_concept,
            "engine": engine_data,
        })

    return analyzed_positions


def import_game_record(
    db: DBSession,
    player_id: UUID,
    source: str,
    external_ref: str,
    game: chess.pgn.Game,
    engine: StockfishAdapter,
    player_color: Optional[chess.Color] = None,
    played_at_override: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Import a single chess game transaction-safely, analyze candidate positions, and write evidence."""
    # 1. Idempotency Check: if game already imported for this player & source & external_ref, skip
    existing_game = (
        db.query(Game)
        .filter(
            Game.player_id == player_id,
            Game.source == source,
            Game.external_ref == external_ref,
        )
        .first()
    )
    if existing_game:
        return {
            "status": "skipped_existing",
            "game_id": existing_game.id,
            "positions_analyzed": 0,
            "evidence_created": 0,
            "seeded_hypotheses": [],
        }

    # 2. Player color & metadata
    color = player_color if player_color is not None else determine_player_color(game)
    result_str = game.headers.get("Result", "*")
    played_at = played_at_override or parse_played_at(game)

    # 3. Create Game row
    game_row = Game(
        player_id=player_id,
        source=source,
        external_ref=external_ref,
        played_at=played_at,
        result=result_str,
    )
    db.add(game_row)
    db.flush()

    # 4. Analyze candidate positions with bounded Stockfish
    analyzed = analyze_candidate_positions(
        game=game,
        player_color=color,
        engine=engine,
        max_positions=MAX_POSITIONS_PER_GAME,
        depth=DEFAULT_IMPORT_STOCKFISH_DEPTH,
    )

    positions_created = 0
    evidence_created = 0
    seeded_hypotheses: List[str] = []
    affected_skills: Dict[str, List[EvidenceRecord]] = {}

    ensure_initial_player_beliefs(db, player_id)

    # 5. Persist Position rows and generate evidence
    for pos_item in analyzed:
        pos_row = (
            db.query(Position)
            .filter(
                Position.game_id == game_row.id,
                Position.move_number == pos_item["move_number"],
                Position.fen == pos_item["fen"],
            )
            .first()
        )
        if not pos_row:
            pos_row = Position(
                game_id=game_row.id,
                player_id=player_id,
                move_number=pos_item["move_number"],
                fen=pos_item["fen"],
                concept=pos_item["concept"],
                engine=pos_item["engine"],
            )
            db.add(pos_row)
            db.flush()
            positions_created += 1

        concept_obs = pos_item["engine"].get("concept_observation")
        cp_loss = pos_item["engine"].get("cp_loss", 0)
        move_outcome = pos_item["engine"].get("move_outcome", "best")

        # Write Skill Evidence ONLY if a concrete concept observation exists
        if concept_obs is not None:
            concept = concept_obs["concept"]
            score = concept_obs["score"]
            skill_direction = "supports" if score >= 0.5 else "contradicts"
            rec, was_created = write_evidence_record(
                db=db,
                player_id=player_id,
                source_type="imported_position",
                source_id=pos_row.id,
                claim_type="skill",
                concept=concept,
                direction=skill_direction,
            )
            if was_created:
                evidence_created += 1
                affected_skills.setdefault(concept, []).append(rec)

        # Hypothesis Seeding Predicates (CONSERVATIVE, SEEDS-ONLY):
        # Do not infer private mental intent from ordinary mistakes.
        # Only seed when observable board refutation specifically warrants future testing.
        if move_outcome == "mistake" and cp_loss >= 150:
            hyp_target = None
            if concept_obs and concept_obs["concept"] == "tactical_awareness":
                hyp_target = "misses_defensive_resources"
            elif pos_item["concept"] == "calculation_depth":
                hyp_target = "stops_calculating_early"

            if hyp_target and hyp_target in HYPOTHESIS_CONCEPTS:
                _, hyp_created = write_evidence_record(
                    db=db,
                    player_id=player_id,
                    source_type="imported_position",
                    source_id=pos_row.id,
                    claim_type="hypothesis",
                    concept=hyp_target,
                    direction="seeds",
                )
                if hyp_created:
                    evidence_created += 1
                    if hyp_target not in seeded_hypotheses:
                        seeded_hypotheses.append(hyp_target)

    # 6. Update skills using newly added imported evidence records
    for skill_concept, recs in affected_skills.items():
        skill_row = (
            db.query(Skill)
            .filter(Skill.player_id == player_id, Skill.concept == skill_concept)
            .first()
        )
        if skill_row:
            update_skill(skill_row, recs, db)

    db.flush()

    return {
        "status": "imported",
        "game_id": game_row.id,
        "positions_analyzed": positions_created,
        "evidence_created": evidence_created,
        "seeded_hypotheses": seeded_hypotheses,
    }
