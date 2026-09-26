import os
import shutil
import logging
from typing import TypedDict, Literal, Optional, List, Dict, Any
import chess
import chess.engine

logger = logging.getLogger(__name__)

class EvalResult(TypedDict):
    best_move: str          # uci
    best_move_san: str
    eval_white_cp: int      # ALWAYS from White's perspective; mate mapped to +/-100000
    mate_white: Optional[int]  # signed plies to mate from White's perspective
    pv: List[str]
    top_moves: List[Dict[str, Any]]   # multipv: [{move, eval_white_cp}]

class EngineStrength(TypedDict):
    requested_elo: int
    effective_elo: Optional[int]
    mode: Literal["uci_elo", "skill_floor", "custom_beginner"]


def eval_for_color(result: EvalResult, color: chess.Color) -> int:
    """Normalize evaluation to the perspective of the specified color.
    Always input a fixed White-perspective evaluation.
    """
    return result["eval_white_cp"] if color == chess.WHITE else -result["eval_white_cp"]


class StockfishAdapter:
    def __init__(
        self,
        path: Optional[str] = None,
        depth_import: int = 18,
        depth_live: int = 14,
        min_stockfish_elo: int = 1320,
    ):
        self.path = path or os.environ.get("STOCKFISH_PATH", "stockfish")
        self.depth_import = depth_import
        self.depth_live = depth_live
        self._min_stockfish_elo = min_stockfish_elo
        self._binary_available = self._check_binary()

    def _check_binary(self) -> bool:
        if not self.path:
            return False
        # Check absolute/relative path or in PATH
        if os.path.exists(self.path):
            return True
        return shutil.which(self.path) is not None

    def min_supported_elo(self) -> int:
        return self._min_stockfish_elo

    def configure_limited(self, requested_elo: int) -> EngineStrength:
        """Query engine Elo floor and determine honest operational mode."""
        if requested_elo >= self._min_stockfish_elo:
            return EngineStrength(
                requested_elo=requested_elo,
                effective_elo=requested_elo,
                mode="uci_elo",
            )
        elif requested_elo >= 1000:
            return EngineStrength(
                requested_elo=requested_elo,
                effective_elo=None,
                mode="skill_floor",
            )
        else:
            return EngineStrength(
                requested_elo=requested_elo,
                effective_elo=None,
                mode="custom_beginner",
            )

    def analyze(self, fen: str, depth: Optional[int] = None, multipv: int = 1) -> EvalResult:
        """Perform evaluation and return fixed White-perspective evaluation."""
        d = depth or self.depth_live
        board = chess.Board(fen)

        if board.is_game_over():
            if board.is_checkmate():
                # White won if turn is Black, else Black won
                white_won = (board.turn == chess.BLACK)
                return EvalResult(
                    best_move="",
                    best_move_san="",
                    eval_white_cp=100000 if white_won else -100000,
                    mate_white=0 if white_won else -0,
                    pv=[],
                    top_moves=[],
                )
            else:
                return EvalResult(
                    best_move="",
                    best_move_san="",
                    eval_white_cp=0,
                    mate_white=None,
                    pv=[],
                    top_moves=[],
                )

        if self._binary_available:
            try:
                with chess.engine.SimpleEngine.popen_uci(self.path) as engine:
                    info = engine.analyse(board, chess.engine.Limit(depth=d), multipv=multipv)
                    if isinstance(info, list):
                        primary = info[0]
                        all_infos = info
                    else:
                        primary = info
                        all_infos = [info]

                    score = primary.get("score")
                    pv_moves = primary.get("pv", [])
                    best_move_uci = pv_moves[0].uci() if pv_moves else ""
                    best_move_san = board.san(pv_moves[0]) if pv_moves else ""

                    eval_white_cp = 0
                    mate_white = None
                    if score:
                        # Extract score relative to white
                        white_score = score.white()
                        if white_score.is_mate():
                            mate_white = white_score.mate()
                            eval_white_cp = 100000 if mate_white > 0 else -100000
                        else:
                            eval_white_cp = white_score.score(mate_score=100000) or 0

                    top_moves = []
                    for item in all_infos:
                        item_pv = item.get("pv", [])
                        item_score = item.get("score")
                        item_eval_cp = 0
                        if item_score:
                            w_score = item_score.white()
                            if w_score.is_mate():
                                item_eval_cp = 100000 if (w_score.mate() or 0) > 0 else -100000
                            else:
                                item_eval_cp = w_score.score(mate_score=100000) or 0
                        if item_pv:
                            top_moves.append({
                                "move": item_pv[0].uci(),
                                "eval_white_cp": item_eval_cp,
                            })

                    return EvalResult(
                        best_move=best_move_uci,
                        best_move_san=best_move_san,
                        eval_white_cp=eval_white_cp,
                        mate_white=mate_white,
                        pv=[m.uci() for m in pv_moves],
                        top_moves=top_moves,
                    )
            except Exception as e:
                logger.warning(f"Stockfish engine invocation failed: {e}. Using fallback evaluator.")

        # Fallback heuristic engine if binary not installed or failed
        return self._heuristic_analyze(board)

    def eval_after(self, fen: str, move_uci: str, depth: Optional[int] = None) -> int:
        """Return fixed White-relative centipawn evaluation after applying move_uci."""
        board = chess.Board(fen)
        move = chess.Move.from_uci(move_uci)
        if move in board.legal_moves:
            board.push(move)
            res = self.analyze(board.fen(), depth=depth)
            return res["eval_white_cp"]
        return 0

    def choose_training_move(self, fen: str, strength: EngineStrength) -> str:
        """Choose engine response move adhering to requested strength mode."""
        board = chess.Board(fen)
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            return ""

        if self._binary_available:
            try:
                with chess.engine.SimpleEngine.popen_uci(self.path) as engine:
                    if strength["mode"] == "uci_elo" and strength.get("effective_elo"):
                        engine.configure({
                            "UCI_LimitStrength": True,
                            "UCI_Elo": strength["effective_elo"],
                        })
                        result = engine.play(board, chess.engine.Limit(time=0.1, depth=self.depth_live))
                        if result.move:
                            return result.move.uci()
                    elif strength["mode"] == "skill_floor":
                        engine.configure({
                            "Skill Level": 0,
                        })
                        result = engine.play(board, chess.engine.Limit(time=0.05, depth=4))
                        if result.move:
                            return result.move.uci()
                    else:
                        # custom_beginner: sample among top-3 candidates with plausible noise
                        info = engine.analyse(board, chess.engine.Limit(depth=5), multipv=min(3, len(legal_moves)))
                        candidates = []
                        if isinstance(info, list):
                            for inf in info:
                                if inf.get("pv"):
                                    candidates.append(inf["pv"][0])
                        elif info.get("pv"):
                            candidates.append(info["pv"][0])

                        if candidates:
                            # 70% best, 30% second/third candidate to mimic human beginner
                            import random
                            return candidates[0].uci() if (len(candidates) == 1 or random.random() < 0.7) else candidates[1].uci()
            except Exception as e:
                logger.warning(f"Engine play failed: {e}. Using fallback move generator.")

        # Heuristic fallback move generator
        return self._heuristic_choose_move(board, strength["mode"])

    def _heuristic_analyze(self, board: chess.Board) -> EvalResult:
        """Fast fallback material & mobility evaluator with fixed White perspective."""
        piece_values = {
            chess.PAWN: 100,
            chess.KNIGHT: 320,
            chess.BISHOP: 330,
            chess.ROOK: 500,
            chess.QUEEN: 900,
            chess.KING: 0,
        }
        white_val = sum(len(board.pieces(pt, chess.WHITE)) * val for pt, val in piece_values.items())
        black_val = sum(len(board.pieces(pt, chess.BLACK)) * val for pt, val in piece_values.items())
        diff = white_val - black_val

        legal_moves = list(board.legal_moves)
        if not legal_moves:
            return EvalResult(
                best_move="",
                best_move_san="",
                eval_white_cp=diff,
                mate_white=None,
                pv=[],
                top_moves=[],
            )

        # Pick move with simple capture/center heuristic
        best_move = legal_moves[0]
        for m in legal_moves:
            if board.is_capture(m):
                best_move = m
                break

        return EvalResult(
            best_move=best_move.uci(),
            best_move_san=board.san(best_move),
            eval_white_cp=diff,
            mate_white=None,
            pv=[best_move.uci()],
            top_moves=[{"move": best_move.uci(), "eval_white_cp": diff}],
        )

    def _heuristic_choose_move(self, board: chess.Board, mode: str) -> str:
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            return ""

        # Prefer developing/captures
        captures = [m for m in legal_moves if board.is_capture(m)]
        checks = [m for m in legal_moves if board.gives_check(m)]

        if mode == "custom_beginner":
            # Natural simple play
            if captures:
                return captures[0].uci()
            if checks:
                return checks[0].uci()
            # prefer pawn or knight moves early
            for m in legal_moves:
                if board.piece_type_at(m.from_square) in (chess.PAWN, chess.KNIGHT, chess.BISHOP):
                    return m.uci()

        return legal_moves[0].uci()
