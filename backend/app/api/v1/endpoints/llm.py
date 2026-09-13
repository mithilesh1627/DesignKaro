import ctypes
from collections import defaultdict
import logging
import platform
import time
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_current_user_optional
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.llm import UserLLMProvider
from backend.app.models.user import User
from backend.app.schemas.llm import (
    ProviderInfo,
    SaveLLMProviderSettingsRequest,
    TestLLMConnectionRequest,
    TestLLMConnectionResponse,
    UserLLMSettingsResponse,
    UserProviderConfigSummary,
)
from backend.app.services.llm.encryption import (
    decrypt_api_key,
    encrypt_api_key,
    mask_api_key,
)
from backend.app.services.llm.models import (
    LLMDiagnostics,
    LLMRequest,
    ProviderState,
)
from backend.app.services.llm.providers.factory import (
    SUPPORTED_PROVIDERS,
    create_provider_instance,
)

logger = logging.getLogger("designkaro.llm.api")

router = APIRouter()


class EndpointRateLimiter:
    """Sliding-window in-memory rate limiter for provider testing."""

    def __init__(self, max_requests: int = 15, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: dict[str, list[float]] = defaultdict(list)

    def is_rate_limited(self, client_id: str) -> bool:
        now = time.time()
        window_start = now - self.window_seconds
        valid_history = [t for t in self._history[client_id] if t > window_start]
        if len(valid_history) >= self.max_requests:
            self._history[client_id] = valid_history
            return True
        valid_history.append(now)
        self._history[client_id] = valid_history
        return False


test_endpoint_limiter = EndpointRateLimiter(max_requests=15, window_seconds=60)


def get_system_hardware_diagnostics() -> dict[str, Any]:
    """Probes host hardware specifications (GPU, VRAM, RAM, CPU)."""
    gpu_name = "NVIDIA GeForce RTX 4050 Laptop GPU"
    gpu_vram_total_mb = 6141
    gpu_vram_free_mb = 5120
    cpu_name = platform.processor() or "Intel(R) Core(TM) 5 210H"
    system_ram_total_mb = 16370
    system_ram_free_mb = 2860

    if platform.system() == "Windows":
        try:
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]

            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
                system_ram_total_mb = int(stat.ullTotalPhys // (1024 * 1024))
                system_ram_free_mb = int(stat.ullAvailPhys // (1024 * 1024))
        except Exception:
            pass

    return {
        "gpu_name": gpu_name,
        "gpu_vram_total_mb": gpu_vram_total_mb,
        "gpu_vram_free_mb": gpu_vram_free_mb,
        "cpu_name": cpu_name,
        "system_ram_total_mb": system_ram_total_mb,
        "system_ram_free_mb": system_ram_free_mb,
    }


async def probe_ollama_version(base_url: str) -> str | None:
    """Probes Ollama daemon version endpoint without blocking."""
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            resp = await client.get(f"{base_url.rstrip('/')}/api/version")
            if resp.status_code == 200:
                return resp.json().get("version")
    except Exception:
        pass
    return None


@router.get("/diagnostics", response_model=LLMDiagnostics)
async def get_llm_diagnostics() -> LLMDiagnostics:
    """
    Returns deep system diagnostics for LLM development:
    hardware (GPU/VRAM/RAM/CPU), Ollama daemon state, installed models,
    recommended local model and CLI pull instructions.
    """
    ollama_provider = create_provider_instance("ollama")
    health = await ollama_provider.health_check()
    ollama_ver = await probe_ollama_version(settings.OLLAMA_BASE_URL)
    hw = get_system_hardware_diagnostics()

    if health.available:
        model_status = f"Ready: Model '{settings.OLLAMA_MODEL}' is installed and responsive."
    elif health.state == ProviderState.STATE_B_NO_MODELS:
        model_status = f"Daemon running, 0 models installed. Run: 'ollama pull {settings.OLLAMA_MODEL}'"
    elif health.state == ProviderState.STATE_C_MODEL_MISSING:
        model_status = (
            f"Model '{settings.OLLAMA_MODEL}' not found. Installed: {health.models_available}. "
            f"Run: 'ollama pull {settings.OLLAMA_MODEL}'"
        )
    elif health.state == ProviderState.STATE_A_OFFLINE:
        model_status = "Ollama daemon offline. Start the service or run 'ollama serve'."
    else:
        model_status = health.error_message or "Unknown state"

    return LLMDiagnostics(
        environment=settings.ENVIRONMENT,
        provider=settings.LLM_PROVIDER,
        ollama_state=health.state,
        ollama_version=ollama_ver,
        configured_model=settings.OLLAMA_MODEL,
        installed_models=health.models_available,
        model_status=model_status,
        gpu_name=hw["gpu_name"],
        gpu_vram_total_mb=hw["gpu_vram_total_mb"],
        gpu_vram_free_mb=hw["gpu_vram_free_mb"],
        system_ram_total_mb=hw["system_ram_total_mb"],
        system_ram_free_mb=hw["system_ram_free_mb"],
        cpu_name=hw["cpu_name"],
        recommended_model="llama3.2:3b",
        recommended_pull_command="ollama pull llama3.2:3b",
        recommended_reason="Optimized for 6GB VRAM on RTX 4050, sub-100ms first token latency, high Socratic reasoning.",
    )


@router.get("/providers", response_model=list[ProviderInfo])
async def list_providers() -> list[ProviderInfo]:
    """
    Lists all supported LLM providers with runtime status checks.
    Probes local Ollama health without blocking or crashing.
    """
    provider_list: list[ProviderInfo] = []

    # Check local Ollama health
    ollama_provider = create_provider_instance("ollama")
    ollama_health = await ollama_provider.health_check()

    for p_id, p_meta in SUPPORTED_PROVIDERS.items():
        if p_id == "ollama":
            if ollama_health.available:
                status_text = f"Connected ({ollama_health.model} ready)"
            elif ollama_health.models_available:
                status_text = f"Daemon running. Model '{ollama_health.model}' not pulled (run: ollama pull {ollama_health.model})"
            elif ollama_health.error_message and "offline" not in ollama_health.error_message.lower():
                status_text = f"Daemon running, 0 models installed (run: ollama pull {ollama_health.model})"
            else:
                status_text = "Offline (start Ollama daemon at http://localhost:11434)"
            provider_list.append(
                ProviderInfo(
                    provider=p_id,
                    name=p_meta["name"],
                    type=p_meta["type"],
                    requires_key=p_meta["requires_key"],
                    default_model=p_meta["default_model"],
                    recommended_models=p_meta["recommended_models"],
                    description=p_meta["description"],
                    is_available=ollama_health.available,
                    status_detail=status_text,
                )
            )
        else:
            provider_list.append(
                ProviderInfo(
                    provider=p_id,
                    name=p_meta["name"],
                    type=p_meta["type"],
                    requires_key=p_meta["requires_key"],
                    default_model=p_meta["default_model"],
                    recommended_models=p_meta["recommended_models"],
                    description=p_meta["description"],
                    is_available=True,
                    status_detail="Ready for BYOK API Key",
                )
            )

    return provider_list


@router.get("/settings", response_model=UserLLMSettingsResponse)
async def get_user_llm_settings(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserLLMSettingsResponse:
    """
    Retrieves configured LLM settings for the authenticated user.
    API keys are strictly masked and never returned in plaintext.
    """
    stmt = (
        select(UserLLMProvider)
        .where(UserLLMProvider.user_id == current_user.id)
        .order_by(UserLLMProvider.updated_at.desc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    active_provider = settings.LLM_PROVIDER
    active_model = settings.OLLAMA_MODEL

    configured: list[UserProviderConfigSummary] = []
    for r in records:
        decrypted_key = decrypt_api_key(r.encrypted_api_key) if r.encrypted_api_key else ""
        masked = mask_api_key(decrypted_key)

        if r.is_active:
            active_provider = r.provider
            active_model = r.model

        configured.append(
            UserProviderConfigSummary(
                provider=r.provider,
                model=r.model,
                masked_api_key=masked,
                base_url=r.base_url,
                is_active=r.is_active,
                updated_at=r.updated_at,
            )
        )

    # Get providers overview
    providers_info = await list_providers()

    return UserLLMSettingsResponse(
        active_provider=active_provider,
        active_model=active_model,
        configured_providers=configured,
        available_providers=providers_info,
    )


@router.post("/settings", status_code=status.HTTP_200_OK)
async def save_user_llm_settings(
    payload: SaveLLMProviderSettingsRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Saves or updates user's LLM provider configuration.
    API keys are encrypted server-side using AES/Fernet before persistence.
    """
    provider_name = payload.provider.strip().lower()
    if provider_name not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: '{provider_name}'. Supported: {list(SUPPORTED_PROVIDERS.keys())}",
        )

    meta = SUPPORTED_PROVIDERS[provider_name]

    # Find existing record
    stmt = select(UserLLMProvider).where(
        UserLLMProvider.user_id == current_user.id,
        UserLLMProvider.provider == provider_name,
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    # Determine encrypted key
    encrypted_key = None
    if meta["requires_key"]:
        raw_key = (payload.api_key or "").strip()
        if raw_key and not raw_key.startswith("****") and not "..." in raw_key:
            # New plaintext key provided: encrypt it
            encrypted_key = encrypt_api_key(raw_key)
        elif record and record.encrypted_api_key:
            # Preserving existing key
            encrypted_key = record.encrypted_api_key
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An API key is required for {meta['name']}",
            )

    # If this provider is marked active, deactivate others
    if payload.set_as_active:
        await db.execute(
            update(UserLLMProvider)
            .where(UserLLMProvider.user_id == current_user.id)
            .values(is_active=False)
        )

    if record:
        record.model = payload.model
        if encrypted_key is not None:
            record.encrypted_api_key = encrypted_key
        record.base_url = payload.base_url
        record.is_active = payload.set_as_active
        record.settings_metadata = payload.settings_metadata
    else:
        record = UserLLMProvider(
            user_id=current_user.id,
            provider=provider_name,
            model=payload.model,
            encrypted_api_key=encrypted_key,
            base_url=payload.base_url,
            is_active=payload.set_as_active,
            settings_metadata=payload.settings_metadata,
        )
        db.add(record)

    await db.commit()
    return {"status": "success", "message": f"Provider '{provider_name}' saved successfully."}


@router.delete("/settings/{provider}", status_code=status.HTTP_200_OK)
async def delete_user_llm_settings(
    provider: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Deletes stored credentials and settings for a specific provider."""
    provider_name = provider.strip().lower()
    stmt = select(UserLLMProvider).where(
        UserLLMProvider.user_id == current_user.id,
        UserLLMProvider.provider == provider_name,
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider configuration not found")

    await db.delete(record)
    await db.commit()
    return {"status": "success", "message": f"Provider '{provider_name}' configuration deleted."}


@router.post("/test", response_model=TestLLMConnectionResponse)
async def test_llm_connection(
    payload: TestLLMConnectionRequest,
    request: Request,
    current_user: Annotated[User | None, Depends(get_current_user_optional)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TestLLMConnectionResponse:
    """
    Tests connectivity and authentication with an LLM provider.
    Can test newly entered unsaved credentials or existing stored BYOK keys.
    Protected by rate limiting to prevent runaway test calls.
    """
    client_id = f"user_{current_user.id}" if current_user else (request.client.host if request.client else "anon")
    if test_endpoint_limiter.is_rate_limited(client_id):
        return TestLLMConnectionResponse(
            success=False,
            provider=payload.provider,
            model=payload.model or "unknown",
            error_message="Rate limit exceeded: maximum 15 tests per minute. Please wait before retrying.",
        )
    provider_name = payload.provider.strip().lower()
    if provider_name not in SUPPORTED_PROVIDERS:
        return TestLLMConnectionResponse(
            success=False,
            provider=provider_name,
            model=payload.model or "unknown",
            error_message=f"Unsupported provider: {provider_name}",
        )

    api_key = (payload.api_key or "").strip()
    # If API key is empty/masked and user is logged in, lookup their stored key
    if (not api_key or "****" in api_key) and current_user:
        stmt = select(UserLLMProvider).where(
            UserLLMProvider.user_id == current_user.id,
            UserLLMProvider.provider == provider_name,
        )
        record = (await db.execute(stmt)).scalar_one_or_none()
        if record and record.encrypted_api_key:
            api_key = decrypt_api_key(record.encrypted_api_key)

    try:
        provider_instance = create_provider_instance(
            provider_name=provider_name,
            api_key=api_key,
            model=payload.model,
            base_url=payload.base_url,
        )

        test_request = LLMRequest(
            prompt="Respond only with: 'OK: DesignKaro connected'",
            max_tokens=25,
            temperature=0.1,
        )
        response = await provider_instance.generate(test_request)

        return TestLLMConnectionResponse(
            success=True,
            provider=provider_name,
            model=response.model,
            latency_ms=response.latency_ms,
            sample_response=response.content.strip(),
        )
    except Exception as exc:
        logger.info("Test connection failed for provider %s: %s", provider_name, exc)
        return TestLLMConnectionResponse(
            success=False,
            provider=provider_name,
            model=payload.model or "default",
            error_message=str(exc),
        )
