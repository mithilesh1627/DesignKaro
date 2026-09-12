from backend.app.api.v1.endpoints import (
    auth,
    capacity,
    designs,
    health,
    interviews,
    learning,
    mentor,
    problems,
    review,
    simulations,
)
from fastapi import APIRouter

api_router = APIRouter()

# Core system endpoints
api_router.include_router(health.router, tags=["Health & System Telemetry"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Profiles"])
api_router.include_router(learning.router, tags=["Learning Engine"])
api_router.include_router(problems.router, prefix="/problems", tags=["Practice Engine"])
api_router.include_router(designs.router, prefix="/designs", tags=["Architecture Canvas & Validation"])
api_router.include_router(capacity.router, prefix="/capacity", tags=["Capacity Estimation Engine"])
api_router.include_router(mentor.router, prefix="/mentor", tags=["AI Senior Engineer Mentor"])
api_router.include_router(review.router, prefix="/review", tags=["Architecture Review (9 Dimensions)"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["Interview Engine"])
api_router.include_router(simulations.router, prefix="/simulations", tags=["Traffic & Chaos Simulation"])
