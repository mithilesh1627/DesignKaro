from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.design import GraphData, RuleViolation


class DimensionScore(BaseModel):
    name: str
    score: int = Field(..., ge=0, le=100)
    verdict: str
    analysis: str


class ArchitectureReviewRequest(BaseModel):
    title: str = Field(default="Architecture Review")
    graph_data: GraphData
    scale_metadata: dict = Field(default_factory=dict)
    problem_slug: str | None = None


class ArchitectureReviewResponse(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    grade: str  # Staff-Ready (90+), Senior-Ready (75-89), Mid-Level (60-74), Needs Remediation (<60)
    radar_scores: list[DimensionScore]
    strengths: list[str]
    critical_vulnerabilities: list[str]
    rule_violations: list[RuleViolation]
    actionable_remediation_plan: list[str]
    executive_summary: str

    model_config = ConfigDict(from_attributes=True)
