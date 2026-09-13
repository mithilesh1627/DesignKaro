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

logger = logging.getLogger("designkaro.llm.openai")


class OpenAIProvider(CommonLLMProvider):
    """
    OpenAI BYOK LLM Provider (Chat Completions API).
    Standard REST implementation; also supports OpenAI-compatible gateways.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str | None = None,
        model: str = "gpt-4o-mini",
    ):
        self._api_key = (api_key or "").strip()
        self._base_url = (base_url or "https://api.openai.com/v1").rstrip("/")
        self._default_model = model or "gpt-4o-mini"
        self._timeout = settings.LLM_TIMEOUT_SECONDS

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def default_model(self) -> str:
        return self._default_model

    def get_capabilities(self):
        from backend.app.services.llm.models import ProviderCapabilities
        return ProviderCapabilities(
            streaming=True,
            system_prompt_supported=True,
            multi_turn=True,
            max_context_tokens=16384,
            requires_api_key=True,
            is_local=False,
        )

    def validate_configuration(self) -> tuple[bool, str | None]:
        if not self._api_key or not self._api_key.strip():
            return False, "OpenAI API key is required"
        return True, None

    def _get_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    def _handle_error_status(self, response: httpx.Response, model: str):
        code = response.status_code
        try:
            body = response.json()
            msg = body.get("error", {}).get("message", response.text)
        except Exception:
            msg = response.text

        if code in (401, 403):
            raise ProviderAuthenticationError(
                f"OpenAI Authentication Failed: {msg}",
                provider=self.provider_name,
                status_code=code,
            )
        elif code == 429:
            raise RateLimitError(
                f"OpenAI Rate Limit Exceeded: {msg}",
                provider=self.provider_name,
                status_code=429,
            )
        elif code == 404:
            raise ModelNotFoundError(
                f"OpenAI model '{model}' not found: {msg}",
                provider=self.provider_name,
                status_code=404,
            )
        elif "context_length_exceeded" in msg.lower() or "maximum context length" in msg.lower():
            raise ContextLengthExceededError(
                f"OpenAI Context Length Exceeded: {msg}",
                provider=self.provider_name,
                status_code=400,
            )
        else:
            raise LLMError(
                f"OpenAI Error (HTTP {code}): {msg}",
                provider=self.provider_name,
                status_code=code,
            )

    async def generate(self, request: LLMRequest) -> LLMResponse:
        if not self._api_key:
            raise ProviderAuthenticationError("OpenAI API key is required", provider=self.provider_name)

        model = request.model or self._default_model
        messages = self.prepare_messages_list(request)
        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": False,
        }

        endpoint = f"{self._base_url}/chat/completions"
        start_time = time.perf_counter()

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(endpoint, json=payload, headers=self._get_headers())
                if response.status_code != 200:
                    self._handle_error_status(response, model)
                data = response.json()
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.TimeoutException) as exc:
            raise ProviderUnavailableError(
                f"Unable to connect to OpenAI API: {exc}",
                provider=self.provider_name,
            ) from exc

        choice = data.get("choices", [{}])[0]
        content = choice.get("message", {}).get("content", "")
        usage_info = data.get("usage", {})

        return LLMResponse(
            content=content,
            model=model,
            provider=self.provider_name,
            usage=LLMUsage(
                prompt_tokens=usage_info.get("prompt_tokens", 0),
                completion_tokens=usage_info.get("completion_tokens", 0),
                total_tokens=usage_info.get("total_tokens", 0),
            ),
            latency_ms=self.calculate_latency_ms(start_time),
            raw_response=data,
        )

    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMStreamChunk]:
        if not self._api_key:
            raise ProviderAuthenticationError("OpenAI API key is required", provider=self.provider_name)

        model = request.model or self._default_model
        messages = self.prepare_messages_list(request)
        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": True,
        }

        endpoint = f"{self._base_url}/chat/completions"

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
                        if data_str == "[DONE]":
                            yield LLMStreamChunk(delta="", finish_reason="stop")
                            break
                        try:
                            chunk = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue

                        choices = chunk.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {}).get("content", "")
                            finish_reason = choices[0].get("finish_reason")
                            if delta or finish_reason:
                                yield LLMStreamChunk(delta=delta, finish_reason=finish_reason)

        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.TimeoutException) as exc:
            raise ProviderUnavailableError(
                f"Connection error during OpenAI streaming: {exc}",
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
        endpoint = f"{self._base_url}/models"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(endpoint, headers=self._get_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get("id", "") for m in data.get("data", []) if "gpt" in m.get("id", "")]
                    return ProviderHealthStatus(
                        provider=self.provider_name,
                        available=True,
                        model=self._default_model,
                        latency_ms=self.calculate_latency_ms(start_time),
                        models_available=models[:10],
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
