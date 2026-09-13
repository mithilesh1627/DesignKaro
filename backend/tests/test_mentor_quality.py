import pytest

from backend.app.schemas.design import CanvasEdgeData, CanvasNodeData, GraphData, NodePropertySchema
from backend.app.schemas.mentor import MentorChatRequest, MentorMessage
from backend.app.services.ai_mentor import mentor_service
from backend.app.services.llm.conversation_tracker import (
    analyze_dialogue_state,
    extract_decisions_from_text,
    get_next_architecture_decision,
    score_question_relevance,
    select_advancing_question,
)
from backend.app.services.llm.parser import (
    normalize_mentor_response,
    render_mentor_response_to_markdown,
)
from backend.app.services.llm.prompts.mentor import classify_mentor_intent


# Helper: Canvas with Redis, Gateway, and Postgres
def get_sample_canvas():
    return GraphData(
        nodes=[
            CanvasNodeData(
                id="gw",
                type="gateway",
                label="Envoy Gateway",
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


# ==============================================================================
# 1. READ/WRITE RATIO SEMANTICS
# Explains workload composition. Never says 10:1 is common or increases capacity.
# ==============================================================================
def test_1_read_write_ratio_semantics():
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="What read/write ratio should I use?")],
        graph_data=None,
    )
    res = mentor_service.generate_heuristic_response(req)
    resp = res.structured_response
    assert resp is not None

    exp = resp.explanation.lower()
    assert "10:1 is common" not in exp
    assert "you should use 10:1" not in exp
    assert "there isn't a universal ratio" in exp or "no universal ratio" in exp or "depends" in exp
    assert "workload composition" in exp or "product behavior" in exp or "measured" in exp

    # Answer comes before next question, and next question is relevant without mentioning Redis
    assert resp.next_question is not None
    assert "redis" not in resp.next_question.lower()


# ==============================================================================
# 2. P99 SLA REASONING
# Not universal; product-driven SLA.
# ==============================================================================
def test_2_p99_sla_reasoning():
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="What p99 latency should I target?")],
        graph_data=None,
    )
    res = mentor_service.generate_heuristic_response(req)
    resp = res.structured_response
    assert resp is not None

    exp = resp.explanation.lower()
    assert "aren't defined" in exp or "not defined" in exp or "no universal" in exp
    assert "product requirements" in exp or "user experience" in exp or "sla" in exp

    next_q = resp.next_question.lower()
    assert "strictest" in next_q or "latency" in next_q or "endpoint" in next_q


# ==============================================================================
# 3. USER-PROVIDED METRICS PERSISTENCE
# Persists 80:20 and 200ms in decision_history.
# ==============================================================================
def test_3_user_provided_metrics_persistence():
    user_msg = "Our system has 80% reads and 20% writes with a 200ms p99 SLA."
    decisions = extract_decisions_from_text(user_msg)
    assert decisions.get("read_write_ratio") == "80:20"
    assert decisions.get("p99_latency_ms") == 200

    state = analyze_dialogue_state([], user_msg)
    assert state.decision_history.get("read_write_ratio") == "80:20"
    assert state.decision_history.get("p99_latency_ms") == 200
    assert state.current_design_stage in {"CACHE", "read_path_caching"}


# ==============================================================================
# 4. NO INVENTED METRICS
# When metrics are not provided, states not specified.
# ==============================================================================
def test_4_no_invented_metrics():
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="Calculate capacity.")],
        graph_data=None,
    )
    res = mentor_service.generate_heuristic_response(req)
    resp = res.structured_response
    assert resp is not None
    assert resp.intent == "calculation"

    exp = resp.explanation.lower()
    assert "not specified" in exp or "isn't specified" in exp or "unknown" in exp
    assert any("example only" in a.lower() for a in resp.assumptions)
    assert any(w in resp.next_question.lower() for w in ["rps", "arrival rate", "latency", "sla"])


