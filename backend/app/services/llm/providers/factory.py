import logging
from typing import Any, Type
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.llm import UserLLMProvider
from backend.app.models.user import User
from backend.app.services.llm.encryption import decrypt_api_key
from backend.app.services.llm.exceptions import ProviderConfigurationError
from backend.app.services.llm.interface import BaseLLMProvider
from backend.app.services.llm.providers.anthropic_provider import AnthropicProvider
from backend.app.services.llm.providers.gemini_provider import GeminiProvider
from backend.app.services.llm.providers.ollama_provider import OllamaProvider
from backend.app.services.llm.providers.openai_provider import OpenAIProvider

logger = logging.getLogger("designkaro.llm.factory")


class ProviderRegistry:
    """
    Extensible registry of LLM providers.
    Enables adding new providers without modifying AI Mentor, Review Engine, or Interview Engine.
    """

    _registry: dict[str, Type[BaseLLMProvider]] = {}
    _metadata: dict[str, dict[str, Any]] = {}

    @classmethod
    def register(cls, name: str, provider_cls: Type[BaseLLMProvider], metadata: dict[str, Any]):
        norm_name = name.strip().lower()
        cls._registry[norm_name] = provider_cls
        cls._metadata[norm_name] = metadata
        logger.info("Registered LLM provider: %s", norm_name)

    @classmethod
    def get(cls, name: str) -> Type[BaseLLMProvider] | None:
        return cls._registry.get(name.strip().lower())

    @classmethod
    def get_metadata(cls, name: str) -> dict[str, Any] | None:
        return cls._metadata.get(name.strip().lower())

    @classmethod
    def list_all(cls) -> dict[str, dict[str, Any]]:
        return dict(cls._metadata)

    @classmethod
    def create(
        cls,
        name: str,
        api_key: str = "",
        model: str | None = None,
        base_url: str | None = None,
    ) -> BaseLLMProvider:
        norm = name.strip().lower()
        provider_cls = cls.get(norm)
        if not provider_cls:
            logger.warning("Unregistered provider '%s'; defaulting to local Ollama.", name)
            return OllamaProvider()

        if norm == "ollama":
            return provider_cls(
                base_url=base_url or settings.OLLAMA_BASE_URL,
                model=model or settings.OLLAMA_MODEL,
            )
        elif norm == "gemini":
            return provider_cls(
                api_key=api_key,
                model=model or "gemini-1.5-flash",
            )
        elif norm == "openai":
            return provider_cls(
                api_key=api_key,
                base_url=base_url,
                model=model or "gpt-4o-mini",
            )
        elif norm == "anthropic":
            return provider_cls(
                api_key=api_key,
                model=model or "claude-3-5-sonnet-20241022",
            )
        else:
            # Generic instantiation for future registered providers
            return provider_cls(api_key=api_key, model=model, base_url=base_url)


# Register initial supported providers
ProviderRegistry.register(
    "ollama",
    OllamaProvider,
    {
        "name": "Ollama (Local Development)",
        "type": "local",
        "requires_key": False,
        "default_model": "llama3.2:3b",
        "recommended_models": ["llama3.2:3b", "qwen2.5:3b", "mistral:7b"],
        "description": "Zero external API calls. Runs locally on your machine via Ollama daemon. Optimal for RTX 4050 6GB VRAM.",
    },
)
ProviderRegistry.register(
    "gemini",
    GeminiProvider,
    {
        "name": "Google Gemini (BYOK)",
        "type": "cloud",
        "requires_key": True,
        "default_model": "gemini-1.5-flash",
        "recommended_models": ["gemini-1.5-flash", "gemini-1.5-pro"],
        "description": "High-throughput, generous free-tier cloud reasoning. Requires Google AI Studio API key.",
    },
)
ProviderRegistry.register(
    "openai",
    OpenAIProvider,
    {
        "name": "OpenAI (BYOK)",
        "type": "cloud",
        "requires_key": True,
        "default_model": "gpt-4o-mini",
        "recommended_models": ["gpt-4o-mini", "gpt-4o"],
        "description": "Industry benchmark reasoning via OpenAI platform. Requires OpenAI API key.",
    },
)
ProviderRegistry.register(
    "anthropic",
    AnthropicProvider,
    {
        "name": "Anthropic Claude (BYOK)",
        "type": "cloud",
        "requires_key": True,
        "default_model": "claude-3-5-sonnet-20241022",
        "recommended_models": ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
        "description": "Deep architectural reasoning and systems design analysis. Requires Anthropic API key.",
    },
)

SUPPORTED_PROVIDERS = ProviderRegistry.list_all()


def create_provider_instance(
    provider_name: str,
    api_key: str = "",
    model: str | None = None,
    base_url: str | None = None,
) -> BaseLLMProvider:
    """Delegates to ProviderRegistry.create."""
    return ProviderRegistry.create(
        name=provider_name,
        api_key=api_key,
        model=model,
        base_url=base_url,
    )


async def get_active_provider_for_user(
    db: AsyncSession | None = None,
    user: User | None = None,
) -> BaseLLMProvider:
    """
    Resolves the active LLM provider for the given user with strict environment separation:
    - In Development: Returns user BYOK provider if configured, or default local Ollama.
    - In Production: Requires an active user BYOK provider (Gemini, OpenAI, Anthropic).
      Prevents accidental leakage to Ollama unless ALLOW_OLLAMA_IN_PRODUCTION is set.
    """
    if user and db:
        try:
            stmt = (
                select(UserLLMProvider)
                .where(
                    UserLLMProvider.user_id == user.id,
                    UserLLMProvider.is_active.is_(True),
                )
                .order_by(UserLLMProvider.updated_at.desc())
            )
            result = await db.execute(stmt)
            config = result.scalar_one_or_none()

            if config:
                decrypted_key = decrypt_api_key(config.encrypted_api_key)
                return create_provider_instance(
                    provider_name=config.provider,
                    api_key=decrypted_key,
                    model=config.model,
                    base_url=config.base_url,
                )
        except Exception as exc:
            logger.error("Failed to load user LLM provider config: %s", exc)

    # In Production environment: Enforce BYOK requirement
    if settings.ENVIRONMENT == "production" and not settings.ALLOW_OLLAMA_IN_PRODUCTION:
        raise ProviderConfigurationError(
            "Production mode requires an active BYOK provider (Google Gemini, OpenAI, or Anthropic). "
            "Please configure your API key in AI Model settings.",
            provider="byok",
        )

    # In Development environment: Default to local Ollama
    return create_provider_instance(
        provider_name=settings.LLM_PROVIDER,
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_MODEL,
    )
