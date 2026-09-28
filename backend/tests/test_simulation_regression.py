import pytest
from backend.app.schemas.design import CanvasEdgeData, CanvasNodeData, GraphData, NodePropertySchema
from backend.app.schemas.simulation import FailureConfig, TrafficProfile
from backend.app.services.simulation_engine import traffic_simulator


@pytest.fixture
def ecommerce_graph():
    return GraphData(
        nodes=[
            CanvasNodeData(id="client_web", type="client", label="Web Browser Clients", properties=NodePropertySchema(qps_capacity=1000)),
            CanvasNodeData(id="gateway", type="gateway", label="Kong API Gateway", properties=NodePropertySchema(qps_capacity=25000, replicas=2)),
            CanvasNodeData(id="app_server", type="service", label="Order API Service", properties=NodePropertySchema(qps_capacity=5000, replicas=2)),
            CanvasNodeData(id="db_primary", type="relational_db", label="PostgreSQL Primary", properties=NodePropertySchema(qps_capacity=3000, replicas=1)),
        ],
        edges=[
            CanvasEdgeData(id="e1", source="client_web", target="gateway"),
            CanvasEdgeData(id="e2", source="gateway", target="app_server"),
            CanvasEdgeData(id="e3", source="app_server", target="db_primary"),
        ],
    )


def test_extreme_load_latency_is_bounded(ecommerce_graph):
    """Regression test for P1 bug: Extreme simulation load produces absurd latency."""
    # Run extreme traffic of 150,000 peak QPS against low capacity nodes
    traffic = TrafficProfile(
        base_qps=50000,
        peak_qps=150000,
        duration_sec=20,
        step_sec=2,
    )
    res = traffic_simulator.run_simulation(
        graph=ecommerce_graph,
        traffic=traffic,
        failure=FailureConfig(failure_type="NONE"),
    )

    # 1. P99 tail latency must be realistically bounded by timeout ceiling (<= 10,000ms), NOT millions of ms
    assert res.overall_p99_latency_ms <= 10000.0, f"Expected realistic p99 latency <= 10,000ms, got {res.overall_p99_latency_ms}"
    for tick in res.ticks:
        assert tick.p99_latency_ms <= 10000.0, f"Tick {tick.second} latency exceeded ceiling: {tick.p99_latency_ms}"
        for nm in tick.node_metrics:
            assert nm.latency_p99_ms <= 10000.0, f"Node {nm.node_id} latency exceeded ceiling: {nm.latency_p99_ms}"

    # 2. Excess requests are properly dropped due to queue/concurrency saturation
    assert res.dropped_requests > 0
    assert res.error_rate > 0.0


def test_web_client_is_never_identified_as_bottleneck(ecommerce_graph):
    """Regression test for P1 bug: Web Client incorrectly blamed as bottleneck."""
    traffic = TrafficProfile(
        base_qps=20000,
        peak_qps=80000,
        duration_sec=10,
        step_sec=2,
    )
    res = traffic_simulator.run_simulation(
        graph=ecommerce_graph,
        traffic=traffic,
        failure=FailureConfig(failure_type="NONE"),
    )

    # Web Client must NEVER be selected as the bottleneck
    assert res.bottleneck_node_id != "client_web", "Web Client should not be selected as primary bottleneck!"
    assert res.bottleneck_type != "CLIENT"
    # Bottleneck should be a server-side tier (e.g. database or compute service)
    assert res.bottleneck_node_id in ("db_primary", "app_server", "gateway")

    # In tick metrics, client should remain HEALTHY and not be flagged as bottleneck
    for tick in res.ticks:
        client_metric = next((nm for nm in tick.node_metrics if nm.node_id == "client_web"), None)
        assert client_metric is not None
        assert client_metric.is_bottleneck is False
        assert client_metric.status == "HEALTHY"