# ==============================================================================
# 5. NO FABRICATED CANVAS FACTS
# Strips operational claims from architecture_observations.
# ==============================================================================
def test_5_no_fabricated_canvas_facts():
    mock_data = {
        "title": "Database Review",
        "summary": "Summary",
        "explanation": "Explanation",
        "architecture_observations": [
            "Postgres HA Cluster is present",
            "Postgres can handle 5,000 writes/sec",
            "Redis is currently handling 80% of reads",
        ],
        "assumptions": [],
        "next_question": "What is your latency SLA?",
    }
    canvas = get_sample_canvas()
    resp = normalize_mentor_response(
        data=mock_data,
        user_query="Review my database",
        graph_data=canvas,
    )
    for obs in resp.architecture_observations:
        assert "5,000" not in obs
        assert "80%" not in obs

    assert any("5,000" in a for a in resp.assumptions)
    assert any("example only" in a.lower() for a in resp.assumptions)


# ==============================================================================
# 6. REPEATED QUESTION PREVENTION
# Acknowledges prior address and provides deeper operational telemetry.
# ==============================================================================
def test_6_repeated_question_prevention():
    history = [
        MentorMessage(role="user", content="What read/write ratio should I use?"),
        MentorMessage(
            role="assistant",
            content="There isn't a universal ratio to choose. It describes workload composition from product behavior.",
        ),
        MentorMessage(role="user", content="What read/write ratio should I use?"),
    ]
    req = MentorChatRequest(messages=history, graph_data=None)
    res = mentor_service.generate_heuristic_response(req)
    resp = res.structured_response
    assert resp is not None

    exp = resp.explanation.lower()
    assert any(w in exp for w in ["previous turn", "established", "as we", "as noted", "discussed"])
    assert any(w in exp for w in ["prometheus", "measure", "logs", "metrics", "telemetry"])


# ==============================================================================
# 7. CONVERSATION CONTINUITY
# Maintains context across turns (e.g. "Why?" following Redis removal).
# ==============================================================================
def test_7_conversation_continuity():
    history = [
        MentorMessage(role="user", content="What if I remove Redis?"),
        MentorMessage(
            role="assistant",
            content="Removing Redis exposes your primary database directly to all read queries, risking connection pool exhaustion.",
        ),
        MentorMessage(role="user", content="Why?"),
    ]
    req = MentorChatRequest(messages=history, graph_data=None)
    res = mentor_service.generate_heuristic_response(req)
    resp = res.structured_response
    assert resp is not None
    assert resp.intent == "follow_up"

    exp = resp.explanation.lower()
    assert any(w in exp for w in ["disk", "ram", "memory", "connection", "postgresql", "lock"])
    assert "welcome" not in exp
    assert "senior staff systems architect" not in resp.title.lower()


# ==============================================================================
# 8. ARCHITECTURE-AWARE FOLLOW-UP
# Challenges components present in canvas or user decisions.
# ==============================================================================
def test_8_architecture_aware_followup():
    canvas = get_sample_canvas()
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="What if I remove Redis?")],
        graph_data=canvas,
    )
    res = mentor_service.generate_heuristic_response(req)
    resp = res.structured_response
    assert resp is not None
    assert any("redis" in o.lower() for o in resp.architecture_observations)
    assert any(w in resp.next_question.lower() for w in ["database", "read", "connection", "qps"])


# ==============================================================================
# 9. CACHE FAILURE PROGRESSION
# User chooses Redis -> Mentor introduces failure challenge.
# ==============================================================================
def test_9_cache_failure_progression():
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="I will use Redis as a cache.")],
        graph_data=None,
    )
    res = mentor_service.generate_heuristic_response(req)
    resp = res.structured_response
    assert resp is not None

    exp = resp.explanation.lower()
    assert "redis" in exp
    assert any(w in exp for w in ["fail", "crash", "unavailable", "restart", "eviction"])

    next_q = resp.next_question.lower()
    assert "redis" in next_q or "cache" in next_q
    assert any(w in next_q for w in ["fail", "unavailable", "database", "fast", "degraded"])


