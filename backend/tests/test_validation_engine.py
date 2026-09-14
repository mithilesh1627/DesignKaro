import pytest
from backend.app.schemas.design import CanvasEdgeData, CanvasNodeData, GraphData, NodePropertySchema
from backend.app.services.validation_engine import rule_engine


def test_empty_graph_validation():
    graph = GraphData(nodes=[], edges=[])
    result = rule_engine.evaluate(graph)
    assert result.health_score == 0
    assert result.status == "CRITICAL_ISSUES"
    assert any(v.rule_id == "RULE-000" for v in result.violations)


def test_single_point_of_failure_detection():
    # Single PostgreSQL node with replicas = 1
    graph = GraphData(
        nodes=[
            CanvasNodeData(
                id="client-1",
                type="client",
                label="Clients",
            ),
            CanvasNodeData(
                id="gateway-1",
                type="gateway",
                label="API Gateway",
            ),
            CanvasNodeData(
                id="service-1",
                type="service",
                label="Core Service",
            ),
            CanvasNodeData(
                id="db-1",
                type="relational_db",
                label="Primary PostgreSQL",
                properties=NodePropertySchema(replicas=1),
            ),
        ],
        edges=[
            CanvasEdgeData(id="e1", source="client-1", target="gateway-1"),
            CanvasEdgeData(id="e2", source="gateway-1", target="service-1"),
            CanvasEdgeData(id="e3", source="service-1", target="db-1"),
        ],
    )

    result = rule_engine.evaluate(graph)
    assert any(v.rule_id == "RULE-001" for v in result.violations)
    rule_001_violation = [v for v in result.violations if v.rule_id == "RULE-001"][0]
    assert "db-1" in rule_001_violation.node_ids


def test_missing_load_balancer_detection():
    # Client directly calling service
    graph = GraphData(
        nodes=[
            CanvasNodeData(id="client-1", type="client", label="Clients"),
            CanvasNodeData(id="service-1", type="service", label="Order Service"),
            CanvasNodeData(
                id="db-1",
                type="relational_db",
                label="Postgres HA",
                properties=NodePropertySchema(replicas=2),
            ),
        ],
        edges=[
            CanvasEdgeData(id="e1", source="client-1", target="service-1"),
            CanvasEdgeData(id="e2", source="service-1", target="db-1"),
        ],
    )

    result = rule_engine.evaluate(graph)
    assert any(v.rule_id == "RULE-002" for v in result.violations)


def test_unbounded_queue_detection():
    # Queue with no consumer
    graph = GraphData(
        nodes=[
            CanvasNodeData(id="client-1", type="client", label="Clients"),
            CanvasNodeData(id="gateway-1", type="gateway", label="Gateway"),
            CanvasNodeData(id="service-1", type="service", label="Ingest Service"),
            CanvasNodeData(id="queue-1", type="queue", label="Kafka Events"),
            CanvasNodeData(
                id="db-1",
                type="relational_db",
                label="Postgres HA",
                properties=NodePropertySchema(replicas=2),
            ),
        ],
        edges=[
            CanvasEdgeData(id="e1", source="client-1", target="gateway-1"),
            CanvasEdgeData(id="e2", source="gateway-1", target="service-1"),
            CanvasEdgeData(id="e3", source="service-1", target="queue-1"),
            CanvasEdgeData(id="e4", source="service-1", target="db-1"),
        ],
    )

    result = rule_engine.evaluate(graph)
    assert any(v.rule_id == "RULE-004" for v in result.violations)


