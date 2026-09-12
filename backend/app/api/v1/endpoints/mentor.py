from backend.app.schemas.mentor import (
    MentorChatRequest,
    MentorChatResponse,
    MentorHintRequest,
    MentorHintResponse,
)
from backend.app.services.ai_mentor import mentor_service
from fastapi import APIRouter

router = APIRouter()


@router.post("/chat", response_model=MentorChatResponse)
async def chat_with_senior_mentor(
    payload: MentorChatRequest,
) -> MentorChatResponse:
    """Engage in interactive Socratic dialogue with the AI Senior Staff Architect mentor."""
    return mentor_service.generate_chat_response(payload)


@router.post("/hint", response_model=MentorHintResponse)
async def get_socratic_hint(
    payload: MentorHintRequest,
) -> MentorHintResponse:
    """Retrieve progressive 4-tier architectural hint with trade-off analysis."""
    return mentor_service.generate_hint(payload)
