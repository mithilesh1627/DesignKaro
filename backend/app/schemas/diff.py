from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class NodeDiff(BaseModel):
    id: str
    type: str
    label: str
    change_type: str  # ADDED, REMOVED, MODIFIED
    property_deltas: dict[str, Any] = Field(default_factory=dict)


class EdgeDiff(BaseModel):
    id: str
    source: str
    target: str
    change_type: str  # ADDED, REMOVED


class ArchitectureDiffResponse(BaseModel):
    design_id: str
    base_version: int
    target_version: int
    added_nodes: list[NodeDiff]
    removed_nodes: list[NodeDiff]
    modified_nodes: list[NodeDiff]
    added_edges: list[EdgeDiff]
    removed_edges: list[EdgeDiff]
    summary: str
    estimated_latency_delta_ms: float
    estimated_cost_delta_usd: float

    model_config = ConfigDict(from_attributes=True)
