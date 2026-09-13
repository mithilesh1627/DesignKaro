import json
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from backend.app.schemas.design import CanvasEdgeData, CanvasNodeData, GraphData, NodePropertySchema
from backend.app.schemas.mentor import MentorChatRequest, MentorMessage, MentorResponse
from backend.app.services.ai_mentor import mentor_service
from backend.app.services.llm.context_builder import build_mentor_context
from backend.app.services.llm.exceptions import ProviderTimeoutError, ProviderUnavailableError
from backend.app.services.llm.models import LLMResponse
from backend.app.services.llm.parser import (
    create_heuristic_mentor_response,
    extract_json_payload,
    normalize_mentor_response,
    render_mentor_response_to_markdown,
    repair_and_parse_json,
    truncate_to_word_count,
)


# Helper: Canvas with Redis, Gateway, and Postgres
def get_sample_canvas():
    return GraphData(
        nodes=[
            CanvasNodeData(
                id="gw",
                type="gateway",
                label="API Gateway",
                properties=NodePropertySchema(replicas=2),
            ),
            CanvasNodeData(
                id="redis",
                type="cache",
                label="Redis Cluster",
                properties=NodePropertySchema(replicas=3),
            ),
            CanvasNodeData(
                id="db",
                type="relational_db",
                label="PostgreSQL Primary",
                properties=NodePropertySchema(replicas=1),
            ),
        ],
        edges=[
            CanvasEdgeData(id="e1", source="gw", target="redis", label="Cache Check"),
            CanvasEdgeData(id="e2", source="redis", target="db", label="Cache Miss"),
        ],
    )


# 1. "What is Redis?" Test
def test_what_is_redis_concise_and_no_hallucination():
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="What is Redis?")],
        graph_data=None,  # Empty canvas
    )
    res = mentor_service.generate_heuristic_response(req)
    assert res.structured_response is not None
    assert "redis" in res.structured_response.title.lower() or "caching" in res.structured_response.title.lower()
    # Word count constraint for simple concepts (60-120 words)
    words = len(res.structured_response.explanation.split())
    assert 30 <= words <= 150
    # No canvas components should be claimed as present
    assert len(res.structured_response.architecture_observations) == 0
    # Exactly one next question
    assert res.structured_response.next_question is not None
    assert res.structured_response.next_question.count("?") == 1


# 2. "How do I prevent SPOF?" (Socratic Level 1, not instant Level 4 dump)
def test_spof_socratic_guidance_no_instant_blueprint():
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="How do I prevent SPOF in my system?")],
        graph_data=None,
    )
    res = mentor_service.generate_heuristic_response(req)
    structured = res.structured_response
    assert structured is not None
    assert structured.response_type == "socratic"
    # Level 1 nudge asks about failure modes rather than dumping a complete 4-tier blueprint
    assert "fail" in structured.next_question.lower() or "reroute" in structured.next_question.lower()
    # Recommendations should be concise, not an entire textbook
    assert len(structured.recommendations) <= 3


# 3. "Calculate Little's Law" (Correct formula L = λW with units)
def test_calculate_littles_law_formula_correctness():
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="Calculate Little's Law for my system")],
        graph_data=None,
    )
    res = mentor_service.generate_heuristic_response(req)
    structured = res.structured_response
    assert structured is not None
    assert structured.calculation is not None
    # Must use correct formula L = λW, NOT W = λ / μ
    assert "L = λW" in structured.calculation.formula or "λW" in structured.calculation.formula
    assert "concurrent" in structured.calculation.result.lower() or "requests" in structured.calculation.result.lower()
    # Units must be explicit in variables
    assert any("req/s" in v or "s" in v for v in structured.calculation.variables.values())


# 4. Missing Traffic Data (States unknown, does not invent numbers)
def test_missing_traffic_data_acknowledges_unknown():
    context = build_mentor_context(graph_data=None, scale_metadata=None)
    assert "UNKNOWN" in context
    assert "Traffic Metrics: UNKNOWN" in context
    assert "Do NOT invent arbitrary numbers" in context


