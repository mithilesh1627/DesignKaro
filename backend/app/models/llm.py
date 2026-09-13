import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.user import User


class UserLLMProvider(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    User Bring-Your-Own-Key (BYOK) LLM Provider Configuration.
    Stores user-provided API keys encrypted at rest using server-side Fernet/AES encryption.
    Plaintext keys are NEVER persisted or returned via API.
    """

    __tablename__ = "user_llm_providers"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)  # "ollama" | "openai" | "anthropic" | "gemini"
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    encrypted_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    settings_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="llm_providers")

    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_provider"),
    )
