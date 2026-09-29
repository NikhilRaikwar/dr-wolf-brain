# Dr. Wolf Brain — Engineering Build Spec

**Version:** 1.2 · **Date:** 2026-09-29 · **Companion to:** PRD v1.5
**Purpose:** original engineering specification plus an explicit record of what the shipped v1 replaced or deferred. Normative learner-model formulas, evidence rules, hypothesis rules, and governor gates remain unchanged.

> **Shipped-state note (2026-09-29):** This document began as a build plan. Sections marked replaced, deferred, or post-MVP describe unshipped designs and must not be read as current interfaces. Current code and migrations remain authoritative.

**v1.1 engineering freeze:** fixed evaluation-perspective normalization, canonical server-side game/session state, staged episode lifecycle, Stockfish Elo-floor fallback, weighted mastery initialization, hypothesis-state logic, hypothesis-test predicates, client/server trigger authority, seeded-hypothesis visibility, and Dream Cycle idempotency.

## 0. Agent instructions (read first)

1. **Build order = demo spine:** IMPORT → THINK FIRST → EPISODES → SESSION SUMMARY → BRAIN UPDATE → WHY UI. Do not build the dashboard before episodes persist. Do not build the learning path before the summary works.
2. **The Iron Rule is a code constraint, not a suggestion:**
   - Chess facts (best moves, evals, threats, key squares) come from Stockfish functions. The LLM never produces them.
   - Learner claims (mastery, hypotheses, "why") come from `evidence_records` + deterministic math. The LLM never produces them.
   - The LLM produces: question phrasing (from curated templates + trigger evidence), takeaway phrasing, tone. It receives engine/evidence facts as *input* and returns *wording*.
   - Any code path where the LLM output flows into a belief update or a chess claim without a deterministic check is a bug. Flag it, don't ship it.
3. **No new product features.** The PRD is frozen. Ambiguity → ask the human, default to the simpler option.
4. **Every commit must keep the app runnable.** Small vertical slices, not layer-by-layer.
5. **Write `BUILD_LOG.md` as you go:** what was built, what was chosen, and where human judgment intervened. It is a public record of the agentic workflow.

## 1. Repo layout & setup

```
dr-wolf-brain/
├── README.md
├── BUILD_LOG.md
├── PRD.md                      # copy of PRD v1.4 FINAL
├── BUILD_SPEC.md               # this file
├── docker-compose.yml          # postgres
├── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app, router wiring
│   │   ├── config.py           # env: DATABASE_URL, OPENROUTER_KEY, STOCKFISH_PATH, ENGINE_ELO_DEFAULT
│   │   ├── db.py               # SQLAlchemy engine/session
│   │   ├── models.py           # ORM models (mirror §2 tables)
│   │   ├── schemas.py          # Pydantic request/response models (§4)
│   │   ├── routers/
│   │   │   ├── import_router.py # POST /api/import/chesscom, POST /api/import/pgn
│   │   │   ├── session.py      # session start/answer/move/summary
│   │   │   ├── brain.py        # GET /api/brain aggregate learner state + provenance
│   │   │   └── dream.py        # POST /api/dream-cycle
│   │   ├── chess/
│   │   │   ├── stockfish.py    # StockfishAdapter (§5)
│   │   │   ├── triggers.py     # trigger detectors (§6)
│   │   │   ├── governor.py     # interruption governor (§6.6)
│   │   │   └── questions.py    # curated question bank (§6.7)
│   │   ├── grading/
│   │   │   └── grader.py       # reasoning_outcome grader (§7)
│   │   ├── beliefs/
│   │   │   └── updater.py      # mastery + hypothesis updates (§8)
│   │   ├── dream/
│   │   │   └── cycle.py        # dream-cycle job (§9)
│   │   └── llm/
│   │       └── client.py       # OpenRouter client, constrained schemas (§10)
│   ├── migrations/
│   │   └── 001_initial.sql     # §2
│   ├── seed/
│   │   └── transfer_positions.sql  # §12 (starter FENs)
│   └── tests/                  # §13
├── app/                          # Next.js App Router
│   │   ├── page.tsx            # landing + import (Chess.com username / PGN)
│   │   ├── play/page.tsx       # Think First game
│   │   ├── brain/page.tsx      # Your Chess Brain dashboard
│   │   └── games/              # Game list and detail surfaces
├── components/
│   │   ├── Chessboard.tsx      # custom display board
│   │   ├── InteractiveChessboard.tsx # custom interactive board
│   │   ├── SocraticModal.tsx   # interruption: question + options + squares + text
├── lib/                         # frontend helpers and landing examples
└── docs/
    ├── ARCHITECTURE.md
    └── DECISIONS.md
```

**Setup:**
```bash
docker compose up -d                     # postgres:5432
cp .env.example .env                     # DATABASE_URL, OPENROUTER_API_KEY, STOCKFISH_PATH
psql $DATABASE_URL -f backend/migrations/001_initial.sql
psql $DATABASE_URL -f backend/seed/transfer_positions.sql
cd backend && uvicorn app.main:app --reload      # :8000
pnpm install --frozen-lockfile
pnpm run dev                                      # :3000
```

`.env.example`:
```
DATABASE_URL=postgresql://wolf:wolf@localhost:5432/wolfbrain
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
STOCKFISH_PATH=/usr/bin/stockfish
ENGINE_DEPTH_IMPORT=18
ENGINE_DEPTH_LIVE=14
DEFAULT_RATING=800
STOCKFISH_MIN_ELO=1320
```

## 2. Database — migration 001_initial.sql

Migration v1.1 creates **11 tables**: players, games, positions, sessions, episodes, skills, hypotheses, evidence_records, belief_changes, transfer_positions, and dream_cycle_runs.

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chesscom_username TEXT,
  estimated_rating INT NOT NULL DEFAULT 800,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('chesscom','pgn')),
  external_ref TEXT,
  played_at TIMESTAMPTZ,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON games(player_id, played_at DESC);

