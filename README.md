# Dr. Wolf Brain

> An AI chess coach that learns how you think.

Dr. Wolf Brain is a personalized chess coaching architecture that goes beyond standard post-game engine blunder checks.

Instead of only telling you the best move, it runs **Think First** live sessions, captures how you reason at critical positions, and builds an evidence-backed model of your chess thinking over time.

---

## 🌐 Public Live Deployments

- **Frontend (Vercel)**: [https://dr-wolf-brain.vercel.app](https://dr-wolf-brain.vercel.app)
- **Backend (Render)**: [https://dr-wolf-brain-api.onrender.com](https://dr-wolf-brain-api.onrender.com)
- **API Health Check**: [https://dr-wolf-brain.vercel.app/api/health](https://dr-wolf-brain.vercel.app/api/health)

---

## The Core Thesis

- **Imported games** observe **WHAT** happened on the board.
- **Think First sessions** observe **WHY** you made the decision.
- **The learner model** only makes claims strictly supported by persisted evidence.

```
"Remembering the player is easy.
 Knowing what deserves to become a belief about the player is the hard part."
```

---

## Architectural Authority Boundaries

To eliminate hallucinations and maintain strict pedagogical integrity:

| Subsystem | Authority Responsibility |
| :--- | :--- |
| **Stockfish 16+** | Owns chess truth, objective evaluations, multi-PV candidate lines, and CP losses. |
| **Persisted Evidence** | Owns learner observations, supporting/contradicting episodes, and position records. |
| **Deterministic State & Math** | Owns session FEN progression, belief updater (decay, confidence, mastery), and trigger governor. |
| **LLM (OpenRouter / GPT-4o-mini)** | Owns pedagogical wording and Socratic dialogue framing — never chess truth or state. |

---

## Architecture Summary

```
   [ Chess.com Public API / PGN ]               [ Live Think First Play ]
                 │                                         │
                 ▼                                         ▼
   Bounded Stockfish Analysis (d=18)             Stockfish Play (d=14) + Trigger Governor
                 │                                         │
                 ▼                                         ▼
   Factual Position Evidence (WHAT)              Socratic Episode Interruption (WHY)
                 │                                         │
                 └───────────────┬─────────────────────────┘
                                 ▼
                    Deterministic Dream Cycle
                                 │
                                 ▼
                     Learner Belief State
                                 │
                                 ▼
                  Real Brain Learner Dashboard
```

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide icons (deployed on Vercel).
- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0, Alembic, python-chess (deployed in Debian Docker on Render).
- **Persistence**: PostgreSQL 16 on Render (production) / SQLite (isolated local unit tests).
- **Engine Authority**: Stockfish 17 binary at `/usr/games/stockfish` in Debian container.

---

## Recruiter / 60-Second Demo Path

1. **Onboarding / Landing**:
   - Visit [`https://dr-wolf-brain.vercel.app`](https://dr-wolf-brain.vercel.app) and select **Continue as Learner**.
   - A real, server-authoritative player profile is initialized in PostgreSQL (`POST /api/player`).
2. **Real Brain Dashboard (Honest Zero-Data State)**:
   - Visit `/brain`. Notice that all concepts state *"Not enough evidence yet"* and hypotheses remain unconfirmed. Zero fabricated data.
3. **Factual Game Import**:
   - Go to `/games` and paste a small PGN (e.g. `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 1-0`).
   - Stockfish evaluates positions bounded to $\le 12$ critical positions per game at depth 18. Factual move quality evidence updates the learner profile without inventing reasoning claims.
4. **Inspect Evidence Attribution in Dashboard**:
   - Return to `/brain`. Notice factual move evidence counts updated, while reasoning-only hypotheses remain unseeded.
5. **Live Play Session & Stockfish Engine**:
   - Go to `/play` and play legal moves against Stockfish.
   - Click **Finish Game** once complete.
6. **Session Review & Dream Cycle**:
   - Trigger the **Dream Cycle** (`POST /api/dream-cycle`) to synthesize session evidence into persistent learner beliefs and derive the next focus.

---

## Think First Interruption Lifecycle

Think First is implemented as a server-authoritative, governed interruption system:
- **Interruption Governor**: Suppresses interruptions during early opening (`move_number < 8`) and enforces minimum 6-move spacing.
- **Trigger Gating**: Evaluates concrete candidate features (opponent threats, hanging pieces, king safety, forcing candidates, passive piece activations).
- **Epistemic Isolation**: A natural live unscripted opening is suppressed by design; full lifecycle transitions (`prompted` $\rightarrow$ `answered` $\rightarrow$ `committed` $\rightarrow$ `graded`) are deterministically verified in the backend test suite.

---

## Game Import & Epistemic Boundaries

- **Chess.com Public Import**:
  - `MAX_CHESSCOM_GAMES = 50`
  - `MAX_ARCHIVES_TO_FETCH = 12`
  - `MAX_POSITIONS_PER_GAME = 12`
  - Bounded Stockfish analysis at depth 18 ($\le 24$ calls/game).
- **Attribution & Deduplication**:
  - Deterministic player side attribution (color matching or learner name).
  - Migration 004 unique constraints: `uq_game_player_source_external_ref` on `(player_id, source, external_ref)` and `uq_position_game_move_fen` on `(game_id, move_number, fen)`.
  - Duplicate imports are safely skipped with zero duplicated positions or evidence records.
- **Compute Infrastructure Note**:
  - On prototype free-tier infrastructure (0.1 vCPU), deep sequential Stockfish analysis across long 60+ move games can exceed cloud HTTP gateway timeouts. Small PGN imports execute reliably in 3–5 seconds.

---

## Local Development Setup

### 1. Requirements
- Node.js 20+ & pnpm / npm
- Python 3.12+
- Stockfish binary installed and available in PATH (or configured via `STOCKFISH_PATH`)
- Docker (for local PostgreSQL instance)

### 2. Backend Setup
```bash
# Start PostgreSQL
docker-compose up -d

# Create virtual environment & install dependencies
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate | On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
# In the root directory:
pnpm install
pnpm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Required Environment Variables

| Variable | Target | Purpose | Production Source |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Backend | PostgreSQL connection string | Render PostgreSQL (`dpg-...`) |
| `STOCKFISH_PATH` | Backend | Path to executable Stockfish binary | `/usr/games/stockfish` in Debian container |
| `OPENROUTER_API_KEY` | Backend | OpenRouter API Key for Socratic LLM wording | OpenRouter Secret Key |
| `OPENROUTER_MODEL` | Backend | LLM model identifier | `openai/gpt-4o-mini` |
| `CORS_ORIGINS` | Backend | Allowed CORS origins | `https://dr-wolf-brain.vercel.app,http://localhost:3000` |
| `BACKEND_API_URL` | Frontend | Backend origin URL for Next.js API route proxying | `https://dr-wolf-brain-api.onrender.com` |

---

## Security & Prototype Identity Boundaries

> **Prototype Data Scoping**: Player UUID (`player_id`) provides local data scoping across database queries. It does **not** provide authenticated account ownership or authorization against a user who knows or submits another player's UUID. Full production authentication (OAuth / JWT) remains future work.

---

## Verification & Test Suite

- **Pytest (Backend)**: 155 unit tests + 5 PostgreSQL concurrency tests in CI.
- **TypeScript**: `pnpm run build` passes with zero errors across 14 static routes.
- **Chess Example Verifier**: `pnpm run verify:chess` validates all landing mockups and FENs.
- **Production Deployment**: Verified live on Vercel and Render.

---

## Status

Independent research prototype exploring evidence-based personalized chess pedagogy. Not an official Chess.com product.