# ==============================================================================
# 10. DATABASE BOTTLENECK PROGRESSION
# User chooses DB fallback -> Mentor challenges database overload & connection pool.
# ==============================================================================
def test_10_database_bottleneck_progression():
    history = [
        MentorMessage(role="user", content="I will use Redis as a cache."),
        MentorMessage(role="assistant", content="What happens when Redis fails or is unavailable?"),
        MentorMessage(role="user", content="We fall back to the database."),
    ]
    req = MentorChatRequest(messages=history, graph_data=None)
    res = mentor_service.generate_heuristic_response(req)
    resp = res.structured_response
    assert resp is not None

    exp = resp.explanation.lower()
    assert any(w in exp for w in ["connection pool", "starvation", "exhaustion", "surge", "504"])

    next_q = resp.next_question.lower()
    assert any(w in next_q for w in ["overwhelmed", "protect", "database", "outage", "prevent"])


# ==============================================================================
# 11. ENVOY REMOVAL REASONING
# Explains TLS termination, routing, and rate limiting impact.
# ==============================================================================
def test_11_envoy_removal_reasoning():
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="What is Envoy Gateway and what if I remove it?")],
        graph_data=None,
    )
    res = mentor_service.generate_heuristic_response(req)
    resp = res.structured_response
    assert resp is not None
    assert resp.intent == "architecture_change"

    exp = resp.explanation.lower()
    assert "envoy" in exp
    assert any(w in exp for w in ["proxy", "gateway", "ingress", "routing"])
    assert any(w in exp for w in ["tls", "rate limit", "routing", "downstream"])

    next_q = resp.next_question.lower()
    assert any(w in next_q for w in ["tls", "rate limit", "ingress", "gateway", "downstream"])


# ==============================================================================
# 12. KAFKA FAILURE REASONING
# Explains consumer lag, queue backlog, retention, and backpressure.
# ==============================================================================
def test_12_kafka_failure_reasoning():
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="What happens if Kafka fails or consumers lag?")],
        graph_data=None,
    )
    res = mentor_service.generate_heuristic_response(req)
    resp = res.structured_response
    assert resp is not None
    assert resp.intent == "failure_analysis"

    exp = resp.explanation.lower()
    assert "kafka" in exp
    assert any(w in exp for w in ["consumer", "lag", "backpressure", "retention", "backlog", "log"])

    next_q = resp.next_question.lower()
    assert any(w in next_q for w in ["consumer", "backlog", "lag", "kafka", "queue"])


# ==============================================================================
# 13. MULTI-PART QUESTIONS
# Answers all parts directly before asking follow-up question.
# ==============================================================================
def test_13_multipart_questions():
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="What is Envoy Gateway and what if I remove it?")],
        graph_data=None,
    )
    res = mentor_service.generate_heuristic_response(req)
    resp = res.structured_response
    assert resp is not None

    exp = resp.explanation.lower()
    # Part 1 answered: what Envoy Gateway is
    assert any(w in exp for w in ["proxy", "ingress", "l7"])
    # Part 2 answered: consequences of removing it
    assert any(w in exp for w in ["tls", "rate limit", "downstream"])
    assert resp.next_question is not None


# ==============================================================================
# 14. DECISION MEMORY
# Does not re-ask known decisions (e.g. read/write ratio or SLA).
# ==============================================================================
def test_14_decision_memory():
    history = [
        MentorMessage(role="user", content="Our system has 80% reads and 20% writes with a 200ms p99 SLA. How should we handle reads?"),
    ]
    req = MentorChatRequest(messages=history, graph_data=None)
    res = mentor_service.generate_heuristic_response(req)
    resp = res.structured_response
    assert resp is not None

    next_q = resp.next_question.lower()
    # Must NOT ask what read/write ratio to use
    assert "what read/write ratio" not in next_q
    assert "what is your read/write ratio" not in next_q
    # Must NOT ask what p99 SLA to target
    assert "what p99 latency should i target" not in next_q
    assert "what is your p99" not in next_q
    # Must advance to caching / staleness
    assert any(w in next_q for w in ["cache", "caching", "stale", "staleness", "replicas"])


