import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.practice import Question


class Topic(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "topics"

    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    track: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # beginner, intermediate, advanced, ml
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    icon: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Relationships
    lessons: Mapped[list["Lesson"]] = relationship(
        "Lesson",
        back_populates="topic",
        cascade="all, delete-orphan",
        order_by="Lesson.order_index",
    )
    dependencies: Mapped[list["TopicDependency"]] = relationship(
        "TopicDependency",
        foreign_keys="TopicDependency.topic_id",
        back_populates="topic",
        cascade="all, delete-orphan",
    )


class TopicDependency(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "topic_dependencies"

    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    prerequisite_topic_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Relationships
    topic: Mapped["Topic"] = relationship("Topic", foreign_keys=[topic_id], back_populates="dependencies")
    prerequisite: Mapped["Topic"] = relationship("Topic", foreign_keys=[prerequisite_topic_id])


class Lesson(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "lessons"

    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    topic: Mapped["Topic"] = relationship("Topic", back_populates="lessons")
    questions: Mapped[list["Question"]] = relationship(
        "Question", back_populates="lesson", cascade="all, delete-orphan"
    )
