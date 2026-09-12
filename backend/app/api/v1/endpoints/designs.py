import uuid
from typing import Annotated

from backend.app.api.deps import get_current_user, get_current_user_optional
from backend.app.core.database import get_db
from backend.app.models.design import Design, DesignEvaluation, DesignVersion
from backend.app.models.user import User
from backend.app.schemas.design import (
    DesignCreate,
    DesignDetail,
    DesignSummary,
    DesignUpdate,
    GraphData,
    ValidationResponse,
)
from backend.app.services.validation_engine import rule_engine
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

router = APIRouter()


@router.post("/validate", response_model=ValidationResponse)
async def validate_architecture_graph(
    payload: GraphData,
) -> ValidationResponse:
    """Standalone deterministic rule validation of an architecture graph."""
    return rule_engine.evaluate(payload)


@router.get("", response_model=list[DesignSummary])
async def list_designs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
) -> list[DesignSummary]:
    """List designs accessible to the user (their own + public templates)."""
    if current_user:
        stmt = (
            select(Design)
            .where(or_(Design.user_id == current_user.id, Design.is_public.is_(True)))
            .options(selectinload(Design.versions))
            .order_by(Design.updated_at.desc())
        )
    else:
        stmt = (
            select(Design)
            .where(Design.is_public.is_(True))
            .options(selectinload(Design.versions))
            .order_by(Design.updated_at.desc())
        )

    result = await db.execute(stmt)
    designs = list(result.scalars().all())

    summaries = []
    for d in designs:
        latest_v = max([v.version_number for v in d.versions], default=1)
        summaries.append(
            DesignSummary(
                id=d.id,
                public_id=d.public_id,
                title=d.title,
                description=d.description,
                is_public=d.is_public,
                scale_metadata=d.scale_metadata or {},
                latest_version=latest_v,
                created_at=d.created_at,
                updated_at=d.updated_at,
            )
        )
    return summaries


@router.post("", response_model=DesignDetail, status_code=status.HTTP_201_CREATED)
async def create_design(
    payload: DesignCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DesignDetail:
    """Create a new architecture canvas design with initial version."""
    public_id = f"design-{uuid.uuid4().hex[:12]}"
    design = Design(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        public_id=public_id,
        is_public=payload.is_public,
        scale_metadata=payload.scale_metadata,
    )
    db.add(design)
    await db.flush()

    version = DesignVersion(
        design_id=design.id,
        version_number=1,
        graph_data=payload.graph_data.model_dump(),
        notes="Initial version",
    )
    db.add(version)
    await db.commit()
    await db.refresh(design)

    return DesignDetail(
        id=design.id,
        user_id=design.user_id,
        public_id=design.public_id,
        title=design.title,
        description=design.description,
        is_public=design.is_public,
        scale_metadata=design.scale_metadata,
        version_number=1,
        graph_data=payload.graph_data,
        created_at=design.created_at,
        updated_at=design.updated_at,
    )


@router.get("/{id_or_public_id}", response_model=DesignDetail)
async def get_design(
    id_or_public_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
) -> DesignDetail:
    """Fetch architecture design and latest version graph data."""
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

    # Permission check: must be public or owner
    if not design.is_public:
        if not current_user or current_user.id != design.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this private design",
            )

    latest_version = max(design.versions, key=lambda v: v.version_number, default=None)
    raw_graph = latest_version.graph_data if latest_version else {"nodes": [], "edges": []}
    graph = GraphData(**raw_graph)

    return DesignDetail(
        id=design.id,
        user_id=design.user_id,
        public_id=design.public_id,
        title=design.title,
        description=design.description,
        is_public=design.is_public,
        scale_metadata=design.scale_metadata or {},
        version_number=latest_version.version_number if latest_version else 1,
        graph_data=graph,
        created_at=design.created_at,
        updated_at=design.updated_at,
    )


@router.put("/{id_or_public_id}", response_model=DesignDetail)
async def update_design(
    id_or_public_id: str,
    payload: DesignUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DesignDetail:
    """Save canvas state by updating metadata and appending a new version."""
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

    if design.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot edit designs owned by another user",
        )

    if payload.title is not None:
        design.title = payload.title
    if payload.description is not None:
        design.description = payload.description
    if payload.is_public is not None:
        design.is_public = payload.is_public
    if payload.scale_metadata is not None:
        design.scale_metadata = payload.scale_metadata

    latest_v_num = max([v.version_number for v in design.versions], default=0)
    new_v_num = latest_v_num + 1

    graph_data = payload.graph_data or GraphData(nodes=[], edges=[])

    new_version = DesignVersion(
        design_id=design.id,
        version_number=new_v_num,
        graph_data=graph_data.model_dump(),
        notes=payload.notes or f"Revision {new_v_num}",
    )
    db.add(new_version)
    await db.commit()
    await db.refresh(design)

    return DesignDetail(
        id=design.id,
        user_id=design.user_id,
        public_id=design.public_id,
        title=design.title,
        description=design.description,
        is_public=design.is_public,
        scale_metadata=design.scale_metadata or {},
        version_number=new_v_num,
        graph_data=graph_data,
        created_at=design.created_at,
        updated_at=design.updated_at,
    )


@router.delete("/{id_or_public_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_design(
    id_or_public_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Delete an architecture design."""
    try:
        d_uuid = uuid.UUID(id_or_public_id)
        stmt = select(Design).where(Design.id == d_uuid)
    except ValueError:
        stmt = select(Design).where(Design.public_id == id_or_public_id)

    result = await db.execute(stmt)
    design = result.scalar_one_or_none()

    if not design:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Design '{id_or_public_id}' not found",
        )

    if design.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete designs owned by another user",
        )

    await db.delete(design)
    await db.commit()
    return None


@router.post("/{id_or_public_id}/validate", response_model=ValidationResponse)
async def validate_saved_design(
    id_or_public_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ValidationResponse:
    """Validate a persisted design and log the evaluation result."""
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

    latest_version = max(design.versions, key=lambda v: v.version_number, default=None)
    raw_graph = latest_version.graph_data if latest_version else {"nodes": [], "edges": []}
    graph = GraphData(**raw_graph)

    evaluation = rule_engine.evaluate(graph, design.scale_metadata)

    # Persist evaluation record
    if latest_version:
        eval_record = DesignEvaluation(
            version_id=latest_version.id,
            overall_score=evaluation.health_score,
            rule_violations=[v.model_dump() for v in evaluation.violations],
            metrics={"status": evaluation.status, "component_counts": evaluation.component_counts},
            strengths=evaluation.passed_rules,
            recommendations=[v.remediation for v in evaluation.violations],
        )
        db.add(eval_record)
        await db.commit()

    return evaluation
