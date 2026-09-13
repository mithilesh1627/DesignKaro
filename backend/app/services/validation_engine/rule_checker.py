from collections import defaultdict
from typing import Any

from backend.app.schemas.design import GraphData, RuleViolation, ValidationResponse


class DeterministicRuleEngine:
    """
    Evaluates architecture graphs against first-principles distributed systems rules.
    Zero hallucinations — pure deterministic graph analysis and structural invariants.
    """

    def evaluate(self, graph: GraphData, scale_metadata: dict[str, Any] | None = None) -> ValidationResponse:
        nodes = graph.nodes
        edges = graph.edges
        scale = scale_metadata or {}

        node_map = {n.id: n for n in nodes}
        adjacency_out = defaultdict(list)
        adjacency_in = defaultdict(list)

        for edge in edges:
            if edge.source in node_map and edge.target in node_map:
                adjacency_out[edge.source].append(edge.target)
                adjacency_in[edge.target].append(edge.source)

        violations: list[RuleViolation] = []
        passed_rules: list[str] = []

        # Count components by type
        component_counts: dict[str, int] = defaultdict(int)
        for n in nodes:
            component_counts[n.type] += 1

        # Check: Empty canvas
        if not nodes:
            return ValidationResponse(
                health_score=0,
                status="CRITICAL_ISSUES",
                violations=[
                    RuleViolation(
                        rule_id="RULE-000",
                        rule_name="EMPTY_ARCHITECTURE",
                        severity="error",
                        node_ids=[],
                        message="The architecture canvas contains no components.",
                        remediation="Add clients, API gateway, compute services, and database nodes to build your system.",
                    )
                ],
                passed_rules=[],
                summary="Canvas is empty. Place initial system components to begin evaluation.",
                component_counts={},
            )

        # 1. Check: Missing Persistent Storage
        has_storage = (
            component_counts["relational_db"] > 0
            or component_counts["nosql_db"] > 0
            or component_counts["storage"] > 0
        )
        if not has_storage and component_counts["service"] > 0:
            violations.append(
                RuleViolation(
                    rule_id="RULE-008",
                    rule_name="MISSING_PERSISTENT_STORAGE",
                    severity="error",
                    node_ids=[n.id for n in nodes if n.type == "service"],
                    message="Architecture lacks durable storage. Compute services have nowhere to persist state.",
                    remediation="Attach a Relational Database (PostgreSQL), NoSQL Store (Cassandra), or Object Storage (S3).",
                )
            )
        else:
            passed_rules.append("DURABLE_STORAGE_PRESENT")

        # 2. Check: Single Point of Failure (SPOF) on DB
        spof_db_nodes = []
        for n in nodes:
            if n.type in ("relational_db", "nosql_db"):
                if n.properties.replicas <= 1:
                    spof_db_nodes.append(n.id)

        if spof_db_nodes:
            violations.append(
                RuleViolation(
                    rule_id="RULE-001",
                    rule_name="SINGLE_POINT_OF_FAILURE_DATABASE",
                    severity="error",
                    node_ids=spof_db_nodes,
                    message=f"Database node(s) {', '.join(spof_db_nodes)} run on a single replica without high-availability failover.",
                    remediation="Increase replica count >= 2 and configure primary-replica replication or multi-AZ clustering.",
                )
            )
        else:
            if has_storage:
                passed_rules.append("DATABASE_HIGH_AVAILABILITY")

        # 3. Check: Missing Load Balancer / Gateway on Client Ingress
        direct_client_bypasses = []
        for n in nodes:
            if n.type == "client":
                for target_id in adjacency_out[n.id]:
                    target_node = node_map.get(target_id)
                    if target_node and target_node.type in ("service", "relational_db", "nosql_db"):
                        direct_client_bypasses.append(n.id)

        if direct_client_bypasses:
            violations.append(
                RuleViolation(
                    rule_id="RULE-002",
                    rule_name="MISSING_LOAD_BALANCER_OR_GATEWAY",
                    severity="error",
                    node_ids=direct_client_bypasses,
                    message="Clients are directly connecting to backend services or databases without an Ingress Proxy or Load Balancer.",
                    remediation="Place an API Gateway or L4/L7 Load Balancer between Clients and backend services for SSL termination, traffic routing, and DDoS mitigation.",
                )
            )
        else:
            if component_counts["client"] > 0:
                passed_rules.append("INGRESS_PROPERLY_GATED")

        # 3b. Check: Direct Client-to-Database Access (Security & Isolation Breach)
        direct_client_db = []
        for n in nodes:
            if n.type == "client":
                for target_id in adjacency_out[n.id]:
                    target_node = node_map.get(target_id)
                    if target_node and target_node.type in ("relational_db", "nosql_db"):
                        direct_client_db.append(n.id)

        if direct_client_db:
            violations.append(
                RuleViolation(
                    rule_id="RULE-005",
                    rule_name="DIRECT_CLIENT_DATABASE_ACCESS",
                    severity="error",
                    node_ids=direct_client_db,
                    message="Client applications are directly querying the database tier without passing through an API or application layer.",
                    remediation="Isolate databases behind application services and API Gateways. Never expose database connection strings or listening ports to client environments.",
                )
            )
        else:
            if component_counts["client"] > 0 and (component_counts["relational_db"] > 0 or component_counts["nosql_db"] > 0):
                passed_rules.append("DATABASE_ISOLATED_FROM_CLIENTS")


        # 4. Check: Missing Cache Layer for High Read QPS
        has_cache = component_counts["cache"] > 0
        target_qps = scale.get("read_qps", 0) or scale.get("peak_qps", 0) or 0
        if (
            component_counts["relational_db"] > 0
            and component_counts["service"] >= 2
            and not has_cache
            and target_qps >= 5000
        ):
            violations.append(
                RuleViolation(
                    rule_id="RULE-003",
                    rule_name="MISSING_CACHE_TIER",
                    severity="warning",
                    node_ids=[n.id for n in nodes if n.type == "relational_db"],
                    message=f"System targets {target_qps} read QPS without an In-Memory Caching layer. Disk IOPS on primary database will saturate.",
                    remediation="Add an In-Memory Cache (Redis / Memcached) between application services and the database with Cache-Aside or Write-Through pattern.",
                )
            )
        else:
            if has_cache:
                passed_rules.append("MEMORY_CACHE_ACCELERATION")

        # 5. Check: Unbounded Message Queue (No Consumer)
        unconsumed_queues = []
        for n in nodes:
            if n.type == "queue":
                if len(adjacency_out[n.id]) == 0:
                    unconsumed_queues.append(n.id)

        if unconsumed_queues:
            violations.append(
                RuleViolation(
                    rule_id="RULE-004",
                    rule_name="UNBOUNDED_MESSAGE_QUEUE",
                    severity="error",
                    node_ids=unconsumed_queues,
                    message=f"Message Queue(s) {', '.join(unconsumed_queues)} have no consumers connected. Queue depth will explode and exhaust broker storage.",
                    remediation="Connect consumer worker services to pull and process messages from the queue topic.",
                )
            )
        else:
            if component_counts["queue"] > 0:
                passed_rules.append("MESSAGE_QUEUE_CONSUMERS_ATTACHED")

        # 6. Check: Direct Object Store Exposure to Clients (Missing CDN)
        direct_storage_hits = []
        for n in nodes:
            if n.type == "client":
                for target_id in adjacency_out[n.id]:
                    target = node_map.get(target_id)
                    if target and target.type == "storage":
                        direct_storage_hits.append(target_id)

        if direct_storage_hits:
            violations.append(
                RuleViolation(
                    rule_id="RULE-006",
                    rule_name="DIRECT_OBJECT_STORAGE_EXPOSURE",
                    severity="warning",
                    node_ids=direct_storage_hits,
                    message="Clients directly fetch assets from Object Storage origin without a Content Delivery Network (CDN).",
                    remediation="Front Object Storage with a global CDN (Cloudflare / CloudFront) to cache static chunks at the edge and protect storage egress bandwidth.",
                )
            )
        else:
            if component_counts["storage"] > 0:
                passed_rules.append("OBJECT_STORAGE_PROTECTED")

        # 7. Check: Orphan Nodes (disconnected components)
        orphan_nodes = []
        for n in nodes:
            if len(adjacency_out[n.id]) == 0 and len(adjacency_in[n.id]) == 0:
                orphan_nodes.append(n.id)

        if orphan_nodes:
            violations.append(
                RuleViolation(
                    rule_id="RULE-009",
                    rule_name="DISCONNECTED_ORPHAN_NODES",
                    severity="warning",
                    node_ids=orphan_nodes,
                    message=f"Components {', '.join(orphan_nodes)} are completely isolated with zero network traffic links.",
                    remediation="Connect network edges to route traffic through these components or delete unused nodes.",
                )
            )
        else:
            passed_rules.append("ALL_COMPONENTS_NETWORKED")

        # 8. Check: Cyclic Dependencies in Call Graph (RULE-007)
        visited_color: dict[str, int] = {}  # 0: unvisited, 1: visiting, 2: visited
        cycle_nodes: set[str] = set()

        def dfs_cycle(curr_id: str, stack: list[str]):
            visited_color[curr_id] = 1
            stack.append(curr_id)
            for nbr_id in adjacency_out.get(curr_id, []):
                if nbr_id in node_map:
                    if visited_color.get(nbr_id, 0) == 1:
                        idx = stack.index(nbr_id)
                        cycle_nodes.update(stack[idx:])
                    elif visited_color.get(nbr_id, 0) == 0:
                        dfs_cycle(nbr_id, stack)
            stack.pop()
            visited_color[curr_id] = 2

        for n in nodes:
            if visited_color.get(n.id, 0) == 0:
                dfs_cycle(n.id, [])

        if cycle_nodes:
            violations.append(
                RuleViolation(
                    rule_id="RULE-007",
                    rule_name="CYCLIC_DEPENDENCY_DETECTED",
                    severity="error",
                    node_ids=sorted(list(cycle_nodes)),
                    message=f"Circular dependency detected involving components: {', '.join(sorted(cycle_nodes))}. Cycles risk distributed deadlocks, infinite call loops, and cascade crashes.",
                    remediation="Decouple circular dependencies using asynchronous message queues, pub/sub topics, or event-driven orchestration.",
                )
            )
        else:
            if len(nodes) > 1:
                passed_rules.append("NO_CYCLIC_DEPENDENCIES")

        # 9. Check: Shared Database Bottleneck (RULE-010)
        overburdened_dbs = []
        for n in nodes:
            if n.type in ("relational_db", "nosql_db"):
                incoming_services = [
                    src for src in adjacency_in.get(n.id, [])
                    if node_map.get(src) and node_map[src].type == "service"
                ]
                if len(incoming_services) > 3:
                    overburdened_dbs.append(n.id)

        if overburdened_dbs:
            violations.append(
                RuleViolation(
                    rule_id="RULE-010",
                    rule_name="DATABASE_BOTTLENECK_TOO_MANY_SERVICES",
                    severity="warning",
                    node_ids=overburdened_dbs,
                    message=f"Database(s) {', '.join(overburdened_dbs)} are directly accessed by more than 3 distinct services, creating tight schema coupling and connection pool exhaustion.",
                    remediation="Implement Database-per-Service pattern, add dedicated read replicas, or wrap shared tables behind a domain service API.",
                )
            )
        else:
            if component_counts["relational_db"] > 0 or component_counts["nosql_db"] > 0:
                passed_rules.append("DATABASE_CONNECTION_FANIN_BALANCED")

        # 10. Check: Synchronous Call Chain Too Deep (RULE-011)
        def get_service_depth(curr_id: str, visited_set: set[str]) -> int:
            max_depth = 0
            for tgt_id in adjacency_out.get(curr_id, []):
                tgt = node_map.get(tgt_id)
                if tgt and tgt.type == "service" and tgt_id not in visited_set:
                    max_depth = max(max_depth, 1 + get_service_depth(tgt_id, visited_set | {tgt_id}))
            return max_depth

        deep_chains = []
        for n in nodes:
            if n.type == "service":
                if get_service_depth(n.id, {n.id}) >= 3:
                    deep_chains.append(n.id)

        if deep_chains:
            violations.append(
                RuleViolation(
                    rule_id="RULE-011",
                    rule_name="SYNCHRONOUS_CHAIN_TOO_DEEP",
                    severity="warning",
                    node_ids=deep_chains,
                    message=f"Synchronous service call chain exceeds 3 hops starting at {', '.join(deep_chains)}. Deep synchronous request chains amplify tail latency and invite cascading timeouts.",
                    remediation="Decouple synchronous chains using asynchronous pub/sub messaging or CQRS to avoid compounding downstream latency.",
                )
            )
        else:
            if component_counts["service"] > 0:
                passed_rules.append("SYNCHRONOUS_CALL_DEPTH_OPTIMAL")

        # 11. Check: High Burst Traffic Without Queue Buffer (RULE-012)
        write_qps = scale.get("write_qps", 0) or 0
        peak_qps = scale.get("peak_qps", 0) or 0
        has_queue = component_counts["queue"] > 0

        if (write_qps >= 10000 or (peak_qps >= 30000 and write_qps >= 3000)) and not has_queue:
            violations.append(
                RuleViolation(
                    rule_id="RULE-012",
                    rule_name="HIGH_BURST_WITHOUT_ASYNC_BUFFER",
                    severity="warning",
                    node_ids=[n.id for n in nodes if n.type == "service"],
                    message=f"High write workload ({write_qps:,} write QPS) configured without a message queue or streaming buffer. Spikes risk overwhelming transactional databases.",
                    remediation="Introduce a message queue (Kafka / RabbitMQ / AWS SQS) to buffer write bursts, rate-limit ingestion, and process tasks asynchronously.",
                )
            )
        else:
            if has_queue or write_qps > 0:
                passed_rules.append("BURST_TRAFFIC_PROTECTED")


        # Calculate Score
        # Start at 100
        # -25 for each error
        # -10 for each warning
        # -5 for each optimization
        penalty = 0
        for v in violations:
            if v.severity == "error":
                penalty += 25
            elif v.severity == "warning":
                penalty += 10
            elif v.severity == "optimization":
                penalty += 5

        health_score = max(0, 100 - penalty)

        if health_score >= 85:
            status = "PASS"
            summary = "Production-grade architecture. High availability, proper tiering, and fault tolerance verified."
        elif health_score >= 60:
            status = "NEEDS_IMPROVEMENT"
            summary = "Partially viable topology with architectural bottlenecks or single points of failure to remediate."
        else:
            status = "CRITICAL_ISSUES"
            summary = "Critical failure modes detected. High probability of downtime or data loss under production load."

        return ValidationResponse(
            health_score=health_score,
            status=status,
            violations=violations,
            passed_rules=passed_rules,
            summary=summary,
            component_counts=dict(component_counts),
        )


rule_engine = DeterministicRuleEngine()
