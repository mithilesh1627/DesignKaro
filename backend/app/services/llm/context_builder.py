import re
from typing import Any
from backend.app.schemas.design import GraphData


def serialize_graph_for_llm(graph_data: GraphData | dict[str, Any] | None) -> str:
    """
    Serializes a system architecture diagram (nodes, types, replicas, edges)
    into a concise, structured markdown format optimized for LLM token efficiency.
    """
    if not graph_data:
        return "No canvas diagram components provided."

    nodes: list[Any] = []
    edges: list[Any] = []

    if isinstance(graph_data, dict):
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])
    elif hasattr(graph_data, "nodes"):
        nodes = graph_data.nodes or []
        edges = graph_data.edges or []

    if not nodes:
        return "Canvas is currently empty (0 nodes)."

    lines = [f"Canvas Architecture Topology ({len(nodes)} components, {len(edges)} connections):"]
    lines.append("### Nodes:")

    node_map = {}
    for n in nodes:
        if isinstance(n, dict):
            nid = n.get("id", "unknown")
            ntype = n.get("type", "generic")
            nlabel = n.get("label", nid)
            props = n.get("properties", {})
            replicas = props.get("replicas", 1)
        else:
            nid = getattr(n, "id", "unknown")
            ntype = getattr(n, "type", "generic")
            nlabel = getattr(n, "label", nid)
            props = getattr(n, "properties", None)
            replicas = getattr(props, "replicas", 1) if props else 1

        node_map[nid] = nlabel
        lines.append(f"- [{nid}] {nlabel} (type: {ntype}, replicas: {replicas})")

    if edges:
        lines.append("### Data Flows / Edges:")
        for e in edges:
            if isinstance(e, dict):
                src = e.get("source", "")
                tgt = e.get("target", "")
                lbl = e.get("label", "")
            else:
                src = getattr(e, "source", "")
                tgt = getattr(e, "target", "")
                lbl = getattr(e, "label", "")

            src_name = node_map.get(src, src)
            tgt_name = node_map.get(tgt, tgt)
            flow_str = f"- {src_name} -> {tgt_name}"
            if lbl:
                flow_str += f" ({lbl})"
            lines.append(flow_str)

    return "\n".join(lines)


def serialize_scale_metadata(scale_metadata: dict[str, Any] | None) -> str:
    """Serializes system scale parameters (QPS, DAU, latency SLAs, storage) into context."""
    if not scale_metadata:
        return "Scale parameters: That isn't specified in your current design."

    lines = ["System Scale & SLA Targets:"]
    for k, v in scale_metadata.items():
        clean_key = k.replace("_", " ").title()
        lines.append(f"- {clean_key}: {v}")
    return "\n".join(lines)


def serialize_rule_violations(violations: list[Any] | None) -> str:
    """Serializes deterministic structural rule violations (e.g. SPOF, missing cache)."""
    if not violations:
        return "Deterministic Invariant Checks: All 0 structural rule violations (100% verified)."

    lines = [f"Deterministic Invariant Violations ({len(violations)} flagged by rule engine):"]
    for v in violations:
        if isinstance(v, dict):
            severity = v.get("severity", "WARNING").upper()
            rule_id = v.get("rule_id", "RULE")
            msg = v.get("message", "")
            remediation = v.get("remediation", "")
        else:
            severity = getattr(v, "severity", "WARNING").upper()
            rule_id = getattr(v, "rule_id", "RULE")
            msg = getattr(v, "message", "")
            remediation = getattr(v, "remediation", "")

        lines.append(f"- [{severity}] {rule_id}: {msg}")
        if remediation:
            lines.append(f"  * Fix: {remediation}")
    return "\n".join(lines)


