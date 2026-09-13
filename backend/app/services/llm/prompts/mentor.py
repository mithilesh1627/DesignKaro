import re
from typing import Any

from backend.app.services.llm.conversation_tracker import (
    DialogueState,
    analyze_dialogue_state,
    select_advancing_question,
)

MENTOR_SYSTEM_PROMPT = """You are a Senior Staff Systems Architect at DesignKaro mentoring a software engineer in an evolving system design interview.
Your persona is that of an experienced senior peer pair-programming beside them: pragmatic, intellectually rigorous, direct, and concise.

CRITICAL REASONING & ORCHESTRATION INVARIANTS:

1. EVERY QUESTION MUST CHANGE AN ARCHITECTURAL DECISION:
   - A follow-up question is valid ONLY if answering it could change one of:
     * Architecture or component selection
     * Data flow (read path vs write path)
     * Scaling strategy (replicas, partitioning, pooling)
     * Consistency model (strong vs eventual consistency, staleness)
     * Latency strategy (caching, edge routing, async queues)
     * Failure handling (failover, fallback, circuit breaker, degradation)
     * Capacity planning, reliability, observability, security, cost
   - If the answer would NOT change an architectural decision, DO NOT ASK THE QUESTION.

2. NO GENERIC DATA ANALYTICS OR VISUALIZATION DETOURS:
   - NEVER ask: "How do you estimate the ratio?", "How do you analyze user interaction data?", "How do you visualize the data?", "What visualization tool would you use?", "How do you handle missing data?".
   - NEVER introduce: Tableau, Power BI, D3.js, heat maps, scatter plots, Google Data Studio, demographics, click-through analysis, retention analysis.
   - These are product analytics questions, NOT system design questions.

3. READ/WRITE RATIO IS STRICTLY WORKLOAD COMPOSITION:
   - Read/write ratio describes workload composition (e.g., 80:20 means 80% reads and 20% writes).
   - Once the ratio is provided: STORE IT AND MOVE ON.
   - Do NOT turn the ratio into a lesson about how to collect analytics.
   - NEVER claim 10:1 is common for high traffic.
   - NEVER claim higher read/write ratio automatically increases capacity or lowers latency.

4. p99 LATENCY BUDGET:
   - p99 latency is a requirement. Once provided (e.g. 200ms), store it and NEVER ask for it again.
   - Connect it to the request path: "What part of your request path is most likely to threaten that 200ms budget?" (client -> gateway -> service -> cache -> database).
   - Do NOT invent latency numbers for individual components.

5. ARCHITECTURAL PROGRESSION & FAILURE-DRIVEN CHALLENGES:
   - System design is a progressive dialogue:
     REQUIREMENTS -> WORKLOAD -> LATENCY -> CRITICAL_PATH -> CACHE -> CONSISTENCY -> FAILURE -> DATABASE -> SCALING.
   - When the user chooses an architectural component, evaluate it and challenge them with its primary failure mode:
     * User chooses Redis: Challenge with consistency/staleness boundaries and cluster failure ("What happens when Redis fails? Fall back to DB, fail fast, or degraded response?").
     * User chooses DB fallback: Challenge with database protection ("How would you protect the database from that surge?").
     * User adds PgBouncer/rate limiting: Challenge with traffic spikes ("Would you prefer rejecting excess requests, serving stale cached data, or degrading non-critical features during a traffic spike?").
     * User introduces Kafka: Challenge with sync vs async boundaries ("Which operations need synchronous confirmation, and which can be processed asynchronously?").
     * User introduces Envoy: Challenge with gateway responsibilities ("Which cross-cutting concerns belong at the gateway versus the service?").

6. NO UNREQUESTED HYPOTHETICAL EXAMPLES:
   - Do NOT automatically generate calculation examples such as "500 RPS × 200 ms = 100 concurrent requests" unless the user explicitly requested a calculation.
   - Never invent: RPS, QPS, latency, database size, users, cache hit rate, replicas, bandwidth, CPU, memory.

7. CANVAS OBSERVATION RULE:
   - "In your design" means ONLY facts explicitly present in the user's canvas topology or confirmed user decisions.
   - If canvas is empty and no components chosen, do NOT invent canvas observations.

8. DIRECT ANSWER FIRST, THEN ONE ADVANCING QUESTION:
   - Always answer the user's latest inquiry directly first.
   - Generate exactly ONE advancing question in `next_question`.
   - Never output robotic role badges, level banners, or repeated headers in body text.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema, with no markdown code blocks outside JSON:
{
  "response_type": "socratic" | "explanation" | "correction" | "architecture_review" | "calculation" | "interview_question",
  "intent": "concept_explanation" | "architecture_analysis" | "architecture_change" | "tradeoff" | "calculation" | "debugging" | "failure_analysis" | "interview_question" | "challenge" | "follow_up",
  "title": "Concise, punchy title (3-6 words)",
  "summary": "1-2 sentence core takeaway",
  "explanation": "Clear, direct technical explanation without textbook fluff",
  "architecture_observations": ["Fact 1 verified from user's canvas or confirmed decision"],
  "assumptions": ["Clearly labeled hypothetical assumptions (leave empty unless user asked for calculation)"],
  "recommendations": ["Actionable recommendation (max 3)"],
  "tradeoffs": ["Core architectural trade-off"],
  "example": null,
  "calculation": null,
  "next_question": "Exactly ONE primary Socratic question advancing the design (never previously asked)",
  "difficulty": "beginner" | "intermediate" | "advanced"
}
"""


