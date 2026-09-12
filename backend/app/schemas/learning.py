import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class LessonSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    estimated_minutes: int
    order_index: int
    is_completed: bool = False


class TopicSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    description: str
    track: str
    order_index: int
    icon: str | None = None
    lesson_count: int = 0
    completed_count: int = 0


class TopicDetail(TopicSummary):
    lessons: list[LessonSummary] = []


class LessonDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    topic_id: uuid.UUID
    topic_slug: str
    topic_title: str
    content_markdown: str
    estimated_minutes: int
    order_index: int
    is_completed: bool = False
    next_lesson_slug: str | None = None
    prev_lesson_slug: str | None = None


class LessonCompletionRequest(BaseModel):
    notes: str | None = None


class LessonCompletionResponse(BaseModel):
    lesson_id: uuid.UUID
    is_completed: bool
    completed_at: datetime.datetime
    xp_earned: int = 50
    updated_mastery_score: int


class TrackProgress(BaseModel):
    track: str
    total_lessons: int
    completed_lessons: int
    percentage: float


class UserProgressResponse(BaseModel):
    total_lessons: int
    completed_lessons: int
    overall_percentage: float
    tracks: list[TrackProgress]
    recent_completions: list[str] = []