-- Position-level imported evidence (PRD §8.5: every claim points at a board state)
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  move_number INT NOT NULL,
  fen TEXT NOT NULL,
  concept TEXT,                       -- e.g. 'opponent_threat_detection'
  engine JSONB NOT NULL DEFAULT '{}',  -- {best_move, eval_cp, swing_cp, ...}
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON positions(player_id, concept);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  engine_elo INT NOT NULL,
  player_color TEXT NOT NULL DEFAULT 'white' CHECK (player_color IN ('white','black')),
  current_fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves_uci JSONB NOT NULL DEFAULT '[]'::jsonb,
  ply_count INT NOT NULL DEFAULT 0,
  interruptions_used INT NOT NULL DEFAULT 0,
  last_interruption_ply INT,
  last_trigger_type TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  move_number INT NOT NULL,
  fen TEXT NOT NULL,
  trigger_evidence JSONB NOT NULL,   -- {type, detected_by, engine_facts{threat,key_squares,key_pieces,eval_before,eval_if_missed}}
  learner_reasoning JSONB NOT NULL,  -- {question_asked, choice, free_text, squares_highlighted}
  learner_action JSONB NOT NULL,     -- {move_played}
  engine_truth JSONB NOT NULL,       -- {best_move, best_eval, played_eval, cp_loss, concept}
  reasoning_outcome TEXT CHECK (reasoning_outcome IN ('recognized','partial','missed')),
  move_outcome TEXT CHECK (move_outcome IN ('best','acceptable','inaccurate','mistake')),
  move_quality_cp_loss INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON episodes(session_id);
CREATE INDEX ON episodes(player_id);

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,              -- 'tactical_awareness' | 'opponent_threat_detection' | 'king_safety' | 'calculation_depth' | 'endgame_technique'
  mastery_score DOUBLE PRECISION,    -- NULL = not enough evidence (PRD §6.4)
  evidence_count INT NOT NULL DEFAULT 0,
  trend TEXT NOT NULL DEFAULT 'new',  -- 'new' | 'improving' | 'stable' | 'declining'
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, concept)
);

CREATE TABLE hypotheses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,              -- 'tunnel_vision_after_attack' | 'stops_calculating_early' | 'misses_defensive_resources'
  description TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0.05 AND 0.95),
  state TEXT NOT NULL DEFAULT 'suspected'
    CHECK (state IN ('suspected','needs_evidence','developing','well_supported')),
  observed_count INT NOT NULL DEFAULT 0,   -- meaningful tests (PRD §7)
  trend TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, concept)
);

-- The shared evidence primitive (PRD §8.5). The CHECK constraint enforces the
-- epistemology rule at the database level: imports can only SEED hypotheses.
CREATE TABLE evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('imported_position','think_first_episode')),
  source_id UUID NOT NULL,            -- positions.id or episodes.id
  claim_type TEXT NOT NULL CHECK (claim_type IN ('skill','hypothesis')),
  concept TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('supports','contradicts','seeds')),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_import_hypothesis_claims CHECK (
    NOT (source_type='imported_position' AND claim_type='hypothesis'
         AND direction IN ('supports','contradicts'))
  )
);
CREATE INDEX ON evidence_records(player_id, concept, claim_type);

CREATE TABLE belief_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('skill','hypothesis')),
  concept TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON belief_changes(player_id, created_at DESC);

CREATE TABLE transfer_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fen TEXT NOT NULL,
  concept TEXT NOT NULL,
  difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  tactical_theme TEXT,
  source TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX ON transfer_positions(concept, difficulty);

