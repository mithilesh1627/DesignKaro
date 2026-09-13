from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user_optional
from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.interview import (
    InterviewFinishResponse,
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewTurnRequest,
    InterviewTurnResponse,
)
from backend.app.services.interview_engine import interview_engine
from backend.app.services.llm.providers.factory import get_active_provider_for_user

router = APIRouter()


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview_session(
    payload: InterviewStartRequest,
) -> InterviewStartResponse:
    """Start an interactive System Design interview session."""
    return interview_engine.start_interview(payload)


@router.post("/{session_id}/message", response_model=InterviewTurnResponse)
async def send_interview_message(
    session_id: str,
    payload: InterviewTurnRequest,
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> InterviewTurnResponse:
    """Submit candidate response and receive interviewer critique and next stage."""
    provider = await get_active_provider_for_user(db=db, user=current_user)
    return await interview_engine.process_turn_async(session_id, payload, provider=provider)


@router.post("/{session_id}/finish", response_model=InterviewFinishResponse)
async def finish_interview_session(
    session_id: str,
) -> InterviewFinishResponse:
    """Complete interview and receive calibrated Staff Architect hiring decision and rubric scorecard."""
    return interview_engine.finish_interview(session_id)