# ==============================================================================
# 15. DETERMINISTIC FACTS OVERRIDING LLM CLAIMS
# Empty canvas forces architecture_observations to be empty.
# ==============================================================================
def test_15_deterministic_facts_overriding_llm_claims():
    hallucinated_json = {
        "title": "Architecture Review",
        "summary": "Review summary",
        "explanation": "We reviewed your system.",
        "architecture_observations": ["Envoy Gateway is present", "Redis cluster is present"],
        "next_question": "What is your next step?",
    }
    # Canvas is empty (None)
    resp = normalize_mentor_response(
        data=hallucinated_json,
        user_query="Review my design",
        graph_data=None,
    )
    assert resp.architecture_observations == []


# ==============================================================================
# 16. RESPONSE LENGTH COMPLIANCE
# Concise senior engineer phrasing (60-180 words default).
# ==============================================================================
def test_16_response_length_compliance():
    queries = [
        "What read/write ratio should I use?",
        "What is 10:1 read/write ratio?",
        "How does read/write ratio affect capacity?",
        "What p99 latency should I target?",
        "What if I remove Redis?",
    ]
    for q in queries:
        req = MentorChatRequest(messages=[MentorMessage(role="user", content=q)], graph_data=None)
        res = mentor_service.generate_heuristic_response(req)
        resp = res.structured_response
        assert resp is not None
        words = resp.explanation.split()
        assert 20 <= len(words) <= 190, f"Query '{q}' word count {len(words)} out of bounds"


# ==============================================================================
# 17. ONE-QUESTION CONSTRAINT
# Next question contains exactly ONE advancing question ending with '?'.
# ==============================================================================
def test_17_one_question_constraint():
    queries = [
        "What read/write ratio should I use?",
        "What is 10:1 read/write ratio?",
        "What p99 latency should I target?",
        "Calculate capacity.",
        "What if I remove Redis?",
    ]
    for q in queries:
        req = MentorChatRequest(messages=[MentorMessage(role="user", content=q)], graph_data=None)
        res = mentor_service.generate_heuristic_response(req)
        resp = res.structured_response
        assert resp is not None
        if resp.next_question:
            assert resp.next_question.count("?") == 1, f"Question '{resp.next_question}' has more than 1 '?'"


# ==============================================================================
# 18. UNRELATED FOLLOW-UP DETECTION
# Does not jump to unrelated topics.
# ==============================================================================
def test_18_unrelated_followup_detection():
    # Discussing workload composition: must not jump to Redis or Kafka
    q = select_advancing_question(
        topic="read_write_ratio",
        candidate_question="Should we deploy Redis cluster?",
        previous_questions=[],
    )
    assert "redis" not in q.lower()

    # Discussing Envoy: must not jump to Redis
    q_envoy = select_advancing_question(
        topic="envoy_gateway",
        candidate_question="Can we use Redis caching?",
        previous_questions=[],
    )
    assert "redis" not in q_envoy.lower()


