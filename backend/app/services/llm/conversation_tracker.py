import hashlib
import re
from typing import Any
from pydantic import BaseModel, Field

# 16 Canonical System Design Stages
ALLOWED_DESIGN_STAGES = [
    "REQUIREMENTS",
    "WORKLOAD",
    "LATENCY",
    "CRITICAL_PATH",
    "DATA",
    "API",
    "CACHE",
    "DATABASE",
    "ASYNC",
    "SCALING",
    "CONSISTENCY",
    "FAILURE",
    "OBSERVABILITY",
    "SECURITY",
    "COST",
    "REVIEW",
]

# Banned questions: meta-lessons, product analytics, visualization tools, demographics
BANNED_QUESTION_PATTERNS = [
    r"how do you estimate (?:the )?(?:read[/ ]?write )?ratio",
    r"how do you design (?:the )?(?:read[/ ]?write )?ratio",
    r"how do you determine (?:the )?(?:read[/ ]?write )?ratio",
    r"how do you analyze user",
    r"how do you visualize",
    r"how do you handle missing data",
    r"visualization tool",
    r"\btableau\b",
    r"\bpower bi\b",
    r"\bd3(?:\.js)?\b",
    r"\bheat map\b",
    r"\bscatter plot\b",
    r"\bgoogle data studio\b",
    r"\bdemographic\b",
    r"\bclick-through\b",
    r"\buser feedback\b",
    r"\bretention analysis\b",
    r"\bcustomer satisfaction\b",
]


class DialogueState(BaseModel):
    current_topic: str = "general_architecture"
    current_design_stage: str = "REQUIREMENTS"
    previous_questions: list[str] = Field(default_factory=list)
    previous_user_queries: list[str] = Field(default_factory=list)
    question_history: list[dict[str, Any]] = Field(default_factory=list)
    is_repeated_query: bool = False
    repeat_count: int = 0
    unresolved_issue: str | None = None
    last_assistant_question: str | None = None
    last_assistant_topic: str | None = None
    last_user_query: str | None = None
    decision_history: dict[str, Any] = Field(default_factory=dict)
    known_facts: list[str] = Field(default_factory=list)
    known_assumptions: list[str] = Field(default_factory=list)
    unknown_requirements: list[str] = Field(default_factory=list)
    asked_question_ids: list[str] = Field(default_factory=list)
    next_architecture_decision: dict[str, Any] = Field(default_factory=dict)


def normalize_query_text(text: str) -> str:
    cleaned = re.sub(r"[^\w\s]", "", (text or "").lower())
    return " ".join(cleaned.split())


def extract_questions_from_text(text: str) -> list[str]:
    if not text:
        return []
    matches = re.findall(r"([^.?!\n]+[?])", text)
    return [m.strip() for m in matches if len(m.strip()) > 10]


def is_question_repeating(cand: str, previous_questions: list[str]) -> bool:
    """Checks if a candidate question is identical or semantically repetitive."""
    if not cand or not previous_questions:
        return False
    cand_norm = normalize_query_text(cand)
    cand_words = set(cand_norm.split())

    for prev in previous_questions:
        prev_norm = normalize_query_text(prev)
        if cand_norm == prev_norm:
            return True
        prev_words = set(prev_norm.split())
        if cand_words and prev_words:
            overlap = len(cand_words & prev_words) / float(max(len(cand_words), len(prev_words)))
            if overlap > 0.70:
                return True
    return False