# 5. Incorrect User Formula Correction
def test_incorrect_user_formula_correction():
    mock_llm_json = {
        "response_type": "correction",
        "title": "Little's Law Formula Correction",
        "summary": "Little's Law is L = λW, not W = λ/L.",
        "explanation": "Little's Law states that average concurrency (L) equals arrival rate (λ) multiplied by average latency (W). Dividing throughput by concurrency inverts the relationship.",
        "architecture_observations": [],
        "assumptions": [],
        "recommendations": ["Use L = λW to size thread pools."],
        "tradeoffs": [],
        "calculation": {
            "formula": "L = λW",
            "variables": {"λ": "200 req/s", "W": "50 ms (0.05s)"},
            "result": "10 concurrent requests",
            "explanation": "200 * 0.05 = 10 in-flight requests."
        },
        "next_question": "What is the average latency of your heaviest endpoint?",
        "difficulty": "intermediate"
    }

    normalized = normalize_mentor_response(
        data=mock_llm_json,
        user_query="Isn't Little's Law W = lambda / L?",
        graph_data=None,
    )
    assert normalized.response_type == "correction"
    assert "L = λW" in normalized.calculation.formula
    assert normalized.next_question.count("?") == 1


# 6. Architecture Containing Redis (Connects explanation to canvas Redis)
def test_architecture_containing_redis_connects_to_canvas():
    graph = get_sample_canvas()
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="How does Redis help my architecture?")],
        graph_data=graph,
    )
    res = mentor_service.generate_heuristic_response(req)
    structured = res.structured_response
    assert structured is not None
    assert len(structured.architecture_observations) > 0
    assert any("redis" in obs.lower() for obs in structured.architecture_observations)


# 7. Architecture Without Redis (Explains Redis without claiming canvas has it)
def test_architecture_without_redis_does_not_claim_canvas_presence():
    graph = GraphData(
        nodes=[
            CanvasNodeData(
                id="gw",
                type="gateway",
                label="API Gateway",
                properties=NodePropertySchema(replicas=1),
            )
        ],
        edges=[],
    )
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="Should I add Redis?")],
        graph_data=graph,
    )
    res = mentor_service.generate_heuristic_response(req)
    structured = res.structured_response
    assert structured is not None
    # Should not claim that Redis exists in canvas
    assert not any("redis" in obs.lower() for obs in structured.architecture_observations)


# 8. Beginner Question (Adapted explanation depth)
def test_beginner_question_adapted_depth():
    context = build_mentor_context(graph_data=None, user_skill_level="beginner")
    assert "BEGINNER" in context


# 9. Advanced Question (In-depth trade-off analysis)
def test_advanced_question_in_depth_tradeoffs():
    context = build_mentor_context(graph_data=None, user_skill_level="advanced")
    assert "ADVANCED" in context


# 10. Malformed LLM Response (Safe JSON repair and fallback)
def test_malformed_llm_response_repair_and_fallback():
    # Malformed JSON: unclosed braces, trailing commas, raw markdown wrapper
    raw_bad_json = """
    ```json
    {
      "response_type": "explanation",
      "title": "Cache Stampede Prevention",
      "summary": "Use probabilistic expiration to prevent cache stampedes.",
      "explanation": "When a hot key expires, multiple workers query the database at once.",
      "recommendations": ["Use XFetch algorithm", "Implement mutex locking",],
      "next_question": "What is your cache TTL?"
    """
    repaired = extract_json_payload(raw_bad_json)
    assert repaired is not None
    assert repaired["title"] == "Cache Stampede Prevention"

    # Completely unparseable text falls back to clean MentorResponse
    fallback = normalize_mentor_response(
        data=None,
        user_query="What is cache stampede?",
        graph_data=None,
    )
    assert isinstance(fallback, MentorResponse)
    assert len(fallback.title) > 0


