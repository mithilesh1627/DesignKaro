from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user_optional
from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.review import (
    ArchitectureReviewRequest,
    ArchitectureReviewResponse,
)
from backend.app.services.llm.providers.factory import get_active_provider_for_user
from backend.app.services.review_engine import review_engine

router = APIRouter()


@router.post("/evaluate", response_model=ArchitectureReviewResponse)
async def evaluate_architecture(
    payload: ArchitectureReviewRequest,
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> ArchitectureReviewResponse:
    """Evaluate architecture graph across 9 quantitative engineering dimensions with LLM augmentation."""
    provider = await get_active_provider_for_user(db=db, user=current_user)
    return await review_engine.evaluate_architecture_async(payload, provider=provider)
