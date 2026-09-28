# Dr. Wolf Brain — Dashboard Data Authority & Truth Boundaries

This document defines the authoritative data source, lifecycle state, and truthful empty/error behavior for every dashboard route and UI metric. It serves as the permanent contract preventing UI fabrication.

---

## Canonical Registered Backend Endpoints

The following are the exact registered FastAPI endpoints and HTTP methods from `backend/app/main.py` and `backend/app/routers/`:

| Method | Exact Path | Router / Tag | Purpose & Contract |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Root | Health check endpoint (`{"status": "ok", "app": "Dr. Wolf Brain"}`). |
| `POST` | `/api/player` | `player` | Explicitly creates a new Player row with a fresh UUID (chesscom_username is optional metadata, not a lookup key). |
| `GET` | `/api/player/{player_id}` | `player` | Fetches canonical player record by ID. |
| `POST` | `/api/session/start` | `session` | Creates canonical server session with limited Stockfish rating. |
| `GET` | `/api/session/{session_id}/position` | `session` | Reads canonical DB-backed session state (`fen`, `turn`, `interruption`). |
| `POST` | `/api/session/{session_id}/interrupt/{episode_id}/answer` | `session` | Stores learner reasoning; advances episode `prompted` → `answered`. |
| `POST` | `/api/session/{session_id}/move` | `session` | Validates player move, runs engine reply, triggers Socratic interruption. |
| `POST` | `/api/session/{session_id}/finish` | `session` | POST /finish is the explicit manual session-closing endpoint (idempotent), transitions status to `completed`, rejects future moves. |
| `GET` | `/api/session/{session_id}/summary` | `session` | Episode grading only on completed session with Stockfish, returns review cards (returns 409 if session still active; never closes sessions). |
| `POST` | `/api/dream-cycle` | `dream-cycle` | Runs idempotent Dream Cycle belief consolidation (evidence consolidation, skill/hypothesis updates, belief_changes, next_focus, persisted DreamCycleRun). |
| `GET` | `/api/brain` | `brain` | Aggregates learner profile, skill masteries, hypotheses, focus, citations. Strictly read-only; does not create orphan player rows. |
| `POST` | `/api/import/chesscom` | `import` | Imports historical games from Chess.com public API, parses PGN, analyzes with bounded Stockfish 18, persists Game/Position, seeds hypotheses, updates skills at 0.5x weight. |
| `POST` | `/api/import/pgn` | `import` | Imports and validates PGN string/file, analyzes key positions with Stockfish 18, persists Game/Position, seeds hypotheses, updates skills at 0.5x weight. |
| `GET` | `/api/games` | `games` | Lists real persisted imported games for player with analyzed moment counts. |
| `GET` | `/api/games/{game_id}` | `games` | Returns game detail and key analyzed positions with Stockfish engine evaluations. |

---

## Canonical Epistemic Architecture

- **Imported games = WHAT happened:** Observes board positions, best moves, centipawn losses, and tactical moments. Stockfish owns chess truth. Imported positions record an objective `skill_score` (`1.0`, `0.5`, `0.0`) and `performance_band` (`"successful"`, `"mixed"`, `"poor"`). They **never** emit reasoning outcomes (`recognized`/`partial`/`missed`).
- **Think First = WHY the learner made the decision:** Observes learner intent, attention, and cognitive choices through interactive Socratic questioning (`Episode.reasoning_outcome`: `recognized` $\rightarrow 1.0$, `partial` $\rightarrow 0.5$, `missed` $\rightarrow 0.0$).

### Epistemic Rules for Imported Data:
1. **Skill Evidence:** Contributes reduced weight (`1.0` for Think First, `0.5` for imported positions).
2. **Skill Score Resolution:** Think First derives from `Episode.reasoning_outcome`; imported games derive from `Position.engine.skill_score` (objective chess facts only).
3. **Hypothesis Evidence:** Imported positions may **ONLY SEED** hypotheses (`direction = 'seeds'`, `state = 'suspected'`). Seeds do not alter hypothesis confidence, do not increment Think First `observed_count`, and do not promote hypotheses to `developing`/`well_supported`.
4. **Never Support or Contradict:** Imported positions must **NEVER** write `direction = 'supports'` or `direction = 'contradicts'` for hypotheses (enforced by DB check constraint `no_import_hypothesis_claims`).
5. **No Synthetic Reasoning:** Imported games never create `Episode` entities or fabricate learner explanations.

