from enum import Enum
from typing import Any, Literal
from pydantic import BaseModel, Field


class ProviderState(str, Enum):
    STATE_A_OFFLINE = "OFFLINE"
    STATE_B_NO_MODELS = "DAEMON_RUNNING_NO_MODEL"
    STATE_C_MODEL_MISSING = "MODEL_NOT_FOUND"
    STATE_D_READY = "READY"
    STATE_E_GENERATION_ERROR = "GENERATION_ERROR"
    TIMEOUT = "TIMEOUT"


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class LLMUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class LLMRequest(BaseModel):
    prompt: str | None = None
    messages: list[ChatMessage] = Field(default_factory=list)
    system_prompt: str | None = None
    model: str | None = None
    temperature: float = 0.2
    max_tokens: int = 2048
    stream: bool = False
    stop: list[str] | None = None


class LLMResponse(BaseModel):
    content: str
    model: str
    provider: str
    source: Literal["llm", "deterministic"] = "llm"
    usage: LLMUsage = Field(default_factory=LLMUsage)
    latency_ms: float = 0.0
    fallback_used: bool = False
    fallback_reason: str | None = None
    raw_response: dict[str, Any] | None = None


class LLMStreamChunk(BaseModel):
    delta: str
    finish_reason: str | None = None
    source: Literal["llm", "deterministic"] = "llm"


class ProviderCapabilities(BaseModel):
    streaming: bool = True
    system_prompt_supported: bool = True
    multi_turn: bool = True
    max_context_tokens: int = 4096
    requires_api_key: bool = False
    is_local: bool = False


class ProviderHealthStatus(BaseModel):
    provider: str
    available: bool
    state: ProviderState = ProviderState.STATE_A_OFFLINE
    model: str
    latency_ms: float | None = None
    error_message: str | None = None
    models_available: list[str] = Field(default_factory=list)


class LLMDiagnostics(BaseModel):
    environment: str
    provider: str
    ollama_state: ProviderState
    ollama_version: str | None = None
    configured_model: str
    installed_models: list[str] = Field(default_factory=list)
    model_status: str
    gpu_name: str | None = None
    gpu_vram_total_mb: int | None = None
    gpu_vram_free_mb: int | None = None
    system_ram_total_mb: int | None = None
    system_ram_free_mb: int | None = None
    cpu_name: str | None = None
    recommended_model: str = "llama3.2:3b"
    recommended_pull_command: str = "ollama pull llama3.2:3b"
    recommended_reason: str = "Optimized for 6GB VRAM on RTX 4050, sub-100ms first token latency, high Socratic reasoning."
