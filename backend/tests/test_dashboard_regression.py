import uuid
import pytest


@pytest.mark.asyncio
async def test_dashboard_unauthenticated(client):
    """Test dashboard endpoint when user is not logged in (guest baseline)."""
    response = await client.get("/api/v1/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["current_rank"] == "Guest Engineer"
    assert data["target_role"] == "Distributed Systems Engineer"
    assert data["readiness_score"] == 0
    assert data["streak_days"] == 0
    assert len(data["skills"]) >= 5
    assert len(data["achievements"]) >= 4
    assert "recommendations" in data


@pytest.mark.asyncio
async def test_dashboard_authenticated_demo_user(client):
    """Regression test for P0 bug: UserProfile target_role crash on authenticated dashboard."""
    # Login as demo user
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "demo@designkaro.io", "password": "Password123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Request dashboard with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/v1/dashboard", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["current_rank"] == "Principal Architect"
    assert data["target_role"] == "Staff Systems Architect"
    assert data["streak_days"] == 12
    assert data["total_xp"] == 2000
    assert data["readiness_score"] >= 0
    assert len(data["skills"]) >= 10
    assert len(data["achievements"]) >= 4


@pytest.mark.asyncio
async def test_dashboard_authenticated_new_user(client):
    """Verify freshly registered user can immediately fetch dashboard without crashing."""
    random_str = str(uuid.uuid4())[:8]
    payload = {
        "email": f"dash_test_{random_str}@example.com",
        "password": "SecurePassword123!",
        "username": f"dashtest_{random_str}",
        "full_name": "Testing Architect",
        "experience_level": "intermediate",
    }
    reg_res = await client.post("/api/v1/auth/register", json=payload)
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]

    # Verify user profile includes target_role
    me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["profile"]["target_role"] == "Staff Systems Architect"

    # Fetch dashboard
    dash_res = await client.get("/api/v1/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["current_rank"] == "Associate Architect"
    assert dash_data["target_role"] == "Staff Systems Architect"
    assert dash_data["streak_days"] == 12
    assert dash_data["total_xp"] == 200
