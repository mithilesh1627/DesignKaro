import pytest


@pytest.mark.asyncio
async def test_list_problems(client):
    response = await client.get("/api/v1/problems")
    assert response.status_code == 200
    data = response.json()
    assert "questions" in data
    assert "total" in data
    assert data["total"] >= 1
    assert "categories" in data
    assert "difficulties" in data

    first_q = data["questions"][0]
    assert "id" in first_q
    assert "slug" in first_q
    assert "title" in first_q
    assert "difficulty" in first_q
    assert "category" in first_q


@pytest.mark.asyncio
async def test_filter_problems_by_difficulty(client):
    response = await client.get("/api/v1/problems?difficulty=beginner")
    assert response.status_code == 200
    data = response.json()
    assert all(q["difficulty"] == "beginner" for q in data["questions"])


@pytest.mark.asyncio
async def test_get_problem_detail(client):
    response = await client.get("/api/v1/problems/url-shortener-tinyurl")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "url-shortener-tinyurl"
    assert len(data["requirements"]) >= 3
    assert "read_qps" in data["constraints"]
    assert "write_qps" in data["constraints"]
    assert len(data["hints"]) >= 2
    assert "evaluation_criteria" in data


@pytest.mark.asyncio
async def test_get_problem_not_found(client):
    response = await client.get("/api/v1/problems/non-existent-problem-xyz")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_submit_problem_attempt_unauthorized(client):
    response = await client.post(
        "/api/v1/problems/url-shortener-tinyurl/attempt",
        json={"status": "passed", "score": 85, "feedback": {"summary": "Great job"}},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_submit_problem_attempt_authenticated(client):
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "demo@designkaro.io", "password": "Password123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.post(
        "/api/v1/problems/url-shortener-tinyurl/attempt",
        headers=headers,
        json={"status": "passed", "score": 90, "feedback": {"verdict": "Production-ready"}},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "passed"
    assert data["score"] == 90
    assert data["feedback"]["verdict"] == "Production-ready"
