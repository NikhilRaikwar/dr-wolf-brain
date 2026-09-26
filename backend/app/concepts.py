"""
Single source of truth for all skill concepts, hypothesis concepts, and mapping dictionaries.
"""

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
