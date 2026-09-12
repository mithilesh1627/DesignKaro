from pydantic import BaseModel, ConfigDict, Field


class KnowledgeItem(BaseModel):
    id: str
    title: str
    category: str
    document_type: str  # case_study, engineering_blog, whitepaper
    company: str
    summary: str
    key_takeaways: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class KnowledgeSearchResponse(BaseModel):
    query: str
    total_results: int
    results: list[KnowledgeItem]
