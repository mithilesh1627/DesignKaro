import datetime
import uuid
from typing import Annotated

from backend.app.api.deps import get_current_user, get_current_user_optional
from backend.app.core.database import get_db
from backend.app.models.learning import Lesson, Topic, UserLessonProgress
from backend.app.models.skill import Skill, UserSkill
from backend.app.models.user import User
from backend.app.schemas.learning import (
    LearningOverviewResponse,
    LessonCompletionRequest,
    LessonCompletionResponse,
    LessonDetail,
    LessonSummary,
    TopicDetail,
    TopicSummary,
    TrackProgress,
    UserProgressResponse,
)
from backend.app.services.learning_engine import CANONICAL_LEARNING_METADATA, get_learning_overview
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

router = APIRouter()


@router.get("/topics", response_model=list[TopicSummary], summary="List all learning topics")
async def list_topics(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    track: str | None = Query(None, description="Filter by track: beginner, intermediate, advanced, ml"),
):
    """
    Returns structured learning topics grouped by track with lesson counts.
    """
    query = select(Topic).order_by(Topic.order_index)
    if track:
        query = query.where(Topic.track == track.lower())

    query = query.options(selectinload(Topic.lessons))
    result = await db.execute(query)
    topics = result.scalars().all()

    completed_lesson_ids: set[uuid.UUID] = set()
    if current_user:
        progress_res = await db.execute(
            select(UserLessonProgress.lesson_id).where(
                UserLessonProgress.user_id == current_user.id,
                UserLessonProgress.is_completed.is_(True),
            )
        )
        completed_lesson_ids = set(progress_res.scalars().all())

    canonical_by_slug = {c["slug"]: c for c in CANONICAL_LEARNING_METADATA}
    response = []
    for t in topics:
        c_count = sum(1 for les in t.lessons if les.id in completed_lesson_ids)
        total_l = len(t.lessons)
        mastery_pct = round((c_count / total_l * 100.0), 1) if total_l > 0 else 0.0
        c_meta = canonical_by_slug.get(t.slug, {})
        diff = c_meta.get("difficulty", "Intermediate")
        est_min = c_meta.get("estimated_minutes", sum(les.estimated_minutes for les in t.lessons) if t.lessons else 30)
        first_lesson = t.lessons[0].slug if t.lessons else c_meta.get("first_lesson_slug")
        response.append(
            TopicSummary(
                id=t.id,
                slug=t.slug,
                title=t.title,
                description=t.description,
                track=t.track,
                order_index=t.order_index,
                icon=t.icon,
                lesson_count=len(t.lessons),
                completed_count=c_count,
                difficulty=diff,
                estimated_minutes=est_min,
                mastery_percentage=mastery_pct,
                first_lesson_slug=first_lesson,
            )
        )
    return response


@router.get("/topics/{id_or_slug}", response_model=TopicDetail, summary="Get topic with lessons")
async def get_topic(
    id_or_slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    """
    Returns detailed topic metadata and its ordered curriculum of lessons.
    """
    query = select(Topic).options(selectinload(Topic.lessons))
    try:
        topic_uuid = uuid.UUID(id_or_slug)
        query = query.where(Topic.id == topic_uuid)
    except ValueError:
        query = query.where(Topic.slug == id_or_slug)

    result = await db.execute(query)
    topic = result.scalar_one_or_none()

    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic '{id_or_slug}' not found.",
        )

    completed_lesson_ids: set[uuid.UUID] = set()
    if current_user:
        progress_res = await db.execute(
            select(UserLessonProgress.lesson_id).where(
                UserLessonProgress.user_id == current_user.id,
                UserLessonProgress.is_completed.is_(True),
            )
        )
        completed_lesson_ids = set(progress_res.scalars().all())

    lessons_summary = [
        LessonSummary(
            id=lesson.id,
            slug=lesson.slug,
            title=lesson.title,
            estimated_minutes=lesson.estimated_minutes,
            order_index=lesson.order_index,
            is_completed=(lesson.id in completed_lesson_ids),
        )
        for lesson in topic.lessons
    ]

    completed_count = sum(1 for les in topic.lessons if les.id in completed_lesson_ids)

    return TopicDetail(
        id=topic.id,
        slug=topic.slug,
        title=topic.title,
        description=topic.description,
        track=topic.track,
        order_index=topic.order_index,
        icon=topic.icon,
        lesson_count=len(topic.lessons),
        completed_count=completed_count,
        lessons=lessons_summary,
    )


@router.get("/lessons/{id_or_slug}", response_model=LessonDetail, summary="Get full lesson content")
async def get_lesson(
    id_or_slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    """
    Retrieves rich lesson material covering the 10 core dimensions:
    Explanation, Visual Diagram, Real-world Case, Trade-offs, Mini Exercises.
    """
    query = select(Lesson).options(selectinload(Lesson.topic))
    try:
        lesson_uuid = uuid.UUID(id_or_slug)
        query = query.where(Lesson.id == lesson_uuid)
    except ValueError:
        query = query.where(Lesson.slug == id_or_slug)

    result = await db.execute(query)
    lesson = result.scalar_one_or_none()

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson '{id_or_slug}' not found.",
        )

    # Check if completed by current user
    is_completed = False
    if current_user:
        prog_stmt = select(UserLessonProgress).where(
            UserLessonProgress.user_id == current_user.id,
            UserLessonProgress.lesson_id == lesson.id,
            UserLessonProgress.is_completed.is_(True),
        )
        prog_res = (await db.execute(prog_stmt)).scalar_one_or_none()
        is_completed = prog_res is not None

    # Fetch sibling lessons for next/prev navigation
    siblings_query = select(Lesson).where(Lesson.topic_id == lesson.topic_id).order_by(Lesson.order_index)
    siblings = (await db.execute(siblings_query)).scalars().all()

    prev_slug = None
    next_slug = None
    for idx, s in enumerate(siblings):
        if s.id == lesson.id:
            if idx > 0:
                prev_slug = siblings[idx - 1].slug
            if idx < len(siblings) - 1:
                next_slug = siblings[idx + 1].slug
            break

    return LessonDetail(
        id=lesson.id,
        slug=lesson.slug,
        title=lesson.title,
        topic_id=lesson.topic_id,
        topic_slug=lesson.topic.slug,
        topic_title=lesson.topic.title,
        content_markdown=lesson.content_markdown,
        estimated_minutes=lesson.estimated_minutes,
        order_index=lesson.order_index,
        is_completed=is_completed,
        next_lesson_slug=next_slug,
        prev_lesson_slug=prev_slug,
    )


