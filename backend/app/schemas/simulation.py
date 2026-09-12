from pydantic import BaseModel, ConfigDict, Field


class TrafficProfile(BaseModel):
    base_qps: int = Field(default=5000, ge=100)
    peak_qps: int = Field(default=25000, ge=100)
    duration_sec: int = Field(default=30, ge=5, le=120)
    step_sec: int = Field(default=2, ge=1, le=10)


class FailureConfig(BaseModel):
    failure_type: str = Field(default="NONE", pattern="^(NONE|KILL_NODE|LATENCY_SPIKE|PACKET_LOSS|SPLIT_BRAIN)$")
    target_node_id: str | None = None
    start_second: int = Field(default=10, ge=0)
    duration_second: int = Field(default=10, ge=1)


class NodeTickMetric(BaseModel):
    node_id: str
    node_type: str
    cpu_percent: float
    memory_percent: float
    queue_depth: int
    error_rate: float
    latency_p99_ms: float
    status: str  # HEALTHY, DEGRADED, CRASHED


class SimulationTick(BaseModel):
    second: int
    qps: int
    total_errors: int
    p99_latency_ms: float
    system_status: str
    node_metrics: list[NodeTickMetric]


class SimulationResponse(BaseModel):
    simulation_id: str
    total_requests_simulated: int
    dropped_requests: int
    peak_observed_qps: int
    overall_p99_latency_ms: float
    blast_radius_summary: str
    incident_rca: str | None = None
    ticks: list[SimulationTick]
    recommendations: list[str]

    model_config = ConfigDict(from_attributes=True)
