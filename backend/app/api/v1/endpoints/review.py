from backend.app.schemas.review import (
    ArchitectureReviewRequest,
    ArchitectureReviewResponse,
)
from backend.app.services.review_engine import review_engine
from fastapi import APIRouter

router = APIRouter()


@router.post("/evaluate", response_model=ArchitectureReviewResponse)
async def evaluate_architecture(
    payload: ArchitectureReviewRequest,
) -> ArchitectureReviewResponse:
    """Evaluate architecture graph across 9 quantitative engineering dimensions."""
    return review_engine.evaluate_architecture(payload)
