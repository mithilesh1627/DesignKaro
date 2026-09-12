import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class NodePropertySchema(BaseModel):
    replicas: int = Field(default=1, ge=1)
    qps_capacity: int = Field(default=10000, ge=0)
    memory_gb: float = Field(default=8.0, ge=0.0)
    storage_gb: float = Field(default=100.0, ge=0.0)
    latency_ms: float = Field(default=1.0, ge=0.0)
    failover_mode: str = Field(default="active-passive")
    custom: dict[str, Any] = Field(default_factory=dict)


class CanvasNodeData(BaseModel):
    id: str
    type: str  # client, gateway, load_balancer, service, cache, relational_db, nosql_db, queue, storage, cdn, search, ml
    label: str
    position: dict[str, float] = Field(default_factory=lambda: {"x": 100.0, "y": 100.0})
    properties: NodePropertySchema = Field(default_factory=NodePropertySchema)


class CanvasEdgeData(BaseModel):
    id: str
    source: str
    target: str
    label: str | None = None
    animated: bool = True
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphData(BaseModel):
    nodes: list[CanvasNodeData] = Field(default_factory=list)
    edges: list[CanvasEdgeData] = Field(default_factory=list)


class DesignCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    is_public: bool = False
    scale_metadata: dict[str, Any] = Field(default_factory=dict)
    graph_data: GraphData = Field(default_factory=GraphData)


class DesignUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_public: bool | None = None
    scale_metadata: dict[str, Any] | None = None
    graph_data: GraphData | None = None
    notes: str | None = None


class DesignSummary(BaseModel):
    id: uuid.UUID
    public_id: str
    title: str
    description: str | None
    is_public: bool
    scale_metadata: dict[str, Any]
    latest_version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DesignDetail(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    public_id: str
    title: str
    description: str | None
    is_public: bool
    scale_metadata: dict[str, Any]
    version_number: int
    graph_data: GraphData
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RuleViolation(BaseModel):
    rule_id: str
    rule_name: str
    severity: str  # error, warning, optimization
    node_ids: list[str] = Field(default_factory=list)
    message: str
    remediation: str


class ValidationResponse(BaseModel):
    health_score: int = Field(..., ge=0, le=100)
    status: str  # PASS, NEEDS_IMPROVEMENT, CRITICAL_ISSUES
    violations: list[RuleViolation]
    passed_rules: list[str]
    summary: str
    component_counts: dict[str, int]
