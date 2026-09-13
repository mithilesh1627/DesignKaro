from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user_optional
from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.mentor import (
    MentorChatRequest,
    MentorChatResponse,
    MentorHintRequest,
    MentorHintResponse,
)
from backend.app.services.ai_mentor import mentor_service
from backend.app.services.llm.providers.factory import get_active_provider_for_user

router = APIRouter()


@router.post("/chat", response_model=MentorChatResponse)
async def chat_with_senior_mentor(
    payload: MentorChatRequest,
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> MentorChatResponse:
    """
    Engage in interactive Socratic dialogue with the AI Senior Staff Architect mentor.
    Resolves user's BYOK provider or local Ollama, falling back seamlessly to deterministic heuristics.
    """
    provider = await get_active_provider_for_user(db=db, user=current_user)
    return await mentor_service.generate_chat_response_async(payload, provider=provider)


@router.post("/chat/stream")
async def stream_chat_with_senior_mentor(
    payload: MentorChatRequest,
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Stream Socratic dialogue tokens in real-time via Server-Sent Events (SSE).
    """
    provider = await get_active_provider_for_user(db=db, user=current_user)
    generator = mentor_service.stream_chat_response_async(payload, provider=provider)

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/hint", response_model=MentorHintResponse)
async def get_socratic_hint(
    payload: MentorHintRequest,
) -> MentorHintResponse:
    """Retrieve progressive 4-tier architectural hint with trade-off analysis."""
    return mentor_service.generate_hint(payload)
