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
    Simulates load propagation, node queue saturation, CPU exhaustion, and failover blast radius.
    """

    def run_simulation(
        self,
        graph: GraphData,
        traffic: TrafficProfile,
        failure: FailureConfig,
    ) -> SimulationResponse:
        sim_id = f"sim-{uuid.uuid4().hex[:12]}"
        nodes = graph.nodes

        ticks: list[SimulationTick] = []

        total_requests = 0
        total_dropped = 0
        peak_qps = 0
        p99_readings = []

        target_fail_id = failure.target_node_id
        if not target_fail_id and nodes:
            # Default to primary DB or first service if not specified
            for n in nodes:
                if n.type in ("relational_db", "service"):
                    target_fail_id = n.id
                    break
            if not target_fail_id:
                target_fail_id = nodes[0].id

        for sec in range(0, traffic.duration_sec, traffic.step_sec):
            # Compute current second QPS using a sinusoidal bell curve ramping from base to peak
            progress = sec / max(1, traffic.duration_sec)
            curve = math.sin(progress * math.pi)
            current_qps = int(traffic.base_qps + (traffic.peak_qps - traffic.base_qps) * curve)
            peak_qps = max(peak_qps, current_qps)
            total_requests += current_qps * traffic.step_sec

            # Check if chaos failure is active in this window
            is_failure_active = (
                failure.failure_type != "NONE"
                and failure.start_second <= sec < (failure.start_second + failure.duration_second)
            )

            tick_errors = 0
            node_metrics: list[NodeTickMetric] = []

            for n in nodes:
                replicas = max(1, n.properties.replicas)
                capacity = n.properties.qps_capacity * replicas
                base_latency = max(0.5, n.properties.latency_ms)

                is_target_failing = is_failure_active and (n.id == target_fail_id)

                if is_target_failing:
                    if failure.failure_type == "KILL_NODE":
                        status = "CRASHED"
                        cpu = 0.0
                        mem = 0.0
                        queue = 50000
                        err_rate = 1.0  # 100% errors on dead node
                        lat = 5000.0
                        tick_errors += int(current_qps * 0.8)
                    elif failure.failure_type == "LATENCY_SPIKE":
                        status = "DEGRADED"
                        cpu = 88.0
                        mem = 75.0
                        queue = 12000
                        err_rate = 0.15
                        lat = base_latency + 500.0
                        tick_errors += int(current_qps * 0.15)
                    elif failure.failure_type == "PACKET_LOSS":
                        status = "DEGRADED"
                        cpu = 60.0
                        mem = 50.0
                        queue = 8000
                        err_rate = 0.50
                        lat = base_latency * 3.0
                        tick_errors += int(current_qps * 0.50)
                    else:
                        status = "DEGRADED"
                        cpu = 95.0
                        mem = 80.0
                        queue = 15000
                        err_rate = 0.20
                        lat = base_latency * 2.0
                        tick_errors += int(current_qps * 0.20)
                else:
                    # Normal load calculation
                    load_ratio = current_qps / max(1, capacity)
                    cpu = min(99.0, max(5.0, load_ratio * 75.0))
                    mem = min(95.0, max(15.0, load_ratio * 60.0))
                    queue = int(max(0, (load_ratio - 0.8) * 10000)) if load_ratio > 0.8 else 0

                    if load_ratio > 1.2:
                        status = "DEGRADED"
                        err_rate = min(0.40, (load_ratio - 1.0) * 0.5)
                        lat = base_latency * (1.0 + load_ratio * 2.0)
                        tick_errors += int(current_qps * err_rate)
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
                        queue_depth=queue,
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
            blast_radius = f"Severe blast radius. Killing node '{target_fail_id}' caused cascading failure across dependent tiers with {total_dropped:,} dropped requests."
            rca = (
                f"Root Cause: Node '{target_fail_id}' lacked active-passive automated failover or circuit breakers. "
                "Upstream caller threads stalled on socket timeouts, starving the connection pool."
            )
        elif failure.failure_type == "LATENCY_SPIKE":
            blast_radius = f"Moderate blast radius. 500ms latency spike in '{target_fail_id}' amplified user p99 to {overall_p99:.1f}ms."
            rca = f"Root Cause: Upstream callers lacked aggressive timeout deadlines and hedge requests for '{target_fail_id}'."
        else:
            blast_radius = "Nominal blast radius. System handled traffic progression with standard saturation curve."
            rca = None

        recommendations = [
            "Configure client-side circuit breakers (break circuit when error rate > 20% over 10s)",
            "Introduce Redis read-through caching to decouple compute load from database queries",
            "Set strict upstream timeout deadlines (connect: 50ms, read: 250ms) to prevent thread pool starvation",
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
