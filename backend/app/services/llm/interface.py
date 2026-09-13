from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Any

from backend.app.services.llm.models import (
    LLMRequest,
    LLMResponse,
    LLMStreamChunk,
    ProviderCapabilities,
    ProviderHealthStatus,
)


class BaseLLMProvider(ABC):
    """
    Abstract interface defining a uniform, provider-agnostic LLM contract.
    All providers (Ollama, Gemini, OpenAI, Anthropic) implement this interface.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Returns the provider name identifier (e.g. 'ollama', 'gemini', 'openai', 'anthropic')."""
        pass

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Returns the default model identifier for this provider."""
        pass

    @abstractmethod
    async def generate(self, request: LLMRequest) -> LLMResponse:
        """
        Executes a synchronous completion or multi-turn chat request.
        Returns a normalized LLMResponse.
        """
        pass

    @abstractmethod
    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMStreamChunk]:
        """
        Executes a streaming completion or chat request.
        Yields LLMStreamChunk tokens as they arrive via Server-Sent Events or HTTP chunks.
        """
        pass

    @abstractmethod
    async def health_check(self) -> ProviderHealthStatus:
        """
        Pings the provider or queries its models list to determine readiness.
        Does NOT raise exceptions; returns ProviderHealthStatus with available=False on failure.
        """
        pass

    def get_capabilities(self) -> ProviderCapabilities:
        """Returns capabilities of this provider (streaming, max context, auth requirements)."""
        return ProviderCapabilities()

    def validate_configuration(self) -> tuple[bool, str | None]:
        """Validates current provider configuration. Returns (is_valid, error_message)."""
        return True, None

    async def list_models(self) -> list[str]:
        """Returns list of models supported or installed for this provider."""
        return [self.default_model]