CREATE TABLE dream_cycle_runs (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 3. Concept registry (single source of truth)

`backend/app/concepts.py` — every concept string in the system comes from here. No string literals elsewhere.

```python
SKILL_CONCEPTS = [
    "tactical_awareness",
    "opponent_threat_detection",
    "king_safety",
    "calculation_depth",
    "endgame_technique",
]

HYPOTHESIS_CONCEPTS = {
    "tunnel_vision_after_attack": "Tends to stop scanning for counterplay after finding an attacking move.",
    "stops_calculating_early": "Frequently stops calculation after the first forcing candidate.",
    "misses_defensive_resources": "Often identifies tactical ideas but misses defensive resources.",
}

# trigger type -> skill concept it evidences
TRIGGER_TO_SKILL = {
    "opponent_threat": "opponent_threat_detection",
    "hanging": "tactical_awareness",
    "king_safety": "king_safety",
    "forcing_candidate": "calculation_depth",
    "passive_piece": "tactical_awareness",
}

# Trigger type alone never proves that a thinking hypothesis was tested.
# First map candidate hypotheses by trigger; then apply a hypothesis-specific predicate
# against the episode's learner reasoning before counting a meaningful test.
TRIGGER_TO_HYPOTHESIS_CANDIDATES = {
    "opponent_threat": ["tunnel_vision_after_attack"],
    "forcing_candidate": ["stops_calculating_early"],
    "hanging": ["misses_defensive_resources"],
    "king_safety": [],
    "passive_piece": [],
}

def episode_tests_hypothesis(ep, hypothesis_concept: str) -> bool:
    if hypothesis_concept == "tunnel_vision_after_attack":
        return (
            ep.trigger_type == "opponent_threat"
            and learner_expressed_attacking_intent(ep)
        )
    if hypothesis_concept == "stops_calculating_early":
        return (
            ep.trigger_type == "forcing_candidate"
            and forcing_candidate_question_was_selected(ep)
        )
    if hypothesis_concept == "misses_defensive_resources":
        return (
            ep.trigger_type == "hanging"
            and defensive_resource_question_was_selected(ep)
        )
    return False
```

## 4. Pydantic schemas (`backend/app/schemas.py`)

```python
from pydantic import BaseModel, Field
from typing import Literal, Optional
from uuid import UUID

# --- import ---
class ChesscomImportRequest(BaseModel):
    username: str
    max_games: int = 30

class ImportJobResponse(BaseModel):
    player_id: UUID
    games_imported: int
    positions_analyzed: int
    seeded_hypotheses: list[str]   # hypothesis concepts seeded as 'suspected'

# --- session ---
class SessionStartRequest(BaseModel):
    player_id: UUID

class SessionStartResponse(BaseModel):
    session_id: UUID
    requested_engine_elo: int
    effective_engine_elo: Optional[int] = None
    engine_mode: Literal["uci_elo","skill_floor","custom_beginner"]
    color: Literal["white"] = "white"
    fen: str

class ReasoningAnswer(BaseModel):
    choice: str                     # must be a key from QUESTION_OPTIONS
    free_text: Optional[str] = None
    squares_highlighted: list[str] = Field(default_factory=list)  # e.g. ["c5","d4"]

class EpisodeResponse(BaseModel):
    episode_id: UUID
    trigger_type: str
    question: str                   # parameterized from question bank
    options: list[dict]             # [{key, label}]

class MoveRequest(BaseModel):
    move_uci: str                   # player's move only; server validates legality

class MoveResponse(BaseModel):
    player_move: str
    engine_move: Optional[str]
    fen: str
    game_over: bool
    result: Optional[str] = None
    interruption: Optional["EpisodeResponse"] = None

class GraderDetail(BaseModel):
    concept_match: bool
    square_match: bool
    piece_match: bool
    llm: dict                       # constrained schema result

class EpisodeResult(BaseModel):
    episode_id: UUID
    reasoning_outcome: Literal["recognized","partial","missed"]
    move_outcome: Literal["best","acceptable","inaccurate","mistake"]
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
    state: Literal["suspected","needs_evidence","developing","well_supported"]
    observed_frequency: str         # "4 of 7 relevant episodes"
    trend: str
    evidence_count: int

class BrainResponse(BaseModel):
    skills: list[SkillState]
    hypotheses: list[HypothesisState]

class EvidenceItem(BaseModel):
    source_type: str
    fen: str
    move_number: Optional[int]
    concept: str
    direction: str
    observed_at: str

class WhyAskResponse(BaseModel):
    narrative: str                  # deterministic template + LLM phrasing
    evidence: list[EvidenceItem]

# --- summary / path / dream ---
class SessionSummaryResponse(BaseModel):
    session_id: UUID
    stats: dict                     # positions_faced, recognized, partial, missed, duration_s
    skill_updates: list[dict]       # [{concept, old, new, evidence_summary}]
    takeaway: str                   # LLM-phrased, evidence-derived
    review_cards: list[dict]        # per-episode: your_thinking / your_move / key_idea / engine_lines

class PathResponse(BaseModel):
    current_focus: str
    next_milestone: str
    stages: list[str]               # ["understand","recognize","apply","transfer","verify"]
    transfer_positions: list[dict]  # 3 FENs with concept+difficulty
```

## 5. API contracts

| Method & path | Request | Response | Notes |
|---|---|---|---|
| `POST /api/import/chesscom` | `ChesscomImportRequest` | `ImportJobResponse` | Fetch monthly archives from `https://api.chess.com/pub/player/{user}/games/{yyyy}/{mm}`. Filter: standard time controls, rated+casual. Cap `max_games`. Analyze each game's critical positions server-side (§6). |
| `POST /api/import/pgn` | JSON `{player_id, pgn}` | `ImportJobResponse` | **Replaced in shipped v1:** PGN text is submitted as JSON and parsed with python-chess. Multipart upload is deferred. |
| `POST /api/session/start` | `SessionStartRequest` | `SessionStartResponse` | Creates canonical server-side session state. `requested_engine_elo = rating + 100`; actual engine mode follows §6.1 Elo-floor policy. |
| `GET /api/session/{id}/position` | — | `{fen, turn, legal_moves, interruption: EpisodeResponse | null}` | Reads canonical DB-backed session state. No in-memory-only board authority. |
| `POST /api/session/{id}/interrupt/{episode_id}/answer` | `ReasoningAnswer` | `{ok: true}` | Requires episode `status='prompted'`; stores `learner_reasoning`, advances to `answered`. Does NOT grade yet. |
| `POST /api/session/{id}/move` | `MoveRequest` | `MoveResponse` | Client sends the player's move only. Server validates/applies it, chooses/applies the canonical engine reply, persists `current_fen` + `moves_uci`, runs the canonical trigger pipeline, creates any `prompted` episode, and returns the resulting state. |
| `GET /api/session/{id}/summary` | — | `SessionSummaryResponse` | Grades all `committed` episodes (server Stockfish = authority), runs the idempotent Dream Cycle once, returns review cards, then marks the session completed. |
| `GET /api/brain?player_id=` | — | `BrainResponse` | Skills + hypotheses. Pure imported seeds are visible in a clearly separate **Possible pattern — based on imported games, not yet tested** section. They are never displayed as confirmed learner claims. After Think First tests begin, they move into the normal hypothesis state UI. |
| `GET /api/evidence/{claim_id}?claim_type=` | — | `list[EvidenceItem]` | **Deferred.** Shipped v1 exposes aggregate persisted provenance through `GET /api/brain`; it does not provide this claim-specific route. |
| `GET /api/session/{id}/why/{episode_n}` | — | `WhyAskResponse` | **Deferred.** The dedicated episode-level “Why did you ask me that?” route and UI are not shipped. Persisted episodes and aggregate Brain provenance are the current foundation. |
| `POST /api/dream-cycle` | `{session_id}` | `{beliefs_changed: int}` | Runs §9. Called once at session end (by the summary endpoint or a job). Idempotent per session. |
| `GET /api/path?player_id=` | — | `PathResponse` | **Deferred.** Shipped v1 has no dedicated learning-path API or complete transfer-training flow. |

**Import analysis (shared by chesscom/pgn):** for each game, walk the moves with server Stockfish at `ENGINE_DEPTH_IMPORT`. Record a `positions` row for every position where: eval swing > 150cp on a move (critical moment), a tactic was available and missed/taken, or king-safety event. Each row gets `concept` + `engine` JSON. Then write `evidence_records` with `source_type='imported_position'`, `claim_type='skill'`, `direction='supports'|'contradicts'` at the updater's half rate. Also seed candidate hypotheses (`claim_type='hypothesis'`, `direction='seeds'`) for concepts with ≥2 supporting positions.

## 6. Chess engine — `backend/app/chess/`

### 6.1 StockfishAdapter (`stockfish.py`)

```python
class EvalResult(TypedDict):
    best_move: str          # uci
    best_move_san: str
    eval_white_cp: int      # ALWAYS from White's perspective; mate mapped to +/-100000
    mate_white: int | None  # signed plies to mate from White's perspective
    pv: list[str]
    top_moves: list[dict]   # multipv=3: [{move, eval_white_cp}]

class EngineStrength(TypedDict):
    requested_elo: int
    effective_elo: int | None
    mode: Literal["uci_elo","skill_floor","custom_beginner"]

class StockfishAdapter:
    def __init__(self, path: str, depth_import=18, depth_live=14): ...
    def analyze(self, fen: str, depth: int | None = None, multipv: int = 1) -> EvalResult: ...
    def eval_after(self, fen: str, move_uci: str, depth: int | None = None) -> int: ...
    def configure_limited(self, requested_elo: int) -> EngineStrength: ...
    def min_supported_elo(self) -> int: ...

def eval_for_color(result: EvalResult, color: chess.Color) -> int:
    return result["eval_white_cp"] if color == chess.WHITE else -result["eval_white_cp"]
```

Rules:
- **All chess facts** in the system come through this class. No inline engine calls elsewhere.
- Engine evaluations are stored in a **fixed White perspective**. Any player-relative comparison must call `eval_for_color(...)`; never subtract values whose perspectives differ.
- `configure_limited()` must query/know the engine's supported Elo floor. If `requested_elo` is below the floor, do **not** silently label a stronger engine as the requested Elo.
- v1 fallback order below the Elo floor:
  1. use a documented `Skill Level=0` / minimum-strength floor when available and label `engine_mode='skill_floor'`, or
  2. use a small custom beginner policy that samples among engine-approved candidate moves and label `engine_mode='custom_beginner'`.
- The UI may call this simply **Training engine**; it must not claim an exact 900 Elo opponent unless the engine can actually honor that value.

### 6.2 Trigger detectors (`triggers.py`)

Each detector is a pure function `(board: chess.Board, engine: StockfishAdapter, ctx: TriggerContext) -> Trigger | None`. `TriggerContext` carries: `player_color`, `eval_before_opponent_move_player_cp` (already normalized to learner perspective), `move_number`, and `history` (for unmoved-piece tracking). Every delta below is computed in the learner's fixed color perspective.

```python
@dataclass
class Trigger:
    type: str  # "opponent_threat" | "hanging" | "king_safety" | "forcing_candidate" | "passive_piece"
    engine_facts: dict  # threat, key_squares, key_pieces, eval_before, eval_if_missed
    target_concept: str # skill concept, from TRIGGER_TO_SKILL
```

**T_opponent_threat** — fire if ANY of:
1. `engine.analyze(fen).mate_in` is negative (opponent mates) and `abs(mate_in) <= 10` plies → facts: `threat="mate threat"`, key_squares = mating squares from PV.
2. Eval swing: `ctx.eval_before_opponent_move_player_cp` minus `eval_for_color(engine.analyze(fen), ctx.player_color)` > 150 → facts include `threat` = human-readable from PV (e.g. "Bc5+ discovered attack"), `key_squares` = squares in PV[0:2] move from/to.
3. A player piece is hanging AND the capture wins material (see T_hanging) — reuse: hanging with material win ≥150cp also qualifies as opponent_threat (the threat *is* the capture). Prefer this classification over `hanging` when the piece is currently attacked (opponent just created the threat).

**T_hanging** — for each player piece P (skip king):
1. Find opponent captures of P: pseudo-legal captures targeting P's square.
2. For each capture C: `eval_after_capture = eval_after_for_color(fen, C, ctx.player_color)`; `delta = ctx.current_eval_player_cp - eval_after_capture` (same fixed player perspective; positive = bad for player).
3. Piece is "inadequately defended" if: no defender, OR cheapest defender value > captured piece value (v1 approximation — exact SEE is v2; comment this).
4. Fire if `delta >= 150` and inadequately defended. `key_squares=[P.square]`, `key_pieces=[P]`.

**T_king_safety** — heuristic, all must hold:
1. Player king has < 2 own pawns on the three adjacent files within 2 ranks, OR an open/semi-open file points at the king.
2. Opponent has queen on board OR ≥2 pieces attacking squares near the king (king ring).
3. Engine check: opponent's best move improves their eval by ≥100cp AND involves a king attack (PV moves target king zone squares).
Fire with `key_squares` = king zone squares. (Heuristic gates the expensive check; engine confirms.)

**T_forcing_candidate** — `engine.analyze(fen, multipv=3)`:
1. If any top-3 move is a check (`board.gives_check(move)`) or a capture with `eval_after` winning ≥100cp → fire.
2. `key_squares` = from/to of that move; `key_pieces` = moving piece.

**T_passive_piece** — LOW PRIORITY, all must hold:
1. `move_number >= 15`, ≥4 other pieces developed (moved at least once — track via `ctx.history`).
2. A minor piece or rook has never moved.
3. Engine: best move activating that piece (first move in PV involving it, or search moves from its square) improves eval by ≥80cp vs current.
Fire with `key_squares=[piece.square]`.

### 6.3 Selection pipeline

```python
def select_interruption(board, engine, ctx, player_state) -> Trigger | None:
    eligible = [t for t in
        (detect_opponent_threat, detect_hanging, detect_king_safety,
         detect_forcing_candidate, detect_passive_piece)
        if (trig := t(board, engine, ctx))]
    if not eligible: return None
    # rank by weakest matching hypothesis/skill (PRD §9.6)
    eligible.sort(key=lambda t: (learner_weakness_score(t, player_state), trigger_priority(t)))
    return eligible[0]
```
`trigger_priority`: opponent_threat=0, hanging=1, king_safety=2, forcing_candidate=3, passive_piece=4 (PRD §9.7). `learner_weakness_score`: lower mastery of `t.target_concept` → earlier. Personalization only reorders *eligible* triggers.

### 6.4 Governor (`governor.py`)

```python
@dataclass
class GovernorState: interruptions_used: int; last_interruption_move: int; last_trigger_type: str | None

def governor_allows(trigger, move_number, state: GovernorState, board) -> bool:
    if state.interruptions_used >= 5: return False
    if move_number < 8: return False
    if move_number - state.last_interruption_move < 6: return False
    if trigger.type == state.last_trigger_type: return False
    if board.is_insufficient_material() or is_dead_drawn(board): return False
    return True
```

### 6.5 Question bank (`questions.py`)

```python
QUESTION_BANK = {
  "opponent_threat": {
    "question": "Before you move — what is your opponent threatening?",
    "options": [
      {"key": "look_for_counterplay", "label": "Look for my opponent's counterplay", "concept": "opponent_threat_detection"},
      {"key": "calculate_forcing", "label": "Calculate forcing lines", "concept": "calculation_depth"},
      {"key": "check_king_safety", "label": "Check my king's safety", "concept": "king_safety"},
      {"key": "better_plan", "label": "Look for a better plan", "concept": "tactical_awareness"},
    ],
  },
  "hanging": {
    "question": "One of your pieces may be under attack. What do you see?",
    "options": [ ... same 4 options, order shuffled ... ],
  },
  "king_safety": {
    "question": "Compare both kings. Which one is safer right now — and why?",
    ...
  },
  "forcing_candidate": {
    "question": "You've found one forcing idea. Can you find another candidate before committing?",
    ...
  },
  "passive_piece": {
    "question": "Which of your pieces is doing the least right now?",
    ...
  },
}
```
Rules: exactly 4 options per trigger; the *correct* concept's option is always present but position-shuffled per interruption; the other three are plausible distractors. `concept_match` = chosen option's `concept` == trigger's `target_concept`.

### 6.6 Live-trigger UX vs server authority (§5.4)

**Shipped v1:** Stockfish runs server-side. The browser renders the canonical state returned by the API and does not run Stockfish WASM. The speculative browser-engine design below was superseded before implementation; server confirmation remains the only trigger authority.

- **Server is the only authority that may create a coaching interruption.**
- The original plan allowed frontend Stockfish WASM to precompute likely replies or triggers. This is **not shipped**. The Socratic modal opens only after the backend confirms and persists a canonical `prompted` episode.
- Canonical turn flow:
  1. Client sends **player move only** to `POST /api/session/{id}/move`.
  2. Server loads `sessions.current_fen`, validates and applies the player move.
  3. Server computes/chooses the canonical engine reply under the configured strength policy, applies it, and persists `moves_uci`, `ply_count`, and `current_fen`.
  4. Server runs trigger detection on the resulting board, applies learner ranking + governor, and if allowed creates an `episodes` row with `status='prompted'`.
  5. Server returns the new FEN, canonical engine move, and optional interruption.
  6. Only then does the frontend open `SocraticModal`.
- If the browser's precomputed engine move or trigger prediction disagrees with the server, discard the browser prediction and log telemetry. The user never sees an unconfirmed coaching claim.

## 7. Reasoning grader (`backend/app/grading/grader.py`)

Implements PRD §6.5. Deterministic checks first; LLM only for free-text interpretation inside a strict schema.

```python
PIECE_NAMES = {"king","queen","rook","bishop","knight","pawn"}

def grade(episode_id, trigger: Trigger, reasoning: ReasoningAnswer, engine_truth: dict,
          llm: LLMClient) -> tuple[str, GraderDetail]:
    facts = trigger.engine_facts
    key_squares = set(facts.get("key_squares", []))          # uci squares "c5"
    key_pieces = facts.get("key_pieces", [])  # structured refs: {type, color, square}; not raw prose tokens

    # --- Layer 1: deterministic ---
    option = find_option(trigger.type, reasoning.choice)
    concept_match = option["concept"] == trigger.target_concept
    square_match = bool(set(reasoning.squares_highlighted) & key_squares)

    # v1 deterministic piece_match is only available when the UI captures an explicit
    # piece selection / square tied to a known key piece. Do not substring-match strings like
    # "black_bishop_c5" against prose.
    piece_match = explicit_piece_or_square_matches(reasoning, key_pieces)

    # --- Layer 2: constrained LLM (free text only) ---
    llm_out = llm.grade_free_text(
        question=reasoning.question_asked,
        free_text=reasoning.free_text or "",
        engine_facts=facts,          # LLM receives facts as INPUT; it never invents them
    )
    # llm_out schema (Pydantic-enforced):
    # { supports_engine_concept: bool, contradicts_engine_truth: bool,
    #   identified_concrete_threat: bool, identified_relevant_piece: bool,
    #   evidence_phrase: str | None }

    contradicts = llm_out.contradicts_engine_truth
    concrete = (square_match or piece_match
                or llm_out.identified_concrete_threat
                or llm_out.identified_relevant_piece)

    # --- final grade ---
    if contradicts:
        outcome = "missed"
    elif concept_match and concrete:
        outcome = "recognized"
    elif concept_match or llm_out.supports_engine_concept:
        outcome = "partial"
    else:
        outcome = "missed"
    return outcome, GraderDetail(concept_match=concept_match, square_match=square_match,
                                piece_match=piece_match, llm=llm_out.model_dump())
```

Notes:
- `contradicts_engine_truth=true` forces `missed` even if squares matched — the explanation must not fight the engine.
- Broad option alone (`concept_match` without any concrete evidence) → `partial`, never `recognized`. This is the anti-click-farming rule.
- `move_outcome` bands (cp loss): best ≤15, acceptable ≤60, inaccurate ≤150, mistake >150.

## 8. Belief updater (`backend/app/beliefs/updater.py`)

Implements PRD §7 exactly. Called by the dream cycle (and by summary for the session's own updates — one code path, called once).

```python
MIN_EVIDENCE_FOR_SCORE = 3

def update_skill(skill, evidence: list[EvidenceRecord]) -> None:
    """evidence: new records since last update, already filtered to this concept."""
    thinkfirst = [e for e in evidence if e.source_type == "think_first_episode"]
    imported   = [e for e in evidence if e.source_type == "imported_position"]

    if skill.mastery_score is None:
        # initialization: weighted average of first qualifying evidence, no invented prior
        if len(evidence) >= MIN_EVIDENCE_FOR_SCORE:
            weighted_sum = (
                sum(outcome_score(e) * 1.0 for e in thinkfirst)
                + sum(outcome_score(e) * 0.5 for e in imported)
            )
            weight_sum = (len(thinkfirst) * 1.0) + (len(imported) * 0.5)
            skill.mastery_score = (weighted_sum / weight_sum) * 100 if weight_sum else None
    else:
        if thinkfirst:
            s = mean(outcome_score(e) for e in thinkfirst) * 100
            skill.mastery_score = clamp(0.7 * skill.mastery_score + 0.3 * s, 0, 100)
        if imported:
            s = mean(outcome_score(e) for e in imported) * 100
            skill.mastery_score = clamp(0.85 * skill.mastery_score + 0.15 * s, 0, 100)
    skill.evidence_count += len(evidence)
    skill.trend = compute_trend(skill)  # from belief_changes history: improving|stable|declining|new
    skill.last_updated = now()

def outcome_score(e: EvidenceRecord) -> float:
    # resolved from the source episode/position's stored outcome
    return {"recognized": 1.0, "partial": 0.5, "missed": 0.0}[e.resolved_outcome]
```

Wait — `evidence_records` don't store outcomes. Resolution: when the dream cycle processes new records, it joins `source_id` → episodes (reasoning_outcome) or positions (stored outcome label from import analysis). Implement `resolve_outcome(record)` doing that join. (Spec note for agent — don't add an outcome column to evidence_records; keep the primitive clean.)

```python
def update_hypothesis(hyp: Hypothesis, episodes: list[Episode]) -> None:
    """Only Think First episodes ever support/contradict hypotheses."""
    for ep in episodes:
        if not episode_tests_hypothesis(ep, hyp.concept):
            continue

        direction = classify_vs_hypothesis(ep, hyp)  # "supports" | "contradicts"
        hyp.confidence = clamp(
            hyp.confidence + (0.08 if direction == "supports" else -0.12),
            0.05,
            0.95,
        )
        hyp.observed_count += 1
        write_evidence_record(
            player=ep.player_id,
            source=ep,
            claim_type="hypothesis",
            concept=hyp.concept,
            direction=direction,
        )

    if hyp.observed_count < 3:
        hyp.state = "suspected"
    elif hyp.confidence < 0.25:
        hyp.state = "needs_evidence"
    elif hyp.confidence <= 0.60:
        hyp.state = "developing"
    else:
        hyp.state = "well_supported"

    hyp.trend = compute_trend(hyp)
    hyp.updated_at = now()
    write_belief_change(...)   # every actual value/state change → belief_changes row
```

`episode_tests_hypothesis()` is the implementation of "meaningfully tested." A matching trigger type is necessary but not sufficient:
- `tunnel_vision_after_attack`: `opponent_threat` episode **and** learner reasoning indicates an attacking intention before the miss.
- `stops_calculating_early`: `forcing_candidate` episode in which the learner was explicitly asked to generate another candidate.
- `misses_defensive_resources`: `hanging`/defensive-resource episode where the selected question actually tests recognition of the defensive resource.
- Unrelated episodes never increment `observed_count`.

`is_meaningful_test`: `TRIGGER_TO_HYPOTHESIS[ep.trigger_evidence.type] == hyp.concept` and `ep.reasoning_outcome` is not None (it was graded). That's the PRD definition in code.

## 9. Dream cycle (`backend/app/dream/cycle.py`)

Session-end job. Deterministic first, LLM last. Idempotent per session using the explicit `dream_cycle_runs(session_id PRIMARY KEY, ran_at)` table from migration §2. Insert-once semantics are the guard; a duplicate run returns the existing result without mutating beliefs again.

```
1. Load session's graded episodes + new imported positions since last run.
2. For each skill concept with new evidence: update_skill(); write belief_changes row.
3. For each hypothesis with candidate/think-first evidence: update_hypothesis(); write belief_changes row.
4. Compute next_focus = skill with lowest mastery_score (ties → most evidence_count).
5. Pick 3 transfer positions: SELECT FROM transfer_positions WHERE concept=next_focus
   ORDER BY ABS(difficulty - player_level) LIMIT 3  (player_level from rating/400).
6. LLM calls (narrow, facts-as-input):
   a. summarize_session(episode facts) -> 1 paragraph
   b. phrase_takeaway(top concept delta + evidence counts) -> 1 sentence
   c. phrase_why(episode_id, evidence list) -> WhyAsk narrative (or do at request time; prefer request time)
7. Mark run complete.
```

The LLM never sees raw authority: prompts include the instruction block from §10 and receive only structured facts.

## 10. LLM client (`backend/app/llm/client.py`)

- Transport: OpenRouter chat completions, `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`), JSON mode / structured outputs via Pydantic schema passed as `response_format`.
- Every call includes the system block:

