import pytest


@pytest.mark.asyncio
async def test_dashboard_endpoint(client):
    response = await client.get("/api/v1/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "readiness_score" in data
    assert data["readiness_score"] >= 0
    assert "skills" in data
    assert len(data["skills"]) >= 5
    assert "achievements" in data
    assert len(data["achievements"]) >= 4
    assert "recent_designs" in data
    assert "recommendations" in data


@pytest.mark.asyncio
async def test_knowledge_search_endpoint(client):
    response = await client.get("/api/v1/knowledge/search?q=Redis")
    assert response.status_code == 200
    data = response.json()
    assert data["total_results"] >= 1
    assert any("Redis" in str(r) for r in data["results"])


@pytest.mark.asyncio
async def test_knowledge_search_category_filter(client):
    response = await client.get("/api/v1/knowledge/search?category=Streaming+%26+Storage")
    assert response.status_code == 200
    data = response.json()
    assert data["total_results"] >= 1
    assert data["results"][0]["company"] == "Netflix"


@pytest.mark.asyncio
async def test_knowledge_search_multi_token_ranked(client):
    response = await client.get("/api/v1/knowledge/search?q=whatsapp+erlang+concurrency")
    assert response.status_code == 200
    data = response.json()
    assert data["total_results"] >= 1
    assert data["results"][0]["company"] == "WhatsApp"


@pytest.mark.asyncio

async def test_architecture_diff_endpoint(client):
    # Fetch public design
    designs_res = await client.get("/api/v1/designs")
    assert designs_res.status_code == 200
    designs = designs_res.json()
    assert len(designs) >= 1
    first_id = designs[0]["public_id"]

    diff_res = await client.get(f"/api/v1/designs/{first_id}/diff?v1=1&v2=1")
    assert diff_res.status_code == 200
    diff_data = diff_res.json()
    assert "summary" in diff_data
    assert "added_nodes" in diff_data
    assert "removed_nodes" in diff_data
