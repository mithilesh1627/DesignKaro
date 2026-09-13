import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field


class PrerequisiteNode(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    status: str = Field("available", description="completed, current, locked, available")


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
    difficulty: str = "Intermediate"
    estimated_minutes: int = 40
    mastery_percentage: float = 0.0
    first_lesson_slug: str | None = None
    prerequisites: list[PrerequisiteNode] = []


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


# ==============================================================================
# LEARN V2 DASHBOARD SCHEMAS
# ==============================================================================

class SkillDomain(BaseModel):
    slug: str
    name: str
    category: str
    mastery_score: int = Field(0, ge=0, le=100)
    status: str = Field("not_started", description="mastered, learning, needs_focus, not_started")
    topics_count: int = 1


class LearningPath(BaseModel):
    id: str
    title: str
    category: str
    description: str
    difficulty: str  # Beginner, Intermediate, Advanced
    concept_count: int
    estimated_minutes: int
    completion_percentage: float
    mastery_score: int
    prerequisites: list[str]
    is_locked: bool = False
    topics: list[str]
    first_lesson_slug: str | None = None


class LearningRecommendation(BaseModel):
    topic_slug: str
    topic_title: str
    lesson_slug: str
    lesson_title: str
    reason: str
    priority: str = Field("prerequisite_unlock", description="prerequisite_unlock, weakest_skill, continue_path, practice_weakness")
    target_domain: str
    estimated_minutes: int = 20


class CurrentLearningState(BaseModel):
    has_progress: bool = False
    topic_slug: str | None = None
    topic_title: str | None = None
    topic_description: str | None = None
    lesson_slug: str | None = None
    lesson_title: str | None = None
    lesson_index: int = 1
    total_lessons: int = 1
    progress_percentage: float = 0.0


class LearningOverviewResponse(BaseModel):
    overall_mastery: int = Field(0, ge=0, le=100)
    current_level: str = "Systems Apprentice"
    concepts_mastered: int = 0
    total_concepts: int = 11
    current_learning: CurrentLearningState | None = None
    strongest_domain: SkillDomain | None = None
    weakest_domain: SkillDomain | None = None
    recommended_domain: str | None = None
    recommendation: LearningRecommendation | None = None
    domains: list[SkillDomain] = []
    learning_paths: list[LearningPath] = []
    topics_prerequisites: dict[str, list[PrerequisiteNode]] = {}
    topics: list[TopicSummary] = []