def classify_mentor_intent(query: str, history: list[Any] | None = None) -> str:
    """
    Classifies user intent into one of 10 core mentorship intents.
    """
    if not query:
        return "concept_explanation"

    q = query.strip().lower()
    words = q.split()

    # 1. Short follow-ups or pronoun queries
    short_followup_phrases = {
        "why?",
        "why",
        "how so?",
        "what about it?",
        "elaborate",
        "can you elaborate?",
        "and then?",
        "how?",
        "tell me more",
        "how can i optimize this?",
        "how can i optimize this",
        "how do i optimize this?",
        "how do i optimize this",
    }
    if q in short_followup_phrases:
        return "follow_up"
    if len(words) <= 5 and history and any(p in words for p in ["it", "that", "this", "they", "them", "optimize"]):
        return "follow_up"

    # 2. Challenge / Pushback
    challenge_indicators = [
        "don't want",
        "do not want",
        "don't need",
        "do not need",
        "why should i use",
        "why do i need",
        "is unnecessary",
        "hate using",
        "can't we just use",
        "cannot we just",
    ]
    if any(ind in q for ind in challenge_indicators):
        return "challenge"

    # 3. Calculation & Math
    calculation_indicators = [
        "little's law",
        "littles law",
        "calculate capacity",
        "calculate",
        "compute",
        "formula",
        "how many servers",
        "concurrency math",
        "storage calculation",
        "bandwidth calculation",
    ]
    if any(ind in q for ind in calculation_indicators):
        return "calculation"
    if ("rps" in q or "qps" in q) and ("latency" in q or "concurrent" in q or "little" in q):
        return "calculation"

    # 4. Architecture Change (removal, replacement, addition)
    change_indicators = [
        "what if i remove",
        "what happens if i remove",
        "if i remove",
        "if we remove",
        "remove ",
        "replace ",
        "get rid of",
        "delete ",
        "without ",
        "swap ",
    ]
    if any(ind in q for ind in change_indicators):
        return "architecture_change"

    # 5. Failure Analysis (SPOF, crash, disaster recovery)
    failure_indicators = [
        "spof",
        "single point of failure",
        "failover",
        "disaster",
        "crash",
        "outage",
        "split brain",
        "partition tolerance",
        "cascading failure",
        "kafka failure",
        "redis failure",
    ]
    if any(ind in q for ind in failure_indicators):
        return "failure_analysis"

    # 6. Debugging & Bottlenecks
    debug_indicators = [
        "slow",
        "high latency",
        "bottleneck",
        "504",
        "502",
        "timeout",
        "exhausted",
        "memory leak",
        "debug",
        "troubleshoot",
    ]
    if any(ind in q for ind in debug_indicators):
        return "debugging"

    # 7. Trade-off Analysis
    tradeoff_indicators = [
        " vs ",
        " versus ",
        "tradeoff",
        "trade-off",
        "trade offs",
        "pros and cons",
        "difference between",
        "compare ",
    ]
    if any(ind in q for ind in tradeoff_indicators):
        return "tradeoff"

    # 8. Architecture Analysis (Canvas review)
    analysis_indicators = [
        "review my",
        "analyze my",
        "evaluate my",
        "look at my",
        "inspect my",
        "critique my",
        "rate my architecture",
        "design review",
    ]
    if any(ind in q for ind in analysis_indicators):
        return "architecture_analysis"

    # 9. Interview Question
    interview_indicators = [
        "interview me",
        "ask me a question",
        "mock interview",
        "practice question",
        "test my knowledge",
    ]
    if any(ind in q for ind in interview_indicators):
        return "interview_question"

    # 10. Default Concept Explanation
    return "concept_explanation"


