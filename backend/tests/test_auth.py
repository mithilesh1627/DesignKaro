import uuid

import pytest


@pytest.mark.asyncio
async def test_register_new_user_success(client):
    random_str = str(uuid.uuid4())[:8]
    payload = {
        "email": f"architect_{random_str}@example.com",
        "password": "SecurePassword123!",
        "username": f"arch_{random_str}",
        "full_name": "Distributed Architect",
        "experience_level": "intermediate",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == payload["email"]
    assert data["user"]["profile"]["username"] == payload["username"]
    assert data["user"]["profile"]["experience_level"] == "intermediate"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    random_str = str(uuid.uuid4())[:8]
    payload = {
        "email": f"duplicate_{random_str}@example.com",
        "password": "SecurePassword123!",
        "username": f"user_{random_str}",
    }
    # First register
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Second register with same email
    payload2 = {
        "email": payload["email"],
        "password": "DifferentPassword123!",
        "username": f"different_{random_str}",
    }
    res2 = await client.post("/api/v1/auth/register", json=payload2)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client):
    # Login with seeded demo user
    payload = {
        "email": "demo@designkaro.io",
        "password": "Password123!",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "demo@designkaro.io"
    assert data["user"]["profile"]["username"] == "demo_architect"


@pytest.mark.asyncio
async def test_login_invalid_password(client):
    payload = {
        "email": "demo@designkaro.io",
        "password": "WrongPassword999!",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_me_authenticated(client):
    # Login first
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "demo@designkaro.io", "password": "Password123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Call /me with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["email"] == "demo@designkaro.io"
    assert data["profile"]["current_rank"] == "Principal Architect"


@pytest.mark.asyncio
async def test_get_me_unauthorized(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_flow(client):
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "demo@designkaro.io", "password": "Password123!"},
    )
    refresh_token = login_res.json()["refresh_token"]

    # Refresh
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200
    data = refresh_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
