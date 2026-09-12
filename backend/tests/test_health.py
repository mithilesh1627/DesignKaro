import pytest


@pytest.mark.asyncio
async def test_root_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "DesignKaro"
    assert "version" in data


@pytest.mark.asyncio
async def test_api_v1_health_check(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "DesignKaro"
    assert data["tagline"] == "Socho. Design Karo. Scale Karo."


@pytest.mark.asyncio
async def test_readiness_probe_structure(client):
    response = await client.get("/ready")
    # Response code may be 200 (if services available) or 503 (if redis/db are connecting)
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "components" in data
    assert "database" in data["components"]
    assert "redis" in data["components"]


@pytest.mark.asyncio
async def test_metrics_endpoint(client):
    response = await client.get("/api/v1/metrics")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "DesignKaro"
    assert data["uptime"] == "active"


@pytest.mark.asyncio
async def test_root_index(client):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "DesignKaro"
    assert data["docs"] == "/docs"


@pytest.mark.asyncio
async def test_security_headers_and_process_time(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert "X-Process-Time" in response.headers


@pytest.mark.asyncio
async def test_prometheus_metrics_format(client):
    response = await client.get("/api/v1/metrics?format=prometheus")
    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")
    assert "designkaro_http_requests_total" in response.text
