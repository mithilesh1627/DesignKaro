import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.user import User


class Interview(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "interviews"

    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    target_role: Mapped[str] = mapped_column(String(64), nullable=False)  # Senior, Staff, Principal
    scenario_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    scale_target: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    rubric: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    sessions: Mapped[list["InterviewSession"]] = relationship(
        "InterviewSession", back_populates="interview", cascade="all, delete-orphan"
    )


class InterviewSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "interview_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    interview_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="in_progress", nullable=False)
    final_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    scorecard: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User")
    interview: Mapped["Interview"] = relationship("Interview", back_populates="sessions")
    messages: Mapped[list["InterviewMessage"]] = relationship(
        "InterviewMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="InterviewMessage.created_at",
    )


class InterviewMessage(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "interview_messages"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender: Mapped[str] = mapped_column(String(32), nullable=False)  # candidate, interviewer, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    audio_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    session: Mapped["InterviewSession"] = relationship("InterviewSession", back_populates="messages")