# ==============================================================================
# 19. FULL MULTI-TURN REGRESSION CONVERSATION TEST
# Turn 1 -> Turn 2 -> Turn 3 -> Turn 4 interview progression.
# ==============================================================================
def test_19_full_multiturn_regression_conversation():
    # --- TURN 1: User provides workload & SLA and asks how to handle reads ---
    history = [
        MentorMessage(
            role="user",
            content="Our system has 80% reads and 20% writes with a 200ms p99 SLA. How should we handle reads?",
        )
    ]
    req1 = MentorChatRequest(messages=history, graph_data=None)
    res1 = mentor_service.generate_heuristic_response(req1)
    resp1 = res1.structured_response
    assert resp1 is not None
    # Verifies workload recognized and read path addressed
    assert "80:20" in resp1.title or "80%" in resp1.summary or "read" in resp1.explanation.lower()
    # Verifies next question advances to caching/staleness and DOES NOT re-ask ratio or SLA
    q1 = resp1.next_question.lower()
    assert "what read/write ratio" not in q1
    assert "p99 latency should i target" not in q1
    assert any(w in q1 for w in ["caching", "cache", "stale", "staleness"])

    # --- TURN 2: User chooses Redis as a cache ---
    history.append(MentorMessage(role="assistant", content=res1.reply))
    history.append(MentorMessage(role="user", content="I will use Redis as a cache."))
    req2 = MentorChatRequest(messages=history, graph_data=None)
    res2 = mentor_service.generate_heuristic_response(req2)
    resp2 = res2.structured_response
    assert resp2 is not None
    # Verifies Redis decision acknowledged and failure challenge introduced
    exp2 = resp2.explanation.lower()
    assert "redis" in exp2
    assert any(w in exp2 for w in ["fail", "crash", "unavailable", "restart"])
    q2 = resp2.next_question.lower()
    assert "what read/write ratio" not in q2
    assert any(w in q2 for w in ["fail", "unavailable", "database", "fast", "degraded"])

    # --- TURN 3: User says we fall back to the database ---
    history.append(MentorMessage(role="assistant", content=res2.reply))
    history.append(MentorMessage(role="user", content="We fall back to the database."))
    req3 = MentorChatRequest(messages=history, graph_data=None)
    res3 = mentor_service.generate_heuristic_response(req3)
    resp3 = res3.structured_response
    assert resp3 is not None
    # Verifies database saturation & connection exhaustion warning
    exp3 = resp3.explanation.lower()
    assert any(w in exp3 for w in ["connection pool", "starvation", "exhaustion", "surge", "504"])
    q3 = resp3.next_question.lower()
    assert any(w in q3 for w in ["overwhelmed", "protect", "database", "outage", "prevent"])

    # --- TURN 4: User introduces rate limiting and connection pooling with PgBouncer ---
    history.append(MentorMessage(role="assistant", content=res3.reply))
    history.append(MentorMessage(role="user", content="We will use rate limiting and connection pooling with PgBouncer."))
    req4 = MentorChatRequest(messages=history, graph_data=None)
    res4 = mentor_service.generate_heuristic_response(req4)
    resp4 = res4.structured_response
    assert resp4 is not None
    # Verifies PgBouncer & rate limiting evaluated, challenges traffic surge
    exp4 = resp4.explanation.lower()
    assert any(w in exp4 for w in ["pgbouncer", "pooling", "rate limiting", "shed"])
    q4 = resp4.next_question.lower()
    assert any(w in q4 for w in ["surge", "spike", "3x", "traffic"])


# ==============================================================================
# MARKDOWN STRUCTURE & NO ROBOTIC BADGES
# Verifies clean presentation without UI badges.
# ==============================================================================
def test_markdown_presentation_structure():
    req = MentorChatRequest(
        messages=[MentorMessage(role="user", content="What read/write ratio should I use?")],
        graph_data=None,
    )
    res = mentor_service.generate_heuristic_response(req)
    md = res.reply

    # Verifies standard markdown sections
    assert "### " in md
    assert "### Trade-off" in md
    assert "### Think about this" in md

    # Verifies NO robotic badges or headers in body text
    assert "Senior Staff Systems Architect" not in md
    assert "Level: intermediate" not in md
    assert "Concept Breakdown" not in md
    assert "Focus:" not in md