def retrieve_relevant_rag_snippets(query: str, limit: int = 2) -> list[str]:
    """
    Retrieves top relevant architectural case studies and design precedents
    from the curated system design knowledge base using token ranking.
    """
    if not query or not query.strip():
        return []
    try:
        from backend.app.api.v1.endpoints.knowledge import KNOWLEDGE_DATA

        query_str = query.strip().lower()
        tokens = [t for t in re.findall(r"\w+", query_str) if len(t) > 2]
        if not tokens:
            return []

        scored: list[tuple[int, str]] = []
        for item in KNOWLEDGE_DATA:
            score = 0
            title_l = item.title.lower()
            summary_l = item.summary.lower()
            company_l = item.company.lower()
            tags_l = [t.lower() for t in item.tags]

            if query_str in title_l:
                score += 20
            for tok in tokens:
                if tok in title_l:
                    score += 8
                if tok in company_l:
                    score += 6
                if any(tok in t for t in tags_l):
                    score += 5
                if tok in summary_l:
                    score += 3

            if score > 0:
                takeaway = item.key_takeaways[0] if item.key_takeaways else item.summary
                snippet = f"{item.company} ({item.title}): {takeaway}"
                scored.append((score, snippet))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [s for _, s in scored[:limit]]
    except Exception:
        return []


def extract_canvas_facts(graph_data: GraphData | dict[str, Any] | None) -> dict[str, Any]:
    """Extracts confirmed component facts from the user's canvas."""
    if not graph_data:
        return {"components": [], "node_types": set(), "has_redis": False, "has_postgres": False}

    nodes: list[Any] = []
    if isinstance(graph_data, dict):
        nodes = graph_data.get("nodes", [])
    elif hasattr(graph_data, "nodes"):
        nodes = graph_data.nodes or []

    components = []
    node_types = set()
    for n in nodes:
        if isinstance(n, dict):
            lbl = n.get("label", n.get("id", ""))
            ntype = n.get("type", "")
        else:
            lbl = getattr(n, "label", getattr(n, "id", ""))
            ntype = getattr(n, "type", "")
        components.append(f"{lbl} ({ntype})")
        node_types.add(ntype.lower())

    has_redis = any("redis" in c.lower() or "cache" in c.lower() for c in components)
    has_postgres = any("postgres" in c.lower() or "relational_db" in c.lower() for c in components)

    return {
        "components": components,
        "node_types": node_types,
        "has_redis": has_redis,
        "has_postgres": has_postgres,
    }


def get_deterministic_invariants(graph_data: GraphData | dict[str, Any] | None) -> list[dict[str, Any]]:
    """Evaluates the canvas with the deterministic rule engine."""
    if not graph_data:
        return []
    try:
        from backend.app.services.validation_engine.rule_checker import DeterministicRuleEngine

        if isinstance(graph_data, dict):
            graph_obj = GraphData.model_validate(graph_data)
        else:
            graph_obj = graph_data
        engine = DeterministicRuleEngine()
        result = engine.evaluate(graph_obj)
        return [
            {
                "rule_id": v.rule_id,
                "severity": v.severity,
                "message": v.message,
                "remediation": v.remediation,
            }
            for v in result.violations
        ]
    except Exception:
        return []


