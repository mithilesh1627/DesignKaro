import pytest


@pytest.mark.asyncio
async def test_list_topics(client):
    response = await client.get("/api/v1/topics")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5
    first_topic = data[0]
    assert "slug" in first_topic
    assert "title" in first_topic
    assert "track" in first_topic
    assert "lesson_count" in first_topic
    assert first_topic["lesson_count"] >= 1


@pytest.mark.asyncio
async def test_list_topics_filter_track(client):
    res_beginner = await client.get("/api/v1/topics?track=beginner")
    assert res_beginner.status_code == 200
    beginner_data = res_beginner.json()
    assert all(t["track"] == "beginner" for t in beginner_data)

    res_ml = await client.get("/api/v1/topics?track=ml")
    assert res_ml.status_code == 200
    ml_data = res_ml.json()
    assert all(t["track"] == "ml" for t in ml_data)


@pytest.mark.asyncio
async def test_get_topic_detail(client):
    response = await client.get("/api/v1/topics/fundamentals")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "fundamentals"
    assert len(data["lessons"]) >= 2
    first_lesson = data["lessons"][0]
    assert "slug" in first_lesson
    assert "title" in first_lesson
    assert "estimated_minutes" in first_lesson


@pytest.mark.asyncio
async def test_get_lesson_detail(client):
    response = await client.get("/api/v1/lessons/latency-vs-throughput")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "latency-vs-throughput"
    assert "Little's Law" in data["content_markdown"]
    assert "Tail Latency Amplification" in data["content_markdown"]
    assert "Trade-offs" in data["content_markdown"]
    assert "Production Scenario" in data["content_markdown"]
    assert data["next_lesson_slug"] == "cap-theorem-in-practice"
    assert data["prev_lesson_slug"] is None


@pytest.mark.asyncio
async def test_complete_lesson_flow(client):
    # 1. Login as demo user
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "demo@designkaro.io", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get lesson id
    lesson_res = await client.get("/api/v1/lessons/latency-vs-throughput")
    lesson_id = lesson_res.json()["id"]

    # 3. Mark lesson complete
    complete_res = await client.post(
        f"/api/v1/lessons/{lesson_id}/complete",
        json={"notes": "Mastered Little's Law and tail latency amplification"},
        headers=headers,
    )
    assert complete_res.status_code == 200
    data = complete_res.json()
    assert data["is_completed"] is True
    assert data["xp_earned"] == 50
    assert data["updated_mastery_score"] >= 50

    # 4. Check user progress
    progress_res = await client.get("/api/v1/learning/progress", headers=headers)
    assert progress_res.status_code == 200
    prog_data = progress_res.json()
    assert prog_data["completed_lessons"] >= 1
    assert prog_data["overall_percentage"] > 0
    assert len(prog_data["tracks"]) == 4


@pytest.mark.asyncio
async def test_complete_lesson_unauthorized(client):
    # Fetch lesson id
    lesson_res = await client.get("/api/v1/lessons/latency-vs-throughput")
    lesson_id = lesson_res.json()["id"]

    # Post complete without auth header
    res = await client.post(
        f"/api/v1/lessons/{lesson_id}/complete",
        json={"notes": "No token"},
    )
    assert res.status_code == 401