# ==============================================================================
# 20. BANNED ANALYTICS & VISUALIZATION FILTER
# Rejects Tableau, Power BI, D3, demographic analysis, estimating ratio loops.
# ==============================================================================
def test_20_banned_analytics_and_visualization_filter():
    banned_candidates = [
        "How do you estimate the read/write ratio from user logs?",
        "How do you design the read/write ratio?",
        "How do you analyze user interaction data?",
        "How do you visualize the data using Tableau or Power BI?",
        "Could we plot this on a heat map or scatter plot with D3.js?",
        "How do you handle missing data in Google Data Studio?",
        "What demographic or click-through analysis would you perform?",
        "How do you measure user retention and customer satisfaction?",
    ]
    for q in banned_candidates:
        score, reason = score_question_relevance(
            question=q,
            current_stage="WORKLOAD",
            decision_history={},
            previous_questions=[],
        )
        assert score == 0.0, f"Expected 0.0 for banned pattern '{q}', got {score} ({reason})"
        assert "banned" in reason.lower() or "analytics" in reason.lower()

    # Re-asking established ratio or SLA must also score 0.0
    decisions = {"read_write_ratio": "80:20", "p99_latency_ms": 200}
    score_ratio, _ = score_question_relevance("What read/write ratio are you designing for?", "WORKLOAD", decisions, [])
    assert score_ratio == 0.0

    score_sla, _ = score_question_relevance("What p99 latency SLA are you targeting?", "LATENCY", decisions, [])
    assert score_sla == 0.0


# ==============================================================================
# 21. ARCHITECTURAL PROGRESSION DETECTOR
# Deterministic orchestrator moves forward across canonical stages without looping.
# ==============================================================================
def test_21_architectural_progression_detector():
    # 1. Initially empty -> WORKLOAD
    dec0 = get_next_architecture_decision({"decision_history": {}})
    assert dec0["stage"] == "WORKLOAD"
    assert "ratio" in dec0["question"].lower()

    # 2. Workload resolved -> LATENCY
    dec1 = get_next_architecture_decision({"decision_history": {"read_write_ratio": "80:20"}})
    assert dec1["stage"] == "LATENCY"
    assert "p99" in dec1["question"].lower()

    # 3. Latency resolved -> CACHE
    dec2 = get_next_architecture_decision({"decision_history": {"read_write_ratio": "80:20", "p99_latency_ms": 200}})
    assert dec2["stage"] == "CACHE"
    assert any(w in dec2["question"].lower() for w in ["cache", "caching", "stale", "latency-sensitive"])

    # 4. Cache chosen (Redis) -> FAILURE
    dec3 = get_next_architecture_decision({"decision_history": {"read_write_ratio": "80:20", "p99_latency_ms": 200, "cache": "Redis"}})
    assert dec3["stage"] == "FAILURE"
    assert any(w in dec3["question"].lower() for w in ["unavailable", "fall back", "fail"])

    # 5. Fallback chosen (Database) -> DATABASE
    dec4 = get_next_architecture_decision({"decision_history": {"read_write_ratio": "80:20", "p99_latency_ms": 200, "cache": "Redis", "cache_fallback": "database"}})
    assert dec4["stage"] == "DATABASE"
    assert any(w in dec4["question"].lower() for w in ["protect", "surge", "database"])

    # 6. Database protection chosen -> SCALING
    dec5 = get_next_architecture_decision({"decision_history": {"read_write_ratio": "80:20", "p99_latency_ms": 200, "cache": "Redis", "cache_fallback": "database", "database_protection": ["pgbouncer", "rate_limiting"]}})
    assert dec5["stage"] == "SCALING"
    assert any(w in dec5["question"].lower() for w in ["spike", "reject", "stale", "degrading"])

    # 7. Traffic spike strategy chosen -> RELIABILITY (Load Shedding Hierarchy)
    dec6 = get_next_architecture_decision({"decision_history": {"read_write_ratio": "80:20", "p99_latency_ms": 200, "cache": "Redis", "cache_fallback": "database", "database_protection": ["pgbouncer", "rate_limiting"], "traffic_spike_strategy": "degrade_non_critical"}})
    assert dec6["stage"] == "RELIABILITY"
    assert any(w in dec6["question"].lower() for w in ["shed", "non-critical", "dependencies"])