def build_mentor_context(
    graph_data: GraphData | dict[str, Any] | None = None,
    scale_metadata: dict[str, Any] | None = None,
    user_skill_level: str = "intermediate",
    rag_snippets: list[str] | None = None,
) -> str:
    """
    Constructs a high-precision context block for the Socratic AI Mentor.
    Enforces strict distinction between:
    - FACT: Component nodes and connections actually present in user's canvas.
    - INVARIANT: Deterministic rule engine checks (SPOFs, bottlenecks).
    - UNKNOWN: Missing scale metrics that MUST NOT be hallucinated.
    """
    sections = []

    # 1. Canvas Facts
    canvas_facts = extract_canvas_facts(graph_data)
    if canvas_facts["components"]:
        sections.append(
            "### SECTION 1: VERIFIED CANVAS FACTS (AUTHORITATIVE)\n"
            + serialize_graph_for_llm(graph_data)
            + f"\nConfirmed Components in Canvas: {', '.join(canvas_facts['components'])}"
        )
    else:
        sections.append(
            "### SECTION 1: VERIFIED CANVAS FACTS (AUTHORITATIVE)\n"
            "Canvas Status: Empty (0 components currently placed on the diagram).\n"
            "RULE: Do NOT claim the user has any components (no Redis, no Gateway, no DB) unless they are in the canvas."
        )

    # 2. Deterministic Rule Invariants
    invariants = get_deterministic_invariants(graph_data)
    if invariants:
        inv_lines = ["### SECTION 2: DETERMINISTIC RULE INVARIANTS (AUTHORITATIVE)"]
        for inv in invariants:
            inv_lines.append(f"- [{inv['severity'].upper()}] {inv['rule_id']}: {inv['message']}")
            if inv["remediation"]:
                inv_lines.append(f"  * Fix: {inv['remediation']}")
        sections.append("\n".join(inv_lines))
    else:
        sections.append(
            "### SECTION 2: DETERMINISTIC RULE INVARIANTS (AUTHORITATIVE)\n"
            "All structural invariant checks passed or canvas is empty."
        )

    # 3. Known vs Unknown Scale Metrics
    if scale_metadata and any(scale_metadata.values()):
        sections.append(
            "### SECTION 3: SCALE METRICS\n" + serialize_scale_metadata(scale_metadata)
        )
    else:
        sections.append(
            "### SECTION 3: SCALE METRICS & UNKNOWNS\n"
            "Traffic Metrics: UNKNOWN (RPS/QPS, p99 latency SLA, read/write ratio, and database size are NOT specified in your current design).\n"
            "CRITICAL INSTRUCTION: Do NOT invent arbitrary numbers for traffic, RPS, or latency! "
            "Never invent workload numbers (RPS, QPS, latency, p99, database size, concurrent users, cache hit ratio). "
            "If missing, state: 'That isn't specified in your current design.' and ask for the missing input. "
            "Never create 'Assuming 10,000 RPS...' just to make an answer concrete. "
            "Hypothetical numbers are allowed ONLY when they materially help explain a concept, and MUST be labeled 'Example only — not your system'."
        )

    # 4. RAG Architectural Precedents
    if rag_snippets:
        lines = ["### SECTION 4: REAL-WORLD ARCHITECTURAL PRECEDENTS (RAG)"]
        for s in rag_snippets:
            lines.append(f"- {s}")
        sections.append("\n".join(lines))

    # 5. User Skill Target
    sections.append(f"### SECTION 5: USER SKILL LEVEL\nTarget Audience Skill Level: {user_skill_level.upper()}")

    return "\n\n".join(sections)


def build_system_architect_context(
    graph_data: GraphData | dict[str, Any] | None = None,
    scale_metadata: dict[str, Any] | None = None,
    violations: list[Any] | None = None,
    rubric_scores: list[Any] | None = None,
    rag_snippets: list[str] | None = None,
) -> str:
    """
    Assembles a complete, structured context block for review and interview prompt execution.
    """
    sections = []
    if graph_data:
        sections.append(serialize_graph_for_llm(graph_data))
    if scale_metadata:
        sections.append(serialize_scale_metadata(scale_metadata))
    if violations is not None:
        sections.append(serialize_rule_violations(violations))
    elif graph_data:
        # Automatically evaluate deterministic invariants if not passed
        auto_violations = get_deterministic_invariants(graph_data)
        if auto_violations:
            sections.append(serialize_rule_violations(auto_violations))
    if rubric_scores:
        lines = ["Deterministic 9-Dimension Rubric Scores:"]
        for r in rubric_scores:
            name = getattr(r, "name", "") or (r.get("name") if isinstance(r, dict) else "")
            score = getattr(r, "score", 0) or (r.get("score") if isinstance(r, dict) else 0)
            verdict = getattr(r, "verdict", "") or (r.get("verdict") if isinstance(r, dict) else "")
            lines.append(f"- {name}: {score}/100 ({verdict})")
        sections.append("\n".join(lines))
    if rag_snippets:
        lines = ["Real-World Architectural Precedents (RAG):"]
        for s in rag_snippets:
            lines.append(f"- {s}")
        sections.append("\n".join(lines))

    return "\n\n".join(sections)
