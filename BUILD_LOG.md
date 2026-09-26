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
