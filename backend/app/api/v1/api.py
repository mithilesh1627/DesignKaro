from backend.app.api.v1.endpoints import health
from fastapi import APIRouter

api_router = APIRouter()

# Core system endpoints
api_router.include_router(health.router, tags=["Health & System Telemetry"])

# Placeholder routers for subsequent phases (Modular Monolith)
# api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
# api_router.include_router(topics.router, prefix="/topics", tags=["Learning"])
# api_router.include_router(problems.router, prefix="/problems", tags=["Practice"])
# api_router.include_router(designs.router, prefix="/designs", tags=["Architecture Canvas"])
# api_router.include_router(mentor.router, prefix="/mentor", tags=["AI Mentor"])
# api_router.include_router(interviews.router, prefix="/interviews", tags=["Interview"])
# api_router.include_router(simulations.router, prefix="/simulations", tags=["Simulation"])
