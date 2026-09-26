# Architectural Decision Records (ADR) — Dr. Wolf Brain

## ADR 001: Separation of Chess Engine & LLM Reasoning
- **Context:** Large language models hallucinate illegal chess moves and inaccurate tactical calculations.
- **Decision:** Chess claims are required to originate from Stockfish-backed deterministic paths rather than the LLM. This reduces tactical hallucination risk; engine depth, integration bugs, and incorrect state handling remain engineering risks and are covered by tests.
- **Consequence:** Prevents the LLM from being the source of authoritative chess moves or evaluations. Pedagogy is cleanly separated from evaluation truth.

## ADR 002: Evidence-Based Belief Engine
- **Context:** Traditional AI agents over-generalize learner skills from single observations or invent metrics.
- **Decision:** Belief updates require multiple corroborating evidence episodes. The system explicitly reports *"Not enough evidence yet"* when thresholds are not met.
- **Consequence:** Learner progression is auditable, inspectable, and evidence-backed.

## ADR 003: Single Source of Truth for Demonstration Positions
- **Context:** Hardcoded board matrices across JSX lead to out-of-sync positions and illegal move representations.
- **Decision:** All landing and demo board configurations are defined as standard FEN strings in `lib/landingExamples.ts` and validated programmatically with `chess.js`.
- **Consequence:** Ensures landing-page positions and illustrated moves are programmatically validated before shipping.