```
You are Dr. Wolf's wording assistant. STRICT RULES:
1. You receive chess facts and learner evidence as INPUT. Never invent, infer, or
   embellish facts beyond the input.
2. You never state a chess claim (best move, evaluation, threat) not present in input.
3. You never state a learner claim (skill level, pattern, frequency) not present in input.
4. Your job is phrasing and tone only: warm, patient, concise. If the input is
   insufficient, say what is missing instead of filling it in.
```

- Functions: `grade_free_text(...) -> FreeTextGrade`, `phrase_takeaway(...) -> str`, `phrase_why(...) -> str`, `summarize_session(...) -> str`.
- Retry: 2 attempts on schema validation failure, then fall back to deterministic template (never fail the request because the LLM failed).
- Log every LLM call with input hash (debuggability for BUILD_LOG).

## 11. Frontend

**Shipped v1 note:** The frontend is the repository-root Next.js application. It uses custom `Chessboard.tsx` and `InteractiveChessboard.tsx` components with chess.js. `react-chessboard`, `WhyAsk.tsx`, a separate session-summary route, and browser Stockfish WASM were planned designs and are not shipped. Summary review is rendered from the Play flow; aggregate provenance is rendered through the Brain surfaces.

**State flow (Think First game):**
```
page.tsx: player_id in localStorage (passwordless v1)
  → POST /session/start → session_id, engine mode, canonical starting FEN
  → InteractiveChessboard.tsx renders server FEN
  → player makes a move locally for immediate UX
  → POST /session/{id}/move {move_uci: player_move}
      server validates + applies player move
      server chooses/applies canonical engine reply
      server persists current_fen + move history
      server runs trigger pipeline + governor
      server creates optional prompted episode
  → response returns {engine_move, fen, interruption?}
  → frontend reconciles to returned server FEN
  → if interruption exists, open SocraticModal.tsx
  → POST /interrupt/{episode_id}/answer
      episode status: prompted → answered
      no grade shown
  → user commits next player move through the same /move endpoint
      if it belongs to the answered episode: episode status → committed
  → game ends or is manually finished → Play summary UI → GET /summary
      grades committed episodes
      runs idempotent Dream Cycle
      episode status → graded
  → review cards: "Your thinking" vs "The key idea" + "Show lines (checked by Stockfish)"
```

