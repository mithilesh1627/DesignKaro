import uuid
from typing import Annotated

from backend.app.core.database import get_db
from backend.app.models.design import Design
from backend.app.schemas.diff import (
    ArchitectureDiffResponse,
    EdgeDiff,
    NodeDiff,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

router = APIRouter()


@router.get("/{id_or_public_id}/diff", response_model=ArchitectureDiffResponse)
async def diff_architecture_versions(
    id_or_public_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    v1: int = Query(default=1, ge=1, description="Base version number"),
    v2: int = Query(default=2, ge=1, description="Target version number"),
) -> ArchitectureDiffResponse:
    """Compute deep architectural diff between two design versions."""
    try:
        d_uuid = uuid.UUID(id_or_public_id)
        stmt = select(Design).where(Design.id == d_uuid).options(selectinload(Design.versions))
    except ValueError:
        stmt = select(Design).where(Design.public_id == id_or_public_id).options(selectinload(Design.versions))

    result = await db.execute(stmt)
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Design '{id_or_public_id}' not found",
        )

    version_map = {v.version_number: v for v in design.versions}
    base_v = version_map.get(v1)
    target_v = version_map.get(v2)

    # If target doesn't exist, fallback gracefully using base or empty
    base_graph = base_v.graph_data if base_v else {"nodes": [], "edges": []}
    target_graph = target_v.graph_data if target_v else base_graph

    base_nodes = {n["id"]: n for n in base_graph.get("nodes", [])}
    target_nodes = {n["id"]: n for n in target_graph.get("nodes", [])}

    added_nodes = []
    removed_nodes = []
    modified_nodes = []

    for nid, node in target_nodes.items():
        if nid not in base_nodes:
            added_nodes.append(
                NodeDiff(
                    id=nid,
                    type=node.get("type", "service"),
                    label=node.get("label", nid),
                    change_type="ADDED",
                )
            )
        else:
            base_n = base_nodes[nid]
            deltas = {}
            p_base = base_n.get("properties", {})
            p_target = node.get("properties", {})
            for pk in set(p_base.keys()) | set(p_target.keys()):
                if p_base.get(pk) != p_target.get(pk):
                    deltas[pk] = {"old": p_base.get(pk), "new": p_target.get(pk)}

            if deltas:
                modified_nodes.append(
                    NodeDiff(
                        id=nid,
                        type=node.get("type", "service"),
                        label=node.get("label", nid),
                        change_type="MODIFIED",
                        property_deltas=deltas,
                    )
                )

    for nid, node in base_nodes.items():
        if nid not in target_nodes:
            removed_nodes.append(
                NodeDiff(
                    id=nid,
                    type=node.get("type", "service"),
                    label=node.get("label", nid),
                    change_type="REMOVED",
                )
            )

    # Edge diff
    base_edges = {f"{e.get('source')}->{e.get('target')}": e for e in base_graph.get("edges", [])}
    target_edges = {f"{e.get('source')}->{e.get('target')}": e for e in target_graph.get("edges", [])}

    added_edges = []
    removed_edges = []

    for ek, edge in target_edges.items():
        if ek not in base_edges:
            added_edges.append(
                EdgeDiff(
                    id=edge.get("id", ek),
                    source=edge.get("source", ""),
                    target=edge.get("target", ""),
                    change_type="ADDED",
                )
            )

    for ek, edge in base_edges.items():
        if ek not in target_edges:
            removed_edges.append(
                EdgeDiff(
                    id=edge.get("id", ek),
                    source=edge.get("source", ""),
                    target=edge.get("target", ""),
                    change_type="REMOVED",
                )
            )

    # Estimate impact
    latency_delta = -12.5 if any(n.type == "cache" for n in added_nodes) else 0.0
    cost_delta = (len(added_nodes) - len(removed_nodes)) * 45.0  # Approx $45/instance/month

    summary = (
        f"Compared v{v1} to v{v2}: Added {len(added_nodes)} node(s), removed {len(removed_nodes)}, "
        f"modified {len(modified_nodes)}. Latency impact estimated at {latency_delta}ms."
    )

    return ArchitectureDiffResponse(
        design_id=str(design.id),
        base_version=v1,
        target_version=v2,
        added_nodes=added_nodes,
        removed_nodes=removed_nodes,
        modified_nodes=modified_nodes,
        added_edges=added_edges,
        removed_edges=removed_edges,
        summary=summary,
        estimated_latency_delta_ms=latency_delta,
        estimated_cost_delta_usd=cost_delta,
    )
