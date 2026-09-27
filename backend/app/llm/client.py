import os
import json
import hashlib
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class FreeTextGrade(BaseModel):
    supports_engine_concept: bool = False
    contradicts_engine_truth: bool = False
    identified_concrete_threat: bool = False
    identified_relevant_piece: bool = False
    evidence_phrase: Optional[str] = None


class LLMClient:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.model = model or settings.OPENROUTER_MODEL

    def grade_free_text(
        self,
        question: str,
        free_text: str,
        engine_facts: Dict[str, Any],
    ) -> FreeTextGrade:
        """Interpret learner free text against engine facts with strict constraints and fallback.
        Never state or invent chess or learner claims not present in input facts.
        """
        if not free_text or not free_text.strip():
            return FreeTextGrade()

        if not self.api_key:
            logger.info("OpenRouter API key not configured; using deterministic fallback.")
            return FreeTextGrade()

        input_data = {
            "question": question,
            "free_text": free_text,
            "engine_facts": engine_facts,
        }
        input_hash = hashlib.sha256(
            json.dumps(input_data, sort_keys=True).encode("utf-8")
        ).hexdigest()[:12]
        logger.info(f"LLM grading request model={self.model} input_hash={input_hash}")

        system_prompt = (
            "You are Dr. Wolf's wording assistant. STRICT RULES:\n"
            "1. You receive chess facts and learner evidence as INPUT. Never invent, infer, or embellish facts beyond the input.\n"
            "2. You never state a chess claim (best move, evaluation, threat) not present in input.\n"
            "3. You never state a learner claim (skill level, pattern, frequency) not present in input.\n"
            "4. Your job is phrasing and interpretation of supplied free text only.\n"
            "5. Return valid JSON matching the schema with fields: "
            "supports_engine_concept (bool), contradicts_engine_truth (bool), "
            "identified_concrete_threat (bool), identified_relevant_piece (bool), evidence_phrase (string or null)."
        )

        user_prompt = (
            f"Question asked: {question}\n"
            f"Learner free text: \"{free_text}\"\n"
            f"Engine facts: {json.dumps(engine_facts)}\n\n"
            "Evaluate whether the learner's free text explanation:\n"
            "- supports_engine_concept: does the explanation touch upon or describe the underlying chess concept?\n"
            "- contradicts_engine_truth: does the explanation make claims directly contrary to the engine facts (e.g. claiming a piece is safe when it is attacked, claiming a threat that doesn't exist)?\n"
            "- identified_concrete_threat: did the learner mention the concrete tactical threat or mating idea in the engine facts?\n"
            "- identified_relevant_piece: did the learner explicitly mention the key piece involved?\n"
            "- evidence_phrase: short quote from free text supporting the assessment, or null.\n"
        )

        # Retry up to 2 times on validation/network failure (3 attempts total)
        for attempt in range(3):
            try:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://drwolfbrain.app",
                    "X-Title": "Dr. Wolf Brain",
                }
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.0,
                }
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers,
                        json=payload,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        content = data["choices"][0]["message"]["content"]
                        parsed = json.loads(content)
                        return FreeTextGrade.model_validate(parsed)
                    else:
                        logger.warning(
                            f"OpenRouter attempt {attempt + 1} failed HTTP {resp.status_code}: {resp.text}"
                        )
            except Exception as e:
                logger.warning(f"OpenRouter attempt {attempt + 1} error: {e}")

        logger.info(
            f"LLM failure/exhaustion for input_hash={input_hash}; falling back to conservative FreeTextGrade."
        )
        return FreeTextGrade()
