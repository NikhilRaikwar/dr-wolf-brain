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

## Milestone 6: Evidence & Belief Updater
- **Date:** 2026-09-27
- **Focus:** Built canonical evidence records, deterministic skill mastery updater, hypothesis meaningful-test updater, and belief changelog (`graded episodes → evidence records → belief changes`).
- **Decisions & Implementation:**
  - **No Invented Mastery Prior (`MIN_EVIDENCE_FOR_SCORE = 3`):**
    - Newly created skill rows start with `mastery_score = NULL`, `evidence_count = 0`, and `trend = "new"`.
    - No numeric mastery score is displayed until at least 3 qualifying evidence records exist for that skill concept.
    - Initial mastery is computed strictly from the weighted average of those first qualifying records (Think First = 1.0, Imported = 0.5):
      $$\text{mastery\_score} = \frac{\sum(\text{TF} \times 1.0) + \sum(\text{Imported} \times 0.5)}{\text{TF\_count} \times 1.0 + \text{Imported\_count} \times 0.5} \times 100$$
    - The minimum 3-evidence threshold applies to record count, not weighted count.
  - **Ongoing Skill Updates (Weighted Moving Averages):**
    - For new Think First evidence:
      $$\text{mastery\_new} = \text{clamp}(0.7 \times \text{mastery\_old} + 0.3 \times \text{session\_score}, 0, 100)$$
    - For new Imported evidence:
      $$\text{mastery\_new} = \text{clamp}(0.85 \times \text{mastery\_old} + 0.15 \times \text{import\_score}, 0, 100)$$
    - Outcome score mapping: `recognized` $\rightarrow 1.0$, `partial` $\rightarrow 0.5$, `missed` $\rightarrow 0.0$.
    - Mastery derives strictly from reasoning outcome, preserving the core thesis (*Right move != Right reasoning*). Move quality never alters skill mastery.
  - **Meaningful-Test Requirement for Hypotheses:**
    - Trigger type alone never proves a thinking-pattern hypothesis was tested.
    - `tunnel_vision_after_attack`: Candidate trigger `opponent_threat` is meaningful ONLY if learner previously expressed attacking intent (via attacking choice key, free-text keywords, or recent session choices).
    - `stops_calculating_early`: Candidate trigger `forcing_candidate` is meaningful ONLY when the canonical `forcing_candidate_another_candidate` question was selected.
    - `misses_defensive_resources`: Candidate trigger `hanging` is meaningful ONLY when the canonical `hanging_under_attack` question was selected.
    - Episodes failing the meaningful-test predicate do NOT increment `observed_count` and do NOT modify confidence.
  - **Hypothesis Confidence & State Progression:**
    - Only meaningful Think First tests modify confidence (+0.08 support / -0.12 contradict, clamped to [0.05, 0.95]).
    - State transitions:
      - $\text{observed\_count} < 3 \implies \mathbf{\text{suspected}}$
      - $\text{confidence} < 0.25 \implies \mathbf{\text{needs\_evidence}}$
      - $0.25 \le \text{confidence} \le 0.60 \implies \mathbf{\text{developing}}$
      - $\text{confidence} > 0.60 \implies \mathbf{\text{well\_supported}}$
  - **Strict Epistemology Rule on Imports:**
    - Imported positions may only seed hypotheses (`direction="seeds"`, `state="suspected"`).
    - The PostgreSQL CHECK constraint `no_import_hypothesis_claims` rejects any attempt by imported positions to `supports` or `contradicts` hypotheses.
  - **Auditable Belief Changelog & Idempotency:**
    - Every actual change to skill mastery, evidence count, hypothesis confidence, or state appends a deterministic row to `belief_changes`.
    - `process_new_graded_evidence` is fully idempotent: re-running against already-processed graded episodes performs 0 redundant writes and leaves all scores, counts, and changelogs unchanged.

## Milestone 7: Dream Cycle Orchestration
- **Date:** 2026-09-27
- **Focus:** Implemented the server-authoritative Dream Cycle pipeline (`Session End → Dream Cycle → Belief Consolidation → Session Summary Facts → Next Focus → Transfer Position Selection`).
- **Decisions & Implementation:**
  - **Core Epistemic Rule: The Dream Cycle Does NOT Decide Truth:**
    - The Dream Cycle coordinates existing deterministic components (`process_new_graded_evidence`, Stockfish truth, verified transfer position bank). It does not invent priors, compute new belief formulas, or alter verified evidence.
  - **Exactly-Once Consolidation & DB Authority (`dream_cycle_runs`):**
    - Enforced via PostgreSQL primary key `dream_cycle_runs(session_id PRIMARY KEY, ran_at)`.
    - The first invocation grades any committed episodes, calls `process_new_graded_evidence`, computes next focus, selects transfer positions, and records `dream_cycle_runs`.
    - Subsequent duplicate invocations or replays perform 0 mutations to skills, hypotheses, evidence records, or belief changes, and reconstruct the canonical result deterministically from persisted database state.
    - Concurrent duplicate run requests race safely at the database level: `IntegrityError` on the primary key constraint rolls back the conflicting transaction and returns the canonical replay result without raising HTTP 500 errors.
  - **No Hidden GET Mutations:**
    - `GET /api/session/{id}/summary` remains a read/inspection endpoint that grades committed episodes without mutating beliefs.
    - Belief consolidation occurs strictly via explicit `POST /api/dream-cycle`.
  - **Deterministic Session Summary Facts:**
    - Session facts are aggregated directly from graded episodes: `graded_episode_count`, `reasoning_counts` (`recognized`, `partial`, `missed`), `move_counts` (`best`, `acceptable`, `inaccurate`, `mistake`), and `concept_counts`.
    - Move quality and reasoning quality are tracked separately, preserving the core invariant (*Right Move != Right Reasoning*).
  - **Deterministic Next Focus Selection:**
    - Identifies the skill with lowest non-null `mastery_score`.
    - `mastery_score = NULL` is treated strictly as "Not enough evidence" and never manufactured into a numeric score; if all skills have `mastery_score = NULL`, `next_focus` is `None`.
    - Tie-breaking:
      1. Highest `evidence_count`.
      2. Stable canonical concept ordering from `concepts.py` (`SKILL_CONCEPTS`).
  - **Verified Curated Transfer Positions:**
    - Selected strictly from curated entries in `transfer_positions` where `concept == next_focus` and `verified == True`.
    - Ranked by absolute difference to player level: `ABS(difficulty - player_level)` (where `player_level = clamp(round(estimated_rating / 400), 1, 5)`), limited to 3 positions.
    - No FENs or positions are generated by an LLM.
  - **Language-Only, Non-Authoritative LLM Role:**
    - The LLM receives verified facts as input and generates structured wording (`DreamCycleLanguage`: `session_summary`, `key_takeaway`, `next_focus_phrase`).
    - The LLM does not decide truth, mastery, confidence, next focus, or transfer positions.
    - Deterministic fallback wording is generated if the OpenRouter API key is unconfigured, times out, or returns malformed output.
  - **No LangGraph or Agent Graphs:**
    - Orchestration is implemented via clean, deterministic Python transactional functions (`backend/app/dream/cycle.py`) without LangGraph or autonomous agent loops.


