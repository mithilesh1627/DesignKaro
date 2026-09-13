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
    Simulates load propagation along graph edges, cache attenuation, queue buffering,
    node capacity saturation, and failover blast radius.
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
        gateway_nodes = [n for n in nodes if n.type in ("gateway", "load_balancer")]
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
                if n.type in ("relational_db", "service"):
                    target_fail_id = n.id
                    break
            if not target_fail_id:
                target_fail_id = nodes[0].id

        ticks: list[SimulationTick] = []
        total_requests = 0
        total_dropped = 0
        peak_qps = 0
        p99_readings: list[float] = []

        # State across seconds (for queue accumulation)
        accumulated_queue_depth: dict[str, int] = defaultdict(int)

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

                    # Determine outgoing traffic based on component semantics
                    if u_node.type == "cdn":
                        # CDN absorbs 80% of static traffic at edge
                        out_qps = u_qps * 0.20
                    elif u_node.type == "cache":
                        # Cache hit ratio: 85% absorbed, only 15% miss reaches downstream DB
                        out_qps = u_qps * 0.15
                    elif u_node.type == "queue":
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
                base_latency = max(0.5, n.properties.latency_ms)
                assigned_qps = node_incoming_qps.get(n.id, 0.0)

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
                    elif failure.failure_type == "LATENCY_SPIKE":
                        status = "DEGRADED"
                        cpu = 88.0
                        mem = 75.0
                        queue_d = 12000
                        err_rate = 0.15
                        lat = base_latency + 500.0
                        dropped = int(assigned_qps * 0.15)
                        tick_errors += dropped
                    elif failure.failure_type == "PACKET_LOSS":
                        status = "DEGRADED"
                        cpu = 60.0
                        mem = 50.0
                        queue_d = 8000
                        err_rate = 0.50
                        lat = base_latency * 3.0
                        dropped = int(assigned_qps * 0.50)
                        tick_errors += dropped
                    else:
                        status = "DEGRADED"
                        cpu = 95.0
                        mem = 80.0
                        queue_d = 15000
                        err_rate = 0.20
                        lat = base_latency * 2.0
                        dropped = int(assigned_qps * 0.20)
                        tick_errors += dropped
                else:
                    # Upstream blast radius: if an upstream node calls a dead target, it stalls
                    is_caller_of_crashed = is_failure_active and (target_fail_id in adj_out[n.id]) and (failure.failure_type == "KILL_NODE")

                    load_ratio = assigned_qps / float(capacity)
                    cpu = min(99.0, max(5.0, load_ratio * 75.0))
                    mem = min(95.0, max(15.0, load_ratio * 60.0))

                    if n.type == "queue":
                        queue_d = accumulated_queue_depth.get(n.id, 0)
                    else:
                        queue_d = int(max(0, (load_ratio - 0.8) * 10000)) if load_ratio > 0.8 else 0

                    if is_caller_of_crashed:
                        status = "DEGRADED"
                        err_rate = 0.40
                        lat = base_latency + 300.0  # Upstream socket stall
                        queue_d += 15000
                        tick_errors += int(assigned_qps * 0.40)
                    elif load_ratio > 1.2:
                        status = "DEGRADED"
                        err_rate = min(0.40, (load_ratio - 1.0) * 0.5)
                        lat = base_latency * (1.0 + load_ratio * 2.0)
                        tick_errors += int(assigned_qps * err_rate)
                    else:
                        status = "HEALTHY"
                        err_rate = 0.001
                        lat = base_latency * (1.0 + load_ratio * 0.3)

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
                    )
                )

            total_dropped += tick_errors
            tick_p99 = max([m.latency_p99_ms for m in node_metrics], default=15.0)
            p99_readings.append(tick_p99)

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

        overall_p99 = max(p99_readings) if p99_readings else 20.0

        # Blast radius summary & RCA
        if failure.failure_type == "KILL_NODE":
            blast_radius = f"Severe blast radius. Killing node '{target_fail_id}' caused upstream backpressure and {total_dropped:,} dropped requests across the graph."
            rca = (
                f"Root Cause: Node '{target_fail_id}' lacked multi-replica active-passive failover or upstream circuit breaking. "
                "Callers exhausted socket thread pools waiting on downstream timeouts."
            )
        elif failure.failure_type == "LATENCY_SPIKE":
            blast_radius = f"Moderate blast radius. 500ms latency spike in '{target_fail_id}' amplified end-to-end user p99 to {overall_p99:.1f}ms."
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

        return SimulationResponse(
            simulation_id=sim_id,
            total_requests_simulated=total_requests,
            dropped_requests=total_dropped,
            peak_observed_qps=peak_qps,
            overall_p99_latency_ms=round(overall_p99, 2),
            blast_radius_summary=blast_radius,
            incident_rca=rca,
            ticks=ticks,
            recommendations=recommendations,
        )


traffic_simulator = SystemTrafficSimulator()
