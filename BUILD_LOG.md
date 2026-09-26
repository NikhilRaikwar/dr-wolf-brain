# Agentic Build Log — Dr. Wolf Brain

> Day-by-day record of product decisions, agent prompts, and architecture evolution.

---

## Milestone 1: Visual Identity & Landing Experience
- **Date:** 2026-09-26
- **Focus:** Developed the initial parchment/editorial visual system for the Dr. Wolf Brain prototype.
- **Decisions & Implementation:**
  - Implemented vintage parchment aesthetic with serif typography (`Newsreader`, `EB Garamond`, `Plus Jakarta Sans`).
  - Integrated CBurnett vector chess piece set (Wikimedia Commons / Lichess source) for crisp rendering.
  - Implemented responsive chessboard component with coordinate margin rendering and mathematical move arrow overlays.
  - Formulated strict truth boundary architecture separating Stockfish chess evaluation from LLM pedagogy.

## Milestone 2: Truthfulness, Chess Validation & Specification Alignment
- **Date:** 2026-09-26
- **Focus:** Strict truthfulness, legal chess validation, and canonical documentation synchronization.
- **Decisions & Implementation:**
  - Standardized all landing positions into `lib/landingExamples.ts` with FEN strings.
  - Added `scripts/verify-landing-chess.mjs` with `chess.js` to automatically assert FEN syntax, king counts, and move legality (e.g. `Nb1-c3`).
  - Aligned review section tabs to `Review` / `Evidence` / `Engine Lines` with honest illustrative labels.
  - Updated Think First Socratic question to canonical trigger family (`opponent_threat`: *"Before you move — what is your opponent threatening?"*).
  - Synchronized canonical `PRD.md` (v1.4 FINAL) and `BUILD_SPEC.md` (v1.1 CANONICAL FINAL).
  - Added `NOTICE.md` with proper asset and vector licensing attribution.

## Milestone 3: Server-Authoritative Chess Session Loop & Core Architecture
- **Date:** 2026-09-26
- **Focus:** Built the server-authoritative chess vertical slice (`/play` loop, StockfishAdapter, DB models, API contracts, session persistence, and state recovery).
- **Decisions & Implementation:**
  - **Server Owns Canonical Game State:**
    - The browser is strictly a client. Every player move is transmitted to `POST /api/session/{id}/move`, validated against `python-chess` on the server, pushed to the board, matched with a canonical engine response, and committed transactionally to `sessions.current_fen`, `sessions.moves_uci`, and `sessions.ply_count`.
    - Browser crashes or page refreshes query `GET /api/session/{id}/position` to reconstruct the exact server-verified position.
  - **Why Browser Engine/State Cannot Be Authority:**
    - Epistemological integrity requires that learner evidence (episodes, reasoning outcomes, and belief updates) derive from a deterministic, unforgeable sequence of moves.
    - If the browser held move authority, client timing jitter, browser WASM variance, or race conditions could desynchronize learner episodes from real chess truth.
  - **Engine Elo Floor & Honest Labeling:**
    - Stockfish's UCI Elo limiter requires a minimum of ~1320 Elo. For beginner ratings (e.g., requested 900 Elo for an 800-rated learner), `StockfishAdapter.configure_limited(900)` honestly sets `engine_mode="custom_beginner"` (or `skill_floor`) and `effective_elo=None`.
    - `custom_beginner` uses Stockfish Multi-PV candidate analysis at depth 5, sampling 70% top Stockfish candidate (#1) and 30% second Stockfish candidate (#2) when available. It never uses random or unverified heuristic moves.
    - If Stockfish is unavailable or binary execution fails, the backend strictly fails closed with typed `EngineUnavailableError` returning HTTP 503 ("Training engine is temporarily unavailable.") and rolls back the database transaction.
  - **Fixed Evaluation Perspective Normalization:**
    - Stored engine evaluations are invariant White-relative integers (`eval_white_cp`, `mate_white`).
    - All delta calculations use `eval_for_color(result, player_color)` rather than naive side-to-move subtractions, preventing perspective inversion bugs.
  - **Rejected / Adjusted Suggestions:**
    - *Rejected:* Storing board state purely in memory or client local storage. Enforced strict PostgreSQL/SQLAlchemy DB persistence.
    - *Rejected:* Falling back to arbitrary heuristics or random legal moves when the chess engine fails. Enforced fail-closed HTTP 503 response.
    - *Rejected:* Prematurely triggering client-side mock interruptions. Strictly adhered to BUILD_SPEC vertical slice ordering so interruptions only fire after full trigger pipeline integration.

