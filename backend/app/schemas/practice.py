import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class HintSchema(BaseModel):
    level: int = Field(..., description="1 = Socratic Nudge, 2 = Constraint Analysis, 3 = Trade-off, 4 = Concrete Blueprint")
    title: str
    content: str


class QuestionSummary(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    difficulty: str
    category: str
    description: str
    expected_scale: dict[str, Any] = Field(default_factory=dict)
    is_completed: bool = False
    best_score: int | None = None
    attempts_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class QuestionDetail(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    difficulty: str
    category: str
    description: str
    requirements: list[str] = Field(default_factory=list)
    constraints: dict[str, Any] = Field(default_factory=dict)
    expected_scale: dict[str, Any] = Field(default_factory=dict)
    hints: list[dict[str, Any]] = Field(default_factory=list)
    evaluation_criteria: dict[str, Any] = Field(default_factory=dict)
    is_completed: bool = False
    best_score: int | None = None
    attempts_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class QuestionListResponse(BaseModel):
    questions: list[QuestionSummary]
    total: int
    categories: list[str]
    difficulties: list[str]


class QuestionAttemptCreate(BaseModel):
    status: str = Field(default="in_progress", pattern="^(in_progress|passed|failed)$")
    score: int = Field(default=0, ge=0, le=100)
    feedback: dict[str, Any] = Field(default_factory=dict)


class QuestionAttemptResponse(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    score: int
    feedback: dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
