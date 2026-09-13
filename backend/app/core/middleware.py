import time
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class TelemetryCollector:
    """In-memory telemetry collector for requests, latency, and error rates."""

    def __init__(self) -> None:
        self.start_time = time.time()
        self.total_requests = 0
        self.status_2xx = 0
        self.status_4xx = 0
        self.status_5xx = 0
        self.total_duration_ms = 0.0

    def record_request(self, status_code: int, duration_ms: float) -> None:
        self.total_requests += 1
        self.total_duration_ms += duration_ms

        if 200 <= status_code < 300:
            self.status_2xx += 1
        elif 400 <= status_code < 500:
            self.status_4xx += 1
        elif status_code >= 500:
            self.status_5xx += 1

    def get_summary(self) -> dict[str, Any]:
        uptime_seconds = round(time.time() - self.start_time, 2)
        avg_latency = (
            round(self.total_duration_ms / self.total_requests, 2)
            if self.total_requests > 0
            else 0.0
        )
        return {
            "uptime_seconds": uptime_seconds,
            "total_requests": self.total_requests,
            "status_2xx": self.status_2xx,
            "status_4xx": self.status_4xx,
            "status_5xx": self.status_5xx,
            "average_latency_ms": avg_latency,
            "error_rate_pct": round(
                (self.status_5xx / max(1, self.total_requests)) * 100, 2
            ),
        }

    def get_prometheus_format(self) -> str:
        summary = self.get_summary()
        lines = [
            "# HELP designkaro_uptime_seconds Application uptime in seconds",
            "# TYPE designkaro_uptime_seconds gauge",
            f"designkaro_uptime_seconds {summary['uptime_seconds']}",
            "# HELP designkaro_http_requests_total Total number of HTTP requests processed",
            "# TYPE designkaro_http_requests_total counter",
            f"designkaro_http_requests_total {summary['total_requests']}",
            'designkaro_http_requests_by_status{status="2xx"} ' + str(summary['status_2xx']),
            'designkaro_http_requests_by_status{status="4xx"} ' + str(summary['status_4xx']),
            'designkaro_http_requests_by_status{status="5xx"} ' + str(summary['status_5xx']),
            "# HELP designkaro_http_request_duration_avg_ms Average HTTP request latency",
            "# TYPE designkaro_http_request_duration_avg_ms gauge",
            f"designkaro_http_request_duration_avg_ms {summary['average_latency_ms']}",
        ]
        return "\n".join(lines) + "\n"


telemetry = TelemetryCollector()


class TelemetryMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start) * 1000
            telemetry.record_request(response.status_code, duration_ms)
            response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"
            return response
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            telemetry.record_request(500, duration_ms)
            raise


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window IP rate limiter.
    Protects authentication endpoints from brute-force and general API from denial-of-service.
    """

    def __init__(self, app, general_limit: int = 300, auth_limit: int = 60, window_sec: int = 60):
        super().__init__(app)
        self.general_limit = general_limit
        self.auth_limit = auth_limit
        self.window_sec = window_sec
        self.request_history: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next) -> Response:
        # Bypass rate limiting for test client or docs/health/openapi
        path = request.url.path
        if path in ("/health", "/ready", "/metrics", "/docs", "/redoc", "/api/v1/openapi.json"):
            return await call_next(request)

        client_ip = request.headers.get("X-Forwarded-For")
        if client_ip:
            client_ip = client_ip.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "127.0.0.1"

        now = time.time()
        is_auth = "/auth/login" in path or "/auth/register" in path
        limit = self.auth_limit if is_auth else self.general_limit
        bucket_key = f"{client_ip}:{'auth' if is_auth else 'gen'}"

        # Clean old timestamps
        timestamps = self.request_history.get(bucket_key, [])
        cutoff = now - self.window_sec
        valid_timestamps = [t for t in timestamps if t > cutoff]

        if len(valid_timestamps) >= limit:
            from starlette.responses import JSONResponse
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down and retry in a minute."},
                headers={
                    "Retry-After": str(self.window_sec),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                },
            )

        valid_timestamps.append(now)
        self.request_history[bucket_key] = valid_timestamps

        response = await call_next(request)
        remaining = max(0, limit - len(valid_timestamps))
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
