from backend.app.schemas.interview import (
    InterviewFinishResponse,
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewTurnRequest,
    InterviewTurnResponse,
)
from backend.app.services.interview_engine import interview_engine
from fastapi import APIRouter

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
) -> InterviewTurnResponse:
    """Submit candidate response and receive interviewer critique and next stage."""
    return interview_engine.process_turn(session_id, payload)


@router.post("/{session_id}/finish", response_model=InterviewFinishResponse)
async def finish_interview_session(
    session_id: str,
) -> InterviewFinishResponse:
    """Complete interview and receive calibrated Staff Architect hiring decision and rubric scorecard."""
    return interview_engine.finish_interview(session_id)
