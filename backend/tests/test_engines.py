import pytest
from backend.app.schemas.design import CanvasEdgeData, CanvasNodeData, GraphData, NodePropertySchema
from backend.app.schemas.review import ArchitectureReviewRequest
from backend.app.schemas.simulation import FailureConfig, TrafficProfile
from backend.app.services.interview_engine import interview_engine
from backend.app.services.review_engine import review_engine
from backend.app.services.simulation_engine import traffic_simulator


@pytest.fixture
def sample_graph():
    return GraphData(
        nodes=[
            CanvasNodeData(id="c1", type="client", label="Clients"),
            CanvasNodeData(id="gw1", type="gateway", label="API Gateway", properties=NodePropertySchema(replicas=2)),
            CanvasNodeData(id="s1", type="service", label="Order Service", properties=NodePropertySchema(replicas=4)),
            CanvasNodeData(id="cache1", type="cache", label="Redis Cache", properties=NodePropertySchema(replicas=2)),
            CanvasNodeData(id="db1", type="relational_db", label="Postgres HA", properties=NodePropertySchema(replicas=2)),
            CanvasNodeData(id="q1", type="queue", label="Kafka Events"),
            CanvasNodeData(id="w1", type="service", label="Worker Pods", properties=NodePropertySchema(replicas=2)),
        ],
        edges=[
            CanvasEdgeData(id="e1", source="c1", target="gw1"),
            CanvasEdgeData(id="e2", source="gw1", target="s1"),
            CanvasEdgeData(id="e3", source="s1", target="cache1"),
            CanvasEdgeData(id="e4", source="s1", target="db1"),
            CanvasEdgeData(id="e5", source="s1", target="q1"),
            CanvasEdgeData(id="e6", source="q1", target="w1"),
            CanvasEdgeData(id="e7", source="w1", target="db1"),
        ],
    )


def test_review_engine_9_dimensions(sample_graph):
    req = ArchitectureReviewRequest(
        title="Production E-Commerce System",
        graph_data=sample_graph,
        scale_metadata={"read_qps": 20000},
    )
    res = review_engine.evaluate_architecture(req)
    assert res.overall_score >= 80
    assert len(res.radar_scores) == 9
    assert res.grade in ("Staff-Ready", "Senior-Ready")
    assert len(res.strengths) >= 1
    assert len(res.actionable_remediation_plan) >= 1


def test_interview_engine_5_stage_flow():
    from backend.app.schemas.interview import InterviewStartRequest, InterviewTurnRequest

    # Stage 1: Start
    start_req = InterviewStartRequest(interview_slug="url-shortener-tinyurl", target_role="Staff Systems Architect")
    start_res = interview_engine.start_interview(start_req)
    assert start_res.current_stage == 1
    session_id = start_res.session_id

    # Stage 1 Turn
    turn_1 = interview_engine.process_turn(
        session_id,
        InterviewTurnRequest(message="We need URL shortening with 7 chars, HTTP 301/302 redirects, and 99.99% availability.", current_stage=1),
    )
    assert turn_1.current_stage == 2
    assert "Capacity" in turn_1.stage_name

    # Stage 2 Turn
    turn_2 = interview_engine.process_turn(
        session_id,
        InterviewTurnRequest(message="At 50M DAU with 10 hits/day, that is 5,800 average QPS and peak 12,000 QPS.", current_stage=2),
    )
    assert turn_2.current_stage == 3

    # Finish
    finish_res = interview_engine.finish_interview(session_id)
    assert finish_res.hiring_decision == "Strong Hire"
    assert finish_res.overall_score >= 90
    assert len(finish_res.dimension_scores) == 5


def test_traffic_simulation_and_chaos(sample_graph):
    traffic = TrafficProfile(base_qps=2000, peak_qps=10000, duration_sec=10, step_sec=2)
    failure = FailureConfig(failure_type="KILL_NODE", target_node_id="db1", start_second=4, duration_second=4)

    sim_res = traffic_simulator.run_simulation(sample_graph, traffic, failure)
    assert sim_res.total_requests_simulated > 0
    assert len(sim_res.ticks) == 5
    assert sim_res.dropped_requests > 0
    assert "blast radius" in sim_res.blast_radius_summary.lower()
    assert sim_res.incident_rca is not None


@pytest.mark.asyncio
async def test_review_api_endpoint(client, sample_graph):
    payload = {
        "title": "API Review Test",
        "graph_data": sample_graph.model_dump(),
        "scale_metadata": {"read_qps": 10000},
    }
    response = await client.post("/api/v1/review/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["radar_scores"]) == 9
    assert "grade" in data


@pytest.mark.asyncio
async def test_simulation_api_endpoint(client, sample_graph):
    payload = {
        "graph_data": sample_graph.model_dump(),
        "traffic": {"base_qps": 1000, "peak_qps": 5000, "duration_sec": 6, "step_sec": 2},
        "failure": {"failure_type": "NONE"},
    }
    response = await client.post("/api/v1/simulations/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "ticks" in data
    assert len(data["ticks"]) == 3
