# Dr. Wolf Brain — Product Requirements Document

**Version:** 1.4 · **Date:** 2026-09-26 · **Author:** Nikhil Raikwar · **Status:** FINAL — FROZEN FOR BUILD
**One-liner:** *Not just a coach that gives answers. A coach that learns you.*
**Changelog (v1.3 → v1.4):** v1 forcing-line grading path removed because v1 has no line-entry UI · `evidence_record.weight` removed; evidence strength is defined only by source-specific update rules · "meaningfully tested" defined as a Think First episode whose eligible/selected trigger maps to the hypothesis concept and yields a support/contradict result · no new product features added; scope remains frozen.
**Changelog (v1.2 → v1.3):** stricter reasoning recognition requiring concrete evidence beyond broad option match · imported evidence made position-level (`imported_position`) · zero-evidence mastery state (`mastery_score=null`) · Victory Lap novelty wording softened · no new product features added.
**Changelog (v1.1 → v1.2):** deterministic reasoning_outcome rubric (option match + square intersection + non-contradiction; LLM assists inside constrained schema) · imported games seed-only for thinking hypotheses (Think First alone supports/contradicts) · capped-engine implementation defined (UCI_LimitStrength, Elo = rating + 100) · T_passive_piece downgraded to low priority · EvidenceRecord primitive unifying SKILL_EVIDENCE and HYPOTHESIS_EVIDENCE · cold-email Iron Rule line corrected.
**Changelog (v1.0 → v1.1):** launch claims marked as measured-only placeholders · reasoning/move outcomes split in episode schema · explicit evidence weights · confidence ≠ severity (UI states, not %) · trigger-selection semantics fixed (rank among eligible) · Iron Rule split into three authorities · Dream Cycle deterministic-first · curated FEN bank for transfer positions · hard demo spine with must/should/can tiers · provenance-first data model.

---

## 1. Vision

Dr. Wolf Brain is a chess coach with a living memory of how *you* think. It watches your real games, plays Socratic training sessions with you (no engine answers), and builds an evidence-backed model of your thinking patterns — then tests its own beliefs about you and updates them as you improve.

The magical moment: after a session, you click **"Why did you ask me that?"** and Dr. Wolf shows you the exact episodes that earned the question. No black-box AI. Every claim has evidence.

## 2. Problem