**Components:**
- `Chessboard.tsx` and `InteractiveChessboard.tsx` — shipped custom boards. The interactive board submits learner moves and reconciles to server FEN. No eval bar or authoritative browser engine output.
- `SocraticModal.tsx` — interruption UI: the question, 4 shuffled options (radio), click-to-highlight squares on a mini board, optional free text, "Commit & play" button. After answering, the main board re-enables for the move.
- Dedicated `WhyAsk.tsx` and episode-level provenance navigation are **deferred**. Shipped Brain components expose aggregate skill, hypothesis, evidence-source, and belief-change information.
- The Play page renders the shipped session-summary modal with graded review data.

**Browser Stockfish WASM:** **superseded by the shipped server-side engine design.** The server chooses the canonical engine move and creates the canonical trigger (§6.6).

**Design constraints:** mobile-responsive for learners who use phones. Dark, calm "study room" aesthetic — no casino colors, no confetti. The product thesis is thinking, so the UI should feel like it.

## 12. Seed data — transfer positions

Format is the `transfer_positions` table (§2). 4 hand-verified starters ship in `backend/seed/transfer_positions.sql`:

```sql
INSERT INTO transfer_positions (fen, concept, difficulty, tactical_theme, source, verified) VALUES
-- King safety: Fool's mate final. Lesson: f/g pawn pushes + queen out = death.
('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1',
 'king_safety', 1, 'mate_threat', 'hand_curated', TRUE),
-- Back-rank mate in 1 (White to play and mate).
('7k/8/6K1/8/8/8/8/3R4 w - - 0 1',
 'opponent_threat_detection', 1, 'back_rank_mate', 'hand_curated', TRUE),
-- Italian Game tabiya (matches PRD episode example). White to play.
('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 9',
 'tactical_awareness', 2, 'piece_activity', 'hand_curated', TRUE),
-- Starting position (sanity / pipeline test).
('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
 'tactical_awareness', 1, 'none', 'hand_curated', TRUE);
```

