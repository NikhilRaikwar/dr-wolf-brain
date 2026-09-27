# Dr. Wolf Brain — Dashboard Data Authority & Truth Boundaries

This document defines the authoritative data source, lifecycle state, and truthful empty/error behavior for every dashboard route and UI metric. It serves as the permanent contract preventing UI fabrication.

---

## Canonical Registered Backend Endpoints

The following are the exact registered FastAPI endpoints and HTTP methods from `backend/app/main.py` and `backend/app/routers/`:

| Method | Exact Path | Router / Tag | Purpose & Contract |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Root | Health check endpoint (`{"status": "ok", "app": "Dr. Wolf Brain"}`). |
| `POST` | `/api/session/start` | `session` | Creates canonical server session with limited Stockfish rating. |
| `GET` | `/api/session/{session_id}/position` | `session` | Reads canonical DB-backed session state (`fen`, `turn`, `interruption`). |
| `POST` | `/api/session/{session_id}/interrupt/{episode_id}/answer` | `session` | Stores learner reasoning; advances episode `prompted` → `answered`. |
| `POST` | `/api/session/{session_id}/move` | `session` | Validates player move, runs engine reply, triggers Socratic interruption. |
| `GET` | `/api/session/{session_id}/summary` | `session` | Grades episodes with Stockfish, executes Dream Cycle, returns summary. |
| `POST` | `/api/dream-cycle` | `dream-cycle` | Runs idempotent Dream Cycle belief consolidation (`{"session_id": "..."}`). |
| `GET` | `/api/brain` | `brain` | Aggregates learner profile, skill masteries, hypotheses, focus, citations. |

---

## Authority Tiers

1. **Tier 1 — Canonical Backend Data (Real Mode)**: Grounded strictly in PostgreSQL tables, deterministic Grader outputs, Stockfish engine truth, or SQLite DB records via FastAPI endpoints (`/api/brain`, `/api/session/*`, `/api/dream-cycle`).
2. **Tier 2 — Explicit Demo Data (Demo Mode Only)**: Grounded in deterministic fixtures (`lib/demo/brainDemoData.ts`), rendered strictly when `?demo=1` is provided. Must display a prominent `DEMO DATA ACTIVE` banner.
3. **Tier 3 — Not Implemented / Honest Empty State**: UI features where backend data models or scheduled jobs do not exist yet. Rendered as honest empty states or labeled "Coming Soon", never as fabricated mock metrics.

---

## Route-by-Route Data Matrix

### 1. Overview & Your Chess Brain (`/overview`, `/brain`)

| UI Metric / Field | Authoritative Source | Real Mode Behavior | Demo Mode (`?demo=1`) | Empty / Failure State |
| :--- | :--- | :--- | :--- | :--- |
| **Sessions Played** | `sessions` table via `GET /api/brain` | Computed real count (`COUNT(Session)`) | `3` | `0` |
| **Episodes Analyzed** | `episodes` table via `GET /api/brain` | Computed real count (`Episode.status == 'graded'`) | `12` | `0` |
| **Last Updated** | Max timestamp (`Player`, `DreamCycleRun`, `Skill`, `BeliefChange`) | ISO timestamp formatted to relative date | `Today` | Neutral date or `--` |
| **Player Username** | `Player.chesscom_username` | Real username from DB | `Alex (Demo)` | `Learner` |
| **Player Rating** | `Player.estimated_rating` | Real rating number | `1600 Rapid` | `Unrated` |
| **Skill Mastery (5 skills)** | `skills` table (`Skill.mastery_score`) | Real score `[0..100]` (green ≥ 65, gold < 65) | 74, 61, 68, 57, `null` | `null` renders *"Not enough evidence yet"* (never 0) |
| **Thinking Patterns (3)** | `hypotheses` table (`Hypothesis.state`) | Deterministic state (`needs_evidence`, `developing`, `well_supported`) | 3 approved patterns | `Needs evidence` with 0 observations |
| **Current Focus** | Latest `DreamCycleRun.result_json.next_focus` | Real skill concept chosen by Dream Cycle CAS | `opponent_threat_detection` | Lowest mastery skill with evidence or None |
| **Why Asked Citations** | `episodes.trigger_evidence` | Real episode IDs and move numbers | Episodes `#14`, `#21`, `#28`, `#31` | Honest empty state |
| **Recent Sessions** | `sessions` + `episodes` query | Real last 3 sessions with outcome counts | 3 demo sessions | *"No Sessions Recorded"* empty card |
| **Recent Belief Updates** | `belief_changes` table | Real log of DB mutations | 2 demo updates | *"No Updates Recorded"* empty card |

