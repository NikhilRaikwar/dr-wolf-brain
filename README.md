# Dr. Wolf Brain

> An AI chess coach that learns how you think.

Dr. Wolf Brain is a personalized chess coach that goes beyond standard engine blunder checks.

Instead of only telling you the best move, it runs **Think First** live sessions, captures how you reason at critical positions, and builds an evidence-backed model of your chess thinking over time.

---

## The Core Thesis

- **Imported games** observe **WHAT** happened on the board.
- **Think First sessions** observe **WHY** you made the decision.
- **The learner model** only makes claims strictly supported by persisted evidence.

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

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide icons.
- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0, Alembic, python-chess.
- **Persistence**: PostgreSQL 16 (production) / SQLite (isolated local unit tests).
- **Engine Authority**: Stockfish 16+ binary at `/usr/games/stockfish` (Debian container) or local PATH / override.

---

## Recruiter / 60-Second Demo Path

1. **Onboarding / Landing**:
   - Visit `/` and select **Continue as Learner**.
   - A real player profile is initialized (`POST /api/player`).
2. **Real Brain Dashboard (Honest Zero-Data State)**:
   - Visit `/brain`. Notice that all concepts state *"Not enough evidence yet"*. Zero fabricated data.
3. **Live Think First Session**:
   - Go to `/play` and play moves.
   - At tactical or developmental tension, Dr. Wolf pauses the eval and poses a Socratic question (*"What is your plan here?"*).
   - Answer the prompt, commit the move, and finish the session.
4. **Post-Session Review**:
   - Inspect the game review showing where *Right Move != Right Reasoning*.
   - Trigger the **Dream Cycle** to synthesize session evidence into persistent learner beliefs.
5. **Why Did You Ask Me That?**:
   - Inspect the provenance card in the dashboard to see exact historical evidence justifying the coach's inquiry.
6. **Import Real Games**:
   - Go to `/games` and import via Chess.com public username or PGN text.
   - Stockfish evaluates positions bounded to $\le 12$ critical positions per game at depth 18 ($\le 24$ engine calls/game). Factual move quality evidence updates the learner profile without inventing reasoning claims.

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
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Required Environment Variables

| Variable | Target | Purpose | Production Source |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Backend | PostgreSQL connection string | Managed PostgreSQL (Railway / Supabase / RDS) |
| `STOCKFISH_PATH` | Backend | Path to executable Stockfish binary | Path in container (e.g. `/usr/games/stockfish` or `stockfish`) |
| `OPENROUTER_API_KEY` | Backend | OpenRouter API Key for Socratic LLM wording | OpenRouter Secret Key |
| `OPENROUTER_MODEL` | Backend | LLM model identifier | e.g. `openai/gpt-4o-mini` |
| `CORS_ORIGINS` | Backend | Allowed CORS origins | Frontend deployment URL (e.g. `https://dr-wolf-brain.vercel.app`) |
| `BACKEND_API_URL` | Frontend | Backend origin URL for Next.js API route proxying | Backend deployment origin (e.g. `https://dr-wolf-api.up.railway.app`) |

---

## Security & Prototype Identity Boundaries

> **Prototype Data Scoping**: Player UUID (`player_id`) provides local data scoping across database queries. It does **not** provide authenticated account ownership or authorization against a user who knows or submits another player's UUID. Full production authentication (OAuth / JWT) remains future work.

---

## Verification & Test Suite

- **Pytest (Backend)**: 155 unit tests + 5 PostgreSQL concurrency tests in CI.
- **TypeScript**: `npm run typecheck` passes with zero errors.
- **Chess Example Verifier**: `npm run verify:chess` validates all landing mockups and FENs.
- **Production Build**: `npm run build` succeeds cleanly.

---

## Status

Independent research prototype exploring evidence-based personalized chess pedagogy. Not an official Chess.com product.

