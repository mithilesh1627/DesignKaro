import pytest
from backend.app.schemas.mentor import MentorChatRequest, MentorHintRequest, MentorMessage
from backend.app.services.ai_mentor import mentor_service


def test_mentor_service_chat_socratic_response():
    req = MentorChatRequest(
        messages=[
            MentorMessage(role="user", content="How should I choose between Redis and Memcached for caching?")
        ],
        problem_slug="url-shortener-tinyurl",
    )
    res = mentor_service.generate_chat_response(req)
    assert len(res.reply) > 50
    assert "cache" in res.reply.lower() or "redis" in res.reply.lower()
    assert len(res.suggested_followups) >= 1


def test_mentor_service_hint_ladder():
    for lvl in [1, 2, 3, 4]:
        req = MentorHintRequest(problem_slug="distributed-rate-limiter", target_level=lvl)
        res = mentor_service.generate_hint(req)
        assert res.level == lvl
        assert len(res.title) > 0
        assert len(res.content) > 0
        assert len(res.trade_off_analysis) > 0


@pytest.mark.asyncio
async def test_mentor_api_chat_endpoint(client):
    payload = {
        "messages": [
            {"role": "user", "content": "My primary PostgreSQL database is getting overwhelmed with writes."}
        ],
        "problem_slug": "url-shortener-tinyurl",
    }
    response = await client.post("/api/v1/mentor/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "suggested_followups" in data
    assert len(data["reply"]) > 50


@pytest.mark.asyncio
async def test_mentor_api_hint_endpoint(client):
    payload = {
        "problem_slug": "distributed-rate-limiter",
        "target_level": 3,
    }
    response = await client.post("/api/v1/mentor/hint", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["level"] == 3
    assert "trade_off_analysis" in data
