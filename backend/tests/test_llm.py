import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import Response

from backend.app.schemas.design import CanvasEdgeData, CanvasNodeData, GraphData, NodePropertySchema
from backend.app.schemas.llm import SaveLLMProviderSettingsRequest, TestLLMConnectionRequest
from backend.app.schemas.mentor import MentorChatRequest, MentorMessage
from backend.app.services.llm.context_builder import build_system_architect_context
from backend.app.services.llm.encryption import (
    decrypt_api_key,
    encrypt_api_key,
    mask_api_key,
)
from backend.app.services.llm.exceptions import (
    EncryptionError,
    ProviderAuthenticationError,
    ProviderUnavailableError,
    RateLimitError,
)
from backend.app.services.llm.models import ChatMessage, LLMRequest
from backend.app.services.llm.providers.anthropic_provider import AnthropicProvider
from backend.app.services.llm.providers.gemini_provider import GeminiProvider
from backend.app.services.llm.providers.ollama_provider import OllamaProvider
from backend.app.services.llm.providers.openai_provider import OpenAIProvider
from backend.app.services.llm.service import LLMService


# ==============================================================================
# 1. Encryption and Masking Tests
# ==============================================================================
def test_encryption_roundtrip_and_tamper_resistance():
    plain = "sk-test-secret-key-1234567890abcdef"
    encrypted = encrypt_api_key(plain)

    assert encrypted != plain
    assert len(encrypted) > len(plain)

    decrypted = decrypt_api_key(encrypted)
    assert decrypted == plain

    # Empty string handling
    assert encrypt_api_key("") == ""
    assert decrypt_api_key("") == ""
    assert decrypt_api_key(None) == ""

    # Tampered token should raise EncryptionError
    tampered = encrypted[:-5] + "XXXXX"
    with pytest.raises(EncryptionError):
        decrypt_api_key(tampered)


def test_api_key_masking():
    assert mask_api_key(None) is None
    assert mask_api_key("") is None
    assert mask_api_key("1234") == "********"

    masked = mask_api_key("sk-ant-api03-abcdef1234567890xyz")
    assert masked.startswith("sk-a")
    assert masked.endswith("0xyz")
    assert "..." in masked
    assert "abcdef1234567890" not in masked


# ==============================================================================
# 2. Context Builder Tests
# ==============================================================================
def test_system_architect_context_builder():
    graph = GraphData(
        nodes=[
            CanvasNodeData(
                id="gw",
                type="gateway",
                label="API Gateway",
                properties=NodePropertySchema(replicas=3),
            ),
            CanvasNodeData(
                id="db",
                type="relational_db",
                label="PostgreSQL Primary",
                properties=NodePropertySchema(replicas=1),
            ),
        ],
        edges=[
            CanvasEdgeData(id="e1", source="gw", target="db", label="SQL"),
        ],
    )
    scale = {"dau": 50000000, "peak_qps": 25000}
    violations = [{"rule_id": "RULE-001", "severity": "CRITICAL", "message": "SPOF detected on db"}]

    ctx = build_system_architect_context(
        graph_data=graph,
        scale_metadata=scale,
        violations=violations,
    )

    assert "API Gateway" in ctx
    assert "PostgreSQL Primary" in ctx
    assert "replicas: 3" in ctx
    assert "50000000" in ctx
    assert "RULE-001" in ctx