**Post-MVP design — not shipped:** expand toward a larger bank from the Lichess puzzle database (`https://database.lichess.org/#puzzles`, `puzzles.csv.gz`: columns `PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags`). Four curated transfer positions are currently seeded; the larger transfer bank and dedicated transfer-training flow remain deferred. A future import script could:
1. Download + filter: `Rating` 800–1700, `NbPlays` > 50.
2. Map Lichess themes → our concepts: `mateIn1/mateIn2/backRank` → `opponent_threat_detection`; `hangingPiece` → `tactical_awareness`; `defensiveMove` → `king_safety`; `fork/pin/skewer` → `tactical_awareness`; `quietMove` → `calculation_depth`.
3. `difficulty` = 1 + int((Rating - 800) / 200), clamped 1–5.
4. Verify each with server Stockfish: the puzzle's first solution move must be engine's top choice at depth 18, else `verified=FALSE` (excluded from selection until verified).
5. Target ~60 verified rows.

## 13. Test matrix

**Unit — triggers** (`tests/test_triggers.py`): FEN in → expected trigger out. Minimum fixtures:
- Fool's mate final FEN (above) → `T_opponent_threat` (mate threat).
- Back-rank FEN (above) → `T_forcing_candidate` (mate in 1 available) — assert it does NOT misfire as `king_safety`.
- A quiet middlegame FEN → no trigger.
- Passive-piece gate: unmoved rook + engine improvement < 80cp → no fire.
- Perspective regression: equivalent evaluations before/after a move with opposite side-to-move signs must produce ~0cp swing after fixed-color normalization.
- Elo-floor behavior: requested 900 Elo must not be reported as effective 900 if the engine floor is higher; response exposes `engine_mode`.

