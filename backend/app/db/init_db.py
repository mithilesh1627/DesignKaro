import asyncio
import logging

from backend.app.core.database import AsyncSessionLocal, engine
from backend.app.core.security import get_password_hash
from backend.app.models import (
    Achievement,
    Base,
    Design,
    DesignVersion,
    Question,
    Skill,
    Topic,
    User,
    UserProfile,
    UserSkill,
)
from sqlalchemy import select

logger = logging.getLogger("designkaro.seed")


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

            # 2. Core Skills
            skills_data = [
                (
                    "fundamentals",
                    "System Fundamentals",
                    "Core",
                    "Latency, throughput, CAP theorem, and SLA design.",
                    100,
                ),
                (
                    "caching",
                    "Distributed Caching",
                    "Storage",
                    "Cache-aside, write-through, LRU/LFU eviction, Redis cluster.",
                    100,
                ),
                (
                    "databases",
                    "Database Scaling",
                    "Storage",
                    "Sharding, consistent hashing, read replicas, and indexing.",
                    100,
                ),
                (
                    "messaging",
                    "Event Streaming & Queues",
                    "Compute",
                    "Kafka partitioning, consumer groups, backpressure, idempotency.",
                    100,
                ),
                (
                    "reliability",
                    "Reliability & Resiliency",
                    "Operations",
                    "SPOF elimination, circuit breakers, rate limiting, chaos engineering.",
                    100,
                ),
                (
                    "consensus",
                    "Distributed Consensus",
                    "Core",
                    "Raft, Paxos, two-phase commit, and quorum consistency.",
                    100,
                ),
                (
                    "ml-systems",
                    "ML System Design",
                    "AI",
                    "Feature stores, vector search, online model serving, and embeddings.",
                    100,
                ),
            ]
            created_skills = []
            for slug, name, cat, desc, max_score in skills_data:
                sk = Skill(slug=slug, name=name, category=cat, description=desc, max_score=max_score)
                session.add(sk)
                created_skills.append(sk)
            await session.flush()

            # Attach User Skills
            for sk in created_skills:
                us = UserSkill(user_id=demo_user.id, skill_id=sk.id, mastery_score=85)
                session.add(us)

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

            # 4. Core Topics
            topics_data = [
                (
                    "fundamentals",
                    "System Design Fundamentals",
                    "Core concepts of latency, throughput, and CAP theorem.",
                    "beginner",
                    1,
                    "BookOpen",
                ),
                (
                    "distributed-caching",
                    "Distributed Caching & Redis",
                    "In-memory caching architectures and invalidation.",
                    "intermediate",
                    2,
                    "Zap",
                ),
                (
                    "database-sharding",
                    "Database Sharding & Replication",
                    "Horizontal partitioning schemes and consistent hashing.",
                    "intermediate",
                    3,
                    "Database",
                ),
                (
                    "event-streaming",
                    "Event Streaming with Kafka",
                    "Asynchronous pipelines, queues, and decoupled microservices.",
                    "intermediate",
                    4,
                    "Layers",
                ),
                (
                    "ml-serving",
                    "ML Inference & Feature Stores",
                    "Low-latency model serving, embeddings, and vector databases.",
                    "ml",
                    5,
                    "Cpu",
                ),
            ]
            for slug, title, desc, track, order, icon in topics_data:
                top = Topic(
                    slug=slug,
                    title=title,
                    description=desc,
                    track=track,
                    order_index=order,
                    icon=icon,
                )
                session.add(top)

            # 5. Core Practice Problem
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

            # 6. Sample Architecture Design
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

            await session.commit()
            logger.info("Database seeding complete!")
        else:
            logger.info("Demo user already exists. Skipping seed.")


if __name__ == "__main__":
    asyncio.run(init_db())
