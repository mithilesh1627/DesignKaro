import json
import logging
from typing import Any

from backend.app.schemas.design import AIArchitectCritiqueResponse, AIArchitectSuggestion, GraphData
from backend.app.services.validation_engine.rule_checker import rule_engine

logger = logging.getLogger("designkaro.llm.architect")

ARCHITECT_SYSTEM_PROMPT = """You are a Principal Distributed Systems Architect at a top-tier cloud company (Google, AWS, Netflix).
You are observing a candidate's real-time system design on an interactive canvas.

Analyze the architecture topology, component tiers, scale requirements, and rule invariants.
Provide a concise, highly insightful critique with actionable graph mutations.

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON with no markdown backticks, no markdown fence (```json), and no extraneous conversational text.
2. The response MUST strictly adhere to this exact JSON schema:
{
  "critique": "1-2 concise, high-impact sentences evaluating the current topology, strengths, and primary vulnerability.",
  "suggestions": [
    {
      "category": "architecture" | "scalability" | "reliability" | "cost",
      "title": "Short title (under 6 words)",
      "description": "Clear explanation of why this change is necessary and the tradeoff involved.",
      "action": "add_component:cache" | "add_component:api_gateway" | "add_component:cdn" | "add_component:queue" | "scale:service:3" | "scale:database:2"
    }
  ],
  "interview_question": "A focused, Socratic interview question that advances the system design (e.g. data modeling, cache invalidation, failover, or consistency).",
  "estimated_monthly_cost": "$X - $Y/mo (estimated AWS cloud bill)"
}

3. Ground your critique entirely in the components actually placed on the canvas.
4. Suggestions MUST be actionable mutations that improve the architecture.
"""


def format_architect_prompt(graph_data: GraphData, scale_metadata: dict[str, Any] | None = None) -> str:
    nodes = graph_data.nodes or []
    edges = graph_data.edges or []
    scale = scale_metadata or getattr(graph_data, "scale_metadata", {}) or {}

    scale_str = ", ".join(f"{k}: {v}" for k, v in scale.items() if v)
    if not scale_str:
        scale_str = "Standard target: 20,000 RPS, 99.9% availability"

    node_lines = [f"- {n.id} ({n.type}, label: {n.label}, replicas: {n.properties.replicas}, capacity: {n.properties.qps_capacity} QPS)" for n in nodes]
    edge_lines = [f"- {e.source} -> {e.target} (flow: {e.properties.get('connectionType', e.label or 'sync')})" for e in edges]

    return f"""Current System Architecture State:
Scale Target: {scale_str}

Nodes ({len(nodes)}):
{chr(10).join(node_lines) if node_lines else 'None (Empty Canvas)'}

Edges ({len(edges)}):
{chr(10).join(edge_lines) if edge_lines else 'None'}

Provide your architectural critique, actionable mutation suggestions, Socratic interview question, and estimated monthly cost in strict JSON.
"""


def generate_deterministic_architect_fallback(
    graph_data: GraphData, scale_metadata: dict[str, Any] | None = None
) -> AIArchitectCritiqueResponse:
    """
    High-fidelity deterministic fallback engine adhering strictly to first principles.
    Ensures zero downtime and immediate sub-millisecond responses if the external LLM provider is unavailable.
    """
    nodes = graph_data.nodes or []
    edges = graph_data.edges or []
    scale = scale_metadata or getattr(graph_data, "scale_metadata", {}) or {}

    validation = rule_engine.evaluate(graph_data, scale)

    type_counts: dict[str, int] = {}
    for n in nodes:
        type_counts[n.type] = type_counts.get(n.type, 0) + 1

    suggestions: list[AIArchitectSuggestion] = []

    # 1. Ingress Tier
    if type_counts.get("client", 0) > 0 and type_counts.get("gateway", 0) == 0 and type_counts.get("load_balancer", 0) == 0:
        suggestions.append(
            AIArchitectSuggestion(
                category="architecture",
                title="Introduce API Gateway Ingress",
                description="Clients currently connect directly to backend services. Place an API Gateway at the edge for centralized rate limiting, authentication, and SSL termination.",
                action="add_component:api_gateway",
            )
        )

    # 2. Cache Tier
    if (type_counts.get("relational_db", 0) > 0 or type_counts.get("nosql_db", 0) > 0) and type_counts.get("cache", 0) == 0:
        suggestions.append(
            AIArchitectSuggestion(
                category="scalability",
                title="Add Redis In-Memory Cache",
                description="Direct database queries will saturate disk IOPS under high read traffic. Add an in-memory cache using Cache-Aside to absorb repetitive read requests.",
                action="add_component:cache",
            )
        )

    # 3. Database SPOF
    for n in nodes:
        if n.type in ("relational_db", "nosql_db") and n.properties.replicas <= 1:
            suggestions.append(
                AIArchitectSuggestion(
                    category="reliability",
                    title="Scale Database to 2 Replicas",
                    description=f"Database '{n.label}' runs on a single instance without failover standby. Increase replicas to 2 for primary-replica high availability.",
                    action="scale:database:2",
                )
            )
            break

    # 4. Service SPOF
    for n in nodes:
        if n.type == "service" and n.properties.replicas <= 1:
            suggestions.append(
                AIArchitectSuggestion(
                    category="reliability",
                    title="Scale Service Pods to 3 Replicas",
                    description=f"Compute service '{n.label}' has only 1 replica. Scale to 3 pods across multiple availability zones to prevent complete outage on node failure.",
                    action="scale:service:3",
                )
            )
            break

    # 5. CDN Edge
    if type_counts.get("cdn", 0) == 0 and (type_counts.get("storage", 0) > 0 or type_counts.get("client", 0) > 0):
        suggestions.append(
            AIArchitectSuggestion(
                category="cost",
                title="Front Ingress with Global CDN",
                description="Offload static assets and media chunks to edge PoPs (Cloudflare / CloudFront) to reduce compute bandwidth and protect origin storage from egress fees.",
                action="add_component:cdn",
            )
        )

    # Default suggestion if all clean
    if not suggestions:
        suggestions.append(
            AIArchitectSuggestion(
                category="architecture",
                title="Enable Horizontal Pod Autoscaling (HPA)",
                description="Topology satisfies all first-principles invariants. Configure CPU/Memory threshold autoscaling to handle unpredictable traffic spikes smoothly.",
                action="scale:service:4",
            )
        )

    # Critique
    if validation.health_score >= 85:
        critique = f"Strong production-grade topology scoring {validation.health_score}/100. Component separation, ingress gating, and replication redundancy are verified."
        interview_q = "How would you design the data partition/sharding key across your storage nodes to avoid hot partition bottlenecks during viral traffic spikes?"
    elif validation.health_score >= 60:
        critique = f"Viable baseline architecture ({validation.health_score}/100), but reliability risks remain around failover redundancy and read caching under sustained throughput."
        interview_q = "If the primary database fails right now, how does your system coordinate automated leader election and avoid split-brain scenarios?"
    else:
        critique = f"Critical architectural vulnerabilities detected ({validation.health_score}/100). The current design risks single-point-of-failure downtime and unbuffered database saturation."
        interview_q = "What happens to in-flight user requests when a single compute node crashes with no standby replicas configured?"

    est_cost = f"${validation.estimated_monthly_cost:,.0f} - ${validation.estimated_monthly_cost * 1.35:,.0f}/mo"

    return AIArchitectCritiqueResponse(
        critique=critique,
        suggestions=suggestions,
        interview_question=interview_q,
        estimated_monthly_cost=est_cost,
        provider="deterministic-architect-engine",
        fallback_used=True,
    )
