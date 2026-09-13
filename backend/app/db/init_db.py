import asyncio
import logging

from backend.app.core.database import AsyncSessionLocal, engine
from backend.app.core.security import get_password_hash
from backend.app.db.seed import LESSONS_SEED_DATA, QUESTIONS_SEED_DATA
from backend.app.models import (
    Achievement,
    Base,
    Design,
    DesignVersion,
    Lesson,
    Question,
    Skill,
    Topic,
    TopicDependency,
    User,
    UserProfile,
    UserSkill,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("designkaro.seed")

# 11 Canonical Skills
CORE_SKILLS_DATA = [
    ("fundamentals", "System Fundamentals", "Core", "Latency, throughput, CAP theorem, and SLA design.", 100),
    ("networking", "Networking & Routing", "Compute", "L4/L7 routing, reverse proxies, and API gateways.", 100),
    ("scalability", "Scalability & Elasticity", "Compute", "Horizontal scaling, load balancing algorithms, and autoscaling.", 100),
    ("caching", "Distributed Caching", "Storage", "Cache-aside, write-through, LRU/LFU eviction, Redis cluster.", 100),
    ("databases", "Database Scaling", "Storage", "Sharding, consistent hashing, read replicas, and indexing.", 100),
    ("messaging", "Event Streaming & Queues", "Compute", "Kafka partitioning, consumer groups, backpressure, idempotency.", 100),
    ("consensus", "Distributed Consensus", "Core", "Raft, Paxos, two-phase commit, and quorum consistency.", 100),
    ("reliability", "Reliability & Resiliency", "Operations", "SPOF elimination, circuit breakers, rate limiting, chaos engineering.", 100),
    ("observability", "Observability & Telemetry", "Operations", "Distributed tracing, OpenTelemetry, metrics, p99 latency alerts.", 100),
    ("security", "Security & Zero Trust", "Security", "mTLS, SPIFFE identity, OAuth2, and defense in depth.", 100),
    ("ml-systems", "ML System Design", "AI", "Feature stores, vector search, online model serving, and embeddings.", 100),
]

# 11 Canonical Topics
CORE_TOPICS_DATA = [
    ("fundamentals", "System Design Fundamentals", "Core concepts of latency, throughput, and CAP theorem.", "beginner", 1, "BookOpen"),
    ("networking-routing", "Networking & Request Routing", "L4 vs L7 routing, Envoy API Gateways, and reverse proxies.", "intermediate", 2, "Globe"),
    ("scalability", "Scalability & Elasticity", "Horizontal scaling, load balancing algorithms, and autoscaling.", "intermediate", 3, "Layers"),
    ("distributed-caching", "Distributed Caching & Redis", "In-memory caching architectures and invalidation.", "intermediate", 4, "Zap"),
    ("database-sharding", "Database Sharding & Replication", "Horizontal partitioning schemes and consistent hashing.", "intermediate", 5, "Database"),
    ("event-streaming", "Event Streaming with Kafka", "Asynchronous pipelines, queues, and decoupled microservices.", "intermediate", 6, "Radio"),
    ("distributed-consensus", "Distributed Systems & Consensus", "Raft consensus, leader election, and quorum replication.", "advanced", 7, "Cpu"),
    ("reliability-fault-tolerance", "Reliability & Fault Tolerance", "Circuit breakers, rate limiting, and failure containment.", "advanced", 8, "ShieldAlert"),
    ("observability-telemetry", "Observability & Telemetry", "Distributed tracing, context propagation, and OpenTelemetry.", "intermediate", 9, "Activity"),
    ("security-zero-trust", "Security & Zero Trust", "Mutual TLS, identity management, and perimeter defense.", "advanced", 10, "Lock"),
    ("ml-serving", "ML Inference & Feature Stores", "Low-latency model serving, embeddings, and vector databases.", "ml", 11, "Brain"),
]

# Prerequisite Dependencies DAG
TOPIC_DEPENDENCIES_DATA = [
    ("networking-routing", "fundamentals"),
    ("scalability", "fundamentals"),
    ("distributed-caching", "fundamentals"),
    ("database-sharding", "fundamentals"),
    ("event-streaming", "fundamentals"),
    ("distributed-consensus", "database-sharding"),
    ("reliability-fault-tolerance", "distributed-caching"),
    ("reliability-fault-tolerance", "database-sharding"),
    ("observability-telemetry", "fundamentals"),
    ("security-zero-trust", "networking-routing"),
    ("ml-serving", "fundamentals"),
    ("ml-serving", "distributed-caching"),
]


async def seed_curriculum(session: AsyncSession, demo_user: User | None = None):
    """Ensures all 11 skills, 11 topics, lessons, and topic dependencies are seeded idempotently."""
    # 1. Ensure Skills
    existing_skills_res = await session.execute(select(Skill))
    existing_skills = {s.slug: s for s in existing_skills_res.scalars().all()}
    created_skills = []
    for slug, name, cat, desc, max_score in CORE_SKILLS_DATA:
        if slug not in existing_skills:
            sk = Skill(slug=slug, name=name, category=cat, description=desc, max_score=max_score)
            session.add(sk)
            existing_skills[slug] = sk
            created_skills.append(sk)
        else:
            created_skills.append(existing_skills[slug])
    await session.flush()

    if demo_user:
        existing_us_res = await session.execute(
            select(UserSkill.skill_id).where(UserSkill.user_id == demo_user.id)
        )
        existing_us_ids = set(existing_us_res.scalars().all())
        for sk in created_skills:
            if sk.id not in existing_us_ids:
                us = UserSkill(user_id=demo_user.id, skill_id=sk.id, mastery_score=85)
                session.add(us)

    # 2. Ensure Topics
    existing_topics_res = await session.execute(select(Topic))
    existing_topics = {t.slug: t for t in existing_topics_res.scalars().all()}
    for slug, title, desc, track, order, icon in CORE_TOPICS_DATA:
        if slug not in existing_topics:
            top = Topic(
                slug=slug,
                title=title,
                description=desc,
                track=track,
                order_index=order,
                icon=icon,
            )
            session.add(top)
            existing_topics[slug] = top
    await session.flush()

    # 3. Ensure Lessons
    existing_lessons_res = await session.execute(select(Lesson.slug))
    existing_lesson_slugs = set(existing_lessons_res.scalars().all())
    for item in LESSONS_SEED_DATA:
        if item["slug"] not in existing_lesson_slugs:
            t_slug = item["topic_slug"]
            if t_slug in existing_topics:
                lesson_obj = Lesson(
                    topic_id=existing_topics[t_slug].id,
                    slug=item["slug"],
                    title=item["title"],
                    content_markdown=item["content_markdown"],
                    estimated_minutes=item["estimated_minutes"],
                    order_index=item["order_index"],
                )
                session.add(lesson_obj)
    await session.flush()

    # 4. Ensure Topic Dependencies
    existing_deps_res = await session.execute(select(TopicDependency))
    existing_dep_pairs = {(d.topic_id, d.prerequisite_topic_id) for d in existing_deps_res.scalars().all()}
    for child_slug, parent_slug in TOPIC_DEPENDENCIES_DATA:
        if child_slug in existing_topics and parent_slug in existing_topics:
            c_id = existing_topics[child_slug].id
            p_id = existing_topics[parent_slug].id
            if (c_id, p_id) not in existing_dep_pairs:
                session.add(TopicDependency(topic_id=c_id, prerequisite_topic_id=p_id))
    await session.flush()


async def init_db():
    """Initializes tables and seeds core datasets for Phase 2."""
    logger.info("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created successfully.")

    async with AsyncSessionLocal() as session:
        # Check if demo user exists
        stmt = select(User).where(User.email == "demo@designkaro.io")
        existing_user = (await session.execute(stmt)).scalar_one_or_none()

        if not existing_user:
            logger.info("Seeding demo user and initial platform data...")

            # 1. Demo User & Profile
            demo_user = User(
                email="demo@designkaro.io",
                hashed_password=get_password_hash("Password123!"),
                is_active=True,
                is_superuser=True,
            )
            session.add(demo_user)
            await session.flush()

            demo_profile = UserProfile(
                user_id=demo_user.id,
                username="demo_architect",
                full_name="Staff Systems Architect",
                bio="Designing resilient, high-throughput distributed systems at 1M+ QPS.",
                experience_level="advanced",
                current_rank="Principal Architect",
                target_qps=100000,
            )
            session.add(demo_profile)

            # 2. Seed All Canonical Skills, Topics, Lessons, and Dependencies
            await seed_curriculum(session, demo_user)

            # 3. Core Achievements
            achievements_data = [
                (
                    "first-arch",
                    "First Architecture",
                    "Created and validated your first system architecture.",
                    "Layers",
                    50,
                ),
                (
                    "10k-qps",
                    "10,000 QPS Club",
                    "Designed a system that handles 10K QPS without saturation.",
                    "Zap",
                    100,
                ),
                (
                    "cache-master",
                    "Cache Master",
                    "Achieved 95%+ cache hit rate with zero cache stampedes.",
                    "Database",
                    150,
                ),
                (
                    "chaos-proof",
                    "Production Resiliency",
                    "Passed all failure injection chaos tests.",
                    "ShieldAlert",
                    200,
                ),
            ]
            for slug, name, desc, icon, xp in achievements_data:
                ach = Achievement(slug=slug, name=name, description=desc, badge_icon=icon, xp_reward=xp)
                session.add(ach)

            # 4. Core Practice Problem
            sample_question = Question(
                slug="design-tinyurl-10k-qps",
                title="Design a High-Throughput URL Shortener (TinyURL)",
                difficulty="beginner",
                category="Storage & Caching",
                description="Design a scalable URL shortening service handling 10,000 read QPS with 100:1 read/write ratio.",
                requirements=[
                    "Given a long URL, generate a unique 7-character short URL.",
                    "Redirect user to original URL with p99 latency < 15ms.",
                    "Analytics tracking for click counts.",
                ],
                constraints={
                    "read_qps": 10000,
                    "write_qps": 100,
                    "storage_years": 5,
                    "availability": "99.99%",
                },
                expected_scale={"daily_active_users": 5000000},
                hints=[
                    {
                        "level": 1,
                        "text": "Think about whether Base62 encoding or hashing fits better.",
                    },
                    {
                        "level": 2,
                        "text": "Read QPS is 100x write QPS. Introduce a distributed cache layer.",
                    },
                ],
                evaluation_criteria={"spof_check": True, "cache_hit_target": 0.90},
            )
            session.add(sample_question)

            # 5. Sample Architecture Design
            sample_design = Design(
                user_id=demo_user.id,
                title="Netflix Recommendation Engine (100M Users)",
                description="Two-tower candidate generation and real-time model ranking architecture.",
                public_id="netflix-rec-demo-2026",
                is_public=True,
                scale_metadata={"dau": 20000000, "peak_qps": 50000},
            )
            session.add(sample_design)
            await session.flush()

            sample_version = DesignVersion(
                design_id=sample_design.id,
                version_number=1,
                graph_data={
                    "nodes": [
                        {"id": "client", "type": "client_tier", "label": "Clients"},
                        {"id": "gateway", "type": "api_gateway", "label": "API Gateway"},
                        {"id": "rec_service", "type": "compute", "label": "Rec Service"},
                        {"id": "redis", "type": "distributed_cache", "label": "Redis"},
                        {"id": "postgres", "type": "relational_db", "label": "PostgreSQL"},
                    ],
                    "edges": [
                        {"source": "client", "target": "gateway"},
                        {"source": "gateway", "target": "rec_service"},
                        {"source": "rec_service", "target": "redis"},
                        {"source": "rec_service", "target": "postgres"},
                    ],
                },
                notes="Initial baseline version. Flags SPOF on single PostgreSQL primary.",
            )
            session.add(sample_version)

            # 6. Seed questions
            for q_data in QUESTIONS_SEED_DATA:
                q_obj = Question(
                    slug=q_data["slug"],
                    title=q_data["title"],
                    difficulty=q_data["difficulty"],
                    category=q_data["category"],
                    description=q_data["description"],
                    requirements=q_data["requirements"],
                    constraints=q_data["constraints"],
                    expected_scale=q_data["expected_scale"],
                    hints=q_data["hints"],
                    evaluation_criteria=q_data["evaluation_criteria"],
                )
                session.add(q_obj)

            await session.commit()
            logger.info("Database seeding complete!")
        else:
            logger.info("Existing database detected. Synchronizing curriculum and missing data...")
            await seed_curriculum(session, existing_user)

            # Check if questions need to be seeded
            question_count = (await session.execute(select(func.count(Question.id)))).scalar() or 0
            if question_count < len(QUESTIONS_SEED_DATA):
                logger.info("Seeding missing questions...")
                existing_q_slugs = set(
                    (await session.execute(select(Question.slug))).scalars().all()
                )
                for q_data in QUESTIONS_SEED_DATA:
                    if q_data["slug"] not in existing_q_slugs:
                        q_obj = Question(
                            slug=q_data["slug"],
                            title=q_data["title"],
                            difficulty=q_data["difficulty"],
                            category=q_data["category"],
                            description=q_data["description"],
                            requirements=q_data["requirements"],
                            constraints=q_data["constraints"],
                            expected_scale=q_data["expected_scale"],
                            hints=q_data["hints"],
                            evaluation_criteria=q_data["evaluation_criteria"],
                        )
                        session.add(q_obj)
                await session.commit()
                logger.info("Questions seeded successfully!")
            else:
                await session.commit()
                logger.info("Curriculum and questions up-to-date.")


if __name__ == "__main__":
    asyncio.run(init_db())