**Unit — grader** (`tests/test_grader.py`):
- Case A (right reasoning, bad move): correct concept + key square → `recognized`, `move_outcome='mistake'`.
- Case B (wrong reasoning, lucky move): unrelated choice + engine's best move played → `missed`, `move_outcome='best'`.
- Correct option but no squares/text → `partial`, never `recognized`.
- Free text contradicting engine truth (mock LLM `contradicts_engine_truth=true`) → `missed`.

**Unit — beliefs** (`tests/test_beliefs.py`):
- Skill with < 3 records → `mastery_score is None`.
- Initialization uses weighted average of first 3, not the 0.7/0.3 formula.
- Hypothesis +0.08 / −0.12 bounds at 0.05/0.95; states at 0.25/0.60 cutoffs.
- `observed_count < 3` always leaves hypothesis in `suspected`, regardless of numeric confidence.
- Opponent-threat episode without demonstrated attacking intent does **not** count as a meaningful test of `tunnel_vision_after_attack`.
- Weighted initialization: one perfect Think First + one perfect imported outcome initializes to 100%, not 75%.
- Imported position → hypothesis `supports` must violate the DB CHECK constraint (assert it raises).

**API:** The planned monolithic `tests/test_api.py` was **replaced in shipped v1** by focused coverage across `test_player.py`, `test_session_loop.py`, `test_episode_lifecycle.py`, `test_brain_endpoint.py`, `test_import.py`, `test_dream_cycle.py`, `test_concurrency.py`, and the related unit suites. Together they cover canonical session persistence, lifecycle transitions, import behavior, summary grading, Dream Cycle idempotency, player scoping, and races.

