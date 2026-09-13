from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class ProviderInfo(BaseModel):
    provider: str
    name: str
    type: str  # "local" | "cloud"
    requires_key: bool
    default_model: str
    recommended_models: list[str] = Field(default_factory=list)
    description: str
    is_available: bool = False
    status_detail: str | None = None


class UserProviderConfigSummary(BaseModel):
    provider: str
    model: str
    masked_api_key: str | None = None
    base_url: str | None = None
    is_active: bool
    updated_at: datetime | None = None


class UserLLMSettingsResponse(BaseModel):
    active_provider: str
    active_model: str
    configured_providers: list[UserProviderConfigSummary] = Field(default_factory=list)
    available_providers: list[ProviderInfo] = Field(default_factory=list)


class SaveLLMProviderSettingsRequest(BaseModel):
    provider: str = Field(..., min_length=2, max_length=32)
    model: str = Field(..., min_length=1, max_length=128)
    api_key: str | None = Field(default=None, max_length=512)
    base_url: str | None = Field(default=None, max_length=512)
    set_as_active: bool = True
    settings_metadata: dict[str, Any] = Field(default_factory=dict)


class TestLLMConnectionRequest(BaseModel):
    __test__ = False
    provider: str = Field(..., min_length=2, max_length=32)
    api_key: str | None = None
    model: str | None = None
    base_url: str | None = None


class TestLLMConnectionResponse(BaseModel):
    __test__ = False
    success: bool
    provider: str
    model: str
    latency_ms: float | None = None
    sample_response: str | None = None
    error_message: str | None = None
