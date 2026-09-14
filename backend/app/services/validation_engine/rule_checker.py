from collections import defaultdict
from typing import Any

from backend.app.schemas.design import GraphData, RuleViolation, ValidationResponse


class DeterministicRuleEngine:
    """
    Evaluates architecture graphs against first-principles distributed systems rules.
    Zero hallucinations — pure deterministic graph analysis and structural invariants.
    Categorized across: Topology, Capacity, Resilience, Consistency, Cost.
    """

    def evaluate(self, graph: GraphData, scale_metadata: dict[str, Any] | None = None) -> ValidationResponse:
        nodes = graph.nodes
        edges = graph.edges
        scale = scale_metadata or getattr(graph, "scale_metadata", {}) or {}

        node_map = {n.id: n for n in nodes}
        adjacency_out = defaultdict(list)
        adjacency_in = defaultdict(list)
        edge_map = {}

        for edge in edges:
            if edge.source in node_map and edge.target in node_map:
                adjacency_out[edge.source].append(edge.target)
                adjacency_in[edge.target].append(edge.source)
                edge_map[(edge.source, edge.target)] = edge

        violations: list[RuleViolation] = []
        passed_rules: list[str] = []

        # Count components by type
        component_counts: dict[str, int] = defaultdict(int)
        for n in nodes:
            component_counts[n.type] += 1

        # Workload metrics
        read_qps = float(scale.get("read_qps", 0) or 0)
        write_qps = float(scale.get("write_qps", 0) or 0)
        peak_qps = float(scale.get("peak_qps", 0) or 0)
        target_rps = float(scale.get("target_rps", 0) or 0)
        effective_traffic = max(target_rps, peak_qps, read_qps + write_qps)

        # ------------------------------------------------------------------
        # RULE-000: Check Empty Canvas
        # ------------------------------------------------------------------
        if not nodes:
            return ValidationResponse(
                health_score=0,
                status="CRITICAL_ISSUES",
                violations=[
                    RuleViolation(
                        rule_id="RULE-000",
                        rule_name="EMPTY_ARCHITECTURE",
                        category="topology",
                        severity="critical",
                        node_ids=[],
                        message="The architecture canvas contains no components.",
                        remediation="Add clients, API gateway, compute services, and database nodes to build your system.",
                    )
                ],
                passed_rules=[],
                summary="Canvas is empty. Place initial system components to begin evaluation.",
                component_counts={},
                estimated_monthly_cost=0.0,
                cost_breakdown={},
            )

        # ------------------------------------------------------------------
        # 1. TOPOLOGY RULES
        # ------------------------------------------------------------------

        # RULE-008: Missing Persistent Storage
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
                    category="topology",
                    severity="critical",
                    node_ids=[n.id for n in nodes if n.type == "service"],
                    message="Architecture lacks durable storage. Compute services have nowhere to persist state.",
                    remediation="Attach a Relational Database (PostgreSQL), NoSQL Store (Cassandra), or Object Storage (S3).",
                )
            )
        else:
            passed_rules.append("DURABLE_STORAGE_PRESENT")

        # RULE-002: Missing Load Balancer / Gateway on Ingress
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
                    category="topology",
                    severity="critical",
                    node_ids=direct_client_bypasses,
                    message="Clients are directly connecting to backend services or databases without an Ingress Proxy or Load Balancer.",
                    remediation="Place an API Gateway or L4/L7 Load Balancer between Clients and backend services for SSL termination, traffic routing, and DDoS mitigation.",
                )
            )
        else:
            if component_counts["client"] > 0:
                passed_rules.append("INGRESS_PROPERLY_GATED")

        # RULE-005: Direct Client-to-Database Access (Security & Isolation Breach)
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
                    category="topology",
                    severity="critical",
                    node_ids=direct_client_db,
                    message="Client applications are directly querying the database tier without passing through an API or application layer.",
                    remediation="Isolate databases behind application services and API Gateways. Never expose database connection strings or listening ports to client environments.",
                )
            )
        else:
            if component_counts["client"] > 0 and (component_counts["relational_db"] > 0 or component_counts["nosql_db"] > 0):
                passed_rules.append("DATABASE_ISOLATED_FROM_CLIENTS")

        # RULE-013: Cache Misplaced or Client Direct Connection
        client_to_cache = []
        for n in nodes:
            if n.type == "client":
                for target_id in adjacency_out[n.id]:
                    target_node = node_map.get(target_id)
                    if target_node and target_node.type == "cache":
                        client_to_cache.append(n.id)

        if client_to_cache:
            violations.append(
                RuleViolation(
                    rule_id="RULE-013",
                    rule_name="CACHE_MISPLACED_OR_CLIENT_DIRECT",
                    category="topology",
                    severity="critical",
                    node_ids=client_to_cache,
                    message="Clients are directly connected to the In-Memory Cache tier. Cache must sit between application services and databases.",
                    remediation="Route client requests through API Gateway and Compute Services. Use Cache-Aside or Read-Through caching inside backend services.",
                )
            )
        else:
            if component_counts["cache"] > 0:
                passed_rules.append("CACHE_PROPERLY_TIERED")

        # RULE-006: Direct Object Store Exposure to Clients (Missing CDN)
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
                    category="topology",
                    severity="warning",
                    node_ids=direct_storage_hits,
                    message="Clients directly fetch assets from Object Storage origin without a Content Delivery Network (CDN).",
                    remediation="Front Object Storage with a global CDN (Cloudflare / CloudFront) to cache static chunks at the edge and protect storage egress bandwidth.",
                )
            )
        else:
            if component_counts["storage"] > 0:
                passed_rules.append("OBJECT_STORAGE_PROTECTED")

        # RULE-014: High Ingress Traffic Missing CDN Edge
        if effective_traffic >= 10000 and component_counts["client"] > 0 and component_counts["cdn"] == 0:
            ingress_nodes = [n.id for n in nodes if n.type in ("gateway", "load_balancer")]
            if ingress_nodes:
                violations.append(
                    RuleViolation(
                        rule_id="RULE-014",
                        rule_name="INGRESS_MISSING_CDN_EDGE",
                        category="topology",
                        severity="warning",
                        node_ids=ingress_nodes,
                        message=f"System handles high workload ({effective_traffic:,.0f} QPS) without a CDN edge layer to absorb DDoS spikes and terminate SSL.",
                        remediation="Front API Gateway / Load Balancer with a CDN (Cloudflare, AWS CloudFront, Fastly) for edge caching and DDoS shield.",
                    )
                )

        # RULE-009: Disconnected Orphan Nodes
        orphan_nodes = []
        for n in nodes:
            if len(adjacency_out[n.id]) == 0 and len(adjacency_in[n.id]) == 0:
                orphan_nodes.append(n.id)

        if orphan_nodes:
            violations.append(
                RuleViolation(
                    rule_id="RULE-009",
                    rule_name="DISCONNECTED_ORPHAN_NODES",
                    category="topology",
                    severity="warning",
                    node_ids=orphan_nodes,
                    message=f"Components {', '.join(orphan_nodes)} are completely isolated with zero network traffic links.",
                    remediation="Connect network edges to route traffic through these components or delete unused nodes.",
                )
            )
        else:
            passed_rules.append("ALL_COMPONENTS_NETWORKED")

        # RULE-007: Cyclic Dependencies in Synchronous Call Graph
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
                    category="topology",
                    severity="critical",
                    node_ids=sorted(list(cycle_nodes)),
                    message=f"Circular dependency detected involving components: {', '.join(sorted(cycle_nodes))}. Cycles risk distributed deadlocks, infinite call loops, and cascade crashes.",
                    remediation="Decouple circular dependencies using asynchronous message queues, pub/sub topics, or event-driven orchestration.",
                )
            )
        else:
            if len(nodes) > 1:
                passed_rules.append("NO_CYCLIC_DEPENDENCIES")

        # ------------------------------------------------------------------
        # 2. CAPACITY RULES
        # ------------------------------------------------------------------

        # RULE-003: Missing Cache Layer for High Read QPS
        has_cache = component_counts["cache"] > 0
        target_read_qps = read_qps or (effective_traffic * 0.8)
        if (
            component_counts["relational_db"] > 0
            and component_counts["service"] >= 2
            and not has_cache
            and target_read_qps >= 5000
        ):
            violations.append(
                RuleViolation(
                    rule_id="RULE-003",
                    rule_name="MISSING_CACHE_TIER",
                    category="capacity",
                    severity="warning",
                    node_ids=[n.id for n in nodes if n.type == "relational_db"],
                    message=f"System targets {target_read_qps:,.0f} read QPS without an In-Memory Caching layer. Disk IOPS on primary database will saturate.",
                    remediation="Add an In-Memory Cache (Redis / Memcached) between application services and the database with Cache-Aside or Write-Through pattern.",
                )
            )
        else:
            if has_cache:
                passed_rules.append("MEMORY_CACHE_ACCELERATION")

        # RULE-010: Shared Database Bottleneck (Too Many Services Fan-In)
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
                    category="capacity",
                    severity="warning",
                    node_ids=overburdened_dbs,
                    message=f"Database(s) {', '.join(overburdened_dbs)} are directly accessed by more than 3 distinct services, creating tight schema coupling and connection pool exhaustion.",
                    remediation="Implement Database-per-Service pattern, add dedicated read replicas, or wrap shared tables behind a domain service API.",
                )
            )
        else:
            if component_counts["relational_db"] > 0 or component_counts["nosql_db"] > 0:
                passed_rules.append("DATABASE_CONNECTION_FANIN_BALANCED")

        # RULE-012: High Burst Traffic Without Queue Buffer
        has_queue = component_counts["queue"] > 0
        if (write_qps >= 10000 or (peak_qps >= 30000 and write_qps >= 3000)) and not has_queue:
            violations.append(
                RuleViolation(
                    rule_id="RULE-012",
                    rule_name="HIGH_BURST_WITHOUT_ASYNC_BUFFER",
                    category="capacity",
                    severity="warning",
                    node_ids=[n.id for n in nodes if n.type == "service"],
                    message=f"High write workload ({write_qps:,.0f} write QPS) configured without a message queue or streaming buffer. Spikes risk overwhelming transactional databases.",
                    remediation="Introduce a message queue (Kafka / RabbitMQ / AWS SQS) to buffer write bursts, rate-limit ingestion, and process tasks asynchronously.",
                )
            )
        else:
            if has_queue or write_qps > 0:
                passed_rules.append("BURST_TRAFFIC_PROTECTED")

        # RULE-015: Service Capacity Bottleneck
        bottlenecked_services = []
        if effective_traffic >= 5000:
            for n in nodes:
                if n.type == "service":
                    service_capacity = n.properties.replicas * n.properties.qps_capacity
                    if effective_traffic > service_capacity:
                        bottlenecked_services.append(n.id)

        if bottlenecked_services:
            violations.append(
                RuleViolation(
                    rule_id="RULE-015",
                    rule_name="SERVICE_CAPACITY_BOTTLENECK",
                    category="capacity",
                    severity="critical",
                    node_ids=bottlenecked_services,
                    message=f"Workload traffic ({effective_traffic:,.0f} QPS) exceeds total provisioned capacity of service(s): {', '.join(bottlenecked_services)}.",
                    remediation=f"Horizontal scale service pods or increase individual container QPS capacity to comfortably exceed {effective_traffic:,.0f} QPS.",
                )
            )
        else:
            if component_counts["service"] > 0 and effective_traffic > 0:
                passed_rules.append("SERVICE_CAPACITY_SUFFICIENT")

        # RULE-016: Database Write Bottleneck
        bottlenecked_dbs = []
        if write_qps > 0:
            for n in nodes:
                if n.type in ("relational_db", "nosql_db"):
                    # Primary handles writes (typically 40% of max IOPS for disk ACID commits)
                    db_write_limit = n.properties.replicas * (n.properties.qps_capacity * 0.4)
                    if write_qps > db_write_limit:
                        bottlenecked_dbs.append(n.id)

        if bottlenecked_dbs:
            violations.append(
                RuleViolation(
                    rule_id="RULE-016",
                    rule_name="DATABASE_WRITE_BOTTLENECK",
                    category="capacity",
                    severity="critical",
                    node_ids=bottlenecked_dbs,
                    message=f"Write QPS ({write_qps:,.0f} writes/sec) exceeds disk write throughput of database(s) {', '.join(bottlenecked_dbs)}.",
                    remediation="Shard databases horizontally, introduce message queues for asynchronous writes, or migrate write-heavy tables to NoSQL / LSM-Tree storage (ScyllaDB / Cassandra).",
                )
            )
        else:
            if (component_counts["relational_db"] > 0 or component_counts["nosql_db"] > 0) and write_qps > 0:
                passed_rules.append("DATABASE_WRITE_CAPACITY_HEALTHY")

        # ------------------------------------------------------------------
        # 3. RESILIENCE RULES
        # ------------------------------------------------------------------

        # RULE-001: Single Point of Failure (SPOF) on DB
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
                    category="resilience",
                    severity="critical",
                    node_ids=spof_db_nodes,
                    message=f"Database node(s) {', '.join(spof_db_nodes)} run on a single replica without high-availability failover.",
                    remediation="Increase replica count >= 2 and configure primary-replica replication or multi-AZ clustering.",
                )
            )
        else:
            if has_storage:
                passed_rules.append("DATABASE_HIGH_AVAILABILITY")

        # RULE-004: Unbounded Message Queue (No Consumer)
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
                    category="resilience",
                    severity="critical",
                    node_ids=unconsumed_queues,
                    message=f"Message Queue(s) {', '.join(unconsumed_queues)} have no consumers connected. Queue depth will explode and exhaust broker storage.",
                    remediation="Connect consumer worker services to pull and process messages from the queue topic.",
                )
            )
        else:
            if component_counts["queue"] > 0:
                passed_rules.append("MESSAGE_QUEUE_CONSUMERS_ATTACHED")

        # RULE-011: Synchronous Call Chain Too Deep
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
                    category="resilience",
                    severity="warning",
                    node_ids=deep_chains,
                    message=f"Synchronous service call chain exceeds 3 hops starting at {', '.join(deep_chains)}. Deep synchronous request chains amplify tail latency and invite cascading timeouts.",
                    remediation="Decouple synchronous chains using asynchronous pub/sub messaging or CQRS to avoid compounding downstream latency.",
                )
            )
        else:
            if component_counts["service"] > 0:
                passed_rules.append("SYNCHRONOUS_CALL_DEPTH_OPTIMAL")

        # RULE-017: Compute Service Single Point of Failure
        spof_services = []
        if effective_traffic >= 3000:
            for n in nodes:
                if n.type == "service" and n.properties.replicas <= 1:
                    # Check if connected to gateway or handling traffic
                    if len(adjacency_in[n.id]) > 0:
                        spof_services.append(n.id)

        if spof_services:
            violations.append(
                RuleViolation(
                    rule_id="RULE-017",
                    rule_name="SERVICE_SINGLE_POINT_OF_FAILURE",
                    category="resilience",
                    severity="critical",
                    node_ids=spof_services,
                    message=f"Compute service(s) {', '.join(spof_services)} have only 1 replica under {effective_traffic:,.0f} QPS traffic load. An unhandled exception or node crash causes total downtime.",
                    remediation="Increase replica count to at least 2 (or 3 for multi-AZ redundancy) with health check probes and auto-healing.",
                )
            )
        else:
            if component_counts["service"] > 0 and effective_traffic >= 3000:
                passed_rules.append("SERVICE_TIER_HIGH_AVAILABILITY")

        # RULE-018: Queue Missing Dead Letter Queue / Error Backpressure
        high_risk_queues = []
        if effective_traffic >= 5000:
            for n in nodes:
                if n.type == "queue":
                    # If queue feeds only 1 worker service and has high throughput
                    consumers = [tgt for tgt in adjacency_out[n.id] if node_map.get(tgt) and node_map[tgt].type == "service"]
                    if len(consumers) == 1 and node_map[consumers[0]].properties.replicas <= 1:
                        high_risk_queues.append(n.id)

        if high_risk_queues:
            violations.append(
                RuleViolation(
                    rule_id="RULE-018",
                    rule_name="QUEUE_WORKER_BACKPRESSURE_HAZARD",
                    category="resilience",
                    severity="warning",
                    node_ids=high_risk_queues,
                    message=f"Queue(s) {', '.join(high_risk_queues)} are drained by a single unscaled worker instance under high traffic, risking poison-pill message stalls.",
                    remediation="Scale consumer worker replicas >= 2 and configure a Dead Letter Queue (DLQ) with exponential backoff retries.",
                )
            )

        # ------------------------------------------------------------------
        # 4. CONSISTENCY RULES
        # ------------------------------------------------------------------

        # RULE-019: Read Replica Consistency Hazard
        stale_read_nodes = []
        for edge in edges:
            conn_type = edge.properties.get("connectionType") or edge.properties.get("type") or ""
            if conn_type == "read_path" or edge.label == "read_path":
                target = node_map.get(edge.target)
                # If target DB uses async replication mode
                if target and target.properties.failover_mode == "async" or target and target.properties.custom.get("replication") == "async":
                    stale_read_nodes.append(target.id)

        if stale_read_nodes:
            violations.append(
                RuleViolation(
                    rule_id="RULE-019",
                    rule_name="READ_REPLICA_CONSISTENCY_HAZARD",
                    category="consistency",
                    severity="warning",
                    node_ids=stale_read_nodes,
                    message=f"Read path queries database replica {', '.join(stale_read_nodes)} with asynchronous replication. Clients may experience read-your-own-writes inconsistencies.",
                    remediation="Switch to semi-synchronous replication or route critical user reads to the primary database immediately following writes.",
                )
            )
        else:
            if has_storage:
                passed_rules.append("REPLICATION_CONSISTENCY_VERIFIED")

        # RULE-020: Cache Invalidation Missing On Write Path
        if has_cache and has_storage:
            cache_ids = [n.id for n in nodes if n.type == "cache"]
            bypass_services = []
            for n in nodes:
                if n.type == "service":
                    # Check if service writes to DB
                    writes_to_db = any(
                        node_map.get(tgt) and node_map[tgt].type in ("relational_db", "nosql_db")
                        for tgt in adjacency_out[n.id]
                    )
                    touches_cache = any(tgt in cache_ids for tgt in adjacency_out[n.id])
                    # If service has explicit write path to DB but no edge to cache
                    for tgt_id in adjacency_out[n.id]:
                        e = edge_map.get((n.id, tgt_id))
                        if e and e.properties.get("connectionType") == "write_path":
                            if not touches_cache:
                                bypass_services.append(n.id)

            if bypass_services:
                violations.append(
                    RuleViolation(
                        rule_id="RULE-020",
                        rule_name="CACHE_INCONSISTENCY_WRITE_BYPASS",
                        category="consistency",
                        severity="warning",
                        node_ids=bypass_services,
                        message=f"Service(s) {', '.join(bypass_services)} execute direct write queries to database without invalidating or updating the Redis cache.",
                        remediation="Add cache invalidation edge (Write-Through or Cache-Evict on write) to prevent stale cache entries from being served.",
                    )
                )
            else:
                passed_rules.append("CACHE_INVALIDATION_COHERENT")

        # ------------------------------------------------------------------
        # 5. COST ESTIMATION & OVER-PROVISIONING
        # ------------------------------------------------------------------
        cost_breakdown = {
            "compute": 0.0,
            "database": 0.0,
            "cache": 0.0,
            "messaging": 0.0,
            "networking": 0.0,
            "storage": 0.0,
        }

        over_provisioned_nodes = []

        for n in nodes:
            reps = max(1, getattr(n.properties, "replicas", 1))
            if n.type in ("service", "compute"):
                cost_breakdown["compute"] += reps * 40.0
                if reps >= 10 and effective_traffic > 0 and effective_traffic < 500:
                    over_provisioned_nodes.append(n.id)
            elif n.type == "relational_db":
                cost_breakdown["database"] += reps * 120.0
            elif n.type == "nosql_db":
                cost_breakdown["database"] += reps * 140.0
            elif n.type == "cache":
                cost_breakdown["cache"] += reps * 60.0
            elif n.type == "queue":
                cost_breakdown["messaging"] += reps * 45.0
            elif n.type in ("gateway", "load_balancer"):
                cost_breakdown["networking"] += reps * 30.0
            elif n.type == "cdn":
                cost_breakdown["networking"] += 20.0
            elif n.type == "storage":
                cost_breakdown["storage"] += 25.0

        estimated_monthly_cost = round(sum(cost_breakdown.values()), 2)

        if over_provisioned_nodes:
            violations.append(
                RuleViolation(
                    rule_id="RULE-021",
                    rule_name="RESOURCE_OVER_PROVISIONED",
                    category="cost",
                    severity="info",
                    node_ids=over_provisioned_nodes,
                    message=f"Component(s) {', '.join(over_provisioned_nodes)} are heavily over-provisioned (>10 instances for <500 QPS).",
                    remediation="Reduce replica count to 2-3 instances or enable Horizontal Pod Autoscaling (HPA) to reduce monthly cloud expenditure.",
                )
            )

        passed_rules.append("COST_ESTIMATION_COMPLETED")

        # ------------------------------------------------------------------
        # Health Score Calculation
        # ------------------------------------------------------------------
        penalty = 0
        for v in violations:
            if v.severity in ("critical", "error"):
                penalty += 20
            elif v.severity == "warning":
                penalty += 8
            elif v.severity in ("info", "optimization"):
                penalty += 2

        health_score = max(0, min(100, 100 - penalty))

        if health_score >= 85:
            status = "PASS"
            summary = f"Production-grade architecture ({health_score}/100). High availability, tiering, and fault tolerance verified. Estimated cost: ${estimated_monthly_cost:,.2f}/mo."
        elif health_score >= 60:
            status = "NEEDS_IMPROVEMENT"
            summary = f"Viable topology with non-critical warnings ({health_score}/100). Estimated cost: ${estimated_monthly_cost:,.2f}/mo."
        else:
            status = "CRITICAL_ISSUES"
            summary = f"Critical failure modes or security gaps detected ({health_score}/100). High risk of downtime or data corruption under load. Estimated cost: ${estimated_monthly_cost:,.2f}/mo."

        return ValidationResponse(
            health_score=health_score,
            status=status,
            violations=violations,
            passed_rules=passed_rules,
            summary=summary,
            component_counts=dict(component_counts),
            estimated_monthly_cost=estimated_monthly_cost,
            cost_breakdown=cost_breakdown,
        )


rule_engine = DeterministicRuleEngine()
