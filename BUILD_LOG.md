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

## Milestone 4: Deterministic Think First Interruption & Episode Lifecycle
- **Date:** 2026-09-27
- **Focus:** Built the deterministic Think First trigger detection pipeline, interruption governor, curated question bank, Socratic UI modal, and staged episode lifecycle (`prompted → answered → committed`).
- **Decisions & Implementation:**
  - **Deterministic Trigger Authority (`triggers.py`):**
    - Implemented 5 canonical v1 trigger families: `opponent_threat`, `hanging`, `king_safety`, `forcing_candidate`, and `passive_piece` (low priority).
    - Every detector outputs structured, auditable evidence records with engine facts and target concept mapping from `concepts.py`.
    - No LLM calls are involved in trigger detection or chess truth.
    - All evaluation comparisons use fixed-perspective normalization: `eval_for_color(analysis, player_color)`.
  - **Deterministic Interruption Governor (`governor.py`):**
    - Enforced strict pedagogical constraints: maximum 5 interruptions per session, no interruptions in early opening (< move 8), minimum spacing of 6 moves between interruptions, no consecutive repetition of the same trigger type, and automatic suppression on terminal or dead/drawn positions.
    - Governor tie-breaks strictly using static trigger priorities (`opponent_threat`=0, `hanging`=1, `king_safety`=2, `forcing_candidate`=3, `passive_piece`=4) without fabricated learner weakness priors.
  - **Why Frontend Cannot Trigger Interruption Independently:**
    - The browser is never authoritative for coaching interruptions.
    - All interruptions are generated server-side during the canonical `POST /api/session/{id}/move` lifecycle after engine reply calculation.
    - The server transactionally inserts a `prompted` episode into PostgreSQL, binds server-stored question metadata, and returns the interruption payload. The client displays `SocraticModal` only in response to this confirmed server event.
  - **Curated Question Bank (`questions.py`):**
    - Implemented stable question IDs: `opponent_threat_counterplay`, `hanging_under_attack`, `king_safety_compare_kings`, `forcing_candidate_another_candidate`, `passive_piece_least_active`.
    - Each entry provides exactly 4 structured options (shuffled for display), with the correct target concept always present alongside 3 plausible distractors.
  - **Staged Episode Lifecycle:**
    - `prompted`: Created on server interruption with `trigger_evidence` populated. Staged fields (`learner_reasoning`, `learner_action`, `engine_truth`, `reasoning_outcome`, `move_outcome`) remain null.
    - `answered`: `POST /api/session/{id}/interrupt/{episode_id}/answer` accepts client `ReasoningAnswer`, validates option selection against server question definition, merges server question metadata, and transitions episode status to `answered`.
    - `committed`: On the player's next move submitted to `POST /api/session/{id}/move`, the server binds `learner_action = {"move_played": player_move}` and advances status to `committed`.
  - **Parchment Socratic Modal (`components/SocraticModal.tsx`):**
    - Built modal in authentic Dr. Wolf parchment styling with Dr. Wolf portrait, question text, 4 structured radio choices, and optional free-text rationale.
    - Displays no evaluation bar, no best move arrow, no engine lines, and no correctness verdict mid-game.
  - **Rejected / Adjusted Suggestions:**
    - *Rejected:* Client-side guessing of question IDs or option validity. Enforced server-authoritative question retrieval and option validation.
    - *Rejected:* Premature reasoning grading or mastery updating. Cleanly scoped this milestone to terminate at `committed` status.
## Milestone 5: Reasoning Grader & Engine Truth
- **Date:** 2026-09-27
- **Focus:** Built canonical engine truth capture, deterministic reasoning grader, move outcome evaluation, constrained LLM free-text interpreter, and the summary grading lifecycle (`committed → graded`).
- **Decisions & Implementation:**
  - **Core Product Rule: Right Move != Right Reasoning:**
    - A player can find the best move through lucky instinct or tactical calculation while misidentifying the underlying theme (e.g. Case B: best move + missed reasoning).
    - A player can correctly diagnose an opponent's tactical threat but blunder the execution move (e.g. Case A: mistake move + recognized reasoning).
    - Reasoning outcome (`recognized` | `partial` | `missed`) and move outcome (`best` | `acceptable` | `inaccurate` | `mistake`) are graded independently and never collapsed into a composite score.
  - **Stockfish Owns Move Truth (`compute_engine_truth` & `compute_move_outcome`):**
    - Computed strictly from the episode's canonical pre-move FEN using `StockfishAdapter`.
    - Engine evaluations remain invariant White-relative integers (`best_eval_white_cp`, `played_eval_white_cp`).
    - Centipawn loss (`cp_loss`) is calculated with learner-perspective normalization via `calculate_cp_loss(...)`:
      - $\le 15\text{ cp}$: `best`
      - $\le 60\text{ cp}$: `acceptable`
      - $\le 150\text{ cp}$: `inaccurate`
      - $> 150\text{ cp}$: `mistake`
    - Preserved forced mates yield $0\text{ cp}$ loss (`best`); blundering a forced mate yields severe deterioration $> 150\text{ cp}$ (`mistake`).
  - **Deterministic Code Owns Final Reasoning Grade (`grade_reasoning`):**
    - Question metadata is resolved server-side from `episode.trigger_type`, `question_id`, and canonical `QUESTION_BANK`.
    - `concept_match`: boolean indicating if the selected option corresponds to the engine fact's target concept.
    - `square_match`: non-empty intersection of highlighted squares (`squares_highlighted`) and engine fact key squares (`key_squares`).
    - `piece_match`: explicit square matching corresponding to key pieces (no brittle prose parsing).
    - **Anti-Click-Farming Rule:** Selecting the correct multiple-choice option alone yields `partial` at most; `recognized` requires concrete visual or textual evidence (`square_match OR piece_match OR identified_concrete_threat OR identified_relevant_piece`).
    - **Contradiction Override:** If the learner's free text contradicts engine truth (`contradicts_engine_truth = True`), the outcome is strictly forced to `missed` regardless of matching squares.
  - **Constrained LLM Free-Text Interpreter (`LLMClient`):**
    - Transport: OpenRouter API.
    - Strict Pydantic output schema: `FreeTextGrade` (`supports_engine_concept`, `contradicts_engine_truth`, `identified_concrete_threat`, `identified_relevant_piece`, `evidence_phrase`).
    - System prompt strictly constrains the LLM to interpreting learner prose against provided chess facts without inventing facts or issuing final verdicts (`recognized`/`partial`/`missed`).
    - **LLM Failure Policy:** 2 schema-valid retries before falling back to a conservative zero-credit default (`FreeTextGrade` with all booleans `False`). Grading never fails or halts when the LLM is down.
  - **No `line_match` in v1:**
    - v1 has no variation-entry UI. The grader schema contains no `line_match` field or hidden line parser.
  - **Fail-Closed Engine Failure Policy:**
    - If Stockfish fails during grading, the transaction fails closed, the episode status remains `committed`, and the endpoint returns HTTP 503 without persisting unverified chess data.
  - **Mid-Game UI Integrity:**
    - No mid-game grading verdict, engine lines, centipawn loss, or best move suggestions are revealed during live play.
