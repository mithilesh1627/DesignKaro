from collections import defaultdict, deque
import math
import uuid

from backend.app.schemas.design import GraphData
from backend.app.schemas.simulation import (
    FailureConfig,
    NodeTickMetric,
    SimulationResponse,
    SimulationTick,
    TrafficProfile,
)


class SystemTrafficSimulator:
    """
    Discrete-event distributed system traffic and chaos resilience simulator.
    Simulates load propagation along graph edges, read/write splitting, cache attenuation,
    queue buffering, node capacity saturation, and automated bottleneck detection.
    """

    def run_simulation(
        self,
        graph: GraphData,
        traffic: TrafficProfile,
        failure: FailureConfig,
    ) -> SimulationResponse:
        sim_id = f"sim-{uuid.uuid4().hex[:12]}"
        nodes = graph.nodes
        edges = graph.edges

        node_map = {n.id: n for n in nodes}
        adj_out: dict[str, list[str]] = defaultdict(list)
        adj_in: dict[str, list[str]] = defaultdict(list)

        for edge in edges:
            if edge.source in node_map and edge.target in node_map:
                adj_out[edge.source].append(edge.target)
                adj_in[edge.target].append(edge.source)

        # Identify entry nodes (clients, CDNs, gateways, or nodes with 0 incoming edges)
        client_nodes = [n for n in nodes if n.type == "client"]
        gateway_nodes = [n for n in nodes if n.type in ("gateway", "api_gateway", "load_balancer")]
        root_nodes = [n for n in nodes if len(adj_in[n.id]) == 0]

        if client_nodes:
            ingress_nodes = client_nodes
        elif gateway_nodes:
            ingress_nodes = gateway_nodes
        elif root_nodes:
            ingress_nodes = root_nodes
        else:
            ingress_nodes = nodes

        target_fail_id = failure.target_node_id
        if not target_fail_id and nodes:
            for n in nodes:
                if n.type in ("relational_db", "postgresql", "mysql", "service", "server"):
                    target_fail_id = n.id
                    break
            if not target_fail_id:
                target_fail_id = nodes[0].id

        ticks: list[SimulationTick] = []
        total_requests = 0
        total_dropped = 0
        peak_qps = 0
        all_latency_readings: list[float] = []

        # State across seconds (for queue accumulation)
        accumulated_queue_depth: dict[str, int] = defaultdict(int)

        # Track per-node load for bottleneck detection
        node_peak_utilization: dict[str, float] = defaultdict(float)
        node_total_load: dict[str, float] = defaultdict(float)
        node_total_capacity: dict[str, float] = defaultdict(float)

        read_ratio = traffic.read_ratio
        cache_hit_ratio = traffic.cache_hit_ratio
        net_latency = traffic.network_latency_ms

        for sec in range(0, traffic.duration_sec, traffic.step_sec):
            # Sinusoidal bell curve for current second traffic
            progress = sec / max(1, traffic.duration_sec)
            curve = math.sin(progress * math.pi)
            current_qps = int(traffic.base_qps + (traffic.peak_qps - traffic.base_qps) * curve)
            peak_qps = max(peak_qps, current_qps)
            total_requests += current_qps * traffic.step_sec

            is_failure_active = (
                failure.failure_type != "NONE"
                and failure.start_second <= sec < (failure.start_second + failure.duration_second)
            )

            # Compute traffic arriving at each node by traversing graph from ingress
            node_incoming_qps: dict[str, float] = defaultdict(float)

            if edges:
                # Distribute initial QPS across ingress nodes
                ingress_share = current_qps / max(1, len(ingress_nodes))
                for in_node in ingress_nodes:
                    node_incoming_qps[in_node.id] += ingress_share

                # BFS propagation along edges
                queue: deque[str] = deque([n.id for n in ingress_nodes])
                visited_in_tick: set[str] = set()

                while queue:
                    u_id = queue.popleft()
                    u_node = node_map.get(u_id)
                    if not u_node:
                        continue

                    u_qps = node_incoming_qps[u_id]
                    targets = adj_out[u_id]
                    if not targets or u_qps <= 0:
                        continue

                    is_u_crashed = is_failure_active and (u_id == target_fail_id) and (failure.failure_type == "KILL_NODE")
                    if is_u_crashed:
                        # Dead node drops all outbound traffic
                        continue

                    # Determine outgoing traffic based on component semantics and read/write ratio
                    if u_node.type == "cdn":
                        # CDN absorbs 80% of static read traffic at edge
                        out_qps = u_qps * (1.0 - (0.80 * read_ratio))
                    elif u_node.type in ("cache", "redis", "memcached"):
                        # Cache absorbs cache_hit_ratio of read requests; writes pass through
                        cache_misses = u_qps * read_ratio * (1.0 - cache_hit_ratio)
                        writes = u_qps * (1.0 - read_ratio)
                        out_qps = cache_misses + writes
                    elif u_node.type in ("queue", "kafka", "rabbitmq"):
                        # Message queue buffers bursts; rate-limits downstream to worker capacity
                        worker_capacity = sum(
                            node_map[t].properties.qps_capacity * max(1, node_map[t].properties.replicas)
                            for t in targets if t in node_map
                        )
                        out_qps = min(u_qps, max(1000, worker_capacity))
                        excess = max(0.0, u_qps - out_qps)
                        accumulated_queue_depth[u_id] = min(100000, accumulated_queue_depth[u_id] + int(excess))
                    else:
                        out_qps = u_qps

                    split_qps = out_qps / len(targets)
                    for t_id in targets:
                        node_incoming_qps[t_id] += split_qps
                        if t_id not in visited_in_tick:
                            visited_in_tick.add(t_id)
                            queue.append(t_id)
            else:
                # If no edges exist on canvas, distribute baseline across components
                for n in nodes:
                    node_incoming_qps[n.id] = current_qps / max(1, len(nodes))

            tick_errors = 0
            node_metrics: list[NodeTickMetric] = []

            for n in nodes:
                replicas = max(1, n.properties.replicas)
                capacity = max(100, n.properties.qps_capacity * replicas)
                base_latency = max(0.5, n.properties.latency_ms) + (net_latency * 0.2)
                assigned_qps = node_incoming_qps.get(n.id, 0.0)

                # Track load for aggregate bottleneck detection
                node_total_load[n.id] += assigned_qps
                node_total_capacity[n.id] += capacity
                utilization = min(100.0, (assigned_qps / float(capacity)) * 100.0)
                node_peak_utilization[n.id] = max(node_peak_utilization[n.id], utilization)

                is_target_failing = is_failure_active and (n.id == target_fail_id)

                if is_target_failing:
                    if failure.failure_type == "KILL_NODE":
                        status = "CRASHED"
                        cpu = 0.0
                        mem = 0.0
                        queue_d = 50000
                        err_rate = 1.0
                        lat = 5000.0
                        dropped = int(assigned_qps * 1.0)
                        tick_errors += dropped
                        delivered_qps = 0.0
                    elif failure.failure_type == "LATENCY_SPIKE":
                        status = "DEGRADED"
                        cpu = 88.0
                        mem = 75.0
                        queue_d = 12000
                        err_rate = 0.15
                        lat = base_latency + 500.0
                        dropped = int(assigned_qps * 0.15)
                        tick_errors += dropped
                        delivered_qps = assigned_qps * 0.85
                    elif failure.failure_type == "PACKET_LOSS":
                        status = "DEGRADED"
                        cpu = 60.0
                        mem = 50.0
                        queue_d = 8000
                        err_rate = 0.50
                        lat = base_latency * 3.0
                        dropped = int(assigned_qps * 0.50)
                        tick_errors += dropped
                        delivered_qps = assigned_qps * 0.50
                    else:
                        status = "DEGRADED"
                        cpu = 95.0
                        mem = 80.0
                        queue_d = 15000
                        err_rate = 0.20
                        lat = base_latency * 2.0
                        dropped = int(assigned_qps * 0.20)
                        tick_errors += dropped
                        delivered_qps = assigned_qps * 0.80
                else:
                    # Upstream blast radius: if an upstream node calls a dead target, it stalls
                    is_caller_of_crashed = is_failure_active and (target_fail_id in adj_out[n.id]) and (failure.failure_type == "KILL_NODE")

                    load_ratio = assigned_qps / float(capacity)
                    cpu = min(99.0, max(5.0, load_ratio * 75.0))
                    mem = min(95.0, max(15.0, load_ratio * 60.0))

                    if n.type in ("queue", "kafka", "rabbitmq"):
                        queue_d = accumulated_queue_depth.get(n.id, 0)
                    else:
                        queue_d = int(max(0, (load_ratio - 0.8) * 10000)) if load_ratio > 0.8 else 0

                    if is_caller_of_crashed:
                        status = "DEGRADED"
                        err_rate = 0.40
                        lat = base_latency + 300.0
                        queue_d += 15000
                        dropped = int(assigned_qps * 0.40)
                        tick_errors += dropped
                        delivered_qps = assigned_qps * 0.60
                    elif load_ratio > 1.0:
                        status = "DEGRADED"
                        err_rate = min(0.60, (load_ratio - 1.0) * 0.5)
                        # Exponential queuing delay near saturation
                        lat = base_latency * (1.0 + (load_ratio ** 2) * 2.5)
                        dropped = int(assigned_qps * err_rate)
                        tick_errors += dropped
                        delivered_qps = assigned_qps - dropped
                    else:
                        status = "HEALTHY"
                        err_rate = 0.001
                        lat = base_latency * (1.0 + load_ratio * 0.3)
                        delivered_qps = assigned_qps

                all_latency_readings.append(lat)

                node_metrics.append(
                    NodeTickMetric(
                        node_id=n.id,
                        node_type=n.type,
                        cpu_percent=round(cpu, 1),
                        memory_percent=round(mem, 1),
                        queue_depth=queue_d,
                        error_rate=round(err_rate, 4),
                        latency_p99_ms=round(lat, 2),
                        status=status,
                        throughput_qps=round(delivered_qps, 1),
                        utilization_percent=round(utilization, 1),
                        is_bottleneck=False,
                    )
                )

            total_dropped += tick_errors
            tick_p99 = max([m.latency_p99_ms for m in node_metrics], default=15.0)

            system_status = (
                "CRITICAL_FAILURE"
                if any(m.status == "CRASHED" for m in node_metrics)
                else "DEGRADED"
                if any(m.status == "DEGRADED" for m in node_metrics)
                else "HEALTHY"
            )

            ticks.append(
                SimulationTick(
                    second=sec,
                    qps=current_qps,
                    total_errors=tick_errors,
                    p99_latency_ms=round(tick_p99, 2),
                    system_status=system_status,
                    node_metrics=node_metrics,
                )
            )

        # Compute percentiles
        all_latency_readings.sort()
        count = len(all_latency_readings)
        if count > 0:
            p50 = all_latency_readings[int(count * 0.50)]
            p95 = all_latency_readings[min(count - 1, int(count * 0.95))]
            p99 = all_latency_readings[min(count - 1, int(count * 0.99))]
        else:
            p50, p95, p99 = 8.0, 25.0, 60.0

        # Calculate overall delivered throughput
        delivered_total = max(0, total_requests - total_dropped)
        delivered_throughput = round(delivered_total / max(1, traffic.duration_sec), 1)
        overall_error_rate = round(total_dropped / max(1, total_requests), 4)

        # Average tier utilizations
        compute_nodes = [n for n in nodes if n.type in ("service", "server", "microservice", "worker")]
        db_nodes = [n for n in nodes if n.type in ("relational_db", "postgresql", "mysql", "mongodb", "cassandra")]
        cache_nodes = [n for n in nodes if n.type in ("cache", "redis", "memcached")]
        queue_nodes = [n for n in nodes if n.type in ("queue", "kafka", "rabbitmq")]

        avg_cpu = (
            sum(node_peak_utilization[n.id] for n in compute_nodes) / max(1, len(compute_nodes))
            if compute_nodes
            else 25.0
        )
        avg_mem = min(95.0, avg_cpu * 0.85 + 15.0)
        max_db_util = max([node_peak_utilization[n.id] for n in db_nodes], default=0.0)
        max_queue_depth = max([accumulated_queue_depth[n.id] for n in queue_nodes], default=0)
        effective_cache_hit = cache_hit_ratio * 100.0 if cache_nodes else 0.0

        # Identify Primary Bottleneck
        bottleneck_node_id = None
        bottleneck_node_name = None
        bottleneck_type = None
        bottleneck_utilization = 0.0
        bottleneck_explanation = None
        ai_bottleneck_explanation = None
        bottleneck_remediation = None
        suggested_action = None

        sorted_nodes = sorted(nodes, key=lambda n: node_peak_utilization[n.id], reverse=True)
        if sorted_nodes and node_peak_utilization[sorted_nodes[0].id] >= 65.0:
            b_node = sorted_nodes[0]
            bottleneck_node_id = b_node.id
            bottleneck_node_name = b_node.label or b_node.id
            bottleneck_utilization = round(node_peak_utilization[b_node.id], 1)

            # Flag the bottleneck node in the tick metrics
            for t in ticks:
                for nm in t.node_metrics:
                    if nm.node_id == bottleneck_node_id:
                        nm.is_bottleneck = True

            if b_node.type in ("relational_db", "postgresql", "mysql", "mongodb", "cassandra"):
                bottleneck_type = "DATABASE"
                bottleneck_explanation = (
                    f"{bottleneck_node_name} is currently the primary bottleneck ({int(bottleneck_utilization)}% capacity saturated). "
                    "Adding more application servers will not solve this because all application servers still depend on the same database."
                )
                ai_bottleneck_explanation = (
                    f"Architectural Bottleneck: {bottleneck_node_name} is enduring heavy read/write contention. "
                    f"With a {int(read_ratio*100)}% read ratio and {traffic.peak_qps:,} Peak RPS, the un-cached query volume "
                    "exhausts DB thread pools and IOPS, cascading latency spikes upstream."
                )
                if not cache_nodes:
                    bottleneck_remediation = "Introduce a Redis read-through caching tier to absorb 85%+ of read queries before they hit the DB."
                    suggested_action = "add_component:redis"
                else:
                    bottleneck_remediation = "Add read replicas or partition database tables to distribute query load."
                    suggested_action = f"scale:{b_node.id}:{max(2, b_node.properties.replicas + 2)}"

            elif b_node.type in ("service", "server", "microservice"):
                bottleneck_type = "COMPUTE"
                bottleneck_explanation = (
                    f"{bottleneck_node_name} application tier is saturated at {int(bottleneck_utilization)}% CPU/memory utilization. "
                    "Incoming request arrival rate exceeds stateless worker concurrency."
                )
                ai_bottleneck_explanation = (
                    f"Compute Bottleneck: {bottleneck_node_name} has {b_node.properties.replicas} instance(s) running. "
                    f"At peak load of {traffic.peak_qps:,} RPS, requests queue up waiting for available worker threads."
                )
                bottleneck_remediation = f"Scale compute cluster from {b_node.properties.replicas} to {b_node.properties.replicas + 2} replicas."
                suggested_action = f"scale:{b_node.id}:{b_node.properties.replicas + 2}"

            elif b_node.type in ("gateway", "api_gateway", "load_balancer"):
                bottleneck_type = "INGRESS"
                bottleneck_explanation = (
                    f"{bottleneck_node_name} is saturated at {int(bottleneck_utilization)}% capacity. "
                    "Ingress reverse proxy connection limits are bottlenecking traffic entry."
                )
                ai_bottleneck_explanation = (
                    f"Edge Bottleneck: Reverse proxy {bottleneck_node_name} is dropping connections due to socket exhaustion."
                )
                bottleneck_remediation = "Scale load balancer instances or enable CDN edge caching."
                suggested_action = "add_component:cdn"

            else:
                bottleneck_type = "COMPONENT"
                bottleneck_explanation = f"{bottleneck_node_name} is operating near peak threshold ({int(bottleneck_utilization)}% capacity)."
                ai_bottleneck_explanation = "Review component resource allocations to ensure sufficient scaling headroom."
                bottleneck_remediation = f"Increase capacity or replicas for {bottleneck_node_name}."
                suggested_action = f"scale:{b_node.id}:{b_node.properties.replicas + 1}"
        else:
            bottleneck_explanation = "Architecture is operating within healthy capacity boundaries under the specified traffic profile."
            ai_bottleneck_explanation = "All tiers demonstrate adequate headroom. Estimated p95 latency and throughput meet SLA expectations."
            bottleneck_remediation = "No immediate scale remediation required."

        # Blast radius summary & RCA
        if failure.failure_type == "KILL_NODE":
            blast_radius = f"Severe blast radius. Killing node '{target_fail_id}' caused upstream backpressure and {total_dropped:,} dropped requests across the graph."
            rca = (
                f"Root Cause: Node '{target_fail_id}' lacked multi-replica active-passive failover or upstream circuit breaking. "
                "Callers exhausted socket thread pools waiting on downstream timeouts."
            )
        elif failure.failure_type == "LATENCY_SPIKE":
            blast_radius = f"Moderate blast radius. 500ms latency spike in '{target_fail_id}' amplified end-to-end user p99 to {p99:.1f}ms."
            rca = f"Root Cause: Upstream callers lacked strict timeout deadlines and fallback hedges for '{target_fail_id}'."
        else:
            blast_radius = "Nominal blast radius. System handled traffic curve with proportional node saturation."
            rca = None

        recommendations = [
            "Configure client-side circuit breakers (trip circuit when error rate > 20% over 10s)",
            "Introduce Redis read-through caching to decouple compute load from database queries",
            "Set strict upstream timeout deadlines (connect: 50ms, read: 250ms) to prevent thread pool starvation",
            "Place message queues between ingestion and async processors to absorb flash surges",
        ]
        if bottleneck_remediation and bottleneck_remediation not in recommendations:
            recommendations.insert(0, bottleneck_remediation)

        return SimulationResponse(
            simulation_id=sim_id,
            total_requests_simulated=total_requests,
            dropped_requests=total_dropped,
            peak_observed_qps=peak_qps,
            overall_p99_latency_ms=round(p99, 2),
            blast_radius_summary=blast_radius,
            incident_rca=rca,
            ticks=ticks,
            recommendations=recommendations,
            # Phase 5 Aggregated Estimated Simulation Metrics
            disclaimer="Estimated Simulation",
            throughput_qps=delivered_throughput,
            p50_latency_ms=round(p50, 1),
            p95_latency_ms=round(p95, 1),
            p99_latency_ms=round(p99, 1),
            error_rate=overall_error_rate,
            cpu_utilization=round(avg_cpu, 1),
            memory_utilization=round(avg_mem, 1),
            database_utilization=round(max_db_util, 1),
            cache_hit_ratio=round(effective_cache_hit, 1),
            queue_depth=max_queue_depth,
            # Automated Bottleneck Analysis
            bottleneck_node_id=bottleneck_node_id,
            bottleneck_node_name=bottleneck_node_name,
            bottleneck_type=bottleneck_type,
            bottleneck_utilization=bottleneck_utilization,
            bottleneck_explanation=bottleneck_explanation,
            ai_bottleneck_explanation=ai_bottleneck_explanation,
            bottleneck_remediation=bottleneck_remediation,
            suggested_action=suggested_action,
        )


traffic_simulator = SystemTrafficSimulator()
