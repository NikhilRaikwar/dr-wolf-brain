# Dr. Wolf Brain

> An AI chess coach that learns how you think.

Dr. Wolf Brain is an experimental personalized chess coach that goes beyond engine analysis.

Instead of only telling you the best move, it runs **Think First** sessions, captures how you reason at key positions, and builds an evidence-backed model of your chess thinking over time.

The core idea:

**Imported games tell the coach what happened.  
Think First sessions help reveal why the decision happened.**

---

## Why I’m building this

Most chess tools are excellent at answering:

> “What was the best move?”

I wanted to explore a different question:

> “Can a chess coach learn how a student thinks — and show the evidence behind what it believes about them?”

Dr. Wolf Brain is my prototype of that idea.

---

## Core Experience

### Think First

Play without an eval bar, hints, or takebacks.

At selected positions, Dr. Wolf asks a Socratic question before you move.

You think, answer, commit to a move, and only see the engine verdict after the game.

### Your Chess Brain

The system builds a learner model from structured evidence:

- skill mastery
- recurring thinking patterns
- improvement trends
- supporting and contradicting episodes

It can also say:

> **Not enough evidence yet.**

### Why Did You Ask Me That?

Every personalized coaching question is inspectable.

Chess claims are grounded in Stockfish.

Learner claims are grounded in stored episode evidence.

The LLM owns language and pedagogy — not truth.

---

## Architecture

Games / PGN  
→ Stockfish Analysis  
→ Episode Memory  
→ Learner Model  
→ LLM Pedagogy  
→ Dream Cycle  
→ Personalized Coaching

### Truth boundaries

- **Stockfish** → chess truth
- **Episode evidence** → learner observations
- **Deterministic belief engine** → scores and confidence
- **LLM** → language and pedagogy

---

## Current Status

🚧 **Building in public**

Current milestone:

- [x] Product concept
- [x] PRD
- [x] Engineering build specification
- [x] Landing page
- [ ] Game import
- [ ] Think First gameplay
- [ ] Episode memory
- [ ] Learner model
- [ ] Session summary
- [ ] Why Did You Ask Me That?
- [ ] Public demo

The MVP goal is simple:

> **Play three sessions and watch the coach learn one defensible thing about you.**

---

## Built in the Open

This project intentionally keeps the product and engineering decisions public.

- [`PRD.md`](./PRD.md) — product source of truth
- [`BUILD_SPEC.md`](./BUILD_SPEC.md) — engineering implementation contract
- [`BUILD_LOG.md`](./BUILD_LOG.md) — day-by-day agentic build log
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — architecture as built
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — engineering decisions and trade-offs

---

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- FastAPI
- PostgreSQL
- python-chess
- Stockfish
- LangGraph
- OpenRouter
- Pydantic structured outputs

---

## AI-assisted development

I use agentic coding tools heavily while building this project.

AI accelerates implementation, but I own:

- architecture
- trust boundaries
- deterministic vs model responsibilities
- state transitions
- testing strategy
- security constraints
- product decisions

`BUILD_LOG.md` records where agents helped and where I changed or rejected their suggestions.

---

## Status

This is an independent prototype exploring personalized chess learning.

It is not an official Chess.com product.