1. **Every chess product dispenses answers.** Eval bars, best-move arrows, "Brilliant!!" — they train engine dependence, not thinking. Nothing trains the actual skill of *noticing*.
2. **Weakness analytics is occupied.** Aimchess (now inside Chess.com's own umbrella) already detects weaknesses from your games. Detection without a coach that *reasons* about you is a dashboard, not a teacher.
3. **Diagnosis without prescription.** Lichess's own Tutor beta gets the exact complaint: "the report tells you what is wrong and then stops."
4. **The trust gap.** AI coaches assert ("you're weak at tactics"). Learners can't see *why* the AI believes that, so they don't trust it — and trust is the #1 adoption blocker for AI coaching.

## 3. Research grounding (why this, why now)

- **Chess.com's own growth data:** ~80% of game reviews happen after *wins*, not losses. Reframing reviews around encouragement grew game reviews 25% and subscriptions 20%. Lesson: design for how humans actually behave. (Feeds the Victory Lap roadmap item.)
- **How Chess.com hires:** CEO Erik Allebest sources people by browsing GitHub projects, messaging talented community members, and inbound emails from interesting people — and filters *for* mission-obsessed builders, *against* mercenaries. The launch *is* the application.
- **The role:** PM for Dr. Wolf = independently own roadmap, talk to users, ship code on mobile apps, and use **agentic AI coding tools as the primary development environment**. This PRD's build plan treats the agentic workflow as a first-class deliverable (public build log), not an implementation detail.

## 4. Goals & non-goals

**Goals**
- G1: Ship a live, working web MVP in ~10 days, played by 15–20 real users.
- G2: Prove the architecture thesis: a coach whose beliefs about the learner are evidence-backed, testable, and revisable.
- G3: Produce the application artifact: live demo + GitHub + community post + cold email.

**Non-goals (v1)**
- Native iOS/Android apps (the web demo is the proof; the role's mobile work comes after hiring).
- Full temporal knowledge graph (v2; v1 uses structured aggregates with the same semantics).
- Monetization, accounts/social, multiplayer.
- Competing with Aimchess on analytics — we frame everything as memory/reasoning, never as stats.

## 5. Users

- **Primary:** 600–1400 rated adult improvers who play on Chess.com and study alone. They've tried puzzles and game review; they plateau because nothing trains *thinking*.
- **Secondary (equally important for v1):** the Chess.com hiring committee. The demo must communicate its thesis in 60 seconds to someone who never reads the README.

## 6. Product scope — MVP (v1)

Eight surfaces, matching the concept mockup. The non-negotiable semantic rule across all of them: **all percentages are skill mastery, higher is better.** Weaknesses are never shown as standalone percentages.

### 6.1 Import Your Games
- **Connect Chess.com account** via the public API (profile + monthly game archives), **or upload a PGN** (drag & drop).
- Analyze the last N games (default 30, cap for cost) with Stockfish: outcomes, critical moments (eval swings > 150cp), tactical opportunities taken/missed, king-safety events, opening/endgame patterns.
- Output is explicitly labeled **"Observed from imported games — directly observable outcomes. Medium confidence."**
- These seed **initial hypotheses**, never conclusions. The UI says so in plain words: *"Game import seeds initial hypotheses. Think First episodes confirm or reject how you think."*
- **Epistemology rule (strict):** imported games may mark a thinking-pattern hypothesis as a **candidate** (`direction=seeds`, status: suspected) — they may never support or contradict it, because import doesn't know intent. Only Think First episodes move thinking hypotheses. Imported games *may* update **skill** mastery at half weight (outcome patterns are directly observable).

### 6.2 Think First Mode (the core loop)
- Play as White vs. a capped engine (~your level + 100). **No eval bar. No hints. No takebacks. Ever.** Implementation: `UCI_LimitStrength=true`, `UCI_Elo = estimated_player_rating + 100` (rating estimated from imported games; default 800 with no import). Fallback: fixed Skill Level mapping if the engine build lacks Elo limiting. Defined here so "capped engine" never becomes a debugging hole.
- At trigger moments (see §9), the game pauses and Dr. Wolf asks **one** Socratic question. Max 5 per session, min 6 moves apart, never in the first 8 moves.
- The player answers via **structured options** (e.g. "Look for opponent's counterplay" / "Calculate forcing lines" / "Check my king safety" / "Look for a better plan") plus optional free text and square highlighting. Structured-first: it makes episode data clean and judgeable.
- After answering, the player **must commit and play the move**. No engine verdict yet.
- **The reveal happens post-game**, in Session Summary: each of the 5 moments is replayed as *"Your answer" vs "The key idea"* with a "Show lines (checked by Stockfish)" expander. Withholding the verdict until the end is the pedagogy — the mockup's per-position feedback panel is the *post-game* review of each moment, not mid-game help.

### 6.3 Episode Memory
Every Socratic interruption becomes one **episode** — the atomic unit of learner memory. Not chat logs; structured events.

```json
{
  "episode_id": "uuid",
  "player_id": "uuid",
  "session_id": "uuid",
  "game_ref": "thinkfirst_014",
  "move_number": 21,
  "fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 9",

  "trigger_evidence": {
    "type": "opponent_threat",
    "detected_by": "deterministic",
    "engine_facts": {
      "threat": "Bc5+ discovered attack on queen",
      "key_squares": ["c5", "d4"],
      "eval_before": 0.4, "eval_if_missed": -1.8
    }
  },

  "learner_reasoning": {
    "question_asked": "You've found an attack. Before moving, what is your opponent threatening?",
    "choice": "look_for_counterplay",
    "free_text": "I think Black wants to play Bc5+",
    "squares_highlighted": ["c5", "d4"]
  },

  "learner_action": { "move_played": "h3" },

  "engine_truth": {
    "best_move": "Qe2", "best_eval": 0.5,
    "played_eval": -1.6, "cp_loss": 210, "concept": "missed_threat"
  },

  "reasoning_outcome": "recognized" | "partial" | "missed",
  "move_outcome": "best" | "acceptable" | "inaccurate" | "mistake",
  "move_quality_cp_loss": 210,
  "created_at": "2026-09-26T..."
}
```

**Right move ≠ right reasoning — the schema encodes the thesis directly:**
- Case A (correctly identifies the threat, plays badly): `reasoning_outcome=recognized`, `move_outcome=mistake`.
- Case B (misunderstands the position, accidentally plays the engine's best move): `reasoning_outcome=missed`, `move_outcome=best`.
- Belief updates and skill mastery consume **reasoning_outcome only**. `move_outcome` is tracked separately for execution trends and never feeds mastery.

**Deterministic grading rubric for `reasoning_outcome` (v1):**
- Deterministic checks compute `concept_match`, `square_match`, and `piece_match` first.
- `recognized` requires `concept_match=true` **and** at least one concrete evidence condition: `square_match=true`, `piece_match=true`, or the constrained free-text check identifies the concrete threat. Free text must not contradict engine truth. Broad category selection alone can never earn full recognition.
- `partial` — correct broad concept identified, but no concrete threat / target / relevant piece is identified.
- `missed` — unrelated concept selected, wrong tactical idea, or explanation contradicts engine evidence.
- The LLM assists **only** with free-text interpretation inside a strict schema: `supports_engine_concept`, `contradicts_engine_truth`, `identified_concrete_threat`, `identified_relevant_piece`, and `evidence_phrase`. It never chooses the final grade.
- **No `line_match` in v1.** The v1 input UI has no dedicated line-entry interaction. If a learner describes a concrete continuation in free text, it may support `identified_concrete_threat`, but there is no separate forcing-line recognition path. A dedicated “play out the line” input is v2.

### 6.4 Your Chess Brain (dashboard)
- **Skills** with mastery % and trend (Tactical awareness, King safety awareness, Calculation depth, Endgame technique). Higher = better, always.
- **Thinking-pattern hypotheses** shown as **state, not percentage**: Needs evidence / Developing / Well-supported (numeric confidence stays internal). Each shows observed frequency and trend, e.g.:
  > Tunnel vision after finding an attack — **Well-supported** · observed in 4 of 7 relevant episodes · trend: improving
  **Confidence ≠ severity:** "Well-supported" means we are confident the *pattern exists* — not that the player is bad at it.
- **Evidence Sources** block: what we can and can't know (imported = outcomes @ Medium; episodes = thinking @ High).
- Per-skill timeline (click a skill → episode history).

**Zero-evidence state:** skills start with `mastery_score = null`, `evidence_count = 0`, and UI state **Not enough evidence**. A mastery score is first initialized after at least 3 relevant evidence records; before that the system shows no manufactured percentage.

### 6.5 "Why Did You Ask Me That?"
- Every interruption stores its trigger + evidence refs. The UI answers in Dr. Wolf's voice: *"You've found an attacking move in similar positions, but in past games you often miss counterplay."* followed by the concrete evidence list (game refs, episode refs, mastery at the time).
- This UI **reads the provenance graph — it never asks the LLM to explain retrospectively.** Every hypothesis carries its `HYPOTHESIS_EVIDENCE` (supporting/contradicting episode ids), so "why" is a database read. That's what makes the trust feature legitimate instead of a confabulation risk.
- Reachable in one click from anywhere a question was asked.

### 6.6 Session Summary
- Stats: positions faced, recognized, missed, time.
- **Skill Updates** with deltas and the evidence behind them ("3 imported games (similar patterns observed) — Medium · 4 Think First episodes (confirmed and refined) — High").
- **One key takeaway**, LLM-generated, Stockfish-checked: *"Look for the opponent's counterplay, even when you have an attack."*

### 6.7 Your Learning Path
- Five stages: **Understand → Recognize → Apply → Transfer → Verify.**
- Current Focus + Next Milestone ("Reach 65% king safety mastery") + Continue button.
- **Transfer** = discriminating positions chosen to test the current hypothesis (the hypothesis-testing loop made visible). **Verify** = "see if you use it in real games" — import next week's games and check.

### 6.8 Dream Cycle (v1: deterministic-first, honest)
A **session-end job** (not realtime), split by what actually needs intelligence:

- **Deterministic code** (the default): aggregate today's episodes by concept → update skill mastery (weighted moving average, §7) → update hypothesis confidences + evidence counts → compute trends → write the `BELIEF_CHANGE` changelog.
- **LLM** (narrow jobs only): summarize the session's pattern in one paragraph, phrase the key takeaway, explain the next focus in Dr. Wolf's voice.
- Do not use LangGraph here just because this is an AI project. The belief engine is deterministic; the LLM owns language, never scores.
- Transfer positions come from the curated FEN bank (§8), selected by concept + difficulty — never hallucinated boards.
- v2 upgrades aggregates to a temporal graph. v1's aggregates already carry the same semantics (confidence, evidence_count, first/last observed, trend) so the upgrade is a storage change, not a redesign.

## 7. Belief update rules (v1 — no graph yet)

Deliberately simple, fully explainable. Every number on screen must be derivable from these rules.

- **Skill mastery** (0–100, higher = better):
  **Initialization:** `mastery_score = null` and `evidence_count = 0`. Do not show a numeric mastery score until at least 3 relevant evidence records exist. At initialization, set mastery to the weighted average of those first qualifying evidence scores rather than applying the moving-average formula to an invented prior.
  `mastery_new = clamp(0.7 * mastery_old + 0.3 * session_score, 0, 100)`
  where `session_score` is computed from **reasoning_outcome only** (recognized = 1, partial = 0.5, missed = 0) — because the thesis is *how you think*. `move_outcome` is tracked separately for execution trends and never feeds mastery.
  Imported positions update the same mastery at half learning rate via per-concept outcome rates:
  `mastery_new = clamp(0.85 * mastery_old + 0.15 * import_score, 0, 100)`.
- **Thinking-pattern hypotheses** — confidence (0.05–0.95, internal) moves **only on Think First episodes**: +0.08 support / −0.12 contradict. Imported games may only *seed a candidate* (`direction=seeds`, status: suspected); they never support or contradict a thinking hypothesis, because import doesn't know intent.
- **Consumer UI** shows **Needs evidence / Developing / Well-supported** (<0.25 / 0.25–0.60 / >0.60), plus observed frequency ("4 of 7 relevant episodes") and trend. **Confidence ≠ severity:** 0.90 means we are 90% sure the *pattern exists* — not that the player is 90% bad at it.
- A candidate stays **suspected** until ≥3 Think First episodes have **meaningfully tested** it. A Think First episode counts as a meaningful test only when the position produced an eligible trigger mapped to that hypothesis concept, that trigger was selected for the interruption, and the resulting episode was classifiable as `supports` or `contradicts` for that hypothesis. Episodes about unrelated concepts do not count toward the threshold. Below 0.25 it shows as **"Needs more evidence"** (shown, not hidden — the system withholding a belief *is* the hypothesis-testing story).
- **Dream cycle** runs these updates at session end and writes one `BELIEF_CHANGE` changelog entry per changed belief, so the "Watch Your Progress" timeline is append-only and auditable.

## 8. Architecture — the 7-step pipeline

```
1 Games/PGN → 2 Stockfish Analysis → 3 Episode Memory → 4 Learner Model
    → 5 LLM Pedagogy → 6 Dream Cycle → 7 Personalized Experience
```

| # | Stage | Owns | Tech |
|---|-------|------|------|
| 1 | Games / PGN | Import from Chess.com API or PGN upload; game list, positions, outcomes | Chess.com public API, python-chess |
| 2 | Stockfish Analysis | **Deterministic chess truth.** Best moves, evals, threats, hanging pieces, king-safety heuristics. Finds key moments in imported games; validates every trigger | Stockfish (server-side for imports; WASM client-side for live triggers) |
| 3 | Episode Memory | Stores every key interaction with full context (§6.3 schema) | Postgres: `players, games, positions, episodes, skills, hypotheses, sessions` |
| 4 | Learner Model (Evidence Store) | Combines game evidence + Think First evidence. Skills with mastery %, hypotheses with confidence | Postgres aggregates (v1); temporal graph (v2) |
| 5 | LLM Pedagogy | Uses learner model + Stockfish results to generate Socratic questions, explanations, takeaways. **LangGraph agents** | LLM with structured outputs (Pydantic); model via OpenRouter |
| 6 | Dream Cycle | Session-end consolidation: deterministic belief updates + changelog; LLM only for takeaway phrasing | Python job at session end; LLM for language |
| 7 | Personalized Experience | Adaptive coaching, learning path, recommendations | Next.js frontend |

**The Iron Rule (v1.1 — three authorities):**
- **Chess claims require engine evidence.** "Bc5 creates a discovered attack." → Stockfish owns chess truth.
- **Learner claims require episode evidence.** "You missed counterplay in 4 of 6 comparable Think First episodes." → the provenance graph owns learner observations.
- **Pedagogical recommendations derive from those two.** "Let's work on counterplay scanning."
- **The LLM owns wording, never truth.** This is what makes the system credible instead of demo-ware — and it's the same "deterministic authority over LLM claims" thesis as PlanProof.

**API sketch (v1):**
- `POST /api/import/chesscom {username}` → game list + analysis job
- `POST /api/import/pgn` (multipart) → same
- `GET /api/brain` → skills, hypotheses, evidence sources
- `POST /api/session/start` → session id, engine config
- `POST /api/session/{id}/interrupt/{n}/answer` → stores episode
- `GET /api/session/{id}/summary` → stats, deltas, takeaway
- `GET /api/path` → current focus, milestone, 5 stages
- `POST /api/dream-cycle {session_id}` → belief updates + changelog

**Stack:** Next.js + react-chessboard + chess.js (frontend) · FastAPI + Postgres (backend) · Stockfish WASM + server Stockfish · LangGraph (pedagogy agent only) + structured-output LLM via OpenRouter.

**Transfer positions (v1): curated FEN bank.** The LLM never invents positions. Table `transfer_positions(fen, concept, difficulty, tactical_theme, source)`. The learner model selects by concept + difficulty for the Transfer stage. v2: search/generated variants, always validated by Stockfish before use.

**Data model (provenance-first):**

```
PLAYER
GAME └── POSITION            (imported games: WHAT happened)
SESSION └── EPISODE          (Think First: WHY the decision)
    ├── trigger_evidence     (deterministic, engine-backed)
    ├── learner_reasoning    (choice + free text + squares)
    ├── learner_action       (the move played)
    └── engine_truth         (best move, evals, cp loss)
SKILL └── SKILL_EVIDENCE
HYPOTHESIS └── HYPOTHESIS_EVIDENCE
    ├── supports:    [episode_14, episode_21, episode_28]
    └── contradicts: [episode_35]
BELIEF_CHANGE                 (append-only changelog → timeline UI)
```

**Evidence primitive (shared by skills and hypotheses):**

```
evidence_record
- id
- source_type:   imported_position | think_first_episode
- source_id:     position_042_m23 / episode_14
- claim_type:    skill | hypothesis
- concept:       opponent_threat_detection
- direction:     supports | contradicts | seeds
- observed_at
```

Both `SKILL_EVIDENCE` and `HYPOTHESIS_EVIDENCE` are collections of `evidence_record`s — one primitive, so auditing is uniform. Evidence strength is not stored as a free-form `weight`; it is derived from source-specific rules in §7 (Think First mastery learning rate 0.30, imported-position mastery learning rate 0.15, and thinking hypotheses updated only by Think First episodes). Constraint: `source_type=imported_position` with `claim_type=hypothesis` may only use `direction=seeds` (the epistemology rule, §6.1).

Never compute a belief and lose its provenance. Every hypothesis is reconstructable from its evidence list — the "Why did you ask me that?" UI is a database read, not an LLM reconstruction.

**Truth boundaries (the architecture to defend in an interview):**

```
Stockfish                  → owns chess truth
Episode evidence           → owns learner observations
Deterministic belief engine → owns scores and confidence
LLM                        → owns language and pedagogy
User                       → remains the final human interpretation
```

## 9. Think First trigger rules (deterministic)

Triggers are computed from chess.js + Stockfish, never from the LLM. All thresholds tunable in one config file.

- **T_opponent_threat** — After the opponent's move, engine finds a concrete threat (mate threat, hanging piece now attacked, discovered attack setup) with eval swing > 150cp against the player if unaddressed. Question: *"Before you move — what is your opponent threatening?"*
- **T_hanging** — Player to move and owns a piece that is attacked and inadequately defended (en prise). Question: *"One of your pieces is under attack. Which one — and does it matter?"*
- **T_king_safety** — King-safety heuristic trips (exposed king, weakened pawn shield with open file, engine king-attack score above threshold). Question: *"Compare both kings. Which one is safer right now?"*
- **T_passive_piece** — **Low priority in v1** (weakest trigger: an unmoved rook isn't necessarily a meaningful lesson). Fires only if the engine shows eval improving ≥80cp when the piece activates; otherwise disabled. Question: *"Which of your pieces is doing nothing right now?"*
- **T_forcing_candidate** — Player has a check or winning capture available (engine top-3). Question: *"You've found one forcing idea. Can you find a second candidate before committing?"*

**Selection pipeline (fixed semantics):**

```
CURRENT POSITION
      ↓
deterministic trigger detector   (chess.js + Stockfish; the LLM is never involved)
      ↓
eligible triggers, e.g. [opponent_threat, king_safety, forcing_candidate]
      ↓
learner model ranks eligible triggers by weakest matching hypothesis
      ↓
governor decides interrupt / skip
      ↓
curated question selected (parameterized by trigger evidence)
```

Personalization chooses **among eligible, evidence-backed triggers** — the agent can never select a trigger the board doesn't support.

**Governor rules:** max 5 interruptions/session · min 6 moves apart · never before move 8 · never twice the same trigger consecutively · skip if the position is theoretically drawn/dead. Priority when several triggers are eligible: opponent_threat > hanging > king_safety > forcing_candidate > passive_piece.

## 10. Metrics

**Product (what "working" means):**
- Activation: import → first completed Think First session (target ≥60%).
- Session completion: started → all 5 moments reviewed (target ≥70%).
- D7 retention: second session within 7 days (target ≥35%).
- Transfer: concept recognized in a *real imported game* within 14 days of training it (the Verify stage — the metric that matters).
- Trust: "Why did you ask me that?" open rate per session (target ≥40% — proves the evidence UI is the feature).

**Demo / job-hunt (what "attention" means):**
- 15–20 real users through ≥1 full session; ≥5 written quotes.
- GitHub: real incremental commit history (never a single dump), README readable in 60 seconds.
- Community post: replies + try-its; the post explicitly asks "what's confusing, what breaks."

**Guardrails:** zero invented claims — chess statements traceable to an engine eval, learner statements traceable to episode ids, per the Iron Rule. If the LLM can't cite it, it doesn't say it. **Launch claims (§12.2, §12.3) are placeholders until telemetry supports them.**

## 11. Build plan — 10 days, agentic-first

The JD's core requirement is *"agentic AI coding tools as your primary way of building."* So the build log is a deliverable: keep a public `BUILD_LOG.md` noting what the agent did well and where human judgment intervened (prompt design, trigger thresholds, pedagogy tone). That log *is* the proof of the "looks like a small team" claim.

- **Days 1–2 — Board + import.** Playable board vs. capped engine (chess.js + react-chessboard + Stockfish WASM). Chess.com API import + PGN upload. Server-side Stockfish pass over imported games → seeded hypotheses at Medium confidence.
- **Days 3–4 — Think First loop.** The 5 trigger rules + governor, Socratic question UI, structured answer input, episode logging to Postgres. No reveal yet.
- **Days 5–6 — Brain surfaces.** Dashboard (skills, hypotheses, evidence sources), "Why did you ask me that?", Session Summary with post-game reveal, Learning Path 5 stages.
- **Days 7–8 — Dream cycle v1 + belief updates.** Session-end job, changelog/timeline, polish, mobile-responsiveness.
- **Days 9–10 — Real users.** 15–20 players, fix what breaks, collect quotes, record 60-second demo, write README + architecture doc. Replace every §12 placeholder with measured results before publishing anything.

**Demo spine (the hard scope contract):**

```
IMPORT → THINK FIRST → EPISODES → SESSION SUMMARY → BRAIN UPDATE → WHY DID YOU ASK ME THAT?
```

- **Must ship:** playable game · deterministic triggers · structured response input · episode storage · post-game reveal · learner belief update · Why UI.
- **Should ship:** Brain dashboard · progress timeline.
- **Can stay thin (no fake data, just simple):** Learning Path — "Current focus: opponent threat detection" is enough for v1. No curriculum engine.

**Build filter (ask before every feature):** *"Does this materially improve the experience of playing three sessions and seeing the coach learn one defensible thing about me?"* If no → v2. The MVP promise is: **play 3 sessions, watch the coach learn one thing about you.**

**v2 (in README as "where this goes," not built now):** temporal graph (Graphiti-style) replacing aggregates; hypothesis-testing with deliberately discriminating transfer positions; Victory Lap (win-review) and Blunder Challenge (viral loop) as the product roadmap.

## 12. Launch playbook — the application *is* the launch

Erik's stated hiring channels: **browsing GitHub, messaging community members, inbound emails.** So we don't "apply and hope" — we ship in public, post where the community lives, then send the inbound email. The Rippling form gets submitted in parallel, with the artifacts linked.

### 12.1 GitHub repo checklist
- Live demo link at the very top of the README, then a 60-second GIF.
- README structure: the problem (3 lines) → the thesis (1 paragraph) → architecture diagram → "what broke / what I'd test next" → roadmap (Victory Lap, Blunder Challenge).
- Real incremental commits from day 1. Never a single dump.
- `BUILD_LOG.md`: agentic workflow documented (what Claude Code/Cursor did, where I intervened).
- `docs/ARCHITECTURE.md`: the 7-step pipeline, the Iron Rule, belief-update math.

### 12.2 Community post (chess.com blog) — draft

> **Title: I gave an AI chess coach a memory — here's what broke**
>
> I spent 10 days building an experiment: a chess coach that doesn't just analyze your games, but builds a *model of how you think* — and then has to show its evidence for everything it claims about you.
>
> The interaction is simple. You play a game with no eval bar, no hints, no takebacks. At key moments the coach stops and asks you a question instead of giving you the answer ("Before you move — what is your opponent threatening?"). You commit to a plan, you play, and only after the game do you see what the engine thought.
>
> Behind that, every interruption becomes a structured "episode": what you said you were thinking, what you played, what the engine says. Over sessions, the coach forms hypotheses ("tunnel vision after finding an attack — Well-supported, seen in 6 games") and updates them as you improve. And any time you wonder why it asked you something, there's a button: "Why did you ask me that?" — it shows you the exact games and moments behind the question.
>
> Two things I learned building it:
> 1. Importing your games only tells the coach your *outcomes*. It takes the Socratic sessions to learn *how you think*. The import seeds hypotheses; the episodes confirm or kill them.
> 2. [Replace after user testing with measured result. Do not publish this claim unless telemetry supports it — e.g. "why" button open rate, quotes about trust.]
>
> Try it here: [link]. It's rough. Tell me what's confusing, what breaks, and what you'd actually use vs. what's noise. I'm building in the open and I read everything.

### 12.3 Cold email — draft

> **Subject:** I built Dr. Wolf a memory (10-day experiment + a 90-day roadmap)
>
> Hi [name],
>
> I'm Nikhil — an applied AI engineer who builds agent systems with memory architectures (most recently PlanProof, an evidence-grounded verification agent for AI coding workflows).
>
> I spent the last 10 days building **Dr. Wolf Brain**: a prototype of what Dr. Wolf becomes when the coach *remembers how you think*. You play Socratic training games (no engine answers), and behind the scenes it builds an evidence-backed model of your thinking patterns — then lets you interrogate every belief with a "Why did you ask me that?" button. Chess claims are grounded in Stockfish; claims about the learner are grounded in stored episode evidence.
>
> Live demo: [link] · Code: [github] · I posted it to the community here: [link]
> [Replace after user testing with measured result — e.g. "N players ran full sessions; the 'why' button was opened in X% of sessions." Do not publish this claim unless telemetry supports it.]
>
> If I joined as PM for Dr. Wolf, my first 90 days would look like this:
> 1. **Ship the memory loop** — productionize the episode → belief → dream-cycle pipeline inside the app's coaching sessions.
> 2. **Victory Lap** — your growth team found ~80% of game reviews happen after wins. I’d explore a dedicated positive post-win learning ritual built around that behavior: celebrate the win, surface one hidden learning moment, and invite the player to solve it.
> 3. **Blunder Challenge** — turn a player's worst moment into a shareable, Dr. Wolf-narrated puzzle challenge for a friend. Your announcement post already says recommending to friends is the easiest onboarding; this makes the recommendation a game.
>
> I build with agentic coding tools as my primary environment (Claude Code/Cursor daily) — the build log is public in the repo. And I'm a genuine product-of-the-product person: [one honest line about your chess — learning as an adult / coaching a friend / your rating grind].
>
> Would love 20 minutes to walk through the demo and the roadmap.
>
> — Nikhil
> [portfolio] · [github] · [linkedin]

### 12.4 The Rippling application
- Submit the standard form; the differentiator is what you link, not what you write.
- Link the demo + GitHub + community post wherever URLs are accepted.
- In any free-text "why you" field: lead with the shipped artifact and the user evidence, not adjectives. One paragraph max. Never mention compensation expectations or titles-first framing — their process filters for mission-fit.

## 13. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| The demo never ships (biggest risk) | Staged v1/v2; static-first frontend; 10-day plan with user testing *in* the schedule, not after it |
| Aimchess overlap ("we already do weakness detection") | Frame every sentence as memory/reasoning, never analytics; the differentiator is the *coach that tests its beliefs*, not the detector |
| Brain is invisible to users | Dashboard + "Why did you ask me that?" are one click from every surface; evidence UI is the feature |
| LLM asserts false chess facts | The Iron Rule: Stockfish owns reality; structured outputs; no uncited claims |
| Launch claims published before measurement | All §12 claims are placeholders gated on telemetry (§10 guardrails) |
| Chess.com is already building this internally | Frame as "my architectural bet for where Dr. Wolf goes" — the roadmap section shows product judgment either way |
| Scope creep into a research project | v1 promise is small: "play 3 sessions, watch the coach learn one thing about you" |

## 14. Open questions

1. **Engine placement for imports:** server-side Stockfish per imported game (cost/latency) vs. client-side WASM batch (slower, free). Decide day 1; default to server-side with a 30-game cap.
2. **Chess.com API limits:** monthly archives can be large; paginate and cap. Fallback is PGN upload, which must work flawlessly regardless.
3. **Accounts:** start passwordless (local player id in localStorage); add auth only if the demo demands it. Never let auth block shipping.
4. **Question personalization depth (v1):** resolved — curated question bank parameterized by trigger evidence; the learner model ranks *eligible* triggers by weakest hypothesis (§9). Fully LLM-composed questions → v2.
5. **Grading rubric:** resolved in §6.3 (deterministic checks + constrained LLM assist). Remaining: implement the grader before day 3. `move_outcome` bands: best ≤15cp / acceptable ≤60 / inaccurate ≤150 / mistake >150 loss.
6. **FEN bank sourcing:** seed ~60 tagged positions (concept × difficulty) — source from the Lichess puzzle DB (rated, themed) or hand-curate? Decide day 1.

---

*Appendix: concept mockup v2 (8-panel flow) is the visual companion to this PRD. The mockup's three corrections — consistent mastery semantics, honest evidence sourcing, explicit Stockfish gating — are normative for the build.*

---

## 15. Final Product Thesis

Dr. Wolf Brain does not try to remember everything.

It tries to remember the **right things**.

The product must never confuse:
- a bad move with bad reasoning,
- an imported outcome with learner intent,
- confidence with severity,
- LLM fluency with chess truth,
- personalization with unexplained inference.

Its architecture follows a simple contract:

> **Chess truth comes from the engine.**  
> **Learner truth comes from evidence.**  
> **Scores come from deterministic rules.**  
> **Language comes from the model.**

The MVP succeeds if one thing happens:

> **A learner plays three sessions and can watch the coach learn one defensible thing about them — and show exactly why it believes it.**

---

## v1.4 FINAL FREEZE

No new product features before the complete demo spine ships.

The PRD changes again only if real user evidence contradicts one of its assumptions.

**Next artifact: Engineering Build Specification.**
