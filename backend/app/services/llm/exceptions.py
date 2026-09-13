from typing import Any


class LLMError(Exception):
    """Base exception for all LLM service errors."""

    def __init__(
        self,
        message: str,
        provider: str = "unknown",
        status_code: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.provider = provider
        self.status_code = status_code
        self.details = details or {}

    def __str__(self) -> str:
        return f"[{self.provider.upper()}] {self.message}"


class ProviderConfigurationError(LLMError):
    """Raised when provider configuration is invalid or missing required fields."""
    pass


class ProviderUnavailableError(LLMError):
    """Raised when the LLM provider host is unreachable or connection refused."""
    pass


class ProviderTimeoutError(LLMError):
    """Raised when the LLM provider times out during generation."""
    pass


class ProviderAuthenticationError(LLMError):
    """Raised when API key is invalid, missing, or unauthorized."""
    pass


class ProviderRateLimitError(LLMError):
    """Raised when the provider rejects the request due to rate-limiting (HTTP 429)."""
    pass


# Backward compatible alias
RateLimitError = ProviderRateLimitError


class ContextLengthExceededError(LLMError):
    """Raised when the prompt token count exceeds the provider's context window."""
    pass


class ModelNotFoundError(LLMError):
    """Raised when the specified model does not exist or has not been pulled in Ollama."""
    pass


class LLMGenerationError(LLMError):
    """Raised when the provider fails to generate completion tokens."""
    pass


class EncryptionError(Exception):
    """Raised when API key encryption or decryption fails."""
    pass