@router.post(
    "/lessons/{lesson_id}/complete",
    response_model=LessonCompletionResponse,
    summary="Mark lesson completed and earn XP",
)
async def complete_lesson(
    lesson_id: uuid.UUID,
    completion_in: LessonCompletionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Records lesson completion for the authenticated engineer and updates skill mastery.
    """
    # Verify lesson exists
    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    # Check or create completion record
    stmt = select(UserLessonProgress).where(
        UserLessonProgress.user_id == current_user.id,
        UserLessonProgress.lesson_id == lesson_id,
    )
    progress_record = (await db.execute(stmt)).scalar_one_or_none()

    now = datetime.datetime.now(datetime.UTC)
    if not progress_record:
        progress_record = UserLessonProgress(
            user_id=current_user.id,
            lesson_id=lesson_id,
            is_completed=True,
            completed_at=now,
            notes=completion_in.notes,
        )
        db.add(progress_record)
    else:
        progress_record.is_completed = True
        progress_record.completed_at = now
        if completion_in.notes:
            progress_record.notes = completion_in.notes

    # Update or reward skill mastery
    skill_stmt = select(Skill).where(Skill.slug == "fundamentals")
    skill = (await db.execute(skill_stmt)).scalar_one_or_none()

    mastery_score = 75
    if skill:
        user_skill_stmt = select(UserSkill).where(
            UserSkill.user_id == current_user.id,
            UserSkill.skill_id == skill.id,
        )
        user_skill = (await db.execute(user_skill_stmt)).scalar_one_or_none()
        if user_skill:
            user_skill.mastery_score = min(100, user_skill.mastery_score + 5)
            mastery_score = user_skill.mastery_score
        else:
            user_skill = UserSkill(
                user_id=current_user.id,
                skill_id=skill.id,
                mastery_score=50,
            )
            db.add(user_skill)
            mastery_score = 50

    await db.commit()

    return LessonCompletionResponse(
        lesson_id=lesson_id,
        is_completed=True,
        completed_at=now,
        xp_earned=50,
        updated_mastery_score=mastery_score,
    )


@router.get(
    "/learning/overview",
    response_model=LearningOverviewResponse,
    summary="Get unified system design learning dashboard overview",
)
async def get_overview(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    """
    Returns unified data for the Intelligent System Design Learning Dashboard:
    - Overall mastery (0-100) and seniority title
    - Active / resume lesson for Continue Learning
    - 11 System design domains with real mastery scores & highlights
    - 11 Structured learning paths with prerequisite lock states
    - Deterministic recommendation engine
    - Prerequisite dependency graphs
    """
    return await get_learning_overview(db, current_user)


@router.get(
    "/learning/progress",
    response_model=UserProgressResponse,
    summary="Get authenticated engineer's learning progress",
)
async def get_user_progress(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Computes overall learning completion percentage and per-track mastery breakdown.
    """
    # Count total lessons
    total_lessons_res = await db.execute(select(func.count(Lesson.id)))
    total_lessons = total_lessons_res.scalar() or 0

    # Count completed lessons by user
    completed_res = await db.execute(
        select(func.count(UserLessonProgress.id)).where(
            UserLessonProgress.user_id == current_user.id,
            UserLessonProgress.is_completed.is_(True),
        )
    )
    completed_lessons = completed_res.scalar() or 0

    overall_pct = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0.0

    # Per-track breakdown
    tracks = ["beginner", "intermediate", "advanced", "ml"]
    track_progress_list = []
    for t in tracks:
        topic_ids_subq = select(Topic.id).where(Topic.track == t)
        t_total = (
            await db.execute(select(func.count(Lesson.id)).where(Lesson.topic_id.in_(topic_ids_subq)))
        ).scalar() or 0

        t_completed = (
            await db.execute(
                select(func.count(UserLessonProgress.id))
                .join(Lesson)
                .where(
                    UserLessonProgress.user_id == current_user.id,
                    UserLessonProgress.is_completed.is_(True),
                    Lesson.topic_id.in_(topic_ids_subq),
                )
            )
        ).scalar() or 0

        t_pct = (t_completed / t_total * 100) if t_total > 0 else 0.0
        track_progress_list.append(
            TrackProgress(
                track=t.capitalize(),
                total_lessons=t_total,
                completed_lessons=t_completed,
                percentage=round(t_pct, 1),
            )
        )

    return UserProgressResponse(
        total_lessons=total_lessons,
        completed_lessons=completed_lessons,
        overall_percentage=round(overall_pct, 1),
        tracks=track_progress_list,
        recent_completions=[],
    )