def test_production_grade_topology_pass():
    # Clean topology with CDN, Gateway, HA App Services, Redis Cache, HA DB, and consumed Queue
    graph = GraphData(
        nodes=[
            CanvasNodeData(id="client-1", type="client", label="Mobile/Web Clients"),
            CanvasNodeData(id="cdn-1", type="cdn", label="Cloudflare CDN"),
            CanvasNodeData(id="gateway-1", type="gateway", label="Kong API Gateway"),
            CanvasNodeData(id="service-1", type="service", label="API Service (3 pods)", properties=NodePropertySchema(replicas=3)),
            CanvasNodeData(id="cache-1", type="cache", label="Redis Cluster", properties=NodePropertySchema(replicas=3)),
            CanvasNodeData(id="db-1", type="relational_db", label="Postgres Primary/Replica", properties=NodePropertySchema(replicas=2)),
            CanvasNodeData(id="queue-1", type="queue", label="Kafka Topics"),
            CanvasNodeData(id="worker-1", type="service", label="Async Worker Pool", properties=NodePropertySchema(replicas=4)),
        ],
        edges=[
            CanvasEdgeData(id="e1", source="client-1", target="cdn-1"),
            CanvasEdgeData(id="e2", source="cdn-1", target="gateway-1"),
            CanvasEdgeData(id="e3", source="gateway-1", target="service-1"),
            CanvasEdgeData(id="e4", source="service-1", target="cache-1"),
            CanvasEdgeData(id="e5", source="service-1", target="db-1"),
            CanvasEdgeData(id="e6", source="service-1", target="queue-1"),
            CanvasEdgeData(id="e7", source="queue-1", target="worker-1"),
            CanvasEdgeData(id="e8", source="worker-1", target="db-1"),
        ],
    )

    result = rule_engine.evaluate(graph)
    assert result.health_score >= 85
    assert result.status == "PASS"
    assert len(result.violations) == 0
    assert "DATABASE_HIGH_AVAILABILITY" in result.passed_rules
    assert "INGRESS_PROPERLY_GATED" in result.passed_rules
    assert "MESSAGE_QUEUE_CONSUMERS_ATTACHED" in result.passed_rules


@pytest.mark.asyncio
async def test_designs_api_lifecycle(client):
    # 1. Login
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "demo@designkaro.io", "password": "Password123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. List designs (public seed design should be visible)
    list_res = await client.get("/api/v1/designs", headers=headers)
    assert list_res.status_code == 200
    designs = list_res.json()
    assert len(designs) >= 1

    # 3. Create a design
    create_payload = {
        "title": "URL Shortener Distributed Architecture",
        "description": "Base62 KGS with Redis Cache-aside and ScyllaDB",
        "is_public": True,
        "scale_metadata": {"read_qps": 25000, "write_qps": 500},
        "graph_data": {
            "nodes": [
                {"id": "c1", "type": "client", "label": "Web App", "position": {"x": 100, "y": 100}, "properties": {"replicas": 1}},
                {"id": "gw1", "type": "gateway", "label": "Cloudflare + Envoy", "position": {"x": 300, "y": 100}, "properties": {"replicas": 2}},
                {"id": "s1", "type": "service", "label": "Redirect Pods", "position": {"x": 500, "y": 100}, "properties": {"replicas": 3}},
                {"id": "cache1", "type": "cache", "label": "Redis LRU", "position": {"x": 700, "y": 50}, "properties": {"replicas": 2}},
                {"id": "db1", "type": "nosql_db", "label": "ScyllaDB Cluster", "position": {"x": 700, "y": 200}, "properties": {"replicas": 3}},
            ],
            "edges": [
                {"id": "e1", "source": "c1", "target": "gw1"},
                {"id": "e2", "source": "gw1", "target": "s1"},
                {"id": "e3", "source": "s1", "target": "cache1"},
                {"id": "e4", "source": "s1", "target": "db1"},
            ],
        },
    }
    create_res = await client.post("/api/v1/designs", headers=headers, json=create_payload)
    assert create_res.status_code == 201
    created_design = create_res.json()
    design_id = created_design["id"]
    assert created_design["title"] == "URL Shortener Distributed Architecture"

    # 4. Get design
    get_res = await client.get(f"/api/v1/designs/{design_id}", headers=headers)
    assert get_res.status_code == 200
    assert len(get_res.json()["graph_data"]["nodes"]) == 5

    # 5. Validate design endpoint
    val_res = await client.post(f"/api/v1/designs/{design_id}/validate", headers=headers)
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["status"] == "PASS"
    assert val_data["health_score"] >= 85


def test_direct_client_database_access_rule_005():
    graph = GraphData(
        nodes=[
            CanvasNodeData(id="client-1", type="client", label="Client"),
            CanvasNodeData(id="db-1", type="relational_db", label="Postgres", properties=NodePropertySchema(replicas=2)),
        ],
        edges=[CanvasEdgeData(id="e1", source="client-1", target="db-1")],
    )
    res = rule_engine.evaluate(graph)
    assert any(v.rule_id == "RULE-005" for v in res.violations)


