"""
Single source of truth for all skill concepts, hypothesis concepts, and mapping dictionaries.
Frozen for v1.1 CANONICAL SPEC.
"""

from typing import Dict, List, Optional, Any

SKILL_CONCEPTS = [
    "tactical_awareness",
    "opponent_threat_detection",
    "king_safety",
    "calculation_depth",
    "endgame_technique",
]

HYPOTHESIS_CONCEPTS = {
    "tunnel_vision_after_attack": "Tends to stop scanning for counterplay after finding an attacking move.",
    "stops_calculating_early": "Frequently stops calculation after the first forcing candidate.",
    "misses_defensive_resources": "Often identifies tactical ideas but misses defensive resources.",
}

# trigger type -> skill concept it evidences
TRIGGER_TO_SKILL = {
    "opponent_threat": "opponent_threat_detection",
    "hanging": "tactical_awareness",
    "king_safety": "king_safety",
    "forcing_candidate": "calculation_depth",
    "passive_piece": "tactical_awareness",
}

# Trigger type candidate hypotheses
TRIGGER_TO_HYPOTHESIS_CANDIDATES = {
    "opponent_threat": ["tunnel_vision_after_attack"],
    "forcing_candidate": ["stops_calculating_early"],
    "hanging": ["misses_defensive_resources"],
    "king_safety": [],
    "passive_piece": [],
}

# Structured choice keys expressing attacking / forcing intent
ATTACKING_CHOICES = {
    "calculate_forcing",
    "explore_candidate_moves",
    "forcing_tactic",
}

# Explicit self-directed phrases indicating own attacking intent in free text
ATTACKING_PHRASES = [
    "i want to attack",
    "i'm attacking",
    "im attacking",
    "going for mate",
    "i want to sacrifice",
    "i have an attack",
    "my attack",
    "attacking their",
    "attacking the",
    "launching an attack",
    "preparing an attack",
    "trying to mate",
    "looking for mate",
    "trying to attack",
]


def learner_expressed_attacking_intent(
    ep: Any, session_choices: Optional[List[str]] = None
) -> bool:
    """Check if the learner expressed attacking/forcing intent prior to or during the episode.
    Deterministic strong signals only:
    - Structured choice expressing attacking/forcing intent (e.g. calculate_forcing).
    - Explicit self-directed phrases indicating own attacking intent in free text.
    - Recent session choices containing attacking/forcing intent.
    Does NOT match isolated words like 'threat', 'check', or defensive statements like 'I see their threat'.
    """
    learner_reasoning = getattr(ep, "learner_reasoning", None) or {}
    choice = learner_reasoning.get("choice", "")
    free_text = (learner_reasoning.get("free_text") or "").lower().strip()

    # 1. Episode's own structured choice
    if choice in ATTACKING_CHOICES:
        return True

    # 2. Explicit self-directed attacking intent phrases in free text
    if any(phrase in free_text for phrase in ATTACKING_PHRASES):
        return True

    # 3. Recent session choices before this episode
    if session_choices:
        if any(c in ATTACKING_CHOICES for c in session_choices):
            return True

    return False


def episode_tests_hypothesis(
    ep: Any,
    hypothesis_concept: str,
    session_choices: Optional[List[str]] = None,
) -> bool:
    """Canonical predicate: determine if a graded episode meaningfully tests a hypothesis.
    Trigger type alone is necessary but NEVER sufficient.
    """
    if getattr(ep, "reasoning_outcome", None) is None:
        return False

    trigger_evidence = getattr(ep, "trigger_evidence", None) or {}
    trigger_type = trigger_evidence.get("type", "")
    question_id = trigger_evidence.get("question_id", "")

    if hypothesis_concept == "tunnel_vision_after_attack":
        # Candidate trigger: opponent_threat AND learner expressed attacking intent
        return (
            trigger_type == "opponent_threat"
            and learner_expressed_attacking_intent(ep, session_choices)
        )

    elif hypothesis_concept == "stops_calculating_early":
        # Candidate trigger: forcing_candidate AND canonical another-candidate question
        return (
            trigger_type == "forcing_candidate"
            and question_id == "forcing_candidate_another_candidate"
        )

    elif hypothesis_concept == "misses_defensive_resources":
        # v1 Question Bank truth: 'hanging_under_attack' tests identifying attacked/exposed pieces,
        # not defensive resource calculation.
        # This hypothesis remains seedable/suspected from imported games until a future Think First
        # question explicitly tests defensive resources.
        return False

    return False


def classify_vs_hypothesis(ep: Any, hypothesis_concept: str) -> Optional[str]:
    """Classify episode reasoning outcome as 'supports', 'contradicts', or None for a hypothesis.
    Deterministic, conservative per-hypothesis mapping:
    - tunnel_vision_after_attack:
        missed -> supports (confirmed tunnel vision ignoring counterplay)
        recognized -> contradicts (spotted counterplay despite attacking intent)
        partial -> None (conservative)
    - stops_calculating_early:
        missed -> supports (stopped calculation after first idea)
        recognized -> contradicts (calculated deeper candidate moves)
        partial -> None (conservative)
    - misses_defensive_resources:
        None (no canonical Think First question in v1)
    """
    outcome = getattr(ep, "reasoning_outcome", None)
    if not outcome:
        return None

    if hypothesis_concept == "tunnel_vision_after_attack":
        if outcome == "recognized":
            return "contradicts"
        elif outcome == "missed":
            return "supports"
        else:
            return None

    elif hypothesis_concept == "stops_calculating_early":
        if outcome == "recognized":
            return "contradicts"
        elif outcome == "missed":
            return "supports"
        else:
            return None

    elif hypothesis_concept == "misses_defensive_resources":
        return None

    return None
