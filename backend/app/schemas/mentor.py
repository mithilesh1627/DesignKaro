from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.design import GraphData


class MentorMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class MentorChatRequest(BaseModel):
    messages: list[MentorMessage]
    problem_slug: str | None = None
    graph_data: GraphData | None = None
    context_notes: str | None = None


class MentorChatResponse(BaseModel):
    reply: str
    suggested_followups: list[str] = Field(default_factory=list)
    dimension_focus: str = Field(default="Scalability & Trade-offs")

    model_config = ConfigDict(from_attributes=True)


class MentorHintRequest(BaseModel):
    problem_slug: str
    target_level: int = Field(default=1, ge=1, le=4)
    graph_data: GraphData | None = None


class MentorHintResponse(BaseModel):
    level: int
    title: str
    content: str
    trade_off_analysis: str

    model_config = ConfigDict(from_attributes=True)