# ==============================================================================
# 3. Provider Abstraction Tests (Mocked Network)
# ==============================================================================
@pytest.mark.asyncio
async def test_ollama_provider_generate_success():
    provider = OllamaProvider(base_url="http://localhost:11434", model="llama3.2:3b")

    mock_resp = {
        "model": "llama3.2:3b",
        "message": {"role": "assistant", "content": "Architectural recommendation: add Redis cache."},
        "prompt_eval_count": 40,
        "eval_count": 20,
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = Response(200, json=mock_resp)

        req = LLMRequest(prompt="How should I scale reads?", temperature=0.2)
        resp = await provider.generate(req)

        assert resp.content == "Architectural recommendation: add Redis cache."
        assert resp.provider == "ollama"
        assert resp.model == "llama3.2:3b"
        assert resp.usage.prompt_tokens == 40
        assert resp.usage.completion_tokens == 20


@pytest.mark.asyncio
async def test_ollama_provider_unavailable_handling():
    import httpx

    provider = OllamaProvider(base_url="http://localhost:11434", model="llama3.2:3b")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.ConnectError("Connection refused")

        req = LLMRequest(prompt="Ping")
        with pytest.raises(ProviderUnavailableError) as exc_info:
            await provider.generate(req)

        assert "offline" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_gemini_provider_generate_and_auth_error():
    provider = GeminiProvider(api_key="valid-test-key", model="gemini-1.5-flash")

    mock_gemini_resp = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": "Partition by user_id to prevent hot spots."}]
                }
            }
        ],
        "usageMetadata": {
            "promptTokenCount": 50,
            "candidatesTokenCount": 25,
            "totalTokenCount": 75,
        },
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = Response(200, json=mock_gemini_resp)

        req = LLMRequest(prompt="How to partition?")
        resp = await provider.generate(req)
        assert "Partition by user_id" in resp.content
        assert resp.provider == "gemini"

    # Test Auth failure
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = Response(400, json={"error": {"message": "API_KEY_INVALID"}})

        with pytest.raises(ProviderAuthenticationError):
            await provider.generate(req)


