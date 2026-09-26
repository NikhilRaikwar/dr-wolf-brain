from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Dict, Any
from uuid import UUID

# --- import ---
class ChesscomImportRequest(BaseModel):
    username: str
    max_games: int = 30

class ImportJobResponse(BaseModel):
    player_id: UUID
    games_imported: int
    positions_analyzed: int
    seeded_hypotheses: List[str]   # hypothesis concepts seeded as 'suspected'

# --- session ---
class SessionStartRequest(BaseModel):
    player_id: Optional[UUID] = None

class SessionStartResponse(BaseModel):
    session_id: UUID
    requested_engine_elo: int
    effective_engine_elo: Optional[int] = None
    engine_mode: Literal["uci_elo", "skill_floor", "custom_beginner"]
    color: Literal["white"] = "white"
    fen: str

class ReasoningAnswer(BaseModel):
    choice: str                     # must be a key from QUESTION_OPTIONS
    free_text: Optional[str] = None
    squares_highlighted: List[str] = Field(default_factory=list)  # e.g. ["c5","d4"]

class EpisodeResponse(BaseModel):
    episode_id: UUID
    trigger_type: str
    question: str                   # parameterized from question bank
    options: List[Dict[str, Any]]   # [{key, label}]

class MoveRequest(BaseModel):
    move_uci: str                   # player's move only; server validates legality

class MoveResponse(BaseModel):
    player_move: str
    engine_move: Optional[str]
    fen: str
    game_over: bool
    result: Optional[str] = None
    interruption: Optional[EpisodeResponse] = None

class PositionResponse(BaseModel):
    session_id: UUID
    fen: str
    turn: str
    legal_moves: List[str]
    moves_uci: List[str]
    ply_count: int
    player_color: str
    game_over: bool
    result: Optional[str] = None
    interruption: Optional[EpisodeResponse] = None

class GraderDetail(BaseModel):
    concept_match: bool
    square_match: bool
    piece_match: bool
    llm: Dict[str, Any]

class EpisodeResult(BaseModel):
    episode_id: UUID
    reasoning_outcome: Literal["recognized", "partial", "missed"]
    move_outcome: Literal["best", "acceptable", "inaccurate", "mistake"]
    grader: GraderDetail

# --- brain / evidence ---
class SkillState(BaseModel):
    concept: str
    mastery_score: Optional[float]  # None = "Not enough evidence"
    evidence_count: int
    trend: str

class HypothesisState(BaseModel):
    concept: str
    description: str
    state: Literal["suspected", "needs_evidence", "developing", "well_supported"]
    observed_frequency: str         # "4 of 7 relevant episodes"
    trend: str
    evidence_count: int

class BrainResponse(BaseModel):
    skills: List[SkillState]
    hypotheses: List[HypothesisState]

class EvidenceItem(BaseModel):
    source_type: str
    fen: str
    move_number: Optional[int]
    concept: str
    direction: str
    observed_at: str

class WhyAskResponse(BaseModel):
    narrative: str                  # deterministic template + LLM phrasing
    evidence: List[EvidenceItem]

# --- summary / path / dream ---
class SessionSummaryResponse(BaseModel):
    session_id: UUID
    stats: Dict[str, Any]           # positions_faced, recognized, partial, missed, duration_s
    skill_updates: List[Dict[str, Any]] # [{concept, old, new, evidence_summary}]
    takeaway: str                   # LLM-phrased, evidence-derived
    review_cards: List[Dict[str, Any]]  # per-episode: your_thinking / your_move / key_idea / engine_lines

class PathResponse(BaseModel):
    current_focus: str
    next_milestone: str
    stages: List[str]               # ["understand","recognize","apply","transfer","verify"]
    transfer_positions: List[Dict[str, Any]]  # 3 FENs with concept+difficulty
