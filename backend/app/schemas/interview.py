import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.design import GraphData


class InterviewSummary(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    difficulty: str
    target_role: str
    scenario_prompt: str
    scale_target: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class InterviewStartRequest(BaseModel):
    interview_slug: str
    target_role: str = Field(default="Staff Systems Architect")


class InterviewStartResponse(BaseModel):
    session_id: str
    title: str
    interviewer_persona: str
    initial_message: str
    current_stage: int
    stage_name: str
    target_role: str
    scenario_prompt: str


class InterviewTurnRequest(BaseModel):
    message: str
    current_stage: int = Field(default=1, ge=1, le=5)
    graph_data: GraphData | None = None


class InterviewTurnResponse(BaseModel):
    session_id: str
    interviewer_reply: str
    current_stage: int
    stage_name: str
    next_stage_ready: bool
    hiring_signal: str  # Strong Hire, Hire, Leaning Hire, Needs Work
    feedback_notes: str


class InterviewFinishResponse(BaseModel):
    session_id: str
    hiring_decision: str  # Strong Hire, Hire, Leaning Hire, No Hire
    overall_score: int
    dimension_scores: dict[str, int]
    strengths: list[str]
    areas_for_growth: list[str]
    interviewer_verdict: str