def test_cyclic_dependency_rule_007():
    graph = GraphData(
        nodes=[
            CanvasNodeData(id="client-1", type="client", label="Client"),
            CanvasNodeData(id="gw-1", type="gateway", label="Gateway"),
            CanvasNodeData(id="svc-a", type="service", label="Service A"),
            CanvasNodeData(id="svc-b", type="service", label="Service B"),
            CanvasNodeData(id="db-1", type="relational_db", label="Postgres", properties=NodePropertySchema(replicas=2)),
        ],
        edges=[
            CanvasEdgeData(id="e1", source="client-1", target="gw-1"),
            CanvasEdgeData(id="e2", source="gw-1", target="svc-a"),
            CanvasEdgeData(id="e3", source="svc-a", target="svc-b"),
            CanvasEdgeData(id="e4", source="svc-b", target="svc-a"),  # Cycle!
            CanvasEdgeData(id="e5", source="svc-a", target="db-1"),
        ],
    )
    res = rule_engine.evaluate(graph)
    assert any(v.rule_id == "RULE-007" for v in res.violations)


def test_database_bottleneck_rule_010():
    # 4 services all pointing to a single DB
    graph = GraphData(
        nodes=[
            CanvasNodeData(id="client-1", type="client", label="Client"),
            CanvasNodeData(id="gw-1", type="gateway", label="Gateway"),
            CanvasNodeData(id="s1", type="service", label="S1"),
            CanvasNodeData(id="s2", type="service", label="S2"),
            CanvasNodeData(id="s3", type="service", label="S3"),
            CanvasNodeData(id="s4", type="service", label="S4"),
            CanvasNodeData(id="db-1", type="relational_db", label="Postgres", properties=NodePropertySchema(replicas=2)),
        ],
        edges=[
            CanvasEdgeData(id="e0", source="client-1", target="gw-1"),
            CanvasEdgeData(id="e1", source="gw-1", target="s1"),
            CanvasEdgeData(id="e2", source="s1", target="db-1"),
            CanvasEdgeData(id="e3", source="s2", target="db-1"),
            CanvasEdgeData(id="e4", source="s3", target="db-1"),
            CanvasEdgeData(id="e5", source="s4", target="db-1"),
        ],
    )
    res = rule_engine.evaluate(graph)
    assert any(v.rule_id == "RULE-010" for v in res.violations)


def test_synchronous_chain_too_deep_rule_011():
    # Chain: S1 -> S2 -> S3 -> S4 (depth = 3)
    graph = GraphData(
        nodes=[
            CanvasNodeData(id="client-1", type="client", label="Client"),
            CanvasNodeData(id="gw-1", type="gateway", label="Gateway"),
            CanvasNodeData(id="s1", type="service", label="S1"),
            CanvasNodeData(id="s2", type="service", label="S2"),
            CanvasNodeData(id="s3", type="service", label="S3"),
            CanvasNodeData(id="s4", type="service", label="S4"),
            CanvasNodeData(id="db-1", type="relational_db", label="Postgres", properties=NodePropertySchema(replicas=2)),
        ],
        edges=[
            CanvasEdgeData(id="e0", source="client-1", target="gw-1"),
            CanvasEdgeData(id="e1", source="gw-1", target="s1"),
            CanvasEdgeData(id="e2", source="s1", target="s2"),
            CanvasEdgeData(id="e3", source="s2", target="s3"),
            CanvasEdgeData(id="e4", source="s3", target="s4"),
            CanvasEdgeData(id="e5", source="s4", target="db-1"),
        ],
    )
    res = rule_engine.evaluate(graph)
    assert any(v.rule_id == "RULE-011" for v in res.violations)


def test_high_burst_without_async_buffer_rule_012():
    graph = GraphData(
        nodes=[
            CanvasNodeData(id="client-1", type="client", label="Client"),
            CanvasNodeData(id="gw-1", type="gateway", label="Gateway"),
            CanvasNodeData(id="s1", type="service", label="S1"),
            CanvasNodeData(id="db-1", type="relational_db", label="Postgres", properties=NodePropertySchema(replicas=2)),
        ],
        edges=[
            CanvasEdgeData(id="e0", source="client-1", target="gw-1"),
            CanvasEdgeData(id="e1", source="gw-1", target="s1"),
            CanvasEdgeData(id="e2", source="s1", target="db-1"),
        ],
    )
    res = rule_engine.evaluate(graph, scale_metadata={"write_qps": 15000})
    assert any(v.rule_id == "RULE-012" for v in res.violations)


