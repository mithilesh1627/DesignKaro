import uuid
from typing import Annotated

from backend.app.api.deps import get_current_user, get_current_user_optional
from backend.app.core.database import get_db
from backend.app.models.practice import Question, QuestionAttempt
from backend.app.models.user import User
from backend.app.schemas.practice import (
    QuestionAttemptCreate,
    QuestionAttemptResponse,
    QuestionDetail,
    QuestionListResponse,
    QuestionSummary,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("", response_model=QuestionListResponse)
async def list_problems(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    difficulty: str | None = Query(None, description="Filter by difficulty: beginner, intermediate, advanced, hard"),
    category: str | None = Query(None, description="Filter by category"),
    search: str | None = Query(None, description="Search by title or description"),
) -> QuestionListResponse:
    """List all practice problems with optional filtering and user progress."""
    query = select(Question)
    if difficulty:
        query = query.where(Question.difficulty == difficulty.lower())
    if category:
        query = query.where(Question.category == category)
    if search:
        query = query.where(
            or_(
                Question.title.ilike(f"%{search}%"),
                Question.description.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(Question.created_at.asc())
    result = await db.execute(query)
    questions = list(result.scalars().all())

    # Collect distinct categories and difficulties for filter badges
    cats_res = await db.execute(select(Question.category).distinct())
    categories = sorted([c for c in cats_res.scalars().all() if c])

    diffs_res = await db.execute(select(Question.difficulty).distinct())
    difficulties = sorted([d for d in diffs_res.scalars().all() if d])

    # Fetch user attempts if authenticated
    user_progress_map: dict[uuid.UUID, dict] = {}
    if current_user:
        attempts_res = await db.execute(
            select(
                QuestionAttempt.question_id,
                func.count(QuestionAttempt.id).label("attempts_count"),
                func.max(QuestionAttempt.score).label("best_score"),
            )
            .where(QuestionAttempt.user_id == current_user.id)
            .group_by(QuestionAttempt.question_id)
        )
        for row in attempts_res.all():
            user_progress_map[row.question_id] = {
                "attempts_count": row.attempts_count,
                "best_score": row.best_score,
                "is_completed": (row.best_score or 0) >= 70,
            }

    question_summaries = []
    for q in questions:
        prog = user_progress_map.get(q.id, {})
        question_summaries.append(
            QuestionSummary(
                id=q.id,
                slug=q.slug,
                title=q.title,
                difficulty=q.difficulty,
                category=q.category,
                description=q.description,
                expected_scale=q.expected_scale or {},
                is_completed=prog.get("is_completed", False),
                best_score=prog.get("best_score"),
                attempts_count=prog.get("attempts_count", 0),
            )
        )

    return QuestionListResponse(
        questions=question_summaries,
        total=len(question_summaries),
        categories=categories,
        difficulties=difficulties,
    )


@router.get("/{id_or_slug}", response_model=QuestionDetail)
async def get_problem(
    id_or_slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
) -> QuestionDetail:
    """Fetch complete problem details including requirements, scale constraints, and 4-tier hints."""
    try:
        q_uuid = uuid.UUID(id_or_slug)
        stmt = select(Question).where(Question.id == q_uuid)
    except ValueError:
        stmt = select(Question).where(Question.slug == id_or_slug)

    result = await db.execute(stmt)
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem '{id_or_slug}' not found",
        )

    # Check user attempts
    is_completed = False
    best_score = None
    attempts_count = 0

    if current_user:
        attempts_res = await db.execute(
            select(
                func.count(QuestionAttempt.id).label("attempts_count"),
                func.max(QuestionAttempt.score).label("best_score"),
            )
            .where(
                QuestionAttempt.user_id == current_user.id,
                QuestionAttempt.question_id == q.id,
            )
        )
        row = attempts_res.one_or_none()
        if row and row.attempts_count:
            attempts_count = row.attempts_count
            best_score = row.best_score
            is_completed = (best_score or 0) >= 70

    return QuestionDetail(
        id=q.id,
        slug=q.slug,
        title=q.title,
        difficulty=q.difficulty,
        category=q.category,
        description=q.description,
        requirements=q.requirements or [],
        constraints=q.constraints or {},
        expected_scale=q.expected_scale or {},
        hints=q.hints or [],
        evaluation_criteria=q.evaluation_criteria or {},
        is_completed=is_completed,
        best_score=best_score,
        attempts_count=attempts_count,
    )


@router.post("/{id_or_slug}/attempt", response_model=QuestionAttemptResponse, status_code=status.HTTP_201_CREATED)
async def submit_problem_attempt(
    id_or_slug: str,
    payload: QuestionAttemptCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> QuestionAttemptResponse:
    """Record a practice submission or evaluation result."""
    try:
        q_uuid = uuid.UUID(id_or_slug)
        stmt = select(Question).where(Question.id == q_uuid)
    except ValueError:
        stmt = select(Question).where(Question.slug == id_or_slug)

    result = await db.execute(stmt)
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem '{id_or_slug}' not found",
        )

    attempt = QuestionAttempt(
        user_id=current_user.id,
        question_id=question.id,
        status=payload.status,
        score=payload.score,
        feedback=payload.feedback,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return QuestionAttemptResponse(
        id=attempt.id,
        question_id=attempt.question_id,
        user_id=attempt.user_id,
        status=attempt.status,
        score=attempt.score,
        feedback=attempt.feedback,
        created_at=attempt.created_at,
    )