---

### 2. Think First Training (`/train`, `/play`)

| UI Metric / Field | Authoritative Source | Real Mode Behavior | Demo Mode (`?demo=1`) | Empty / Failure State |
| :--- | :--- | :--- | :--- | :--- |
| **Session Initialization** | `POST /api/session/start` | Creates server-authoritative session with Stockfish Elo | Local isolated demo board | **Error Screen**: Backend unavailable with Retry and Demo option |
| **Chess Moves & Engine Reply**| `POST /api/session/{id}/move` | Validated by `python-chess` & Stockfish engine | Isolated client move validation | Move rejection toast with error message |
| **Socratic Question** | `POST /api/session/{id}/interrupt/{ep_id}/answer` | Server evaluates trigger criteria | Local puzzle dataset (5 episodes) | Pauses game until answered |
| **Answer Submission Feedback**| Epistemic rule | Moves episode `prompted` → `answered`. **No grading revealed** until move is committed | Moves to move commitment | Never reveals correctness before move |

---

### 3. Your Games (`/games`)

| UI Metric / Field | Authoritative Source | Real Mode Behavior | Demo Mode (`?demo=1`) | Empty / Failure State |
| :--- | :--- | :--- | :--- | :--- |
| **Imported Games List** | `sessions` table (where imported) | Real game history rows | 8 sample games | *"No Imported Games Yet"* with Connect CTA |
| **Accuracy Score** | Not yet in DB | Omitted / Coming Soon | Demo-only percentages | Omitted |
| **Opening Classification** | PGN Header / Stockfish | Real ECO / opening string if present | Demo opening names | Neutral *"Standard Game"* |

---

### 4. Insights (`/insights`)

| UI Metric / Field | Authoritative Source | Real Mode Behavior | Demo Mode (`?demo=1`) | Empty / Failure State |
| :--- | :--- | :--- | :--- | :--- |
| **Recurring Themes** | `hypotheses` with `state == 'well_supported'` | Derived from real DB hypotheses | 2 demo themes | *"No Recurring Themes Identified"* |
| **Top Missed Ideas** | `episodes` with `reasoning_outcome == 'missed'` | Derived from real missed episodes | 2 demo tactical missed ideas | *"No Missed Tactics Recorded"* |
| **Key Strengths** | `skills` with `mastery_score >= 65` | Derived from real high-mastery skills | 2 demo strengths | *"Developing initial baseline"* |
| **Needs Attention** | `skills` with `mastery_score < 60` or declining | Derived from lowest mastery skills | 2 demo focus areas | *"Gathering evidence"* |

---

### 5. Progress (`/progress`)

| UI Metric / Field | Authoritative Source | Real Mode Behavior | Demo Mode (`?demo=1`) | Empty / Failure State |
| :--- | :--- | :--- | :--- | :--- |
| **Learning Path Stepper** | Current Focus stage | Stage 1..5 mapped from latest Dream Cycle | Stage 2 (Recognize) | Stage 1 (Understand) |
| **Mastery Sparklines** | Historical `belief_changes` | Plotted from real `belief_changes` timestamps | 14-day demo trends | Flat baseline trend |
| **Milestones** | Sessions & Episodes count | Earned dynamically (`>= 1 session`, `>= 10 episodes`) | 3 earned badges | Locked badge placeholders |

---

### 6. Settings (`/settings`) & Help (`/help`)

| UI Metric / Field | Authoritative Source | Real Mode Behavior | Demo Mode (`?demo=1`) | Empty / Failure State |
| :--- | :--- | :--- | :--- | :--- |
| **Profile Info** | `Player` table | Real `chesscom_username` and `estimated_rating` | `Alex`, `1600` | Editable local preferences |
| **Dream Cycle Scheduler** | Manual trigger (`POST /api/dream-cycle`) | Manual run active; auto-cron marked *"Coming Soon"* | Demo toggle | Explicit *"Manual Trigger via API"* label |
| **Documentation & Guides** | Static Help Knowledge Base | Full Markdown guides and FAQ accordions | Full Help Center | Static guides always available |

---

## Verification Rules

1. **No Silent Fallback**: Live network errors (`fetch` failures or 500s) must render an Error screen with a Retry button, not fake analytics.
2. **Explicit Opt-In**: Demo data is unlocked strictly by `?demo=1`.
3. **Banner Visibility**: When `?demo=1` is active, the `DemoBanner` component is rendered at the top of the viewport.
4. **Epistemic Invariance**: Neither UI nor LLM phrasing can contradict Stockfish chess truth or database belief scores.
