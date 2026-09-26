# Product Requirements Document (PRD) — Dr. Wolf Brain

> **Status:** Draft / Frozen v1 Specification  
> **Author:** Nikhil Raikwar  
> **Type:** Core Product Specification  

---

## 1. Vision & Problem Statement

Most chess training software analyzes *moves* through brute engine evaluations (centipawn loss, blunders, engine accuracy). However, human improvement requires understanding *how* a player reasons:
- What did the player see?
- What was their intended plan?
- Which candidate moves were ignored or dismissed prematurely?

**Dr. Wolf Brain** is an adaptive, evidence-based AI chess coach that models learner thinking habits over time.

---

## 2. Core Product Pillars

1. **Think First Protocol:** Socratic questioning during critical game moments before revealing engine verdicts.
2. **Episodic Evidence Memory:** Structured records of student rationale, mistakes, and recurring patterns.
3. **Deterministic Learner Model:** Clear belief thresholds that avoid hallucinated learner states. If evidence is insufficient, it explicitly reports: *"Not enough evidence yet."*
4. **"Why Did You Ask Me That?" Explainability:** Full inspectability into the exact evidence episodes that triggered every coaching question.

---

## 3. User Journey & Experience

```
[Import Game / PGN] 
       │
       ▼
[Stockfish Truth Engine] ──> Critical Decision Identification
       │
       ▼
[Think First Session] ─────> Socratic Coaching & Intent Capture
       │
       ▼
[Post-Game Review] ────────> Socratic vs Engine Contrast
       │
       ▼
[Dream Cycle Update] ──────> Consolidated Evidence & Beliefs
```

---

## 4. Scope & Milestones

### In Scope (v1 MVP)
- PGN and game import parsing
- Stockfish-backed evaluation and tactic detection
- Interactive Think First coaching interface
- Structured learner profile (openings, recurring themes, tactical blind spots)
- Socratic post-game review

### Out of Scope (v1)
- Live competitive multiplayer
- Unbounded conversational chat without chess grounding
- Automated opening book generation
