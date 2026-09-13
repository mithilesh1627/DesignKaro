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
    ChatMessage,
    LLMRequest,
    LLMResponse,
    LLMStreamChunk,
    LLMUsage,
    ProviderHealthStatus,
)
from backend.app.services.llm.providers.base import CommonLLMProvider

logger = logging.getLogger("designkaro.llm.gemini")


class GeminiProvider(CommonLLMProvider):
    """
    Google Gemini BYOK LLM Provider (via REST API v1beta).
    Uses official HTTP endpoints; no third-party SDK dependencies required.
    """

    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        self._api_key = (api_key or "").strip()
        self._default_model = model or "gemini-1.5-flash"
        self._timeout = settings.LLM_TIMEOUT_SECONDS

    @property
    def provider_name(self) -> str:
        return "gemini"

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
            return False, "Gemini API key is required"
        return True, None

    def _build_payload(self, request: LLMRequest) -> dict:
        messages = self.prepare_messages_list(request)
        contents = []
        system_instructions = []

        for m in messages:
            if m.role == "system":
                system_instructions.append({"text": m.content})
            elif m.role == "assistant":
                contents.append({"role": "model", "parts": [{"text": m.content}]})
            else:
                contents.append({"role": "user", "parts": [{"text": m.content}]})

        # Ensure at least one user message exists
        if not contents:
            contents.append({"role": "user", "parts": [{"text": "Hello"}]})

        payload: dict = {
            "contents": contents,
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
            },
        }

        if system_instructions:
            payload["systemInstruction"] = {"parts": system_instructions}

        return payload

    def _handle_error_status(self, response: httpx.Response, model: str):
        code = response.status_code
        try:
            body = response.json()
            msg = body.get("error", {}).get("message", response.text)
        except Exception:
            msg = response.text

        if code in (401, 403) or "API_KEY" in msg:
            raise ProviderAuthenticationError(
                f"Google Gemini Authentication Failed: {msg}",
                provider=self.provider_name,
                status_code=code,
            )
        elif code == 429 or "RESOURCE_EXHAUSTED" in msg:
            raise RateLimitError(
                f"Google Gemini Rate Limit Exceeded: {msg}",
                provider=self.provider_name,
                status_code=429,
            )
        elif code == 404:
            raise ModelNotFoundError(
                f"Gemini model '{model}' not found: {msg}",
                provider=self.provider_name,
                status_code=404,
            )
        elif "token" in msg.lower() and "exceed" in msg.lower():
            raise ContextLengthExceededError(
                f"Gemini Context Length Exceeded: {msg}",
                provider=self.provider_name,
                status_code=400,
            )
        else:
            raise LLMError(
                f"Google Gemini Error (HTTP {code}): {msg}",
                provider=self.provider_name,
                status_code=code,
            )

    async def generate(self, request: LLMRequest) -> LLMResponse:
        if not self._api_key:
            raise ProviderAuthenticationError("Gemini API key is required", provider=self.provider_name)

        model = request.model or self._default_model
        payload = self._build_payload(request)
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self._api_key}"

        start_time = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(endpoint, json=payload)
                if response.status_code != 200:
                    self._handle_error_status(response, model)

                data = response.json()
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.TimeoutException) as exc:
            raise ProviderUnavailableError(
                f"Unable to connect to Google Gemini API: {exc}",
                provider=self.provider_name,
            ) from exc

        candidates = data.get("candidates", [])
        content = ""
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            content = "".join(p.get("text", "") for p in parts)

        metadata = data.get("usageMetadata", {})
        prompt_tokens = metadata.get("promptTokenCount", 0)
        completion_tokens = metadata.get("candidatesTokenCount", 0)

        return LLMResponse(
            content=content,
            model=model,
            provider=self.provider_name,
            usage=LLMUsage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=metadata.get("totalTokenCount", prompt_tokens + completion_tokens),
            ),
            latency_ms=self.calculate_latency_ms(start_time),
            raw_response=data,
        )

    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMStreamChunk]:
        if not self._api_key:
            raise ProviderAuthenticationError("Gemini API key is required", provider=self.provider_name)

        model = request.model or self._default_model
        payload = self._build_payload(request)
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={self._api_key}"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                async with client.stream("POST", endpoint, json=payload) as response:
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

                        candidates = chunk.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            delta = "".join(p.get("text", "") for p in parts)
                            finish_reason = candidates[0].get("finishReason")
                            if delta or finish_reason:
                                yield LLMStreamChunk(delta=delta, finish_reason=finish_reason)

        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.TimeoutException) as exc:
            raise ProviderUnavailableError(
                f"Connection error during Gemini streaming: {exc}",
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
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models?key={self._api_key}"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(endpoint)
                if resp.status_code == 200:
                    data = resp.json()
                    models = [
                        m.get("name", "").replace("models/", "")
                        for m in data.get("models", [])
                        if "generateContent" in m.get("supportedGenerationMethods", [])
                    ]
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
