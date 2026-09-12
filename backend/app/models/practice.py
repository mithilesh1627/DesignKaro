import uuid
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.learning import Lesson
    from backend.app.models.user import User


class Question(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "questions"

    lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # beginner, intermediate, advanced
    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirements: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    constraints: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    expected_scale: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    hints: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    evaluation_criteria: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    lesson: Mapped[Optional["Lesson"]] = relationship("Lesson", back_populates="questions")
    attempts: Mapped[list["QuestionAttempt"]] = relationship(
        "QuestionAttempt", back_populates="question", cascade="all, delete-orphan"
    )


class QuestionAttempt(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "question_attempts"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(32), default="in_progress", nullable=False
    )  # in_progress, passed, failed
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    feedback: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="attempts")
    question: Mapped["Question"] = relationship("Question", back_populates="attempts")
