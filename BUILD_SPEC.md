# Engineering Build Specification — Dr. Wolf Brain

> **Contract:** System boundaries, data schemas, triggers, and deterministic grading.

---

## 1. System Truth Boundaries

| Layer | Responsibility | Authority |
|---|---|---|
| **Chess Engine** | Valid moves, centipawn evaluations, best lines | Stockfish 16 / python-chess |
| **Learner Evidence** | User moves, prompt responses, decision latencies | PostgreSQL Episode Tables |
| **Belief Engine** | Skill mastery, habit scoring, trigger thresholds | Deterministic Python / Pydantic Logic |
| **Pedagogy / Language** | Conversational tone, Socratic questions | LLM (Prompt-Engineered Socratic Persona) |

---

## 2. Core Data Models

### Episode Schema
```typescript
interface Episode {
  id: string
  userId: string
  fen: string
  movePlayed: string
  bestMove: string
  evalDelta: number
  playerThought: string
  themeTrigger: 'center_control' | 'king_safety' | 'piece_coordination' | 'tactical_blindspot'
  confidenceScore: number
  timestamp: string
}
```

### Learner Profile Schema
```typescript
interface LearnerProfile {
  userId: string
  strengths: string[]
  recurringGaps: string[]
  openingMastery: Record<string, number>
  evidenceCount: number
  hypotheses: Array<{
    theme: string
    status: 'needs_more_evidence' | 'developing' | 'mastered'
    supportingEpisodeIds: string[]
  }>
}
```

---

## 3. Trigger Engine & Decision Matrix

- **Critical Threshold:** Eval change > 1.2 pawns triggers a Think First pause.
- **Hypothesis Promotion:** Requires >= 3 corroborating episodes within a 10-game window before updating mastery status.