def test_database_bottleneck_read_heavy_explanation(ecommerce_graph):
    """Verify read-heavy DB saturation provides actionable connection-pool/IOPS explanation and Redis suggestion."""
    traffic = TrafficProfile(
        base_qps=10000,
        peak_qps=50000,
        duration_sec=10,
        step_sec=2,
        read_ratio=0.90,  # 90% read heavy
    )
    res = traffic_simulator.run_simulation(
        graph=ecommerce_graph,
        traffic=traffic,
        failure=FailureConfig(failure_type="NONE"),
    )

    assert res.bottleneck_type in ("DATABASE", "COMPUTE")
    if res.bottleneck_type == "DATABASE":
        assert "connection pool" in res.bottleneck_explanation.lower() or "read" in res.bottleneck_explanation.lower()
        assert "redis" in res.bottleneck_remediation.lower() or "cache" in res.bottleneck_remediation.lower()


def test_database_bottleneck_write_heavy_explanation(ecommerce_graph):
    """Verify write-heavy DB saturation provides actionable write serialization/locking explanation and Kafka suggestion."""
    # Scale compute so DB is guaranteed to be the bottleneck
    ecommerce_graph.nodes[2].properties.replicas = 10
    traffic = TrafficProfile(
        base_qps=10000,
        peak_qps=50000,
        duration_sec=10,
        step_sec=2,
        read_ratio=0.10,  # 90% write heavy
    )
    res = traffic_simulator.run_simulation(
        graph=ecommerce_graph,
        traffic=traffic,
        failure=FailureConfig(failure_type="NONE"),
    )

    assert res.bottleneck_type == "DATABASE"
    assert "write" in res.bottleneck_explanation.lower()
    assert "kafka" in res.bottleneck_remediation.lower() or "queue" in res.bottleneck_remediation.lower()


def test_chaos_failure_propagates_to_direct_and_transitive_callers(ecommerce_graph):
    """Regression test for P1 bug: Fault injection does not propagate failures through dependent nodes.
    
    Topology: Client -> Gateway -> App Server -> Database
    When Database is killed:
    - Database must be CRASHED
    - App Server (1-hop direct caller) must be DEGRADED (stalled thread pool, latency spike)
    - Gateway (2-hop transitive caller) must be DEGRADED (cascaded 502/504 errors)
    - Client remains HEALTHY
    - Blast radius and incident report must capture both direct and transitive callers
    """
    traffic = TrafficProfile(
        base_qps=2000,
        peak_qps=5000,
        duration_sec=10,
        step_sec=2,
    )
    res = traffic_simulator.run_simulation(
        graph=ecommerce_graph,
        traffic=traffic,
        failure=FailureConfig(
            failure_type="KILL_POSTGRES",
            target_node_id="db_primary",
            start_second=2,
            duration_second=6,
        ),
    )

    # Verify failure occurred during active window
    active_ticks = [t for t in res.ticks if 2 <= t.second < 8]
    assert len(active_ticks) > 0

    for tick in active_ticks:
        node_map = {m.node_id: m for m in tick.node_metrics}
        
        # 1. Target node is CRASHED
        assert node_map["db_primary"].status == "CRASHED"
        assert node_map["db_primary"].error_rate == 1.0

        # 2. Direct caller (app_server) is DEGRADED with stalled thread pool
        assert node_map["app_server"].status == "DEGRADED"
        assert node_map["app_server"].error_rate >= 0.40

        # 3. Transitive caller (gateway) is DEGRADED with cascaded errors
        assert node_map["gateway"].status == "DEGRADED"
        assert node_map["gateway"].error_rate >= 0.15

        # 4. Client node remains HEALTHY
        assert node_map["client_web"].status == "HEALTHY"

    # 5. Dynamic Chaos Incident Report accurately reports blast radius
    assert res.chaos_incident_report is not None
    assert "db_primary" in res.chaos_incident_report.failed_node_ids
    assert "app_server" in res.chaos_incident_report.degraded_node_ids
    assert "gateway" in res.chaos_incident_report.degraded_node_ids


