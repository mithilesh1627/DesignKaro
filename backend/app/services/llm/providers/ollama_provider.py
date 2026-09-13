import json
import logging
import time
from collections.abc import AsyncIterator

import httpx

from backend.app.core.config import settings
from backend.app.services.llm.exceptions import (
    LLMError,
    LLMGenerationError,
    ModelNotFoundError,
    ProviderConfigurationError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from backend.app.services.llm.models import (
    LLMRequest,
    LLMResponse,
    LLMStreamChunk,
    LLMUsage,
    ProviderCapabilities,
    ProviderHealthStatus,
    ProviderState,
)
from backend.app.services.llm.providers.base import CommonLLMProvider

logger = logging.getLogger("designkaro.llm.ollama")


class OllamaProvider(CommonLLMProvider):
    """
    Local Ollama LLM Provider for Development.
    Communicates with local Ollama daemon (default: http://localhost:11434).
    Zero cloud dependencies, zero external network calls, zero API keys required.
    """

    def __init__(self, base_url: str | None = None, model: str | None = None):
        self._base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self._default_model = model or settings.OLLAMA_MODEL
        self._timeout = settings.LLM_TIMEOUT_SECONDS

    @property
    def provider_name(self) -> str:
        return "ollama"

    @property
    def default_model(self) -> str:
        return self._default_model

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            streaming=True,
            system_prompt_supported=True,
            multi_turn=True,
            max_context_tokens=settings.LLM_MAX_INPUT_TOKENS,
            requires_api_key=False,
            is_local=True,
        )

    def validate_configuration(self) -> tuple[bool, str | None]:
        if not self._base_url.startswith(("http://", "https://")):
            return False, f"Invalid Ollama base URL: {self._base_url}"
        if not self._default_model.strip():
            return False, "Ollama model name cannot be empty"
        return True, None

    async def list_models(self) -> list[str]:
        status = await self.health_check()
        return status.models_available

    async def generate(self, request: LLMRequest) -> LLMResponse:
        model = request.model or self._default_model
        messages = self.prepare_messages_list(request)
        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "options": {
                "temperature": request.temperature,
                "num_predict": request.max_tokens,
            },
            "stream": False,
        }

        start_time = time.perf_counter()
        endpoint = f"{self._base_url}/api/chat"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(endpoint, json=payload)

                if response.status_code == 404:
                    raise ModelNotFoundError(
                        f"Ollama model '{model}' not found. Run: 'ollama pull {model}'",
                        provider=self.provider_name,
                        status_code=404,
                    )
                if response.status_code >= 400:
                    raise LLMGenerationError(
                        f"Ollama error (HTTP {response.status_code}): {response.text}",
                        provider=self.provider_name,
                        status_code=response.status_code,
                    )
                data = response.json()

        except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
            logger.warning("Ollama daemon unreachable at %s: %s", self._base_url, exc)
            raise ProviderUnavailableError(
                f"Ollama daemon is offline at {self._base_url}. Ensure Ollama is running ('ollama serve').",
                provider=self.provider_name,
            ) from exc
        except httpx.TimeoutException as exc:
            logger.warning("Ollama inference timed out after %ss: %s", self._timeout, exc)
            raise ProviderTimeoutError(
                f"Ollama generation timed out after {self._timeout}s.",
                provider=self.provider_name,
            ) from exc
        except (ModelNotFoundError, ProviderUnavailableError, ProviderTimeoutError, LLMGenerationError):
            raise
        except Exception as exc:
            logger.error("Unexpected Ollama error: %s", exc)
            raise LLMError(f"Ollama error: {exc}", provider=self.provider_name) from exc

        content = data.get("message", {}).get("content", "")
        prompt_tokens = data.get("prompt_eval_count") or self.estimate_tokens(
            " ".join(m.content for m in messages)
        )
        completion_tokens = data.get("eval_count") or self.estimate_tokens(content)

        return LLMResponse(
            content=content,
            model=model,
            provider=self.provider_name,
            source="llm",
            usage=LLMUsage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
            ),
            latency_ms=self.calculate_latency_ms(start_time),
            raw_response=data,
        )

    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMStreamChunk]:
        model = request.model or self._default_model
        messages = self.prepare_messages_list(request)
        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "options": {
                "temperature": request.temperature,
                "num_predict": request.max_tokens,
            },
            "stream": True,
        }

        endpoint = f"{self._base_url}/api/chat"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                async with client.stream("POST", endpoint, json=payload) as response:
                    if response.status_code == 404:
                        raise ModelNotFoundError(
                            f"Ollama model '{model}' not found. Run: 'ollama pull {model}'",
                            provider=self.provider_name,
                            status_code=404,
                        )
                    if response.status_code >= 400:
                        raw_err = await response.aread()
                        raise LLMGenerationError(
                            f"Ollama streaming error (HTTP {response.status_code}): {raw_err.decode('utf-8', errors='ignore')}",
                            provider=self.provider_name,
                            status_code=response.status_code,
                        )

                    async for line in response.aiter_lines():
                        if not line or not line.strip():
                            continue
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        delta = chunk.get("message", {}).get("content", "")
                        done = chunk.get("done", False)
                        finish_reason = "stop" if done else None

                        if delta or done:
                            yield LLMStreamChunk(delta=delta, finish_reason=finish_reason, source="llm")

        except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
            logger.warning("Ollama daemon unreachable during stream: %s", exc)
            raise ProviderUnavailableError(
                f"Ollama daemon is offline at {self._base_url}.",
                provider=self.provider_name,
            ) from exc
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"Ollama stream timed out after {self._timeout}s.",
                provider=self.provider_name,
            ) from exc
        except (ModelNotFoundError, ProviderUnavailableError, ProviderTimeoutError, LLMGenerationError):
            raise
        except Exception as exc:
            logger.error("Ollama streaming error: %s", exc)
            raise LLMError(f"Ollama streaming failed: {exc}", provider=self.provider_name) from exc

    async def health_check(self) -> ProviderHealthStatus:
        start_time = time.perf_counter()
        endpoint = f"{self._base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(endpoint)
                if response.status_code == 200:
                    data = response.json()
                    models = [m.get("name", "") for m in data.get("models", []) if m.get("name")]
                    
                    if not models:
                        state = ProviderState.STATE_B_NO_MODELS
                        is_ready = False
                        err_msg = f"Ollama daemon running with 0 models. Run: 'ollama pull {self._default_model}'"
                    else:
                        model_installed = any(
                            self._default_model in m or m.startswith(self._default_model.split(":")[0])
                            for m in models
                        )
                        if model_installed:
                            state = ProviderState.STATE_D_READY
                            is_ready = True
                            err_msg = None
                        else:
                            state = ProviderState.STATE_C_MODEL_MISSING
                            is_ready = False
                            err_msg = f"Configured model '{self._default_model}' missing. Run: 'ollama pull {self._default_model}'"

                    return ProviderHealthStatus(
                        provider=self.provider_name,
                        available=is_ready,
                        state=state,
                        model=self._default_model,
                        latency_ms=self.calculate_latency_ms(start_time),
                        models_available=models,
                        error_message=err_msg,
                    )
                return ProviderHealthStatus(
                    provider=self.provider_name,
                    available=False,
                    state=ProviderState.STATE_E_GENERATION_ERROR,
                    model=self._default_model,
                    latency_ms=self.calculate_latency_ms(start_time),
                    error_message=f"HTTP {response.status_code}: {response.text[:100]}",
                )
        except httpx.TimeoutException:
            return ProviderHealthStatus(
                provider=self.provider_name,
                available=False,
                state=ProviderState.TIMEOUT,
                model=self._default_model,
                latency_ms=self.calculate_latency_ms(start_time),
                error_message=f"Ollama connection timed out at {self._base_url}",
            )
        except Exception as exc:
            return ProviderHealthStatus(
                provider=self.provider_name,
                available=False,
                state=ProviderState.STATE_A_OFFLINE,
                model=self._default_model,
                latency_ms=self.calculate_latency_ms(start_time),
                error_message=f"Ollama offline at {self._base_url} ({exc.__class__.__name__})",
            )
