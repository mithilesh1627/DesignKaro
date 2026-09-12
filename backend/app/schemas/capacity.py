from pydantic import BaseModel, ConfigDict, Field


class CapacityInput(BaseModel):
    dau: int = Field(..., ge=100, description="Daily Active Users")
    actions_per_user_day: int = Field(default=20, ge=1, description="Average actions per user per day")
    read_write_ratio: float = Field(default=10.0, ge=0.1, description="Ratio of reads to writes (e.g. 10.0 = 10:1)")
    peak_multiplier: float = Field(default=2.0, ge=1.0, le=10.0, description="Multiplier for peak hour traffic")
    avg_write_payload_kb: float = Field(default=2.0, ge=0.01, description="Average size of a write payload in KB")
    avg_read_payload_kb: float = Field(default=10.0, ge=0.01, description="Average size of a read payload in KB")
    storage_duration_years: int = Field(default=5, ge=1, le=20, description="Storage retention duration in years")
    replication_factor: int = Field(default=3, ge=1, le=5, description="Number of database replicas")
    cache_hot_ratio: float = Field(default=0.20, ge=0.01, le=1.0, description="Fraction of daily data stored in cache (80/20 rule)")
    server_qps_capacity: int = Field(default=2000, ge=100, description="Requests per second handled by a single app server instance")


class DerivationStep(BaseModel):
    step_number: int
    metric_name: str
    formula: str
    calculation: str
    result_str: str
    notes: str


class CapacityResponse(BaseModel):
    # QPS Metrics
    avg_total_qps: float
    peak_total_qps: float
    avg_write_qps: float
    peak_write_qps: float
    avg_read_qps: float
    peak_read_qps: float

    # Bandwidth Metrics
    ingress_bandwidth_mb_per_sec: float
    ingress_bandwidth_gbps: float
    egress_bandwidth_mb_per_sec: float
    egress_bandwidth_gbps: float

    # Storage Metrics
    daily_storage_raw_gb: float
    daily_storage_replicated_gb: float
    storage_1_year_tb: float
    storage_3_years_tb: float
    storage_5_years_tb: float
    total_retention_storage_tb: float

    # Cache & Compute Sizing
    recommended_cache_ram_gb: float
    recommended_cache_nodes: int
    min_app_servers_peak: int
    min_app_servers_ha: int

    # Step-by-step mathematical derivations
    derivation_steps: list[DerivationStep]
    markdown_report: str

    model_config = ConfigDict(from_attributes=True)