def score_question_relevance(
    question: str,
    current_stage: str,
    decision_history: dict[str, Any],
    previous_questions: list[str],
) -> tuple[float, str]:
    """
    Evaluates follow-up question relevance strictly on system-design impact.
    Scores from 0.0 (unacceptable) to 1.0 (ideal).
    Rejects:
    - Banned analytics/visualization/meta-lesson topics.
    - Re-asking already established decisions (workload, SLA, cache).
    - Non-architectural questions (demographics, feedback).
    - Semantic duplicates.
    """
    if not question or not question.strip():
        return 0.0, "Empty question"

    q_lower = question.lower().strip()

    # 1. Banned analytics/meta-lesson patterns
    for pat in BANNED_QUESTION_PATTERNS:
        if re.search(pat, q_lower):
            return 0.0, f"Banned analytics or meta-lesson topic: '{pat}'"

    # 2. Duplicate check against history
    if is_question_repeating(question, previous_questions):
        return 0.0, "Question is a duplicate of a previously asked question"

    # 3. Re-asking known decisions
    has_ratio = bool(
        decision_history.get("read_write_ratio")
        or decision_history.get("workload", {}).get("read_write_ratio")
    )
    has_sla = bool(
        decision_history.get("p99_latency_ms")
        or decision_history.get("latency", {}).get("p99_ms")
    )

    if has_ratio and any(
        p in q_lower
        for p in [
            "what read/write ratio",
            "what read write ratio",
            "what is your read/write",
            "what workload composition",
            "how do you determine your read/write",
        ]
    ):
        return 0.0, "Re-asks established workload ratio decision"

    if has_sla and any(
        p in q_lower
        for p in [
            "what p99 latency",
            "what latency sla",
            "what is your p99",
            "what is your latency target",
            "what latency target",
        ]
    ):
        return 0.0, "Re-asks established latency SLA decision"

    # 4. Architectural impact check: must address core architecture dimensions
    architectural_keywords = [
        "cache", "caching", "database", "db", "postgres", "redis", "kafka", "queue",
        "replica", "replication", "partition", "sharding", "latency", "throughput",
        "sla", "p99", "fallback", "failover", "failure", "crash", "timeout", "pool",
        "pooling", "rate limit", "circuit breaker", "consistent", "consistency",
        "stale", "staleness", "synchronous", "asynchronous", "async", "gateway",
        "envoy", "proxy", "tls", "routing", "surge", "scale", "bottleneck", "spof",
        "load balancer", "connection", "memory", "disk", "write path", "read path",
    ]
    if not any(kw in q_lower for kw in architectural_keywords):
        return 0.2, "Low architectural impact (does not address distributed systems primitives)"

    # 5. Stage & topic coherence check
    stage_upper = current_stage.upper()

    if stage_upper in {"WORKLOAD", "REQUIREMENTS"}:
        if any(w in q_lower for w in ["redis", "kafka", "pgbouncer", "memcached"]):
            return 0.2, "Premature component selection before establishing workload and SLA"
        if any(w in q_lower for w in ["ratio", "read", "write", "rps", "qps", "throughput", "workload"]):
            return 1.0, "Directly aligns with workload requirements"

    if stage_upper in {"API", "GATEWAY"}:
        if any(w in q_lower for w in ["redis", "database", "postgres", "kafka"]):
            return 0.2, "Unrelated component leap while evaluating API Gateway"
        if any(w in q_lower for w in ["envoy", "gateway", "tls", "ingress", "routing", "rate limit"]):
            return 1.0, "Directly aligns with API Gateway concerns"

    # 6. Stage alignment scoring
    score = 0.7
    if stage_upper in {"CACHE", "CRITICAL_PATH"} and any(w in q_lower for w in ["cache", "caching", "stale", "staleness", "read path", "latency"]):
        score = 1.0
    elif stage_upper == "CONSISTENCY" and any(w in q_lower for w in ["stale", "fresh", "consistent", "eventual", "strong", "replicate"]):
        score = 1.0
    elif stage_upper == "FAILURE" and any(w in q_lower for w in ["fail", "crash", "unavailable", "fallback", "down", "outage", "degrade"]):
        score = 1.0
    elif stage_upper == "DATABASE" and any(w in q_lower for w in ["database", "db", "pool", "protect", "surge", "overwhelm", "postgres"]):
        score = 1.0
    elif stage_upper == "SCALING" and any(w in q_lower for w in ["surge", "spike", "scale", "3x", "traffic", "shed", "degrade"]):
        score = 1.0
    elif stage_upper == "ASYNC" and any(w in q_lower for w in ["async", "asynchronous", "queue", "kafka", "backpressure", "lag"]):
        score = 1.0

    return score, "High architectural relevance"