---

## Canonical Session Closure & Dream Cycle Ownership

### Canonical Session Closure Paths:
1. **Natural Terminal Chess State:** Move processing (`POST /api/session/{id}/move`) detects checkmate / stalemate / draw, marks `session.status = "completed"`, and sets `ended_at`.
2. **Explicit Manual Action:** `POST /api/session/{id}/finish` is the explicit manual session-closing endpoint, marking `session.status = "completed"` and setting `ended_at`.
- **Invariant:** `GET /api/session/{id}/summary` **NEVER** closes an active session (returns `HTTP 409 Conflict` if session is active).

### Exact Ownership Separation:
- **`GET /api/session/{id}/summary`:** Owns **episode grading only** (grades `committed` episodes against Stockfish engine truth; leaves already `graded` episodes unchanged; returns review cards).
- **`POST /api/dream-cycle`:** Owns **evidence consolidation and learner model updates** (evidence records, deterministic skill and hypothesis updates, belief changelog, next focus CAS, and persisted `DreamCycleRun`).

---

## Milestone & Product Status

- **REAL LIVE-PLAY PATH:** `IMPLEMENTED` (Full server-authoritative live session loop, deterministic triggers, Socratic interruption modal, Stockfish grading, idempotent manual session finish, and Dream Cycle).
- **REAL IMPORT PATH:** `IMPLEMENTED` (Real Chess.com public API import, real PGN upload/parsing, bounded Stockfish 18 position analysis, Game/Position persistence, deduplication/idempotency, hypothesis seeding, and `/games` interactive UI).
- **MILESTONE BLOCKERS:** `NONE`.
- **FULL PRD STATUS:** Core server-authoritative live-play loop and real import pipeline fully implemented and verified.

---

## Prototype Auth Boundary & Claimed-Identity Note

- **Claimed-Identity Boundary:** Chess.com username is a user-supplied public game source, not authenticated account ownership. There is no proof or claim that the local user owns the entered public Chess.com username. The prototype uses public game data without claiming account linking or authentication.
- **Local Learner Identity:** The player UUID stored in client `localStorage` (`dr_wolf_player_id`) is a prototype local learner identity for v1 single-user/local workflows, **not** production authentication.
- **PGN Learner-Side Attribution Contract:** The Player UUID owns all imported data. In multi-game PGN imports, `learner_name` deterministically attributes which board side represents the learner by case-insensitively matching White and Black headers. Single-game imports additionally support explicit `learner_color = "white" | "black"`. Unmatched or ambiguous games are safely rejected with zero evidence generated.
- **Multi-Game Transaction Policy (Option B):** Implements per-game savepoint atomicity + factual partial success. Successful games commit; failed games roll back completely; response reports exact `games_found`, `games_imported`, `games_skipped_existing`, `games_failed`, and `failures: [{game_identifier, reason}]`.
- **No Secure Login Claimed:** The system does not claim multi-user auth, password hashing, or account ownership security in this pass.

---

## Authority Principles

1. **Strict Server Authority (100% Real Mode)**: Grounded strictly in PostgreSQL tables, deterministic Grader outputs, Stockfish engine truth, or SQLite DB records via FastAPI endpoints (`/api/brain`, `/api/session/*`, `/api/dream-cycle`, `/api/player`).
2. **Zero Fabricated Learner Data**: No fake usernames (Alex/Guest), no mock ratings (1600/1200), no synthetic sparklines, no hardcoded FENs used as user history.
3. **Honest Empty States**: Brand new users with 0 sessions see honest empty states ("Not enough evidence yet", "Needs evidence", "No sessions recorded"), with clear CTAs to play Think First sessions.
4. **Epistemic Invariance**: Right move != Right reasoning. Grader evaluates reasoning and move legality independently against Stockfish truth.

---

## Route-by-Route Data Authority

### 1. Overview & Your Chess Brain (`/overview`, `/brain`)

