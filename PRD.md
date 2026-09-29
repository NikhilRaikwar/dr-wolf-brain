# Dr. Wolf Brain — Product Requirements Document

**Version:** 1.5 · **Date:** 2026-09-29 · **Author:** Nikhil Raikwar · **Status:** Shipped prototype; pre-user-research

**One-liner:** *Not just a coach that gives answers. A coach that learns you.*

The Learn Chess with Dr. Wolf opportunity prompted me to explore whether a coach could remember how a learner thinks across games.

---

## 1. Product vision

Dr. Wolf Brain is an independent proof-of-work prototype for a chess coach with a persistent, evidence-backed learner model. It observes outcomes from imported games, asks structured Socratic questions during live training sessions, and updates its beliefs only when the available evidence permits the claim.

The product should help a learner understand both what happened on the board and which parts of their thinking process may be improving. It should also be able to say when it does not have enough evidence.

## 2. Learner problem

Chess analysis products are effective at showing evaluation swings and better moves, but a move alone does not reveal the reasoning that produced it. A learner can play the best move for the wrong reason or make a poor move after correctly recognizing the important feature of the position.

This creates three product problems:

1. Move feedback can encourage answer-seeking instead of better thinking habits.
2. Imported games reveal behavior but cannot reliably reveal intent.
3. Personalized claims are difficult to trust when the learner cannot inspect their evidence.

## 3. Target learner

The initial target is an adult improver around 600–1400 rating who plays online and studies independently. They have used puzzles or game review, understand basic chess notation, and want help developing repeatable thinking habits rather than only receiving engine lines.

This target remains a product hypothesis. Structured learner interviews and usability sessions have not yet been completed.

## 4. Product thesis

> **Imported games show WHAT happened. Think First episodes can reveal WHY.**

An imported move is valid evidence about a board outcome. It is not sufficient evidence about attention, calculation, intent, or decision process. Think First therefore asks the learner to externalize reasoning before committing a move.

The learner model keeps these evidence classes separate:

- Imported positions can update observable skill evidence at a reduced learning rate and seed possible hypotheses.
- Imported positions cannot support or contradict thinking-pattern hypotheses.
- Think First episodes can update reasoning evidence after the learner answers, commits a move, and the episode is graded.

## 5. Product principles and trust boundaries

- **Stockfish owns chess truth:** legal moves, evaluations, best moves, threats, and move quality.
- **Persisted evidence owns learner observations:** claims about a learner must trace to imported positions or Think First episodes.
- **Deterministic code owns state and scores:** mastery, confidence, evidence thresholds, and belief changes do not come from generated prose.
- **The language model owns wording:** it can phrase summaries and takeaways from supplied facts, but it cannot mutate authoritative chess or learner state.
- **Insufficient evidence is a valid state:** the interface must not manufacture precision.
- **Provenance must be inspectable:** aggregate Brain responses expose persisted evidence and belief changes. A dedicated episode-level “Why did you ask me that?” route and UI remain deferred.

## 6. Shipped product scope

### 6.1 Player identity

The prototype creates a player UUID and stores it in browser localStorage. This provides continuity and player-scoped data, but it is not authentication and should not be represented as account security.

### 6.2 Live training session

The learner plays White against server-side Stockfish. The backend owns canonical FEN, move history, legal-move validation, and the engine reply. The browser does not decide engine truth.

There is no evaluation bar, hint, or takeback in the live loop. A session may end through a terminal chess result or an explicit manual finish. Manual finish is a completed learning session, not a manufactured draw.

### 6.3 Think First

After an eligible board position and governor approval, the server persists a `prompted` episode and the interface pauses play. The learner submits a structured answer with optional free text and highlighted squares, then commits a legal move.

The lifecycle is:

```text
prompted → answered → committed → graded → Dream Cycle → evidence/belief update
```

The learner does not receive the engine verdict before committing the move.

### 6.4 Episode memory

Each interruption stores the session, player, move number, FEN, deterministic trigger evidence, question, structured learner reasoning, committed move, Stockfish truth, and separate reasoning and move outcomes.

The schema preserves the distinction between right reasoning and right execution. Mastery consumes `reasoning_outcome`; `move_outcome` remains a separate execution signal.

