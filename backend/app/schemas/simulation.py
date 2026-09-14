from pydantic import BaseModel, ConfigDict, Field


class TrafficProfile(BaseModel):
    base_qps: int = Field(default=5000, ge=100)
    peak_qps: int = Field(default=25000, ge=100)
    duration_sec: int = Field(default=30, ge=5, le=120)
    step_sec: int = Field(default=2, ge=1, le=10)
    # Phase 5 Controls
    concurrent_users: int = Field(default=50000, ge=1)
    read_ratio: float = Field(default=0.8, ge=0.0, le=1.0)
    payload_kb: float = Field(default=10.0, ge=0.1)
    cache_hit_ratio: float = Field(default=0.85, ge=0.0, le=1.0)
    network_latency_ms: float = Field(default=15.0, ge=0.0)


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
    throughput_qps: float = 0.0
    utilization_percent: float = 0.0
    is_bottleneck: bool = False


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

    # Phase 5 Aggregated Estimated Simulation Metrics
    disclaimer: str = "Estimated Simulation"
    throughput_qps: float = 0.0
    p50_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0
    error_rate: float = 0.0
    cpu_utilization: float = 0.0
    memory_utilization: float = 0.0
    database_utilization: float = 0.0
    cache_hit_ratio: float = 0.0
    queue_depth: int = 0

    # Automated Bottleneck Analysis
    bottleneck_node_id: str | None = None
    bottleneck_node_name: str | None = None
    bottleneck_type: str | None = None
    bottleneck_utilization: float = 0.0
    bottleneck_explanation: str | None = None
    ai_bottleneck_explanation: str | None = None
    bottleneck_remediation: str | None = None
    suggested_action: str | None = None

    model_config = ConfigDict(from_attributes=True)
