"""
Curated Question Bank for Dr. Wolf Brain Think First Socratic interruptions.
Frozen for v1.1 CANONICAL SPEC.
"""

from typing import Dict, List, Any
import random

# Canonical Question IDs
QUESTION_OPPONENT_THREAT = "opponent_threat_counterplay"
QUESTION_HANGING = "hanging_under_attack"
QUESTION_KING_SAFETY = "king_safety_compare_kings"
QUESTION_FORCING_CANDIDATE = "forcing_candidate_another_candidate"
QUESTION_PASSIVE_PIECE = "passive_piece_least_active"

TRIGGER_TO_QUESTION_ID: Dict[str, str] = {
    "opponent_threat": QUESTION_OPPONENT_THREAT,
    "hanging": QUESTION_HANGING,
    "king_safety": QUESTION_KING_SAFETY,
    "forcing_candidate": QUESTION_FORCING_CANDIDATE,
    "passive_piece": QUESTION_PASSIVE_PIECE,
}

QUESTION_BANK: Dict[str, Dict[str, Any]] = {
    QUESTION_OPPONENT_THREAT: {
        "question_id": QUESTION_OPPONENT_THREAT,
        "trigger_type": "opponent_threat",
        "question": "Before you move — what is your opponent threatening?",
        "options": [
            {
                "key": "look_for_counterplay",
                "label": "Look for my opponent's counterplay",
                "concept": "opponent_threat_detection",
            },
            {
                "key": "calculate_forcing",
                "label": "Calculate forcing lines",
                "concept": "calculation_depth",
            },
            {
                "key": "check_king_safety",
                "label": "Check my king's safety",
                "concept": "king_safety",
            },
            {
                "key": "better_plan",
                "label": "Look for a better plan",
                "concept": "tactical_awareness",
            },
        ],
    },
    QUESTION_HANGING: {
        "question_id": QUESTION_HANGING,
        "trigger_type": "hanging",
        "question": "One of your pieces may be under attack. What do you see?",
        "options": [
            {
                "key": "protect_piece",
                "label": "Identify undefended or exposed pieces",
                "concept": "tactical_awareness",
            },
            {
                "key": "look_for_counterplay",
                "label": "Look for counterplay against opponent",
                "concept": "opponent_threat_detection",
            },
            {
                "key": "calculate_forcing",
                "label": "Calculate forcing checks and captures",
                "concept": "calculation_depth",
            },
            {
                "key": "king_safety",
                "label": "Check king shield and escape squares",
                "concept": "king_safety",
            },
        ],
    },
    QUESTION_KING_SAFETY: {
        "question_id": QUESTION_KING_SAFETY,
        "trigger_type": "king_safety",
        "question": "Compare both kings. Which one is safer right now — and why?",
        "options": [
            {
                "key": "assess_king_safety",
                "label": "Assess open files and attacking pieces near the king",
                "concept": "king_safety",
            },
            {
                "key": "look_for_counterplay",
                "label": "Scan for opponent tactical threats",
                "concept": "opponent_threat_detection",
            },
            {
                "key": "calculate_forcing",
                "label": "Search for forcing sacrificial lines",
                "concept": "calculation_depth",
            },
            {
                "key": "piece_activity",
                "label": "Improve piece coordination and activity",
                "concept": "tactical_awareness",
            },
        ],
    },
    QUESTION_FORCING_CANDIDATE: {
        "question_id": QUESTION_FORCING_CANDIDATE,
        "trigger_type": "forcing_candidate",
        "question": "You've found one forcing idea. Can you find another candidate before committing?",
        "options": [
            {
                "key": "explore_candidate_moves",
                "label": "Calculate deeper forcing candidates (checks, captures, threats)",
                "concept": "calculation_depth",
            },
            {
                "key": "check_opponent_response",
                "label": "Look for opponent counter-threats",
                "concept": "opponent_threat_detection",
            },
            {
                "key": "assess_king_danger",
                "label": "Verify king safety after complications",
                "concept": "king_safety",
            },
            {
                "key": "solidify_position",
                "label": "Keep tactical control without rushing",
                "concept": "tactical_awareness",
            },
        ],
    },
    QUESTION_PASSIVE_PIECE: {
        "question_id": QUESTION_PASSIVE_PIECE,
        "trigger_type": "passive_piece",
        "question": "Which of your pieces is doing the least right now?",
        "options": [
            {
                "key": "activate_passive_piece",
                "label": "Find and activate an underdeveloped piece",
                "concept": "tactical_awareness",
            },
            {
                "key": "scan_threats",
                "label": "Scan for immediate opponent threats",
                "concept": "opponent_threat_detection",
            },
            {
                "key": "king_defense",
                "label": "Shore up king pawn structure",
                "concept": "king_safety",
            },
            {
                "key": "forcing_tactic",
                "label": "Look for a forcing tactical break",
                "concept": "calculation_depth",
            },
        ],
    },
}


def get_question_for_trigger(trigger_type: str, shuffle_options: bool = True) -> Dict[str, Any]:
    """Retrieve structured question and options for a trigger type."""
    question_id = TRIGGER_TO_QUESTION_ID.get(trigger_type)
    if not question_id or question_id not in QUESTION_BANK:
        raise ValueError(f"Unknown trigger type: {trigger_type}")

    bank_entry = QUESTION_BANK[question_id]
    options = list(bank_entry["options"])
    if shuffle_options:
        # Create a randomized copy of options
        options = random.sample(options, len(options))

    return {
        "question_id": question_id,
        "trigger_type": trigger_type,
        "question": bank_entry["question"],
        "options": [{"key": opt["key"], "label": opt["label"]} for opt in options],
    }


def get_question_by_id(question_id: str) -> Dict[str, Any]:
    """Retrieve question definition by stable question_id."""
    if question_id not in QUESTION_BANK:
        raise ValueError(f"Unknown question_id: {question_id}")
    return QUESTION_BANK[question_id]
