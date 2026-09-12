import pytest
from backend.app.core.database import AsyncSessionLocal
from backend.app.models import Design, Question, Skill, Topic, User
from sqlalchemy import select
from sqlalchemy.orm import selectinload


@pytest.mark.asyncio
async def test_database_models_relationships():
    async with AsyncSessionLocal() as session:
        # Verify demo user with profile
        stmt = select(User).where(User.email == "demo@designkaro.io").options(selectinload(User.profile))
        user = (await session.execute(stmt)).scalar_one_or_none()
        assert user is not None
        assert user.profile is not None
        assert user.profile.username == "demo_architect"

        # Verify seeded topics
        topic_stmt = select(Topic).where(Topic.slug == "fundamentals")
        topic = (await session.execute(topic_stmt)).scalar_one_or_none()
        assert topic is not None
        assert topic.track == "beginner"

        # Verify seeded question
        q_stmt = select(Question).where(Question.slug == "design-tinyurl-10k-qps")
        question = (await session.execute(q_stmt)).scalar_one_or_none()
        assert question is not None
        assert question.constraints["read_qps"] == 10000

        # Verify seeded design
        d_stmt = (
            select(Design).where(Design.public_id == "netflix-rec-demo-2026").options(selectinload(Design.versions))
        )
        design = (await session.execute(d_stmt)).scalar_one_or_none()
        assert design is not None
        assert len(design.versions) >= 1
        assert design.versions[0].version_number == 1
        assert len(design.versions[0].graph_data["nodes"]) == 5

        # Verify skills
        skill_stmt = select(Skill)
        skills = (await session.execute(skill_stmt)).scalars().all()
        assert len(skills) >= 7