| UI Metric / Field | Authoritative Source | Real Mode Behavior | Empty / Initial State |
| :--- | :--- | :--- | :--- |
| **Sessions Played** | `sessions` table via `GET /api/brain` | Computed real count (`COUNT(Session)`) | `0` |
| **Episodes Analyzed** | `episodes` table via `GET /api/brain` | Computed real count (`Episode.status == 'graded'`) | `0` |
| **Player Username** | `Player.chesscom_username` | Real username from DB | `Learner` |
| **Player Rating** | `Player.estimated_rating` | Real rating number | `Unrated` / Initial Rating |
| **Skill Mastery (5 skills)** | `skills` table (`Skill.mastery_score`) | Real score `[0..100]` | `null` renders *"Not enough evidence yet"* |
| **Thinking Patterns (3)** | `hypotheses` table (`Hypothesis.state`) | Deterministic state (`needs_evidence`, `developing`, `well_supported`) | `Needs evidence` with 0 observations |
| **Current Focus** | Latest `DreamCycleRun.result_json.next_focus` | Real skill concept chosen by Dream Cycle CAS | Lowest mastery skill with evidence or None |
| **Why Asked Citations** | `episodes.trigger_evidence` | Real episode IDs and move numbers | Honest empty state with CTA |
| **Recent Sessions** | `sessions` + `episodes` query | Real last 3 sessions with outcome counts | *"No Sessions Recorded"* empty card |
| **Recent Belief Updates** | `belief_changes` table | Real log of DB mutations | *"No Updates Recorded"* empty card |

---

### 2. Think First Training (`/train`, `/play`)

| UI Metric / Field | Authoritative Source | Real Mode Behavior | Failure State |
| :--- | :--- | :--- | :--- |
| **Session Initialization** | `POST /api/session/start` | Creates server-authoritative session with Stockfish Elo | **Error Screen**: Backend unavailable with Retry |
| **Chess Moves & Engine Reply**| `POST /api/session/{id}/move` | Validated by `python-chess` & Stockfish engine | Move rejection toast with error message |
| **Socratic Question** | `POST /api/session/{id}/interrupt/{ep_id}/answer` | Server evaluates trigger criteria | Pauses game until answered |
| **Answer Submission Feedback**| Epistemic rule | Moves episode `prompted` → `answered`. **No grading revealed** until move is committed | Never reveals correctness before move |
| **Session Summary** | `GET /api/session/{id}/summary` | Grades committed episodes against Stockfish engine truth | Post-game modal with grading breakdown |
| **Dream Cycle Consolidation** | `POST /api/dream-cycle` | Consolidates evidence, updates skills & hypotheses | Updates DB learner records |

---

### 3. Your Games (`/games`)

| UI Metric / Field | Authoritative Source | Real Mode Behavior | Initial State |
| :--- | :--- | :--- | :--- |
| **Imported Games List** | `games` & `positions` tables via `GET /api/games` | Real imported game rows with Stockfish-analyzed moment counts | Honest empty state with Connect / Upload PGN CTAs |
| **Game Review Moments** | `positions` table via `GET /api/games/{id}` | Real FENs, concepts, and Stockfish engine evaluations | Modal review viewer with objective phrasing |

---

### 4. Insights (`/insights`)

| UI Metric / Field | Authoritative Source | Real Mode Behavior | Initial State |
| :--- | :--- | :--- | :--- |
| **Calibrated Hypotheses** | `hypotheses` table | Derived from real DB hypotheses & evidence counts | *"No Tactical Themes Calibrated Yet"* |
| **Skill Calibration** | `skills` table | Real mastery scores consolidated via Dream Cycle | *"Not enough evidence yet"* |

---

### 5. Progress (`/progress`)

| UI Metric / Field | Authoritative Source | Real Mode Behavior | Initial State |
| :--- | :--- | :--- | :--- |
| **Sessions & Episodes** | `sessions` & `episodes` | Real counts from DB | *"No Recorded Progress History Yet"* |
| **Belief Transitions** | `belief_changes` table | Real log of validated transitions | *"No belief transitions triggered yet"* |

---

### 6. Settings (`/settings`) & Help (`/help`)

| UI Metric / Field | Authoritative Source | Real Mode Behavior | Persistence |
| :--- | :--- | :--- | :--- |
| **Player Profile** | `Player` table & `localStorage` | Real `chesscom_username` and `estimated_rating` | Backend DB + `localStorage` |
| **Board Appearance** | Client state & `localStorage` | Classic, Green, Walnut, Dark themes | `localStorage` |
| **Documentation & Guides** | Static Architecture Guide | Explains Stockfish truth, Think First, Dream Cycle | Static guides |
