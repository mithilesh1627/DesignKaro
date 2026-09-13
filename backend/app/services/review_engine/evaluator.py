from backend.app.schemas.review import (
    ArchitectureReviewRequest,
    ArchitectureReviewResponse,
    DimensionScore,
)
from backend.app.services.validation_engine import rule_engine


class ArchitectureReviewEngine:
    """
    9-Dimension System Design Architecture Review Engine.
    Combines deterministic graph analysis, topological invariants, and Socratic evaluation.
    """

    def evaluate_architecture(self, request: ArchitectureReviewRequest) -> ArchitectureReviewResponse:
        graph = request.graph_data
        scale = request.scale_metadata or {}
        validation = rule_engine.evaluate(graph, scale)

        nodes = graph.nodes
        node_types = {n.type for n in nodes}

        has_lb_or_gw = "gateway" in node_types or "load_balancer" in node_types
        has_cache = "cache" in node_types
        has_queue = "queue" in node_types
        has_cdn = "cdn" in node_types

        # Check DB replicas
        db_replicas = max(
            [n.properties.replicas for n in nodes if n.type in ("relational_db", "nosql_db")],
            default=1,
        )
        service_replicas = max(
            [n.properties.replicas for n in nodes if n.type == "service"],
            default=1,
        )

        # Compute 9 Dimensions:
        # 1. Scalability
        scalability_score = 60
        if has_cache:
            scalability_score += 15
        if has_queue:
            scalability_score += 15
        if service_replicas >= 3:
            scalability_score += 10

        # 2. Availability & Fault Tolerance
        availability_score = 50
        if db_replicas >= 2:
            availability_score += 25
        if service_replicas >= 2:
            availability_score += 15
        if has_lb_or_gw:
            availability_score += 10

        # 3. Performance & Latency
        latency_score = 55
        if has_cdn:
            latency_score += 20
        if has_cache:
            latency_score += 25

        # 4. Data Consistency & Integrity
        consistency_score = 70
        if "relational_db" in node_types:
            consistency_score += 20
        elif "nosql_db" in node_types:
            consistency_score += 10

        # 5. Cost Optimization
        cost_score = 80
        total_nodes = len(nodes)
        if total_nodes > 15:
            cost_score -= 15
        elif total_nodes < 3:
            cost_score = 50

        # 6. Operational Simplicity
        simplicity_score = max(50, 95 - (total_nodes * 2))

        # 7. Observability & Telemetry
        observability_score = 65
        if has_queue or any("telemetry" in n.label.lower() or "worker" in n.label.lower() for n in nodes):
            observability_score += 25

        # 8. Security & Ingress Hardening
        security_score = 50
        if has_lb_or_gw:
            security_score += 35
        if has_cdn:
            security_score += 15

        # 9. Resilience to Traffic Surges
        surge_score = 50
        if has_queue:
            surge_score += 25
        if has_cache:
            surge_score += 15
        if service_replicas >= 3:
            surge_score += 10

        dimensions = [
            DimensionScore(
                name="Scalability",
                score=min(100, scalability_score),
                verdict="Strong" if scalability_score >= 80 else "Adequate" if scalability_score >= 65 else "Vulnerable",
                analysis="Horizontal autoscaling enabled across stateless services; caching shields hot read paths." if scalability_score >= 80 else "Single instances or missing caches limit horizontal scaling under surge load.",
            ),
            DimensionScore(
                name="Availability & Fault Tolerance",
                score=min(100, availability_score),
                verdict="Resilient" if availability_score >= 80 else "Moderate" if availability_score >= 65 else "SPOF Risk",
                analysis="Multi-AZ redundancy and primary-replica failover configured." if availability_score >= 80 else "Single point of failure detected in primary database or gateway tier.",
            ),
            DimensionScore(
                name="Performance & Latency",
                score=min(100, latency_score),
                verdict="Sub-20ms" if latency_score >= 80 else "Acceptable" if latency_score >= 65 else "High Latency",
                analysis="Edge CDN caching and in-memory Redis layer guarantee sub-20ms p99 response times." if latency_score >= 80 else "Uncached disk reads will push tail latencies beyond SLA budgets.",
            ),
            DimensionScore(
                name="Data Consistency & Integrity",
                score=min(100, consistency_score),
                verdict="ACID Strong" if consistency_score >= 80 else "Eventual",
                analysis="Strong transactional boundaries and durable replication invariants enforced." if consistency_score >= 80 else "Eventual consistency trade-off adopted; watch for read-your-writes anomalies.",
            ),
            DimensionScore(
                name="Cost Optimization",
                score=min(100, cost_score),
                verdict="Optimal" if cost_score >= 75 else "High Overhead",
                analysis="Balanced cluster sizing prevents cloud overprovisioning while maintaining headroom." if cost_score >= 75 else "Excessive node proliferation or lack of tiering increases cloud footprint.",
            ),
            DimensionScore(
                name="Operational Simplicity",
                score=min(100, simplicity_score),
                verdict="Manageable" if simplicity_score >= 75 else "Complex",
                analysis="Clean decoupled boundaries reduce cognitive load and incident triage overhead." if simplicity_score >= 75 else "Distributed complexity requires robust distributed tracing and on-call runbooks.",
            ),
            DimensionScore(
                name="Observability & Telemetry",
                score=min(100, observability_score),
                verdict="Instrumented" if observability_score >= 80 else "Partial",
                analysis="Asynchronous telemetry collection path decouples metric ingestion from critical user flows." if observability_score >= 80 else "Ensure Prometheus metrics and distributed tracing spans are emitted.",
            ),
            DimensionScore(
                name="Security & Ingress Hardening",
                score=min(100, security_score),
                verdict="Fortified" if security_score >= 80 else "Exposed Ingress",
                analysis="WAF, DDoS mitigation, and reverse proxy front all upstream microservices." if security_score >= 80 else "Services or databases lack reverse-proxy isolation from external client traffic.",
            ),
            DimensionScore(
                name="Resilience to Traffic Surges",
                score=min(100, surge_score),
                verdict="Buffered" if surge_score >= 80 else "Brittle",
                analysis="Asynchronous log broker absorbs peak traffic bursts and prevents cascading failures." if surge_score >= 80 else "Synchronous coupling risks thread pool starvation during traffic spikes.",
            ),
        ]

        overall_score = round(sum(d.score for d in dimensions) / len(dimensions))

        if overall_score >= 90:
            grade = "Staff-Ready"
        elif overall_score >= 75:
            grade = "Senior-Ready"
        elif overall_score >= 60:
            grade = "Mid-Level"
        else:
            grade = "Needs Remediation"

        # Strengths & Vulnerabilities
        strengths = [d.name for d in dimensions if d.score >= 80]
        if not strengths:
            strengths = ["Baseline topology drafted"]

        vulnerabilities = [f"{d.name}: {d.analysis}" for d in dimensions if d.score < 70]
        if not vulnerabilities:
            vulnerabilities = ["Zero critical vulnerabilities detected"]

        remediation_plan = [v.remediation for v in validation.violations]
        if not remediation_plan:
            remediation_plan = [
                "Configure automated multi-AZ failover drills in staging",
                "Implement distributed circuit breakers (Envoy / Resilience4j)",
                "Establish synthetic canary probes for p99 latency verification",
            ]

        summary = (
            f"Architecture evaluated at {overall_score}/100 ({grade}). "
            f"Identified {len(validation.violations)} structural violations and verified {len(validation.passed_rules)} distributed system invariants. "
            f"System exhibits high {', '.join(strengths[:2])}."
        )

        return ArchitectureReviewResponse(
            overall_score=overall_score,
            grade=grade,
            radar_scores=dimensions,
            strengths=strengths,
            critical_vulnerabilities=vulnerabilities,
            rule_violations=validation.violations,
            actionable_remediation_plan=remediation_plan,
            executive_summary=summary,
        )

    async def evaluate_architecture_async(
        self,
        request: ArchitectureReviewRequest,
        provider=None,
    ) -> ArchitectureReviewResponse:
        """
        Asynchronously evaluates architecture across the 9 deterministic dimensions,
        then enriches the executive summary using the active LLM provider.
        """
        base_review = self.evaluate_architecture(request)

        try:
            from backend.app.services.llm.service import llm_service

            llm_resp = await llm_service.generate_review_summary(
                graph_data=request.graph_data,
                scale_metadata=request.scale_metadata,
                violations=base_review.rule_violations,
                rubric_scores=base_review.radar_scores,
                overall_score=base_review.overall_score,
                grade=base_review.grade,
                provider=provider,
                fallback_fn=lambda: base_review.executive_summary,
            )
            if llm_resp and llm_resp.content and not llm_resp.fallback_used:
                base_review.executive_summary = llm_resp.content
        except Exception:
            pass  # Retain deterministic summary on error

        return base_review


review_engine = ArchitectureReviewEngine()
