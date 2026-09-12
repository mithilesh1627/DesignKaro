import datetime

from backend.app.core.config import settings
from backend.app.core.database import engine
from backend.app.core.middleware import telemetry
from backend.app.core.redis import redis_manager
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy import text

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK, summary="Liveness probe")
async def health_check():
    """
    Returns 200 if the FastAPI application process is alive and responsive.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "tagline": settings.TAGLINE,
        "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
        "environment": settings.ENVIRONMENT,
    }


@router.get("/ready", summary="Readiness probe")
async def readiness_check():
    """
    Validates that backing services (Database, Redis) are ready to accept traffic.
    """
    db_status = False
    redis_status = False
    details = {}

    # Check Database
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_status = True
            details["database"] = "connected"
    except Exception as e:
        details["database"] = f"unreachable: {e!s}"

    # Check Redis
    try:
        redis_ok = await redis_manager.check_health()
        if redis_ok:
            redis_status = True
            details["redis"] = "connected"
        else:
            details["redis"] = "ping_failed"
    except Exception as e:
        details["redis"] = f"unreachable: {e!s}"

    is_ready = db_status and redis_status
    http_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=http_code,
        content={
            "status": "ready" if is_ready else "degraded",
            "service": settings.PROJECT_NAME,
            "components": {
                "database": db_status,
                "redis": redis_status,
            },
            "details": details,
            "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
        },
    )


@router.get("/metrics", summary="Telemetry & Prometheus metrics summary")
async def metrics_summary(format: str | None = None):
    """
    Exposes essential application telemetry and Prometheus-compatible metrics.
    """
    if format == "prometheus":
        return PlainTextResponse(
            content=telemetry.get_prometheus_format(),
            media_type="text/plain; version=0.0.4",
        )

    summary = telemetry.get_summary()
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "uptime": "active",
        "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
        "telemetry": summary,
    }
