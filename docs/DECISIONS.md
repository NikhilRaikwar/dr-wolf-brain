# Architectural Decision Records (ADR) — Dr. Wolf Brain

## ADR 001: Separation of Chess Engine & LLM Reasoning
- **Context:** Large language models hallucinate illegal chess moves and inaccurate tactical calculations.
- **Decision:** All chess evaluations must originate from Stockfish. The LLM is restricted to pedagogical coaching and natural language communication.
- **Consequence:** 100% chess accuracy and zero tactical hallucinations.

## ADR 002: Evidence-Based Belief Engine
- **Context:** Traditional AI agents over-generalize learner skills from single observations.
- **Decision:** Belief updates require multiple corroborating evidence episodes. The system explicitly responds with *"Not enough evidence yet"* when thresholds are not met.
- **Consequence:** Trustworthy, inspectable learner progression.
