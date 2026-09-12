import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.design import DesignSummary


class SkillMastery(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    category: str
    description: str
    mastery_score: int = Field(default=0, ge=0, le=100)

    model_config = ConfigDict(from_attributes=True)


class AchievementItem(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str
    badge_icon: str
    xp_reward: int
    is_unlocked: bool = False
    unlocked_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class DashboardResponse(BaseModel):
    readiness_score: int = Field(..., ge=0, le=100)
    current_rank: str
    target_role: str
    total_xp: int
    streak_days: int
    completed_lessons_count: int
    solved_problems_count: int
    designs_created_count: int
    interviews_completed_count: int
    skills: list[SkillMastery]
    achievements: list[AchievementItem]
    recent_designs: list[DesignSummary]
    recommendations: list[str]

    model_config = ConfigDict(from_attributes=True)
