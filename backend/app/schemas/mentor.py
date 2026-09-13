from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.app.schemas.design import GraphData


class MentorCalculation(BaseModel):
    formula: str = Field(default="", description="Mathematical formula, e.g. L = λW")
    variables: dict[str, str] = Field(
        default_factory=dict,
        description="Variables used with units, e.g. {'λ': '100 req/s', 'W': '200 ms'}",
    )
    result: str = Field(default="", description="Derived result with units, e.g. '20 concurrent in-flight requests'")
    explanation: str | None = Field(default=None, description="Why this calculation matters in distributed systems")

    model_config = ConfigDict(from_attributes=True)


class MentorExample(BaseModel):
    scenario: str = Field(default="", description="Concrete real-world scenario or flow")
    walkthrough: list[str] = Field(default_factory=list, description="Step-by-step request flow or lifecycle")

    model_config = ConfigDict(from_attributes=True)


class MentorResponse(BaseModel):
    response_type: Literal[
        "socratic",
        "explanation",
        "correction",
        "architecture_review",
        "calculation",
        "interview_question",
    ] = Field(default="socratic", description="Type of mentor response")
    intent: Literal[
        "concept_explanation",
        "architecture_analysis",
        "architecture_change",
        "tradeoff",
        "calculation",
        "debugging",
        "failure_analysis",
        "interview_question",
        "challenge",
        "follow_up",
    ] = Field(default="concept_explanation", description="Classified intent of the user's inquiry")
    title: str = Field(..., description="Concise, punchy title")
    summary: str = Field(..., description="1-2 sentence core takeaway")
    explanation: str = Field(..., description="Concise engineering explanation (60-180 words default)")
    architecture_observations: list[str] = Field(
        default_factory=list,
        description="Facts strictly verified from the user's canvas",
    )
    assumptions: list[str] = Field(
        default_factory=list,
        description="Clearly labeled hypothetical assumptions",
    )
    recommendations: list[str] = Field(
        default_factory=list,
        description="Pragmatic design recommendations (max 3-5)",
    )
    tradeoffs: list[str] = Field(
        default_factory=list,
        description="Engineering trade-offs (e.g. consistency vs latency)",
    )
    example: MentorExample | None = Field(default=None, description="Concrete walkthrough or flow example")
    calculation: MentorCalculation | None = Field(default=None, description="Deterministic system design calculation")
    next_question: str | None = Field(
        default=None,
        description="Exactly ONE primary Socratic follow-up question",
    )
    difficulty: Literal["beginner", "intermediate", "advanced"] = Field(
        default="intermediate",
        description="Target skill level",
    )
    # Internal orchestration & tracking fields
    conversation_topic: str | None = Field(default=None, description="Topic being tracked across turns")
    unresolved_issue: str | None = Field(default=None, description="Active unresolved architectural bottleneck")
    question_history: list[str] = Field(default_factory=list, description="Prior questions to avoid repetition")
    facts_used: list[str] = Field(default_factory=list, description="Verified canvas facts referenced")
    unsupported_claims: list[str] = Field(default_factory=list, description="Claims filtered during validation")

    @field_validator("intent", mode="before")
    @classmethod
    def validate_intent(cls, v: Any) -> str:
        valid = {
            "concept_explanation",
            "architecture_analysis",
            "architecture_change",
            "tradeoff",
            "calculation",
            "debugging",
            "failure_analysis",
            "interview_question",
            "challenge",
            "follow_up",
        }
        if isinstance(v, str) and v.lower() in valid:
            return v.lower()
        return "concept_explanation"

    @field_validator("example", mode="before")
    @classmethod
    def parse_example(cls, v: Any) -> Any:
        if isinstance(v, str) and v.strip():
            return MentorExample(scenario=v.strip(), walkthrough=[])
        return v

    @field_validator("calculation", mode="before")
    @classmethod
    def parse_calculation(cls, v: Any) -> Any:
        if isinstance(v, str) and v.strip():
            return MentorCalculation(formula="Calculation", result=v.strip())
        return v

    model_config = ConfigDict(from_attributes=True)


class MentorMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class MentorChatRequest(BaseModel):
    messages: list[MentorMessage]
    problem_slug: str | None = None
    graph_data: GraphData | None = None
    context_notes: str | None = None
    user_skill_level: Literal["beginner", "intermediate", "advanced"] = "intermediate"


class MentorChatResponse(BaseModel):
    reply: str
    structured_response: MentorResponse | None = None
    suggested_followups: list[str] = Field(default_factory=list)
    dimension_focus: str = Field(default="Scalability & Trade-offs")
    llm_provider: str | None = None
    fallback_used: bool = False

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