def extract_decisions_from_text(
    text: str,
    current_decisions: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Extracts structured user architectural decisions and inputs from conversational text.
    Maintains both top-level keys and nested structured dictionaries for compatibility.
    """
    decisions = dict(current_decisions or {})
    if not text:
        return decisions

    t_lower = text.lower()

    # 1. Read/Write Ratio
    match_pct = re.search(r"(\d+)\s*%\s*reads?.*?(?:and\s*|,|\s+)?(\d+)\s*%\s*writes?", t_lower)
    if match_pct:
        ratio_str = f"{match_pct.group(1)}:{match_pct.group(2)}"
        r_ratio = float(match_pct.group(1)) / 100.0
        w_ratio = float(match_pct.group(2)) / 100.0
        decisions["read_write_ratio"] = ratio_str
        decisions.setdefault("workload", {})["read_ratio"] = r_ratio
        decisions["workload"]["write_ratio"] = w_ratio
        decisions["workload"]["read_write_ratio"] = ratio_str
        decisions["workload"]["source"] = "user"
    else:
        match_pct_rev = re.search(r"(\d+)\s*%\s*writes?.*?(?:and\s*|,|\s+)?(\d+)\s*%\s*reads?", t_lower)
        if match_pct_rev:
            ratio_str = f"{match_pct_rev.group(2)}:{match_pct_rev.group(1)}"
            r_ratio = float(match_pct_rev.group(2)) / 100.0
            w_ratio = float(match_pct_rev.group(1)) / 100.0
            decisions["read_write_ratio"] = ratio_str
            decisions.setdefault("workload", {})["read_ratio"] = r_ratio
            decisions["workload"]["write_ratio"] = w_ratio
            decisions["workload"]["read_write_ratio"] = ratio_str
            decisions["workload"]["source"] = "user"
        else:
            match_colon = re.search(r"\b(\d+)\s*[:/]\s*(\d+)\b", t_lower)
            if match_colon and any(w in t_lower for w in ["read", "write", "ratio", "workload"]):
                ratio_str = f"{match_colon.group(1)}:{match_colon.group(2)}"
                decisions["read_write_ratio"] = ratio_str
                decisions.setdefault("workload", {})["read_write_ratio"] = ratio_str
                decisions["workload"]["source"] = "user"

    # 2. p99 Latency SLA
    match_lat1 = re.search(r"p99\s*(?:latency|sla|target)?\s*(?:is|of|=|:)?\s*(\d+)\s*(?:ms|milliseconds)", t_lower)
    if match_lat1:
        p99_val = int(match_lat1.group(1))
        decisions["p99_latency_ms"] = p99_val
        decisions.setdefault("latency", {})["p99_ms"] = p99_val
        decisions["latency"]["source"] = "user"
    else:
        match_lat2 = re.search(r"(\d+)\s*(?:ms|milliseconds)\s*p99", t_lower)
        if match_lat2:
            p99_val = int(match_lat2.group(1))
            decisions["p99_latency_ms"] = p99_val
            decisions.setdefault("latency", {})["p99_ms"] = p99_val
            decisions["latency"]["source"] = "user"
        else:
            match_lat3 = re.search(r"latency\s*(?:sla|budget|target|is)?\s*(?:of|=|:)?\s*(\d+)\s*(?:ms|milliseconds)", t_lower)
            if match_lat3 and "p99" in t_lower:
                p99_val = int(match_lat3.group(1))
                decisions["p99_latency_ms"] = p99_val
                decisions.setdefault("latency", {})["p99_ms"] = p99_val
                decisions["latency"]["source"] = "user"

    # 3. Throughput (RPS/QPS)
    match_rps = re.search(r"(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rps|qps|req/s|requests\s+per\s+second)", t_lower)
    if match_rps:
        try:
            rps_val = float(match_rps.group(1).replace(",", ""))
            decisions["throughput_rps"] = rps_val
            decisions.setdefault("workload", {})["throughput_rps"] = rps_val
        except ValueError:
            pass

    # 4. Cache Technology Choice
    if any(phrase in t_lower for phrase in ["use redis", "using redis", "choose redis", "deploy redis", "redis as a cache", "redis as cache", "i will use redis", "i'll use redis", "cache with redis"]):
        decisions["cache"] = "Redis"
        decisions.setdefault("cache_info", {})["technology"] = "Redis"
        decisions["cache_info"]["purpose"] = "frequent reads"
    elif "redis" in t_lower and ("cache" in t_lower or "caching" in t_lower) and not any(w in t_lower for w in ["remove", "without", "delete"]):
        decisions["cache"] = "Redis"
        decisions.setdefault("cache_info", {})["technology"] = "Redis"
        decisions["cache_info"]["purpose"] = "frequent reads"
    elif "memcached" in t_lower:
        decisions["cache"] = "Memcached"
        decisions.setdefault("cache_info", {})["technology"] = "Memcached"

    # 5. Consistency & Freshness boundaries
    if "stale" in t_lower and ("fresh" in t_lower or "cannot" in t_lower or "must" in t_lower or "tolerate" in t_lower):
        decisions.setdefault("consistency", {})
        if "metadata" in t_lower:
            decisions["consistency"]["product_metadata"] = "eventual"
        if "payment" in t_lower:
            decisions["consistency"]["payment_status"] = "strong"

    # 6. Cache Failure Fallback Strategy
    if any(phrase in t_lower for phrase in ["fall back to the database", "fallback to the database", "fall back to db", "fallback to db", "fall back to database", "query the database directly", "bypass cache"]):
        decisions["cache_fallback"] = "database"
        decisions.setdefault("cache_info", {})["fallback"] = "database"
    elif any(phrase in t_lower for phrase in ["fail fast", "circuit breaker", "return error", "drop request"]):
        decisions["cache_fallback"] = "fail_fast"
        decisions.setdefault("cache_info", {})["fallback"] = "fail_fast"
    elif "serve stale" in t_lower or "degraded response" in t_lower:
        decisions["cache_fallback"] = "serve_stale"
        decisions.setdefault("cache_info", {})["fallback"] = "serve_stale"

    # 7. Database Protection & Traffic Shedding
    protections = list(decisions.get("database_protection") or [])
    if "pgbouncer" in t_lower and "pgbouncer" not in protections:
        protections.append("pgbouncer")
    if ("connection pool" in t_lower or "connection pooling" in t_lower) and "connection_pooling" not in protections:
        protections.append("connection_pooling")
    if ("rate limit" in t_lower or "rate limiting" in t_lower) and "rate_limiting" not in protections:
        protections.append("rate_limiting")
    if ("read replica" in t_lower or "read replicas" in t_lower) and "read_replicas" not in protections:
        protections.append("read_replicas")
    if "circuit breaker" in t_lower and "circuit_breaker" not in protections:
        protections.append("circuit_breaker")
    if ("degrade" in t_lower or "shed" in t_lower) and "feature_degradation" not in protections:
        protections.append("feature_degradation")
    if protections:
        decisions["database_protection"] = protections

    # 8. Traffic Spike Strategy
    if any(w in t_lower for w in ["degrading non-critical", "degrade non-critical", "degrade features", "feature degradation"]):
        decisions["traffic_spike_strategy"] = "degrade_non_critical"
    elif any(w in t_lower for w in ["rejecting excess", "reject excess", "shed traffic"]):
        decisions["traffic_spike_strategy"] = "reject_excess"
    elif "serve stale" in t_lower or "serving stale" in t_lower:
        decisions["traffic_spike_strategy"] = "serve_stale"

    # 9. Shedding Targets
    if any(w in t_lower for w in ["reviews", "recommendations", "analytics", "feed", "search suggestions", "notification"]):
        decisions["shedding_target"] = "auxiliary_features"

    # 10. Recovery Strategy
    if any(w in t_lower for w in ["hysteresis", "health check", "probe", "gradual ramp", "metric", "prometheus", "latency drop"]):
        decisions["recovery_strategy"] = "health_check_ramp"

    # 11. Queue Technology
    if "kafka" in t_lower:
        decisions["queue"] = "Kafka"
    elif "rabbitmq" in t_lower:
        decisions["queue"] = "RabbitMQ"

    # 12. Gateway Technology
    if "envoy" in t_lower:
        decisions["gateway"] = "Envoy"
    elif "nginx" in t_lower:
        decisions["gateway"] = "Nginx"

    return decisions


def get_next_architecture_decision(context: dict[str, Any]) -> dict[str, Any]:
    """
    Authoritative Orchestrator: Determines WHAT architectural decision must be addressed next.
    Examines:
    - unresolved requirements
    - current canvas facts
    - previous decisions
    - current stage
    Returns:
    {
      "stage": "...",
      "decision": "...",
      "reason": "...",
      "question": "..."
    }
    """
    decisions = context.get("decision_history") or {}
    canvas_facts = context.get("canvas_facts") or {}
    previous_questions = context.get("previous_questions") or []
    current_query = (context.get("current_query") or "").lower()

    has_ratio = bool(
        decisions.get("read_write_ratio")
        or decisions.get("workload", {}).get("read_write_ratio")
    )
    has_sla = bool(
        decisions.get("p99_latency_ms")
        or decisions.get("latency", {}).get("p99_ms")
    )
    has_cache = bool(decisions.get("cache") or canvas_facts.get("has_redis"))
    has_fallback = bool(decisions.get("cache_fallback"))
    has_protection = bool(decisions.get("database_protection"))
    has_spike_handling = bool(decisions.get("traffic_spike_strategy")) or (has_protection and any("degrade" in str(p) for p in decisions.get("database_protection", [])))
    has_shedding = bool(decisions.get("shedding_target"))
    has_recovery = bool(decisions.get("recovery_strategy"))
    has_kafka = bool(decisions.get("queue") == "Kafka" or canvas_facts.get("has_kafka"))
    has_envoy = bool(decisions.get("gateway") == "Envoy" or any("envoy" in str(c).lower() for c in canvas_facts.get("components", [])))

    # Stage 1: Workload Requirements
    if not has_ratio:
        return {
            "stage": "WORKLOAD",
            "decision": "workload_composition",
            "reason": "Need to establish whether system is read-heavy or write-heavy before choosing storage or caching.",
            "question": "What read/write ratio and peak arrival rate (RPS) are you designing for?",
        }

    # Stage 2: Latency SLA
    if not has_sla:
        return {
            "stage": "LATENCY",
            "decision": "p99_latency_budget",
            "reason": "Workload composition is established; latency SLA defines the budget for the request path.",
            "question": "What p99 latency SLA are you targeting for the critical path?",
        }

    # Stage 3: Read Path / Caching Strategy
    if not has_cache:
        return {
            "stage": "CACHE",
            "decision": "caching_strategy",
            "reason": "With an established read-heavy workload and latency SLA, we must identify which read path to shield with caching.",
            "question": "Which read operation is most latency-sensitive, and can its data tolerate being slightly stale?",
        }

    # Stage 4: Cache Failure & Fallback Mode
    if not has_fallback:
        return {
            "stage": "FAILURE",
            "decision": "cache_failure_mode",
            "reason": "In-memory cache clusters face node restarts, crashes, and network partitions.",
            "question": "If Redis becomes unavailable, should requests fall back to the database, return a degraded response, or fail fast?",
        }

    # Stage 5: Database Surge Protection
    if not has_protection:
        return {
            "stage": "DATABASE",
            "decision": "database_surge_protection",
            "reason": "Falling back to the database shifts read volume onto PostgreSQL, risking connection exhaustion and cascading 504 timeouts.",
            "question": "How would you protect the database from that surge?",
        }

    # Stage 6: Scaling & Surge Management
    if not has_spike_handling:
        return {
            "stage": "SCALING",
            "decision": "traffic_spike_handling",
            "reason": "Rate limiting protects database processes but sheds excess user traffic during sustained surges.",
            "question": "Would you prefer rejecting excess requests, serving stale cached data, or degrading non-critical features during a traffic spike?",
        }

    # Stage 7: Feature Degradation & Load Shedding
    if not has_shedding:
        return {
            "stage": "RELIABILITY",
            "decision": "load_shedding_hierarchy",
            "reason": "Degrading features requires defining explicit dependency tiers to preserve core revenue and transactional flows.",
            "question": "Which non-critical service dependencies would you shed first during an incident?",
        }

    # Stage 8: Incident Recovery & Health Checks
    if not has_recovery:
        return {
            "stage": "RELIABILITY",
            "decision": "system_recovery_and_restoration",
            "reason": "During degraded operation, systems must safely transition back to full functionality without secondary stampedes.",
            "question": "How do you detect that the primary database has recovered so you can safely restore shed features?",
        }

    # Stage 9: Async Queues
    if has_kafka:
        return {
            "stage": "ASYNC",
            "decision": "async_processing_boundaries",
            "reason": "Deciding which operations require synchronous HTTP response vs asynchronous background processing.",
            "question": "Which operations need synchronous confirmation, and which can be processed asynchronously?",
        }

    # Stage 10: Ingress API Gateway
    if has_envoy:
        return {
            "stage": "API",
            "decision": "gateway_responsibilities",
            "reason": "Separating ingress concerns from microservice business logic.",
            "question": "Which cross-cutting concerns belong at the gateway versus the service?",
        }

    # Stage 11: Final Architecture Review
    return {
        "stage": "REVIEW",
        "decision": "holistic_tradeoff_review",
        "reason": "Evaluating holistic architecture resilience.",
        "question": "What failure mode or bottleneck in this topology represents your greatest operational concern right now?",
    }


def determine_design_stage(decision_history: dict[str, Any], current_topic: str) -> str:
    """
    Maps conversational state to one of the 16 ALLOWED_DESIGN_STAGES.
    """
    context = {"decision_history": decision_history, "current_topic": current_topic}
    next_dec = get_next_architecture_decision(context)

    topic_map = {
        "envoy_gateway": "API",
        "kafka_resilience": "ASYNC",
        "redis_removal": "DATABASE",
        "redis_caching": "CACHE",
        "read_write_ratio": "WORKLOAD",
        "latency_sla": "LATENCY",
        "capacity_sizing": "CRITICAL_PATH",
        "scaling_surge": "SCALING",
        "database_protection": "DATABASE",
        "failure_scenarios": "FAILURE",
        "load_shedding": "RELIABILITY",
        "incident_recovery": "RELIABILITY",
    }

    # If the topic is already resolved in decision_history, advance to next stage
    has_ratio = bool(decision_history.get("read_write_ratio") or decision_history.get("workload", {}).get("read_write_ratio"))
    has_sla = bool(decision_history.get("p99_latency_ms") or decision_history.get("latency", {}).get("p99_ms"))
    has_cache = bool(decision_history.get("cache"))
    has_fallback = bool(decision_history.get("cache_fallback"))
    has_protection = bool(decision_history.get("database_protection"))

    if current_topic == "read_write_ratio" and has_ratio:
        return "LATENCY" if not has_sla else "CACHE"
    if current_topic == "latency_sla" and has_sla:
        return "CACHE" if not has_cache else "FAILURE"
    if current_topic in {"redis_caching", "read_path_caching"} and has_cache:
        return "FAILURE" if not has_fallback else "DATABASE"
    if current_topic == "failure_scenarios" and has_fallback:
        return "DATABASE" if not has_protection else "SCALING"
    if current_topic == "database_protection" and has_protection:
        return "SCALING"

    if current_topic in topic_map and current_topic != "general_architecture":
        return topic_map[current_topic]

    return next_dec["stage"]


def detect_topic(query: str, history_context: str = "") -> str:
    q = (query or "").lower()

    if "kafka" in q:
        return "kafka_resilience"
    if "monitor" in q or ("resource utilization" in q and "ratio" in q):
        return "monitoring"
    if "read/write" in q or "read write" in q or "read-to-write" in q or ("ratio" in q and ("read" in q or "write" in q)):
        return "read_write_ratio"
    if "p99" in q or ("latency" in q and ("sla" in q or "target" in q)):
        return "latency_sla"
    if "capacity" in q or "little" in q or ("calculate" in q and ("concurrency" in q or "throughput" in q)):
        return "capacity_sizing"
    if "envoy" in q or ("gateway" in q and ("remove" in q or "alternative" in q)):
        return "envoy_gateway"
    if "redis" in q and ("remove" in q or "without" in q or "delete" in q):
        return "redis_removal"
    if "redis" in q or "cache" in q:
        if "redis_removal" in history_context:
            return "redis_removal"
        return "redis_caching"
    if "10 million" in q or "10m" in q or "scale for" in q:
        return "scale_users"
    if "spof" in q or "single point" in q or "failover" in q:
        return "spof_failure"

    if ("optimize" in q or "how so" in q or "why" in q or "fix" in q) and history_context:
        return history_context

    return "general_architecture"


def analyze_dialogue_state(
    messages: list[Any],
    current_query: str,
    canvas_facts: dict[str, Any] | None = None,
) -> DialogueState:
    """
    Tracks conversational state across dialogue turns:
    - Avoids question loops & repeated questions
    - Persists structured decision memory
    - Drives orchestrator state machine through ALLOWED_DESIGN_STAGES
    """
    previous_questions: list[str] = []
    previous_user_queries: list[str] = []
    question_history: list[dict[str, Any]] = []
    last_asst_q: str | None = None
    last_asst_topic: str | None = None
    last_user_q: str | None = None
    unresolved_issue: str | None = None
    decision_history: dict[str, Any] = {}

    curr_norm = normalize_query_text(current_query)
    repeat_count = 0
    history_context_str = ""

    if messages:
        last_m = messages[-1]
        last_c = getattr(last_m, "content", "") or (last_m.get("content") if isinstance(last_m, dict) else "")
        prior_messages = messages[:-1] if normalize_query_text(last_c) == curr_norm else messages
    else:
        prior_messages = []

    last_q_text = ""
    for m in prior_messages:
        role = getattr(m, "role", "") or (m.get("role") if isinstance(m, dict) else "")
        content = getattr(m, "content", "") or (m.get("content") if isinstance(m, dict) else "")

        if role == "user":
            user_text = content.strip()
            if user_text:
                previous_user_queries.append(user_text)
                last_user_q = user_text
                if normalize_query_text(user_text) == curr_norm:
                    repeat_count += 1
                history_context_str += f" {user_text}"
                decision_history = extract_decisions_from_text(user_text, decision_history)

                # Record structured question-answer pair if assistant previously asked
                if last_q_text:
                    q_id = hashlib.md5(last_q_text.encode("utf-8")).hexdigest()[:8]
                    question_history.append({
                        "question_id": f"q_{q_id}",
                        "topic": last_asst_topic or "architecture",
                        "question": last_q_text,
                        "answer": user_text,
                        "decision": str(decision_history),
                        "stage": determine_design_stage(decision_history, last_asst_topic or ""),
                    })
                    last_q_text = ""

        elif role == "assistant":
            asst_text = content.strip()
            if asst_text:
                history_context_str += f" {asst_text}"
                qs = extract_questions_from_text(asst_text)
                for q in qs:
                    previous_questions.append(q)
                    last_asst_q = q
                    last_q_text = q

                text_lower = asst_text.lower()
                if "redis" in text_lower and ("connection pool" in text_lower or "saturation" in text_lower or "disk i/o" in text_lower):
                    unresolved_issue = "database connection pool saturation and disk I/O latency spike from absence of caching"
                    last_asst_topic = "redis_removal"
                elif "little" in text_lower or "unknown" in text_lower or "not specified" in text_lower:
                    if "capacity" in text_lower or "concurrency" in text_lower:
                        unresolved_issue = "missing throughput (RPS) and latency SLA inputs required to size capacity"
                        last_asst_topic = "capacity_sizing"
                elif "envoy" in text_lower and ("tls" in text_lower or "routing" in text_lower):
                    unresolved_issue = "decentralized TLS termination and unhardened service exposure without an ingress gateway"
                    last_asst_topic = "envoy_gateway"
                elif "read" in text_lower and "write" in text_lower and "ratio" in text_lower:
                    last_asst_topic = "read_write_ratio"

    if current_query:
        decision_history = extract_decisions_from_text(current_query, decision_history)

    current_topic = detect_topic(current_query, last_asst_topic or "")
    current_stage = determine_design_stage(decision_history, current_topic)

    context = {
        "decision_history": decision_history,
        "canvas_facts": canvas_facts or {},
        "previous_questions": previous_questions,
        "unresolved_issue": unresolved_issue,
        "current_query": current_query,
    }
    next_decision = get_next_architecture_decision(context)

    is_repeated = repeat_count >= 1

    known_facts = []
    if decision_history.get("read_write_ratio"):
        known_facts.append(f"Read/Write Ratio: {decision_history['read_write_ratio']}")
    if decision_history.get("p99_latency_ms"):
        known_facts.append(f"p99 SLA: {decision_history['p99_latency_ms']}ms")
    if decision_history.get("cache"):
        known_facts.append(f"Cache Layer: {decision_history['cache']}")
    if decision_history.get("cache_fallback"):
        known_facts.append(f"Cache Fallback Policy: {decision_history['cache_fallback']}")

    return DialogueState(
        current_topic=current_topic,
        current_design_stage=current_stage,
        previous_questions=previous_questions,
        previous_user_queries=previous_user_queries,
        question_history=question_history,
        is_repeated_query=is_repeated,
        repeat_count=repeat_count,
        unresolved_issue=unresolved_issue,
        last_assistant_question=last_asst_q,
        last_assistant_topic=last_asst_topic,
        last_user_query=last_user_q,
        decision_history=decision_history,
        known_facts=known_facts,
        next_architecture_decision=next_decision,
    )


def select_advancing_question(
    topic: str,
    candidate_question: str | None,
    previous_questions: list[str],
    unresolved_issue: str | None = None,
    decision_history: dict[str, Any] | None = None,
    current_stage: str | None = None,
    canvas_facts: dict[str, Any] | None = None,
) -> str:
    """
    Strict System Design Question Selector:
    1. Obtains the authoritative next decision from get_next_architecture_decision.
    2. Scores candidate_question using score_question_relevance.
    3. If candidate scores >= 0.6 and aligns with the stage, accepts it.
    4. Otherwise, enforces the orchestrator's target question to stop generic loops.
    """
    decisions = decision_history or {}
    stage = current_stage or determine_design_stage(decisions, topic)

    context = {
        "decision_history": decisions,
        "canvas_facts": canvas_facts or {},
        "previous_questions": previous_questions,
        "unresolved_issue": unresolved_issue,
    }
    authoritative_decision = get_next_architecture_decision(context)

    cand = (candidate_question or "").strip()
    if cand:
        score, _ = score_question_relevance(cand, stage, decisions, previous_questions)
        if score >= 0.6:
            return cand

    # Stage-aware authoritative questions from the orchestrator
    target_q = authoritative_decision["question"]
    if not is_question_repeating(target_q, previous_questions):
        return target_q

    # Stage-specific fallback pools strictly driving architecture
    stage_fallbacks: dict[str, list[str]] = {
        "WORKLOAD": [
            "What read/write ratio and peak arrival rate (RPS) are you designing for?",
            "Which user flow generates the highest write throughput in this system?",
        ],
        "LATENCY": [
            "What p99 latency SLA are you targeting for the critical path?",
            "What part of your request path is most likely to threaten that latency budget?",
        ],
        "CRITICAL_PATH": [
            "Which read path or user flow in this system has the strictest latency requirement?",
            "Which operations need synchronous confirmation, and which can be processed asynchronously?",
        ],
        "CACHE": [
            "Which read operation is most latency-sensitive, and can its data tolerate being slightly stale?",
            "Which read path is latency-sensitive enough to justify caching, and what caching strategy will you use?",
        ],
        "CONSISTENCY": [
            "Which data can tolerate stale cached values, and which data must always be strictly fresh?",
            "Does the user need the updated value immediately after writing, or can downstream services tolerate replication lag?",
        ],
        "FAILURE": [
            "If Redis becomes unavailable, should requests fall back to the database, return a degraded response, or fail fast?",
            "How does the system behave when one backend instance or database node becomes unhealthy?",
        ],
        "DATABASE": [
            "How would you protect the database from that surge?",
            "Would you solve the read load with caching, read replicas, or both?",
        ],
        "SCALING": [
            "Would you prefer rejecting excess requests, serving stale cached data, or degrading non-critical features during a traffic spike?",
            "How does your design handle a sudden 3x traffic surge on the primary critical path?",
        ],
        "ASYNC": [
            "Which operations need synchronous confirmation, and which can be processed asynchronously?",
            "What happens if message consumers fall behind or fail, causing the queue backlog to grow?",
        ],
        "API": [
            "Which cross-cutting concerns belong at the gateway versus the service?",
            "What responsibility is Envoy providing here, and what breaks if we remove it?",
        ],
    }

    pool = stage_fallbacks.get(stage.upper(), stage_fallbacks.get(authoritative_decision["stage"], []))
    for q in pool:
        if not is_question_repeating(q, previous_questions):
            return q

    return authoritative_decision["question"]
