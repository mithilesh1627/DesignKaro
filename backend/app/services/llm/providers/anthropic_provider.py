import json
import logging
import time
from collections.abc import AsyncIterator

import httpx

from backend.app.core.config import settings
from backend.app.services.llm.exceptions import (
    ContextLengthExceededError,
    LLMError,
    ModelNotFoundError,
    ProviderAuthenticationError,
    ProviderUnavailableError,
    RateLimitError,
)
from backend.app.services.llm.models import (
    LLMRequest,
    LLMResponse,
    LLMStreamChunk,
    LLMUsage,
    ProviderHealthStatus,
)
from backend.app.services.llm.providers.base import CommonLLMProvider

logger = logging.getLogger("designkaro.llm.anthropic")


class AnthropicProvider(CommonLLMProvider):
    """
    Anthropic Claude BYOK LLM Provider (Messages API).
    Standard REST implementation with system prompt top-level separation.
    """

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        self._api_key = (api_key or "").strip()
        self._default_model = model or "claude-3-5-sonnet-20241022"
        self._timeout = settings.LLM_TIMEOUT_SECONDS

    @property
    def provider_name(self) -> str:
        return "anthropic"

    @property
    def default_model(self) -> str:
        return self._default_model

    def get_capabilities(self):
        from backend.app.services.llm.models import ProviderCapabilities
        return ProviderCapabilities(
            streaming=True,
            system_prompt_supported=True,
            multi_turn=True,
            max_context_tokens=32768,
            requires_api_key=True,
            is_local=False,
        )

    def validate_configuration(self) -> tuple[bool, str | None]:
        if not self._api_key or not self._api_key.strip():
            return False, "Anthropic API key is required"
        return True, None

    def _get_headers(self) -> dict[str, str]:
        return {
            "x-api-key": self._api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

    def _build_payload(self, request: LLMRequest, stream: bool = False) -> dict:
        messages = []
        for m in request.messages:
            if m.role in ("user", "assistant"):
                messages.append({"role": m.role, "content": m.content})

        if request.prompt and request.prompt.strip():
            messages.append({"role": "user", "content": request.prompt.strip()})

        if not messages:
            messages.append({"role": "user", "content": "Hello"})

        payload = {
            "model": request.model or self._default_model,
            "messages": messages,
            "max_tokens": request.max_tokens or 2048,
            "temperature": request.temperature,
            "stream": stream,
        }

        if request.system_prompt and request.system_prompt.strip():
            payload["system"] = request.system_prompt.strip()

        return payload

    def _handle_error_status(self, response: httpx.Response, model: str):
        code = response.status_code
        try:
            body = response.json()
            err = body.get("error", {})
            msg = err.get("message", response.text)
            err_type = err.get("type", "")
        except Exception:
            msg = response.text
            err_type = ""

        if code in (401, 403) or "authentication_error" in err_type:
            raise ProviderAuthenticationError(
                f"Anthropic Authentication Failed: {msg}",
                provider=self.provider_name,
                status_code=code,
            )
        elif code == 429 or "rate_limit_error" in err_type:
            raise RateLimitError(
                f"Anthropic Rate Limit Exceeded: {msg}",
                provider=self.provider_name,
                status_code=429,
            )
        elif code == 404 or "not_found_error" in err_type:
            raise ModelNotFoundError(
                f"Anthropic model '{model}' not found: {msg}",
                provider=self.provider_name,
                status_code=404,
            )
        elif "prompt_too_long" in err_type or "context" in msg.lower():
            raise ContextLengthExceededError(
                f"Anthropic Context Length Exceeded: {msg}",
                provider=self.provider_name,
                status_code=400,
            )
        else:
            raise LLMError(
                f"Anthropic Error (HTTP {code}): {msg}",
                provider=self.provider_name,
                status_code=code,
            )

    async def generate(self, request: LLMRequest) -> LLMResponse:
        if not self._api_key:
            raise ProviderAuthenticationError("Anthropic API key is required", provider=self.provider_name)

        model = request.model or self._default_model
        payload = self._build_payload(request, stream=False)
        endpoint = "https://api.anthropic.com/v1/messages"
        start_time = time.perf_counter()

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(endpoint, json=payload, headers=self._get_headers())
                if response.status_code != 200:
                    self._handle_error_status(response, model)
                data = response.json()
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.TimeoutException) as exc:
            raise ProviderUnavailableError(
                f"Unable to connect to Anthropic API: {exc}",
                provider=self.provider_name,
            ) from exc

        content_parts = data.get("content", [])
        content = "".join(p.get("text", "") for p in content_parts if p.get("type") == "text")
        usage = data.get("usage", {})

        return LLMResponse(
            content=content,
            model=model,
            provider=self.provider_name,
            usage=LLMUsage(
                prompt_tokens=usage.get("input_tokens", 0),
                completion_tokens=usage.get("output_tokens", 0),
                total_tokens=usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
            ),
            latency_ms=self.calculate_latency_ms(start_time),
            raw_response=data,
        )

    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMStreamChunk]:
        if not self._api_key:
            raise ProviderAuthenticationError("Anthropic API key is required", provider=self.provider_name)

        model = request.model or self._default_model
        payload = self._build_payload(request, stream=True)
        endpoint = "https://api.anthropic.com/v1/messages"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                async with client.stream("POST", endpoint, json=payload, headers=self._get_headers()) as response:
                    if response.status_code != 200:
                        await response.aread()
                        self._handle_error_status(response, model)

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if not data_str:
                            continue
                        try:
                            chunk = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue

                        event_type = chunk.get("type")
                        if event_type == "content_block_delta":
                            delta = chunk.get("delta", {}).get("text", "")
                            if delta:
                                yield LLMStreamChunk(delta=delta)
                        elif event_type == "message_delta":
                            finish_reason = chunk.get("delta", {}).get("stop_reason")
                            if finish_reason:
                                yield LLMStreamChunk(delta="", finish_reason=finish_reason)

        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.TimeoutException) as exc:
            raise ProviderUnavailableError(
                f"Connection error during Anthropic streaming: {exc}",
                provider=self.provider_name,
            ) from exc

    async def health_check(self) -> ProviderHealthStatus:
        start_time = time.perf_counter()
        if not self._api_key:
            return ProviderHealthStatus(
                provider=self.provider_name,
                available=False,
                model=self._default_model,
                error_message="API key not configured",
            )
        # Test minimal authentication by validating API key with a 1-token query
        endpoint = "https://api.anthropic.com/v1/messages"
        payload = {
            "model": self._default_model,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(endpoint, json=payload, headers=self._get_headers())
                if resp.status_code == 200:
                    return ProviderHealthStatus(
                        provider=self.provider_name,
                        available=True,
                        model=self._default_model,
                        latency_ms=self.calculate_latency_ms(start_time),
                        models_available=["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
                    )
                return ProviderHealthStatus(
                    provider=self.provider_name,
                    available=False,
                    model=self._default_model,
                    latency_ms=self.calculate_latency_ms(start_time),
                    error_message=f"HTTP {resp.status_code}: {resp.text[:100]}",
                )
        except Exception as exc:
            return ProviderHealthStatus(
                provider=self.provider_name,
                available=False,
                model=self._default_model,
                latency_ms=self.calculate_latency_ms(start_time),
                error_message=str(exc),
            )