def resolve_conversation_context(query: str, history: list[Any] | None = None) -> str | None:
    """
    Extracts topic and context from the previous turn when user asks a follow-up.
    """
    if not history or len(history) < 2:
        return None

    last_user_turn = None
    last_asst_turn = None
    for item in reversed(history[:-1]):
        role = getattr(item, "role", "") or (item.get("role") if isinstance(item, dict) else "")
        content = getattr(item, "content", "") or (item.get("content") if isinstance(item, dict) else "")
        if role == "assistant" and not last_asst_turn:
            last_asst_turn = content
        elif role == "user" and not last_user_turn:
            last_user_turn = content
        if last_user_turn and last_asst_turn:
            break

    if last_user_turn:
        return f"Previous turn was discussing: '{last_user_turn}'."
    return None


def format_mentor_user_prompt(
    user_message: str,
    architecture_context: str | None = None,
    is_initial_turn: bool = False,
    history: list[Any] | None = None,
) -> str:
    parts = []
    if architecture_context:
        parts.append(f"{architecture_context}\n")

    intent = classify_mentor_intent(user_message, history)
    dialogue_state = analyze_dialogue_state(history or [], user_message)

    if is_initial_turn:
        parts.append("Context Note: This is the first interaction in this mentoring session.")
    else:
        parts.append("Context Note: This is an ongoing conversation. Do NOT repeat welcome introductions.")

    # Context resolution for pronouns & follow-ups
    resolved_context = resolve_conversation_context(user_message, history)
    if resolved_context:
        parts.append(f"Dialogue Continuity: {resolved_context} Resolve any pronouns ('it', 'why') based on this context.")

    # Decision Memory injection
    if dialogue_state.decision_history:
        decisions_summary = []
        if dialogue_state.decision_history.get("read_write_ratio"):
            decisions_summary.append(f"Workload Composition: {dialogue_state.decision_history['read_write_ratio']} (ESTABLISHED — DO NOT RE-ASK)")
        if dialogue_state.decision_history.get("p99_latency_ms"):
            decisions_summary.append(f"p99 Latency SLA: {dialogue_state.decision_history['p99_latency_ms']}ms (ESTABLISHED — DO NOT RE-ASK)")
        if dialogue_state.decision_history.get("throughput_rps"):
            decisions_summary.append(f"Throughput: {dialogue_state.decision_history['throughput_rps']} RPS (ESTABLISHED)")
        if dialogue_state.decision_history.get("cache"):
            decisions_summary.append(f"Caching Technology: {dialogue_state.decision_history['cache']}")
        if dialogue_state.decision_history.get("cache_fallback"):
            decisions_summary.append(f"Cache Failure Fallback: {dialogue_state.decision_history['cache_fallback']}")
        if dialogue_state.decision_history.get("database_protection"):
            decisions_summary.append(f"Database Protection: {', '.join(dialogue_state.decision_history['database_protection'])}")
        if dialogue_state.decision_history.get("consistency"):
            decisions_summary.append(f"Consistency Boundaries: {dialogue_state.decision_history['consistency']}")

        if decisions_summary:
            parts.append("ESTABLISHED ARCHITECTURAL DECISIONS:\n" + "\n".join(f"- {d}" for d in decisions_summary))

    parts.append(f"Current Design Stage: {dialogue_state.current_design_stage}")

    # Inject Authoritative Next Decision from Orchestrator
    if dialogue_state.next_architecture_decision:
        target_info = dialogue_state.next_architecture_decision
        parts.append(
            f"\n### ORCHESTRATOR TARGET DECISION (MANDATORY):\n"
            f"- Next Stage: {target_info.get('stage')}\n"
            f"- Decision to resolve: {target_info.get('decision')}\n"
            f"- Strategic rationale: {target_info.get('reason')}\n"
            f"- Target follow-up question: \"{target_info.get('question')}\"\n"
            f"You MUST connect the user's latest statement to this target decision and advance the architecture."
        )

    if dialogue_state.unresolved_issue:
        parts.append(f"Active Architectural Bottleneck: {dialogue_state.unresolved_issue}.")

    if dialogue_state.is_repeated_query:
        parts.append(
            "CRITICAL NOTE: The user is REPEATING this question. You MUST acknowledge that this was previously discussed "
            "and provide new, deeper insights rather than repeating the previous answer."
        )

    if dialogue_state.previous_questions:
        recent_qs = dialogue_state.previous_questions[-3:]
        parts.append(f"ALREADY ASKED QUESTIONS (DO NOT REPEAT): {'; '.join(recent_qs)}")

    parts.append(f"Detected Intent: {intent}")
    parts.append(f"Current Topic: {dialogue_state.current_topic}")

    # Specific topic directives
    q_lower = user_message.lower()
    if "read/write" in q_lower or "read write" in q_lower or ("ratio" in q_lower and ("read" in q_lower or "write" in q_lower)):
        parts.append(
            "TOPIC DIRECTIVE (READ/WRITE RATIO): "
            "Treat read/write ratio strictly as workload composition. "
            "Do NOT ask how to collect analytics or visualize traffic. "
            "NEVER claim 10:1 is common for high traffic. "
            "NEVER claim higher read/write ratio means higher capacity or lower latency."
        )

    if "p99" in q_lower or ("latency" in q_lower and ("sla" in q_lower or "target" in q_lower)):
        parts.append(
            "TOPIC DIRECTIVE (LATENCY SLA): "
            "Do NOT invent an arbitrary latency SLA. Connect it to the latency budget along the request path."
        )

    if "capacity" in q_lower and "calculate" in q_lower:
        parts.append(
            "TOPIC DIRECTIVE (CAPACITY): "
            "If traffic and latency metrics are not specified, state that they are not specified in the current design, "
            "and ask for the required inputs. Do NOT generate generic examples unless explicitly asked."
        )

    # Multi-part question check
    is_multi_part = (" and " in q_lower or "?" in user_message[:-1]) and any(
        w in q_lower for w in ["what if", "remove", "replace", "how does", "what is"]
    )
    if is_multi_part:
        parts.append(
            "CRITICAL INSTRUCTION: The engineer's prompt is a MULTI-PART QUESTION. "
            "You MUST answer all parts in sequence directly in your explanation before providing your follow-up question."
        )

    parts.append(f"### Engineer's Question / Statement:\n{user_message}")
    parts.append(
        "\nProvide your mentorship as a valid, structured JSON object as specified in the system prompt. "
        "Keep follow-up question strictly relevant to the specific topic and ensure it has not been asked before."
    )
    return "\n".join(parts)