# ==============================================================================
# 22. END-TO-END 6-TURN SYSTEM DESIGN DIALOGUE
# Full interview sequence: Workload -> Redis -> DB Fallback -> Rate Limiting &
# PgBouncer -> Feature Degradation -> Dependency Shedding & Incident Recovery.
# ==============================================================================
def test_22_end_to_end_6_turn_system_design_dialogue():
    # --- Turn 1: User provides workload & SLA and asks how to handle reads ---
    history = [
        MentorMessage(
            role="user",
            content="Our system has 80% reads and 20% writes with a 200ms p99 SLA. How should we handle reads?",
        )
    ]
    req1 = MentorChatRequest(messages=history, graph_data=None)
    res1 = mentor_service.generate_heuristic_response(req1)
    resp1 = res1.structured_response
    assert resp1 is not None
    assert "80:20" in resp1.title or "80%" in resp1.summary
    q1 = resp1.next_question.lower()
    assert "what read/write ratio" not in q1
    assert "what p99 latency" not in q1
    assert any(w in q1 for w in ["caching", "cache", "stale", "staleness", "latency-sensitive"])

    # --- Turn 2: User chooses Redis as a cache ---
    history.append(MentorMessage(role="assistant", content=res1.reply))
    history.append(MentorMessage(role="user", content="I will use Redis as a cache."))
    req2 = MentorChatRequest(messages=history, graph_data=None)
    res2 = mentor_service.generate_heuristic_response(req2)
    resp2 = res2.structured_response
    assert resp2 is not None
    assert "redis" in resp2.explanation.lower()
    q2 = resp2.next_question.lower()
    assert any(w in q2 for w in ["fail", "unavailable", "database", "degraded", "fast"])

    # --- Turn 3: User says we fall back to the database ---
    history.append(MentorMessage(role="assistant", content=res2.reply))
    history.append(MentorMessage(role="user", content="We fall back to the database."))
    req3 = MentorChatRequest(messages=history, graph_data=None)
    res3 = mentor_service.generate_heuristic_response(req3)
    resp3 = res3.structured_response
    assert resp3 is not None
    assert any(w in resp3.explanation.lower() for w in ["connection pool", "starvation", "exhaustion", "surge", "504"])
    q3 = resp3.next_question.lower()
    assert any(w in q3 for w in ["overwhelmed", "protect", "database", "surge", "prevent"])

    # --- Turn 4: User introduces rate limiting and connection pooling with PgBouncer ---
    history.append(MentorMessage(role="assistant", content=res3.reply))
    history.append(MentorMessage(role="user", content="We will use rate limiting and connection pooling with PgBouncer."))
    req4 = MentorChatRequest(messages=history, graph_data=None)
    res4 = mentor_service.generate_heuristic_response(req4)
    resp4 = res4.structured_response
    assert resp4 is not None
    assert any(w in resp4.explanation.lower() for w in ["pgbouncer", "pooling", "rate limiting", "shed"])
    q4 = resp4.next_question.lower()
    assert any(w in q4 for w in ["reject", "stale", "degrading", "spike", "traffic"])

    # --- Turn 5: User chooses feature degradation ---
    history.append(MentorMessage(role="assistant", content=res4.reply))
    history.append(MentorMessage(role="user", content="We prefer degrading non-critical features during traffic spikes."))
    req5 = MentorChatRequest(messages=history, graph_data=None)
    res5 = mentor_service.generate_heuristic_response(req5)
    resp5 = res5.structured_response
    assert resp5 is not None
    assert any(w in resp5.explanation.lower() for w in ["degradation", "hierarchy", "dependencies", "tier", "checkout"])
    q5 = resp5.next_question.lower()
    assert any(w in q5 for w in ["shed", "non-critical", "dependencies", "incident"])

    # --- Turn 6: User specifies dependencies to shed ---
    history.append(MentorMessage(role="assistant", content=res5.reply))
    history.append(MentorMessage(role="user", content="We will shed reviews and recommendations first."))
    req6 = MentorChatRequest(messages=history, graph_data=None)
    res6 = mentor_service.generate_heuristic_response(req6)
    resp6 = res6.structured_response
    assert resp6 is not None
    assert any(w in resp6.explanation.lower() for w in ["recovery", "stampede", "circuit breaker", "hysteresis", "restor"])
    q6 = resp6.next_question.lower()
    assert any(w in q6 for w in ["recovered", "recovery", "restore", "detect"])

