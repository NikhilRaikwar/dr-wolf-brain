import pytest
from unittest.mock import patch, MagicMock
import httpx

from app.llm.client import LLMClient, FreeTextGrade


def test_llm_client_returns_conservative_fallback_when_unconfigured():
    """When no API key is configured, LLMClient safely returns conservative default."""
    client = LLMClient(api_key=None)
    result = client.grade_free_text(
        question="What is your opponent threatening?",
        free_text="I see a checkmate threat with queen.",
        engine_facts={"threat": "Mate threat", "key_squares": ["h2", "g2"]},
    )
    assert isinstance(result, FreeTextGrade)
    assert result.supports_engine_concept is False
    assert result.contradicts_engine_truth is False
    assert result.identified_concrete_threat is False
    assert result.identified_relevant_piece is False
    assert result.evidence_phrase is None


def test_llm_client_returns_conservative_fallback_on_empty_text():
    """Empty or whitespace-only free text returns default fallback without API call."""
    client = LLMClient(api_key="test-key")
    result = client.grade_free_text(
        question="What is your opponent threatening?",
        free_text="   ",
        engine_facts={},
    )
    assert isinstance(result, FreeTextGrade)
    assert result.supports_engine_concept is False


def test_llm_client_successful_structured_response():
    """Valid JSON from OpenRouter is validated into FreeTextGrade."""
    client = LLMClient(api_key="test-key")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": '{"supports_engine_concept": true, "contradicts_engine_truth": false, "identified_concrete_threat": true, "identified_relevant_piece": true, "evidence_phrase": "queen takes g2 mate"}'
                }
            }
        ]
    }

    with patch.object(httpx.Client, "post", return_value=mock_response):
        result = client.grade_free_text(
            question="What is your opponent threatening?",
            free_text="Black wants to play queen takes g2 mate",
            engine_facts={"threat": "Mate in 1", "key_squares": ["f2", "g2"]},
        )

    assert result.supports_engine_concept is True
    assert result.contradicts_engine_truth is False
    assert result.identified_concrete_threat is True
    assert result.identified_relevant_piece is True
    assert result.evidence_phrase == "queen takes g2 mate"


def test_llm_client_retries_and_falls_back_on_malformed_json():
    """Malformed response retries up to exhaustion and returns conservative fallback."""
    client = LLMClient(api_key="test-key")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "Not valid json at all!"}}]
    }

    with patch.object(httpx.Client, "post", return_value=mock_response) as mock_post:
        result = client.grade_free_text(
            question="What is your opponent threatening?",
            free_text="I think my bishop is under attack",
            engine_facts={"threat": "Mate in 1"},
        )
        assert mock_post.call_count == 3  # 1 initial + 2 retries

    assert isinstance(result, FreeTextGrade)
    assert result.supports_engine_concept is False
    assert result.contradicts_engine_truth is False


def test_llm_client_retries_and_falls_back_on_http_error():
    """Network failure retries and safely falls back without raising exception."""
    client = LLMClient(api_key="test-key")

    with patch.object(httpx.Client, "post", side_effect=httpx.ConnectError("Connection refused")) as mock_post:
        result = client.grade_free_text(
            question="What is your opponent threatening?",
            free_text="Looking at f7",
            engine_facts={"threat": "f7 weakness"},
        )
        assert mock_post.call_count == 3

    assert isinstance(result, FreeTextGrade)
    assert result.supports_engine_concept is False