### 6.5 Brain dashboard

The Brain endpoint and dashboard aggregate persisted skills, hypotheses, evidence sources, belief changes, and session counts. Skills begin with `mastery_score = null` and `evidence_count = 0`; the UI shows **Not enough evidence** until the minimum evidence threshold is met.

Hypotheses are shown as states rather than learner-facing confidence percentages. Imported seeds remain visibly untested and are not presented as confirmed cognitive patterns.

### 6.6 Dream Cycle

The Dream Cycle is an idempotent session-end consolidation step. It grades committed episodes through the canonical grader, creates evidence, applies deterministic mastery and hypothesis rules, records belief changes, and generates bounded language from already-computed facts.

It does not regrade completed episodes on replay, allow language output to own truth, or infer reasoning from imported games.

### 6.7 Game import

The shipped import paths are Chess.com public archive import with a configurable game cap and PGN text submitted in JSON. Both use server-side python-chess parsing and Stockfish analysis. Duplicate imports are deduplicated, imported positions remain player-scoped, and hypothesis evidence from import is seed-only.

### 6.8 Games and supporting surfaces

The product includes game list and detail views plus Train, Insights, Progress, Settings, Help, and Overview routes. Several supporting routes are intentionally thin prototype surfaces rather than complete curriculum, settings, or analytics systems.

## 7. Evidence, mastery, and hypothesis semantics

### 7.1 Skill mastery

Skills start with `mastery_score = null` and `evidence_count = 0`. A numeric score is initialized only after at least three relevant evidence records, using the weighted average of the first qualifying records.

After initialization:

```text
Think First: mastery_new = clamp(0.7 × mastery_old + 0.3 × session_score, 0, 100)
Imported:    mastery_new = clamp(0.85 × mastery_old + 0.15 × import_score, 0, 100)
```

For Think First, `recognized = 1`, `partial = 0.5`, and `missed = 0`. Move quality does not substitute for reasoning quality.

### 7.2 Reasoning grading

Deterministic checks compute concept, square, and piece matches. Full recognition requires a concept match plus concrete supporting evidence and no contradiction of engine truth. A broad option match alone cannot earn full recognition.

The optional constrained language check can identify whether free text supports or contradicts supplied engine facts. Deterministic code selects the final grade.

### 7.3 Thinking-pattern hypotheses

Hypothesis confidence is internal and bounded from 0.05 to 0.95. Meaningful Think First evidence moves confidence by `+0.08` for support or `−0.12` for contradiction.

A hypothesis remains suspected until at least three Think First episodes have meaningfully tested it. A meaningful test requires an eligible and selected trigger mapped to the hypothesis plus a classifiable support or contradiction result. Unrelated episodes do not count.

Imported positions may create `direction=seeds` evidence. Database constraints prevent imported evidence from supporting or contradicting a cognitive hypothesis.

## 8. Think First trigger and governor rules

Trigger detection is deterministic and engine-backed. Categories are `opponent_threat`, `hanging`, `king_safety`, `forcing_candidate`, and `passive_piece`; passive piece remains low priority and requires an engine-improvement gate.

The governor enforces:

- No interruption before move 8
- At least six moves between interruptions
- At most five interruptions per session
- No consecutive repetition of the same trigger category
- No interruption in terminal or theoretically dead positions

When several triggers are eligible, the priority is opponent threat, hanging piece, king safety, forcing candidate, then passive piece. The learner model ranks only evidence-backed triggers that the board actually supports. These semantics must not be weakened for demonstration purposes.

## 9. Think First verification and demo truth

Think First is implemented and its lifecycle is covered by focused backend tests. The golden lifecycle test exercises answer, commit, finish, grading, and summary behavior. If natural detection does not produce an episode in that test, it inserts a prompted episode to continue verifying the lifecycle.

Therefore, `test_golden_think_first_e2e_session_loop` is lifecycle evidence; it is not proof of a guaranteed short public trigger sequence. Natural production triggering depends on the board, Stockfish results, and governor state. No current public sequence is guaranteed to trigger Think First on demand.

### Future deterministic demonstration fixture

A future fixture should be development/test-only and clearly labeled. It would seed:

