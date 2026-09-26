# System Architecture — Dr. Wolf Brain

```
  ┌─────────────────┐       ┌────────────────────────┐
  │   Next.js App   │ <───> │  FastAPI Server (API)  │
  └─────────────────┘       └───────────┬────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
  ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
  │ Stockfish (NNUE)│          │ PostgreSQL (DB) │          │ LLM Orchestrator│
  │ (Chess Truth)   │          │ (Episode Memory)│          │ (Socratic Coach)│
  └─────────────────┘          └─────────────────┘          └─────────────────┘
```

## Truth & Separation of Concerns

1. **Deterministic Core:** Stockfish handles all game state validation, tactical scoring, and move suggestions.
2. **Episode Memory:** Stores historical rationale and mistake patterns in PostgreSQL.
3. **Learner Modeling:** State transition logic calculates mastery scores deterministically.
4. **Pedagogical LLM:** Translates structured evidence into natural, supportive Socratic feedback.