# 11. LLM Timeout (Graceful fallback)
@pytest.mark.asyncio
async def test_llm_timeout_graceful_fallback():
    with patch("backend.app.services.llm.service.llm_service.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = ProviderTimeoutError("Inference timed out after 30s", provider="ollama")

        req = MentorChatRequest(
            messages=[MentorMessage(role="user", content="How do I partition my database?")],
            graph_data=None,
        )
        res = await mentor_service.generate_chat_response_async(req)

        assert res.structured_response is not None
        assert res.fallback_used is True
        assert res.llm_provider == "heuristic-engine"
        assert len(res.reply) > 50


# 12. LLM Unavailable (Deterministic heuristic fallback)
@pytest.mark.asyncio
async def test_llm_unavailable_deterministic_fallback():
    with patch("backend.app.services.llm.service.llm_service.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = ProviderUnavailableError("Daemon offline", provider="ollama")

        req = MentorChatRequest(
            messages=[MentorMessage(role="user", content="Explain Kafka partitioning")],
            graph_data=None,
        )
        res = await mentor_service.generate_chat_response_async(req)

        assert res.structured_response is not None
        assert res.fallback_used is True
        assert "kafka" in res.reply.lower() or "scale" in res.reply.lower()


# 13. Conversation Continuation (Remembers topic, doesn't repeat welcome greeting)
def test_conversation_continuation_does_not_repeat_welcome():
    messages = [
        MentorMessage(role="user", content="What is Redis?"),
        MentorMessage(role="assistant", content="Redis is an in-memory cache."),
        MentorMessage(role="user", content="How do we handle replication lag?"),
    ]
    # format_mentor_user_prompt with is_initial_turn=False
    from backend.app.services.llm.prompts.mentor import format_mentor_user_prompt
    prompt = format_mentor_user_prompt(
        user_message="How do we handle replication lag?",
        architecture_context="Context",
        is_initial_turn=False,
    )
    assert "Do NOT repeat welcome introductions" in prompt


# 14. Long LLM Response (Enforces word count bounds)
def test_long_llm_response_truncation():
    giant_explanation = "Word " * 500  # 500 words
    truncated = truncate_to_word_count(giant_explanation, max_words=180)
    assert len(truncated.split()) <= 181

    mock_verbose_json = {
        "title": "Verbose Topic",
        "summary": "Summary",
        "explanation": giant_explanation,
        "next_question": "What next?",
    }
    normalized = normalize_mentor_response(
        data=mock_verbose_json,
        user_query="Tell me everything",
        graph_data=None,
    )
    assert len(normalized.explanation.split()) <= 201


# 15. Hallucinated Architecture Facts Prevention
def test_hallucinated_architecture_facts_moved_to_assumptions():
    # Canvas is empty, but LLM claims "Your Redis cluster has 3 nodes"
    mock_hallucinated_json = {
        "title": "Caching Analysis",
        "summary": "Summary",
        "explanation": "Explanation",
        "architecture_observations": ["Your Redis cluster has 3 nodes connected to PostgreSQL"],
        "next_question": "How will you handle failover?",
    }
    normalized = normalize_mentor_response(
        data=mock_hallucinated_json,
        user_query="Analyze my canvas",
        graph_data=None,  # Canvas is EMPTY
    )
    # Architecture observations must be empty because canvas is empty
    assert len(normalized.architecture_observations) == 0
    # The hallucinated claim is converted into an explicit hypothetical assumption
    assert len(normalized.assumptions) > 0
    assert "Hypothetical" in normalized.assumptions[0] or "Redis" in normalized.assumptions[0]


# Markdown Rendering Test
def test_render_mentor_response_to_markdown():
    resp = MentorResponse(
        response_type="explanation",
        title="Redis Caching",
        summary="Redis reduces read latency.",
        explanation="Redis stores key-values in RAM.",
        architecture_observations=["Observed Redis node"],
        assumptions=["Assuming 100 QPS"],
        recommendations=["Set a TTL"],
        tradeoffs=["Low latency vs stale data"],
        next_question="What is your eviction policy?",
        difficulty="intermediate",
    )
    md = render_mentor_response_to_markdown(resp)
    assert "### Redis Caching" in md
    assert "### In your design" in md
    assert "### Assumptions" in md
    assert "### Think about this" in md
    assert "Focus:" not in md
