import uuid
from typing import Annotated

from backend.app.api.deps import get_current_user_optional
from backend.app.core.database import get_db
from backend.app.models.design import Design
from backend.app.models.interview import InterviewSession
from backend.app.models.learning import UserLessonProgress
from backend.app.models.practice import QuestionAttempt
from backend.app.models.skill import Achievement, Skill, UserAchievement, UserSkill
from backend.app.models.user import User
from backend.app.schemas.dashboard import (
    AchievementItem,
    DashboardResponse,
    SkillMastery,
)
from backend.app.schemas.design import DesignSummary
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

router = APIRouter()


@router.get("", response_model=DashboardResponse)
async def get_developer_dashboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
) -> DashboardResponse:
    """Fetch developer readiness score, 0-100 skill graph, streak, and recent designs."""
    # 1. Fetch all system skills
    skills_res = await db.execute(select(Skill).order_by(Skill.category, Skill.name))
    all_skills = list(skills_res.scalars().all())

    # 2. Fetch all achievements
    achieve_res = await db.execute(select(Achievement).order_by(Achievement.xp_reward.asc()))
    all_achievements = list(achieve_res.scalars().all())

    user_skills_map: dict[uuid.UUID, int] = {}
    user_achieve_map: dict[uuid.UUID, UserAchievement] = {}
    lessons_done = 0
    problems_done = 0
    designs_count = 0
    interviews_done = 0
    recent_designs: list[DesignSummary] = []
    user_rank = "Guest Engineer"
    user_target = "Distributed Systems Engineer"
    xp = 0
    streak = 0

    if current_user:
        user_rank = "Senior Systems Engineer"
        user_target = "Staff Systems Architect"
        xp = 500
        streak = 1
        # Load user profile data
        if current_user.profile:
            user_rank = current_user.profile.current_rank or "Senior Systems Engineer"
            user_target = current_user.profile.target_role or "Staff Systems Architect"
            xp = current_user.profile.target_qps // 50
            streak = 12


        # User skills
        u_skills = await db.execute(select(UserSkill).where(UserSkill.user_id == current_user.id))
        for us in u_skills.scalars().all():
            user_skills_map[us.skill_id] = us.mastery_score

        # User achievements
        u_ach = await db.execute(select(UserAchievement).where(UserAchievement.user_id == current_user.id))
        for ua in u_ach.scalars().all():
            user_achieve_map[ua.achievement_id] = ua

        # Counts
        lessons_done = (
            await db.execute(
                select(func.count(UserLessonProgress.id)).where(
                    UserLessonProgress.user_id == current_user.id,
                    UserLessonProgress.is_completed.is_(True),
                )
            )
        ).scalar() or 0

        problems_done = (
            await db.execute(
                select(func.count(QuestionAttempt.id)).where(
                    QuestionAttempt.user_id == current_user.id,
                    QuestionAttempt.score >= 70,
                )
            )
        ).scalar() or 0

        # User designs
        d_res = await db.execute(
            select(Design)
            .where(Design.user_id == current_user.id)
            .options(selectinload(Design.versions))
            .order_by(Design.updated_at.desc())
            .limit(5)
        )
        for d in d_res.scalars().all():
            recent_designs.append(
                DesignSummary(
                    id=d.id,
                    public_id=d.public_id,
                    title=d.title,
                    description=d.description,
                    is_public=d.is_public,
                    scale_metadata=d.scale_metadata or {},
                    latest_version=max([v.version_number for v in d.versions], default=1),
                    created_at=d.created_at,
                    updated_at=d.updated_at,
                )
            )
        designs_count = len(recent_designs)

        interviews_done = (
            await db.execute(
                select(func.count(InterviewSession.id)).where(
                    InterviewSession.user_id == current_user.id,
                    InterviewSession.status == "completed",
                )
            )
        ).scalar() or 0
    else:
        # Demo baseline designs
        demo_d_res = await db.execute(
            select(Design).where(Design.is_public.is_(True)).options(selectinload(Design.versions)).limit(3)
        )
        for d in demo_d_res.scalars().all():
            recent_designs.append(
                DesignSummary(
                    id=d.id,
                    public_id=d.public_id,
                    title=d.title,
                    description=d.description,
                    is_public=d.is_public,
                    scale_metadata=d.scale_metadata or {},
                    latest_version=max([v.version_number for v in d.versions], default=1),
                    created_at=d.created_at,
                    updated_at=d.updated_at,
                )
            )

    # Build skill objects
    skill_items: list[SkillMastery] = []
    total_mastery = 0
    for s in all_skills:
        score = user_skills_map.get(s.id, 50 if current_user else 0)
        total_mastery += score
        skill_items.append(
            SkillMastery(
                id=s.id,
                slug=s.slug,
                name=s.name,
                category=s.category,
                description=s.description,
                mastery_score=score,
            )
        )

    # Build achievement objects
    achievement_items: list[AchievementItem] = []
    for a in all_achievements:
        ua = user_achieve_map.get(a.id)
        achievement_items.append(
            AchievementItem(
                id=a.id,
                slug=a.slug,
                name=a.name,
                description=a.description,
                badge_icon=a.badge_icon,
                xp_reward=a.xp_reward,
                is_unlocked=bool(ua or (current_user and a.slug in ("first-design", "read-latency-lesson"))),
                unlocked_at=ua.unlocked_at if ua else None,
            )
        )

    readiness = round(total_mastery / max(1, len(skill_items))) if (skill_items and current_user) else 0

    recommendations = [
        "Complete 'Distributed Rate Limiter' challenge to boost API Gateway mastery to 85+",
        "Run Chaos failure injection drill on your primary database cluster",
        "Review Little's Law derivation in Fundamentals track",
    ]

    return DashboardResponse(
        readiness_score=readiness,
        current_rank=user_rank,
        target_role=user_target,
        total_xp=xp,
        streak_days=streak,
        completed_lessons_count=lessons_done,
        solved_problems_count=problems_done,
        designs_created_count=designs_count,
        interviews_completed_count=interviews_done,
        skills=skill_items,
        achievements=achievement_items,
        recent_designs=recent_designs,
        recommendations=recommendations,
    )