def test_chaos_cache_stampede_saturates_database():
    """Verify KILL_REDIS drops cache hit ratio to 0 and stampedes 100% of read traffic to DB."""
    cache_graph = GraphData(
        nodes=[
            CanvasNodeData(id="client", type="client", label="Client", properties=NodePropertySchema(qps_capacity=1000)),
            CanvasNodeData(id="gateway", type="gateway", label="Gateway", properties=NodePropertySchema(qps_capacity=20000, replicas=2)),
            CanvasNodeData(id="server", type="service", label="App Server", properties=NodePropertySchema(qps_capacity=15000, replicas=2)),
            CanvasNodeData(id="cache", type="cache", label="Redis Cache", properties=NodePropertySchema(qps_capacity=20000, replicas=1)),
            CanvasNodeData(id="db", type="relational_db", label="Postgres DB", properties=NodePropertySchema(qps_capacity=2000, replicas=1)),
        ],
        edges=[
            CanvasEdgeData(id="e1", source="client", target="gateway"),
            CanvasEdgeData(id="e2", source="gateway", target="server"),
            CanvasEdgeData(id="e3", source="server", target="cache"),
            CanvasEdgeData(id="e4", source="cache", target="db"),
        ],
    )

    traffic = TrafficProfile(
        base_qps=3000,
        peak_qps=4000,
        duration_sec=10,
        step_sec=2,
        read_ratio=0.90,
        cache_hit_ratio=0.85,
    )

    res = traffic_simulator.run_simulation(
        graph=cache_graph,
        traffic=traffic,
        failure=FailureConfig(
            failure_type="KILL_REDIS",
            target_node_id="cache",
            start_second=2,
            duration_second=6,
        ),
    )

    active_ticks = [t for t in res.ticks if 2 <= t.second < 8]
    assert len(active_ticks) > 0

    for tick in active_ticks:
        node_map = {m.node_id: m for m in tick.node_metrics}
        assert node_map["cache"].status == "CRASHED"
        # DB must receive uncached stampede traffic and degrade under heavy query volume
        assert node_map["db"].status == "DEGRADED"

    assert res.chaos_incident_report is not None
    assert "cache" in res.chaos_incident_report.failed_node_ids
    assert "db" in res.chaos_incident_report.degraded_node_ids


def test_chaos_kafka_starves_downstream_worker():
    """Verify KILL_KAFKA marks downstream worker consumers as DEGRADED (starved pipeline)."""
    kafka_graph = GraphData(
        nodes=[
            CanvasNodeData(id="client", type="client", label="Client", properties=NodePropertySchema(qps_capacity=1000)),
            CanvasNodeData(id="gateway", type="gateway", label="Gateway", properties=NodePropertySchema(qps_capacity=10000, replicas=1)),
            CanvasNodeData(id="server", type="service", label="Producer Service", properties=NodePropertySchema(qps_capacity=10000, replicas=1)),
            CanvasNodeData(id="queue", type="queue", label="Kafka Broker", properties=NodePropertySchema(qps_capacity=10000, replicas=1)),
            CanvasNodeData(id="worker", type="worker", label="Consumer Worker", properties=NodePropertySchema(qps_capacity=5000, replicas=1)),
        ],
        edges=[
            CanvasEdgeData(id="e1", source="client", target="gateway"),
            CanvasEdgeData(id="e2", source="gateway", target="server"),
            CanvasEdgeData(id="e3", source="server", target="queue"),
            CanvasEdgeData(id="e4", source="queue", target="worker"),
        ],
    )

    traffic = TrafficProfile(
        base_qps=1000,
        peak_qps=2000,
        duration_sec=10,
        step_sec=2,
    )

    res = traffic_simulator.run_simulation(
        graph=kafka_graph,
        traffic=traffic,
        failure=FailureConfig(
            failure_type="KILL_KAFKA",
            target_node_id="queue",
            start_second=2,
            duration_second=6,
        ),
    )

    active_ticks = [t for t in res.ticks if 2 <= t.second < 8]
    assert len(active_ticks) > 0

    for tick in active_ticks:
        node_map = {m.node_id: m for m in tick.node_metrics}
        assert node_map["queue"].status == "CRASHED"
        assert node_map["server"].status == "DEGRADED"  # Producer backpressured
        assert node_map["worker"].status == "DEGRADED"  # Consumer starved (delivered_qps = 0)
        assert node_map["worker"].throughput_qps == 0.0

    assert res.chaos_incident_report is not None
    assert "queue" in res.chaos_incident_report.failed_node_ids
    assert "worker" in res.chaos_incident_report.degraded_node_ids


