from backend.app.schemas.capacity import CapacityInput, CapacityResponse
from backend.app.services.capacity_engine import capacity_calculator
from fastapi import APIRouter

router = APIRouter()


@router.post("/calculate", response_model=CapacityResponse)
async def calculate_system_capacity(
    payload: CapacityInput,
) -> CapacityResponse:
    """Calculate distributed system capacity, QPS, storage horizons, and cache sizing."""
    return capacity_calculator.calculate(payload)