def test_client_to_cache_rule_013():
    graph = GraphData(
        nodes=[
            CanvasNodeData(id="client-1", type="client", label="Client"),
            CanvasNodeData(id="cache-1", type="cache", label="Redis Cache"),
            CanvasNodeData(id="db-1", type="relational_db", label="Postgres", properties=NodePropertySchema(replicas=2)),
        ],
        edges=[CanvasEdgeData(id="e1", source="client-1", target="cache-1")],
    )
    res = rule_engine.evaluate(graph)
    assert any(v.rule_id == "RULE-013" for v in res.violations)
    assert any(v.category == "topology" for v in res.violations)


def test_service_capacity_bottleneck_rule_015():
    # 10,000 QPS hitting service with only 1 pod * 1,000 QPS = 1,000 capacity
    graph = GraphData(
        nodes=[
            CanvasNodeData(id="client-1", type="client", label="Client"),
            CanvasNodeData(id="gw-1", type="gateway", label="Gateway"),
            CanvasNodeData(id="s1", type="service", label="Order Pod", properties=NodePropertySchema(replicas=1, qps_capacity=1000)),
            CanvasNodeData(id="db-1", type="relational_db", label="Postgres", properties=NodePropertySchema(replicas=2)),
        ],
        edges=[
            CanvasEdgeData(id="e0", source="client-1", target="gw-1"),
            CanvasEdgeData(id="e1", source="gw-1", target="s1"),
            CanvasEdgeData(id="e2", source="s1", target="db-1"),
        ],
    )
    res = rule_engine.evaluate(graph, scale_metadata={"peak_qps": 10000})
    assert any(v.rule_id == "RULE-015" for v in res.violations)
    assert any(v.category == "capacity" for v in res.violations)


def test_cache_inconsistency_write_bypass_rule_020():
    # Service writes to DB with write_path edge but does not update cache
    graph = GraphData(
        nodes=[
            CanvasNodeData(id="client-1", type="client", label="Client"),
            CanvasNodeData(id="gw-1", type="gateway", label="Gateway"),
            CanvasNodeData(id="s1", type="service", label="Writer Service", properties=NodePropertySchema(replicas=2)),
            CanvasNodeData(id="cache-1", type="cache", label="Redis Cache", properties=NodePropertySchema(replicas=2)),
            CanvasNodeData(id="db-1", type="relational_db", label="Postgres", properties=NodePropertySchema(replicas=2)),
        ],
        edges=[
            CanvasEdgeData(id="e0", source="client-1", target="gw-1"),
            CanvasEdgeData(id="e1", source="gw-1", target="s1"),
            CanvasEdgeData(id="e2", source="s1", target="db-1", properties={"connectionType": "write_path"}),
        ],
    )
    res = rule_engine.evaluate(graph)
    assert any(v.rule_id == "RULE-020" for v in res.violations)
    assert any(v.category == "consistency" for v in res.violations)


def test_cost_estimation_breakdown():
    graph = GraphData(
        nodes=[
            CanvasNodeData(id="gw-1", type="gateway", label="Gateway", properties=NodePropertySchema(replicas=2)),
            CanvasNodeData(id="s1", type="service", label="Service", properties=NodePropertySchema(replicas=3)),
            CanvasNodeData(id="cache-1", type="cache", label="Redis", properties=NodePropertySchema(replicas=2)),
            CanvasNodeData(id="db-1", type="relational_db", label="Postgres", properties=NodePropertySchema(replicas=2)),
        ],
        edges=[],
    )
    res = rule_engine.evaluate(graph)
    # Expected: GW (2*30=60) + Svc (3*40=120) + Cache (2*60=120) + DB (2*120=240) = 540
    assert res.estimated_monthly_cost == 540.0
    assert res.cost_breakdown["compute"] == 120.0
    assert res.cost_breakdown["database"] == 240.0
    assert res.cost_breakdown["cache"] == 120.0
    assert res.cost_breakdown["networking"] == 60.0


