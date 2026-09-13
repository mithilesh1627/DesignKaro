import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1.api import api_router
from backend.app.core.config import settings
from backend.app.core.middleware import (
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    TelemetryMiddleware,
)
from backend.app.core.redis import redis_manager

# Configure structured logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("designkaro")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    logger.info(f"Tagline: {settings.TAGLINE}")
    # Verify Redis connectivity in background
    redis_ok = await redis_manager.check_health()
    logger.info(f"Initial Redis status: {'CONNECTED' if redis_ok else 'UNAVAILABLE (will retry on demand)'}")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")
    await redis_manager.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Interactive System Design Learning, Architecture Practice, "
        "Simulation, and Interview Platform.\n\n"
        "*Socho. Design Karo. Scale Karo.*"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Telemetry & Request Timing Middleware
app.add_middleware(TelemetryMiddleware)

# Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include versioned API router
app.include_router(api_router, prefix=settings.API_V1_STR)


# Ingress / root level health checks (required by load balancers and container probes)
@app.get("/health", status_code=status.HTTP_200_OK, tags=["System"])
async def root_health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "tagline": settings.TAGLINE,
    }


@app.get("/ready", tags=["System"])
async def root_ready():
    # Forward to API v1 readiness check
    from backend.app.api.v1.endpoints.health import readiness_check

    return await readiness_check()


@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
        "ready": "/ready",
        "api_v1": settings.API_V1_STR,
    }
