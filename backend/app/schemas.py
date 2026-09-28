from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Dict, Any
from uuid import UUID

# --- player ---
class PlayerCreateRequest(BaseModel):
    chesscom_username: Optional[str] = None
    estimated_rating: Optional[int] = None

class PlayerResponse(BaseModel):
    id: UUID
    chesscom_username: Optional[str] = None
    estimated_rating: int
    created_at: Optional[str] = None

# --- import ---
class ChesscomImportRequest(BaseModel):
    player_id: UUID
    username: str
    max_games: int = Field(default=10, ge=1, le=50)

class PGNImportRequest(BaseModel):
    player_id: UUID
    pgn: str
    learner_name: Optional[str] = None
    learner_color: Optional[Literal["white", "black"]] = None
    max_games: int = Field(default=10, ge=1, le=50)

class ImportFailureItem(BaseModel):
    game_identifier: str
    reason: str

class ImportJobResponse(BaseModel):
    player_id: UUID
    source: str
    games_found: int
    games_imported: int
    games_skipped_existing: int
    games_failed: int = 0
    positions_analyzed: int
    evidence_records_created: int
    seeded_hypotheses: List[str]
    failures: List[ImportFailureItem] = Field(default_factory=list)

class GameSummaryItem(BaseModel):
    id: UUID
    source: str
    external_ref: Optional[str] = None
    played_at: Optional[str] = None
    result: Optional[str] = None
    positions_count: int = 0
    created_at: str

class PositionDetailItem(BaseModel):
    id: UUID
    move_number: int
    fen: str
    concept: Optional[str] = None
    engine: Dict[str, Any]
    observed_at: str

class GameDetailResponse(BaseModel):
    id: UUID
    player_id: UUID
    source: str
    external_ref: Optional[str] = None
    played_at: Optional[str] = None
    result: Optional[str] = None
    created_at: str
    positions: List[PositionDetailItem]

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

class AnswerResponse(BaseModel):
    ok: bool = True
    episode_id: UUID
    status: str

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

# --- dream cycle ---
class DreamCycleRequest(BaseModel):
    session_id: UUID

class ReasoningCounts(BaseModel):
    recognized: int = 0
    partial: int = 0
    missed: int = 0

class MoveCounts(BaseModel):
    best: int = 0
    acceptable: int = 0
    inaccurate: int = 0
    mistake: int = 0

class BeliefChangeItem(BaseModel):
    claim_type: str
    concept: str
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    created_at: Optional[str] = None

class TransferPositionItem(BaseModel):
    id: UUID
    fen: str
    concept: str
    difficulty: int
    tactical_theme: Optional[str] = None
    source: Optional[str] = None
    verified: bool = True

class SessionFacts(BaseModel):
    session_id: UUID
    player_id: UUID
    graded_episode_count: int
    reasoning_counts: ReasoningCounts
    move_counts: MoveCounts
    concept_counts: Dict[str, int]
    belief_changes: List[BeliefChangeItem]
    next_focus: Optional[str] = None
    transfer_position_ids: List[UUID] = Field(default_factory=list)

class DreamCycleLanguage(BaseModel):
    session_summary: str
    key_takeaway: str
    next_focus_phrase: Optional[str] = None

class DreamCycleResult(BaseModel):
    session_id: UUID
    player_id: UUID
    ran_at: str
    session_facts: SessionFacts
    language: DreamCycleLanguage
    next_focus: Optional[str] = None
    transfer_positions: List[TransferPositionItem] = Field(default_factory=list)
    belief_changes: List[BeliefChangeItem] = Field(default_factory=list)