1. A known FEN with a verified trigger condition
2. An eligible move count
3. Governor-compatible interruption count, spacing, and prior-trigger state
4. A deterministic Stockfish condition verified in the test environment

After setup, it must use the normal answer, move, finish, summary, Dream Cycle, and Brain APIs. Fixture records must remain isolated from production learner data and must never be presented as organic learner evidence.

## 10. Product hypotheses and planned validation

The next research step is to test these assumptions with real adult improvers:

1. Asking before revealing produces useful reflection rather than unwanted interruption.
2. Learners understand the difference between imported observation and reasoning evidence.
3. Evidence provenance makes personalized claims more trustworthy.
4. A persistent learner model provides a reason to return for another session.
5. The Brain communicates uncertainty without feeling empty or punitive.

### Planned validation target

- Recruit 15–20 learners for at least one complete session
- Conduct at least five moderated usability interviews
- Collect quotes only with explicit permission
- Record task completion, confusion, abandonment, and qualitative trust signals
- Ship at least one change directly caused by learner feedback

No completed user study, adoption result, retention measurement, quote set, or usability finding is claimed in this document.

## 11. Success metrics

These are proposed measures for future validation, not measured results:

- **Activation:** learner completes a session or import and opens the Brain
- **Think First completion:** prompted episodes that reach committed status
- **Session completion:** started sessions that reach summary
- **Trust:** learners can correctly explain why a question was asked
- **Learning:** previously missed concepts correctly recognized when they recur
- **Retention:** learner returns for another session within seven days
- **Reliability guardrails:** API failures, engine latency, import latency, and incorrect-explanation reports

Time-on-site is not a primary success metric; a learning interaction can be valuable precisely because it resolves confusion efficiently.

## 12. Architecture and deployment

```text
Next.js frontend
    → proxied FastAPI API
        → PostgreSQL evidence and learner state
        → server-side Stockfish for chess authority
        → constrained language client for wording
```

- Frontend: Next.js with custom chessboard components and chess.js
- Backend: FastAPI and SQLAlchemy
- Database: PostgreSQL with Alembic migrations
- Chess engine: server-side Stockfish
- Language: OpenRouter-compatible structured client with deterministic fallbacks
- Orchestration: deterministic Python session and Dream Cycle services; LangGraph is not used
- Deployment: Vercel frontend proxy and Render Docker backend

The system uses localStorage player identity rather than authentication. Production deployment demonstrates the prototype flow but is not a claim of production-grade account security or scale.

## 13. Scope and non-goals

### Shipped prototype scope

- Live server-authoritative chess sessions
- Stockfish replies and analysis
- Think First episode lifecycle
- Reasoning grader
- Evidence, mastery, and hypothesis persistence
- Dream Cycle consolidation
- Brain dashboard aggregates
- Chess.com and JSON PGN import
- Game list and detail views
- CI, Docker deployment, and PostgreSQL migrations

### Deferred or post-MVP

- Native iOS or Android applications
- Authentication and account recovery
- Product analytics and measured retention
- Dedicated episode-level “Why did you ask me that?” API/UI
- Dedicated learning-path API
- Complete transfer-training flow
- Large transfer-position bank; four curated positions are currently seeded
- Asynchronous import jobs
- Full curriculum and business model

## 14. Roadmap

1. Conduct structured learner research and document observed problems.
2. Make one small product change driven by that evidence.
3. Add lightweight funnel instrumentation after event definitions are validated.
4. Evaluate a narrow native-mobile proof without treating the web prototype as mobile delivery.
5. Measure engine and language cost, latency, reliability, and retention implications.
6. Consider dedicated provenance and transfer-training surfaces only after the core loop is validated.

## 15. Final product contract

Dr. Wolf Brain must never confuse:

- A bad move with bad reasoning
- An imported outcome with learner intent
- Confidence with severity
- LLM fluency with chess truth
- Personalization with unexplained inference

> **Chess truth comes from the engine.**
> **Learner truth comes from evidence.**
> **Scores come from deterministic rules.**
> **Language comes from the model.**

The prototype is ready for learner validation when it can complete this loop without inventing evidence: play or import, observe, reflect, persist, consolidate, and explain the limits of what it knows.