@pytest.mark.asyncio
async def test_openai_provider_generate_and_rate_limit():
    provider = OpenAIProvider(api_key="sk-test-key", model="gpt-4o-mini")

    mock_openai_resp = {
        "choices": [{"message": {"role": "assistant", "content": "Use Kafka for event streaming."}}],
        "usage": {"prompt_tokens": 30, "completion_tokens": 15, "total_tokens": 45},
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = Response(200, json=mock_openai_resp)

        req = LLMRequest(prompt="Suggest messaging system")
        resp = await provider.generate(req)
        assert "Kafka" in resp.content
        assert resp.provider == "openai"

    # Test Rate Limit
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = Response(429, json={"error": {"message": "Rate limit exceeded"}})

        with pytest.raises(RateLimitError):
            await provider.generate(req)


@pytest.mark.asyncio
async def test_anthropic_provider_generate():
    provider = AnthropicProvider(api_key="sk-ant-test", model="claude-3-5-sonnet-20241022")

    mock_claude_resp = {
        "content": [{"type": "text", "text": "Decouple synchronous write path."}],
        "usage": {"input_tokens": 45, "output_tokens": 20},
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = Response(200, json=mock_claude_resp)

        req = LLMRequest(prompt="How to optimize throughput?", system_prompt="Be concise.")
        resp = await provider.generate(req)
        assert "Decouple" in resp.content
        assert resp.provider == "anthropic"


# ==============================================================================
# 4. Fallback Mechanism Test
# ==============================================================================
@pytest.mark.asyncio
async def test_llm_service_graceful_fallback():
    mock_provider = MagicMock()
    mock_provider.provider_name = "failing-provider"
    mock_provider.generate = AsyncMock(side_effect=ProviderUnavailableError("Offline"))

    service = LLMService(default_provider=mock_provider)

    req = LLMRequest(prompt="Hello")
    fallback_text = "Deterministic heuristic fallback response."

    # When fallback_fn is provided, it must not crash and return fallback response
    resp = await service.generate(req, fallback_fn=lambda: fallback_text)

    assert resp.content == fallback_text
    assert resp.fallback_used is True
    assert resp.provider == "heuristic-engine"


# ==============================================================================
# 5. API Endpoints Integration Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_llm_providers_list_endpoint(client):
    response = await client.get("/api/v1/llm/providers")
    assert response.status_code == 200
    providers = response.json()

    assert len(providers) >= 4
    provider_names = {p["provider"] for p in providers}
    assert "ollama" in provider_names
    assert "gemini" in provider_names
    assert "openai" in provider_names
    assert "anthropic" in provider_names


@pytest.mark.asyncio
async def test_llm_test_connection_endpoint(client):
    # Test connection with simulated failure (invalid key / offline) returns 200 with success=False
    payload = {"provider": "gemini", "api_key": "invalid-dummy-key"}
    response = await client.post("/api/v1/llm/test", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "gemini"
    assert data["success"] is False
    assert data["error_message"] is not None


@pytest.mark.asyncio
async def test_mentor_chat_sse_stream_endpoint(client):
    req = {
        "messages": [{"role": "user", "content": "How do I prevent cache stampedes?"}],
        "graph_data": None,
    }
    response = await client.post("/api/v1/mentor/chat/stream", json=req)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    content = response.text
    assert "data: " in content


# ==============================================================================
# 6. Diagnostics Endpoint Tests (Phase 16)
# ==============================================================================
@pytest.mark.asyncio
async def test_llm_diagnostics_endpoint(client):
    response = await client.get("/api/v1/llm/diagnostics")
    assert response.status_code == 200
    data = response.json()

    assert data["environment"] == "development"
    assert data["provider"] == "ollama"
    assert data["configured_model"] == "llama3.2:3b"
    assert data["recommended_model"] == "llama3.2:3b"
    assert "ollama pull" in data["recommended_pull_command"]
    assert data["gpu_name"] is not None
    assert data["system_ram_total_mb"] is not None
    assert data["system_ram_total_mb"] > 0
    assert data["ollama_state"] in [
        "OFFLINE",
        "DAEMON_RUNNING_NO_MODEL",
        "MODEL_NOT_FOUND",
        "READY",
    ]
    assert data["model_status"] is not None


# ==============================================================================
# 7. Health Check State Machine Tests (State A, B, C, D)
# ==============================================================================
@pytest.mark.asyncio
async def test_ollama_health_check_states():
    from backend.app.services.llm.models import ProviderState

    provider = OllamaProvider(base_url="http://localhost:11434", model="llama3.2:3b")

    # State A: Offline (ConnectError)
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        import httpx
        mock_get.side_effect = httpx.ConnectError("Connection refused")
        health = await provider.health_check()
        assert health.available is False
        assert health.state == ProviderState.STATE_A_OFFLINE

    # State B: Daemon Running, 0 Models Installed
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(200, json={"models": []})
        health = await provider.health_check()
        assert health.available is False
        assert health.state == ProviderState.STATE_B_NO_MODELS
        assert len(health.models_available) == 0

    # State C: Daemon Running, Configured Model Missing
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(200, json={"models": [{"name": "mistral:7b"}]})
        health = await provider.health_check()
        assert health.available is False
        assert health.state == ProviderState.STATE_C_MODEL_MISSING
        assert "mistral:7b" in health.models_available

    # State D: Ready (Configured Model Installed)
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(200, json={"models": [{"name": "llama3.2:3b"}]})
        health = await provider.health_check()
        assert health.available is True
        assert health.state == ProviderState.STATE_D_READY
        assert "llama3.2:3b" in health.models_available


# ==============================================================================
# 8. Environment Isolation & Settings Validation Tests
# ==============================================================================
def test_environment_isolation_prohibits_ollama_in_production():
    from backend.app.core.config import Settings

    valid_prod_key = "a-very-strong-production-secret-key-64-bytes-long-for-testing-only"

    # Attempting to set LLM_PROVIDER="ollama" in production without explicit allow flag MUST raise ValueError
    with pytest.raises(ValueError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY=valid_prod_key,
            LLM_PROVIDER="ollama",
            ALLOW_OLLAMA_IN_PRODUCTION=False,
        )
    assert "cannot use 'ollama'" in str(exc_info.value)

    # Allowed in production if explicit override flag is true
    valid_prod = Settings(
        ENVIRONMENT="production",
        SECRET_KEY=valid_prod_key,
        LLM_PROVIDER="ollama",
        ALLOW_OLLAMA_IN_PRODUCTION=True,
    )
    assert valid_prod.LLM_PROVIDER == "ollama"

    # Development allows Ollama unconditionally
    dev_settings = Settings(
        ENVIRONMENT="development",
        LLM_PROVIDER="ollama",
        ALLOW_OLLAMA_IN_PRODUCTION=False,
    )
    assert dev_settings.LLM_PROVIDER == "ollama"


# ==============================================================================
# 9. RAG Knowledge Retrieval and Context Injection Tests
# ==============================================================================
def test_rag_knowledge_snippet_retrieval():
    from backend.app.services.llm.context_builder import retrieve_relevant_rag_snippets

    # Empty query returns empty list
    assert retrieve_relevant_rag_snippets("") == []
    assert retrieve_relevant_rag_snippets("   ") == []

    # Architectural query matching Netflix / caching
    snippets = retrieve_relevant_rag_snippets("Netflix video caching and CDN playback architecture")
    assert len(snippets) > 0
    assert any("Netflix" in s or "video" in s.lower() or "cdn" in s.lower() for s in snippets)


def test_system_architect_context_rag_injection():
    snippets = ["Netflix: Distributed Open Connect CDN edge caching architecture."]
    ctx = build_system_architect_context(rag_snippets=snippets)

    assert "Real-World Architectural Precedents (RAG):" in ctx
    assert "Netflix: Distributed Open Connect CDN" in ctx


# ==============================================================================
# 10. Rate Limiting Tests (Phase 26)
# ==============================================================================
@pytest.mark.asyncio
async def test_llm_test_rate_limiting(client):
    from backend.app.api.v1.endpoints.llm import test_endpoint_limiter
    from backend.app.services.llm.models import LLMResponse

    # Reset limiter history for clean isolation
    test_endpoint_limiter._history.clear()

    mock_inst = MagicMock()
    mock_inst.generate = AsyncMock(return_value=LLMResponse(content="OK", model="test-model", provider="gemini"))

    with patch("backend.app.api.v1.endpoints.llm.create_provider_instance", return_value=mock_inst):
        payload = {"provider": "gemini", "api_key": "test-key"}

        # Execute 15 calls (limit threshold)
        for _ in range(15):
            resp = await client.post("/api/v1/llm/test", json=payload)
            assert resp.status_code == 200

        # 16th call must be blocked by the rate limiter
        resp16 = await client.post("/api/v1/llm/test", json=payload)
        assert resp16.status_code == 200
        data = resp16.json()
        assert data["success"] is False
        assert "Rate limit exceeded" in data["error_message"]

    # Clean up
    test_endpoint_limiter._history.clear()


# ==============================================================================
# 11. User BYOK Settings Endpoints (Authenticated CRUD)
# ==============================================================================
@pytest.mark.asyncio
async def test_user_byok_settings_crud(client):
    # 1. Login with demo user
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "demo@designkaro.io", "password": "Password123!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 2. Save BYOK provider settings
    save_payload = {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "api_key": "sk-proj-demo-test-api-key-1234567890abcdef",
        "set_as_active": True,
    }
    save_resp = await client.post("/api/v1/llm/settings", json=save_payload, headers=auth_headers)
    assert save_resp.status_code == 200
    assert "saved successfully" in save_resp.json()["message"]

    # 3. Retrieve settings: verify API key is strictly masked
    get_resp = await client.get("/api/v1/llm/settings", headers=auth_headers)
    assert get_resp.status_code == 200
    settings_data = get_resp.json()

    assert settings_data["active_provider"] == "openai"
    assert settings_data["active_model"] == "gpt-4o-mini"

    # Find the saved openai config
    openai_cfg = next((p for p in settings_data["configured_providers"] if p["provider"] == "openai"), None)
    assert openai_cfg is not None
    assert openai_cfg["masked_api_key"] is not None
    assert openai_cfg["masked_api_key"].startswith("sk-p")
    assert "..." in openai_cfg["masked_api_key"]
    assert "demo-test-api-key" not in openai_cfg["masked_api_key"]

    # 4. Delete the BYOK provider
    del_resp = await client.delete("/api/v1/llm/settings/openai", headers=auth_headers)
    assert del_resp.status_code == 200
    assert "deleted" in del_resp.json()["message"]