def test_chaos_heal_system_restores_all_nodes(ecommerce_graph):
    """Verify HEAL_SYSTEM restores all components to HEALTHY."""
    traffic = TrafficProfile(
        base_qps=1000,
        peak_qps=2000,
        duration_sec=10,
        step_sec=2,
    )

    res = traffic_simulator.run_simulation(
        graph=ecommerce_graph,
        traffic=traffic,
        failure=FailureConfig(
            failure_type="HEAL_SYSTEM",
        ),
    )

    for tick in res.ticks:
        assert tick.system_status == "HEALTHY"
        for nm in tick.node_metrics:
            assert nm.status == "HEALTHY"

    assert "healed" in res.blast_radius_summary.lower()
    assert res.chaos_incident_report is None


@pytest.mark.asyncio
async def test_simulation_route_aliases_and_canonical_endpoint(ecommerce_graph):
    """Regression test for Sprint 5 Item 1: Route divergence between /simulations and /simulator."""
    from httpx import ASGITransport, AsyncClient
    from backend.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "graph_data": ecommerce_graph.model_dump(),
            "traffic": {"base_qps": 2000, "peak_qps": 5000, "duration_sec": 6, "step_sec": 2},
            "failure": {"failure_type": "NONE"},
        }

        # 1. Canonical endpoint
        res1 = await ac.post("/api/v1/simulations/run", json=payload)
        assert res1.status_code == 200, f"Canonical /simulations/run returned {res1.status_code}"
        data1 = res1.json()
        assert "throughput_qps" in data1
        assert "overall_p99_latency_ms" in data1

        # 2. Alias: /simulations/simulate
        res2 = await ac.post("/api/v1/simulations/simulate", json=payload)
        assert res2.status_code == 200, f"Alias /simulations/simulate returned {res2.status_code}"

        # 3. Alias: /simulator/run
        res3 = await ac.post("/api/v1/simulator/run", json=payload)
        assert res3.status_code == 200, f"Alias /simulator/run returned {res3.status_code}"

        # 4. Alias: /simulator/simulate
        res4 = await ac.post("/api/v1/simulator/simulate", json=payload)
        assert res4.status_code == 200, f"Alias /simulator/simulate returned {res4.status_code}"


def test_zero_and_missing_traffic_profile_never_produce_nan_or_crash(ecommerce_graph):
    """Regression test for Sprint 5 Item 1 / P2 bug 5: Simulation produces NaN with 0/missing QPS."""
    import math

    # Test with base_qps=0, peak_qps=0
    traffic_zero = TrafficProfile(
        base_qps=0,
        peak_qps=0,
        duration_sec=10,
        step_sec=2,
        concurrent_users=0,
    )
    res = traffic_simulator.run_simulation(
        graph=ecommerce_graph,
        traffic=traffic_zero,
        failure=FailureConfig(failure_type="NONE"),
    )

    assert not math.isnan(res.throughput_qps)
    assert not math.isinf(res.throughput_qps)
    assert not math.isnan(res.overall_p99_latency_ms)
    assert not math.isinf(res.overall_p99_latency_ms)
    assert not math.isnan(res.error_rate)
    assert not math.isnan(res.cpu_utilization)
    assert not math.isnan(res.memory_utilization)

    for tick in res.ticks:
        assert not math.isnan(tick.qps)
        assert not math.isnan(tick.p99_latency_ms)
        for nm in tick.node_metrics:
            assert not math.isnan(nm.throughput_qps)
            assert not math.isnan(nm.cpu_percent)
            assert not math.isnan(nm.error_rate)
            assert not math.isnan(nm.latency_p99_ms)


def test_database_read_write_capacity_properties():
    """Regression test for Sprint 5 Item 5: Database configuration read/write capacity."""
    node = CanvasNodeData(
        id="postgres_master",
        type="relational_db",
        label="PostgreSQL Primary",
        properties=NodePropertySchema(
            replicas=3,
            qps_capacity=10000,
            read_capacity=8000,
            write_capacity=2000,
            storage_gb=500.0,
            latency_ms=4.0,
        ),
    )

    dumped = node.model_dump()
    assert dumped["properties"]["read_capacity"] == 8000
    assert dumped["properties"]["write_capacity"] == 2000

    # Validate deserialization back into CanvasNodeData
    rehydrated = CanvasNodeData.model_validate(dumped)
    assert rehydrated.properties.read_capacity == 8000
    assert rehydrated.properties.write_capacity == 2000