**Think First lifecycle test truth:** `test_golden_think_first_e2e_session_loop` verifies prompted/answered/committed/graded behavior and summary grading. If the natural trigger pipeline does not create an episode, the test seeds a prompted episode. It must not be represented as a guaranteed public live-trigger sequence. Natural triggering depends on board conditions, Stockfish output, and unchanged governor rules.

**Future deterministic demo fixture — deferred:** use a clearly labeled development/test-only setup with a known FEN, eligible move count, governor-compatible prior state, and deterministic Stockfish trigger condition. After seeding, use the normal answer, move, finish, summary, Dream Cycle, and Brain APIs. Never write fixture evidence into production learner data.

## 14. Acceptance criteria (MVP done)

- [x] Import via Chess.com username and JSON PGN text; pure imported seeds remain seed-only and cannot confirm a learner hypothesis. Multipart file upload is deferred.
- [ ] Playable Think First game vs training engine; server persists canonical FEN/move history, exposes honest engine mode below the UCI Elo floor, interruptions fire only after server confirmation; max 5; no eval/hints anywhere mid-game.
- [ ] Answers stored as episodes; post-game reveal shows thinking-vs-key-idea with Stockfish-checked lines.
- [x] Brain dashboard: skills with mastery or "Not enough evidence," hypotheses as states, aggregate persisted provenance, and belief changes. Dedicated episode-level Why UI is deferred.
- [ ] Dream cycle runs at session end; `belief_changes` timeline visible; idempotent.
- [ ] `BUILD_LOG.md` documents the agentic workflow honestly.
- [x] Deployed live; README has deployment links and architecture diagrams. A recorded demo artifact remains optional follow-up work.

## 15. Original execution plan reconciliation

The shipped prototype includes the repository scaffold, migrations, four transfer seeds, server-owned move loop, Chess.com and JSON PGN import, server Stockfish analysis, trigger detectors, governor, Socratic modal, episode lifecycle, grader, belief updater, Dream Cycle, Brain dashboard, tests, documentation, and deployment.

The original plan's Lichess import script, roughly 60-position bank, multipart upload, dedicated Why UI, dedicated learning-path API, and completed learner study were not shipped. They are deferred rather than implied by this specification.

---

## 16. Implementation invariants

These are release blockers:

1. **Fixed evaluation perspective:** stored engine scores are White-relative; all learner deltas normalize to `player_color`.
2. **Server owns the game:** a session is reconstructable from Postgres after process restart; no in-memory board object is authoritative.
3. **Server owns interruptions:** the frontend never displays a Socratic question until a canonical `prompted` episode exists.
4. **Episode lifecycle is staged:** `prompted → answered → committed → graded`; later fields are nullable until their stage.
5. **Engine-strength honesty:** never claim an Elo the installed Stockfish build cannot honor.
6. **Thinking hypotheses need predicates:** trigger type alone never proves a causal thinking pattern.
7. **Dream Cycle runs once:** `dream_cycle_runs` prevents duplicate belief mutation.
8. **Imported seeds are visibly provisional:** import can suggest a possible pattern, never confirm learner intent.

## 17. Docs expectations

- `docs/ARCHITECTURE.md` — the 7-step pipeline as built, the Iron Rule as code constraints, data flow diagram.
- `docs/DECISIONS.md` — important judgment calls with date and reason, including the server-authoritative Stockfish design.
- `BUILD_LOG.md` — daily entries describing what agents did, what the human changed, and what broke; it is the public record of the agentic workflow.
