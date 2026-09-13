import uuid

from backend.app.models.learning import Lesson, Topic, UserLessonProgress
from backend.app.models.skill import Skill, UserSkill
from backend.app.models.user import User
from backend.app.schemas.learning import (
    CurrentLearningState,
    LearningOverviewResponse,
    LearningPath,
    LearningRecommendation,
    PrerequisiteNode,
    SkillDomain,
    TopicSummary,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

# 11 Canonical System Design Domains & Paths
CANONICAL_LEARNING_METADATA = [
    {
        "id": "foundations",
        "slug": "fundamentals",
        "title": "System Design Foundations",
        "category": "Foundations",
        "track": "beginner",
        "difficulty": "Beginner",
        "description": "Master core primitives: Latency vs Throughput, Little's Law, tail latency, SLAs, and the CAP theorem.",
        "icon": "BookOpen",
        "order_index": 1,
        "estimated_minutes": 40,
        "concept_count": 2,
        "skill_slug": "fundamentals",
        "prerequisites": [],
        "first_lesson_slug": "latency-vs-throughput",
    },
    {
        "id": "networking",
        "slug": "networking-routing",
        "title": "Networking & Request Routing",
        "category": "Networking",
        "track": "intermediate",
        "difficulty": "Intermediate",
        "description": "L4 vs L7 routing, Envoy API Gateways, TLS termination, Reverse Proxies, and Anycast routing.",
        "icon": "Globe",
        "order_index": 2,
        "estimated_minutes": 35,
        "concept_count": 2,
        "skill_slug": "networking",
        "prerequisites": ["fundamentals"],
        "first_lesson_slug": "api-gateway-envoy-routing",
    },
    {
        "id": "scalability",
        "slug": "scalability",
        "title": "Scalability & Elasticity",
        "category": "Scalability",
        "track": "intermediate",
        "difficulty": "Intermediate",
        "description": "Horizontal scaling, L4/L7 load balancing algorithms, stateful vs stateless tiering, and autoscaling.",
        "icon": "Layers",
        "order_index": 3,
        "estimated_minutes": 30,
        "concept_count": 2,
        "skill_slug": "scalability",
        "prerequisites": ["fundamentals"],
        "first_lesson_slug": "load-balancing-horizontal-scaling",
    },
    {
        "id": "caching",
        "slug": "distributed-caching",
        "title": "Distributed Caching & Redis",
        "category": "Caching",
        "track": "intermediate",
        "difficulty": "Intermediate",
        "description": "Cache-aside, write-through, LRU/LFU eviction, Redis clusters, and stampede/avalanche mitigation.",
        "icon": "Zap",
        "order_index": 4,
        "estimated_minutes": 35,
        "concept_count": 2,
        "skill_slug": "caching",
        "prerequisites": ["fundamentals"],
        "first_lesson_slug": "distributed-cache-redis",
    },
    {
        "id": "databases",
        "slug": "database-sharding",
        "title": "Databases & Storage Systems",
        "category": "Databases",
        "track": "intermediate",
        "difficulty": "Intermediate",
        "description": "SQL vs NoSQL, horizontal sharding, consistent hashing rings, B-Trees vs LSM-Trees, and read replicas.",
        "icon": "Database",
        "order_index": 5,
        "estimated_minutes": 45,
        "concept_count": 3,
        "skill_slug": "databases",
        "prerequisites": ["fundamentals"],
        "first_lesson_slug": "consistent-hashing-sharding",
    },
    {
        "id": "messaging",
        "slug": "event-streaming",
        "title": "Messaging & Event Streaming",
        "category": "Messaging",
        "track": "intermediate",
        "difficulty": "Intermediate",
        "description": "Asynchronous commit logs, Kafka partitions, consumer groups, idempotency, and backpressure handling.",
        "icon": "Radio",
        "order_index": 6,
        "estimated_minutes": 40,
        "concept_count": 2,
        "skill_slug": "messaging",
        "prerequisites": ["fundamentals"],
        "first_lesson_slug": "kafka-event-streaming",
    },
    {
        "id": "distributed",
        "slug": "distributed-consensus",
        "title": "Distributed Systems & Consensus",
        "category": "Distributed Systems",
        "track": "advanced",
        "difficulty": "Advanced",
        "description": "Raft consensus, Paxos, two-phase commit (2PC), quorum replication, vector clocks, and distributed locks.",
        "icon": "Cpu",
        "order_index": 7,
        "estimated_minutes": 50,
        "concept_count": 2,
        "skill_slug": "consensus",
        "prerequisites": ["database-sharding"],
        "first_lesson_slug": "raft-distributed-consensus",
    },
    {
        "id": "reliability",
        "slug": "reliability-fault-tolerance",
        "title": "Reliability & Fault Tolerance",
        "category": "Reliability",
        "track": "advanced",
        "difficulty": "Advanced",
        "description": "SPOF elimination, circuit breakers, rate limiting, retry storms with exponential backoff, and load shedding.",
        "icon": "ShieldAlert",
        "order_index": 8,
        "estimated_minutes": 45,
        "concept_count": 2,
        "skill_slug": "reliability",
        "prerequisites": ["distributed-caching", "database-sharding"],
        "first_lesson_slug": "circuit-breakers-resilience",
    },
    {
        "id": "observability",
        "slug": "observability-telemetry",
        "title": "Observability & Telemetry",
        "category": "Observability",
        "track": "intermediate",
        "difficulty": "Intermediate",
        "description": "Distributed tracing with OpenTelemetry, latency percentiles (p50/p99), structured logs, and Prometheus alerts.",
        "icon": "Activity",
        "order_index": 9,
        "estimated_minutes": 35,
        "concept_count": 2,
        "skill_slug": "observability",
        "prerequisites": ["fundamentals"],
        "first_lesson_slug": "distributed-tracing-opentelemetry",
    },
    {
        "id": "security",
        "slug": "security-zero-trust",
        "title": "Security & Zero Trust",
        "category": "Security",
        "track": "advanced",
        "difficulty": "Advanced",
        "description": "Zero trust network boundaries, mutual TLS (mTLS), OAuth2/OIDC token verification, and DDoS mitigation.",
        "icon": "Lock",
        "order_index": 10,
        "estimated_minutes": 35,
        "concept_count": 2,
        "skill_slug": "security",
        "prerequisites": ["networking-routing"],
        "first_lesson_slug": "zero-trust-mtls-security",
    },
    {
        "id": "ml",
        "slug": "ml-serving",
        "title": "ML System Design & Inference",
        "category": "ML Systems",
        "track": "ml",
        "difficulty": "Advanced",
        "description": "Two-tower candidate retrieval, real-time feature stores, low-latency GPU model serving, and vector embeddings.",
        "icon": "Brain",
        "order_index": 11,
        "estimated_minutes": 45,
        "concept_count": 2,
        "skill_slug": "ml-systems",
        "prerequisites": ["fundamentals", "distributed-caching"],
        "first_lesson_slug": "low-latency-ml-inference",
    },
]

TOPIC_TITLE_MAP = {item["slug"]: item["title"] for item in CANONICAL_LEARNING_METADATA}


def get_level_title(mastery: int) -> str:
    """Derives engineering seniority level from 0-100 mastery."""
    if mastery < 20:
        return "Systems Apprentice"
    if mastery < 40:
        return "Junior Infrastructure Engineer"
    if mastery < 60:
        return "Mid-Level Distributed Systems Engineer"
    if mastery < 80:
        return "Senior Systems Engineer"
    if mastery < 95:
        return "Staff Systems Architect"
    return "Principal Architect"


async def get_learning_overview(
    db: AsyncSession,
    current_user: User | None = None,
) -> LearningOverviewResponse:
    """
    Computes unified, high-performance learning overview:
    - Overall mastery and seniority level
    - Active / resume lesson for Continue Learning
    - 11 System design domains with real mastery scores & highlights
    - 11 Structured learning paths with prerequisite lock states
    - Deterministic recommendation engine
    - Prerequisite dependency graphs
    """
    # 1. Fetch all topics and lessons from DB
    topics_res = await db.execute(
        select(Topic).options(selectinload(Topic.lessons)).order_by(Topic.order_index)
    )
    db_topics = {t.slug: t for t in topics_res.scalars().all()}

    # 2. Fetch user completions if authenticated
    completed_lesson_ids: set[uuid.UUID] = set()
    user_skills_map: dict[str, int] = {}
    last_completed_lesson: Lesson | None = None

    if current_user:
        prog_stmt = (
            select(UserLessonProgress)
            .where(
                UserLessonProgress.user_id == current_user.id,
                UserLessonProgress.is_completed.is_(True),
            )
            .options(selectinload(UserLessonProgress.lesson).selectinload(Lesson.topic))
            .order_by(UserLessonProgress.completed_at.desc())
        )
        prog_rows = (await db.execute(prog_stmt)).scalars().all()
        completed_lesson_ids = {p.lesson_id for p in prog_rows}
        if prog_rows:
            last_completed_lesson = prog_rows[0].lesson

        # Fetch skills
        skills_stmt = (
            select(UserSkill, Skill)
            .join(Skill, UserSkill.skill_id == Skill.id)
            .where(UserSkill.user_id == current_user.id)
        )
        skills_rows = (await db.execute(skills_stmt)).all()
        for us, sk in skills_rows:
            user_skills_map[sk.slug] = us.mastery_score

    # 3. Build Topic Prerequisite Graph & Topic Completion Map
    topic_completed_map: dict[str, bool] = {}
    topic_completion_pct_map: dict[str, float] = {}

    for meta in CANONICAL_LEARNING_METADATA:
        t_slug = meta["slug"]
        db_topic = db_topics.get(t_slug)
        if db_topic and db_topic.lessons:
            total_l = len(db_topic.lessons)
            done_l = sum(1 for les in db_topic.lessons if les.id in completed_lesson_ids)
            pct = (done_l / total_l * 100.0) if total_l > 0 else 0.0
            topic_completed_map[t_slug] = done_l == total_l and total_l > 0
            topic_completion_pct_map[t_slug] = round(pct, 1)
        else:
            topic_completed_map[t_slug] = False
            topic_completion_pct_map[t_slug] = 0.0

    # Build prerequisite nodes map
    topics_prerequisites: dict[str, list[PrerequisiteNode]] = {}
    for meta in CANONICAL_LEARNING_METADATA:
        t_slug = meta["slug"]
        prereq_slugs = meta["prerequisites"]
        nodes: list[PrerequisiteNode] = []
        for p_slug in prereq_slugs:
            p_title = TOPIC_TITLE_MAP.get(p_slug, p_slug.replace("-", " ").title())
            is_done = topic_completed_map.get(p_slug, False)
            nodes.append(
                PrerequisiteNode(
                    slug=p_slug,
                    title=p_title,
                    status="completed" if is_done else "locked",
                )
            )
        topics_prerequisites[t_slug] = nodes

    # 4. Construct 11 Skill Domains
    domains: list[SkillDomain] = []
    total_mastery_sum = 0

    for meta in CANONICAL_LEARNING_METADATA:
        sk_slug = meta["skill_slug"]
        score = user_skills_map.get(sk_slug)
        if score is None:
            # Derive from lesson completion if skill not explicitly recorded
            pct = topic_completion_pct_map.get(meta["slug"], 0.0)
            score = int(pct)

        if score >= 80:
            dom_status = "mastered"
        elif score > 0:
            dom_status = "learning"
        elif any(p for p in meta["prerequisites"] if not topic_completed_map.get(p, False)):
            dom_status = "needs_focus"
        else:
            dom_status = "not_started"

        total_mastery_sum += score
        domains.append(
            SkillDomain(
                slug=sk_slug,
                name=meta["title"],
                category=meta["category"],
                mastery_score=score,
                status=dom_status,
                topics_count=1,
            )
        )

    overall_mastery = round(total_mastery_sum / len(CANONICAL_LEARNING_METADATA)) if CANONICAL_LEARNING_METADATA else 0
    current_level = get_level_title(overall_mastery)

    # Strongest / Weakest domains
    sorted_domains = sorted(domains, key=lambda d: d.mastery_score, reverse=True)
    strongest_domain = sorted_domains[0] if sorted_domains and sorted_domains[0].mastery_score > 0 else None
    weakest_domain = sorted_domains[-1] if sorted_domains else None
    recommended_domain = weakest_domain.name if weakest_domain else "System Design Foundations"

    # 5. Construct 11 Learning Paths
    learning_paths: list[LearningPath] = []
    concepts_mastered = sum(1 for m in CANONICAL_LEARNING_METADATA if topic_completed_map.get(m["slug"], False))

    for meta in CANONICAL_LEARNING_METADATA:
        t_slug = meta["slug"]
        db_topic = db_topics.get(t_slug)
        prereq_satisfied = all(topic_completed_map.get(p, False) for p in meta["prerequisites"])
        is_locked = not prereq_satisfied and len(meta["prerequisites"]) > 0
        pct = topic_completion_pct_map.get(t_slug, 0.0)

        # Get first lesson slug
        first_lesson = meta["first_lesson_slug"]
        if db_topic and db_topic.lessons:
            first_lesson = db_topic.lessons[0].slug

        sk_score = user_skills_map.get(meta["skill_slug"], int(pct))

        learning_paths.append(
            LearningPath(
                id=meta["id"],
                title=meta["title"],
                category=meta["category"],
                description=meta["description"],
                difficulty=meta["difficulty"],
                concept_count=meta["concept_count"],
                estimated_minutes=meta["estimated_minutes"],
                completion_percentage=pct,
                mastery_score=sk_score,
                prerequisites=meta["prerequisites"],
                is_locked=is_locked,
                topics=[t_slug],
                first_lesson_slug=first_lesson,
            )
        )

    # 6. Compute Active / Continue Learning Card
    current_learning: CurrentLearningState | None = None
    has_progress = len(completed_lesson_ids) > 0

    if has_progress:
        # Identify next lesson to resume
        resume_topic = None
        resume_lesson = None
        lesson_idx = 1
        total_l = 1

        # Check if last completed lesson has a next sibling
        if last_completed_lesson:
            t = last_completed_lesson.topic
            if t and t.lessons:
                total_l = len(t.lessons)
                found_next = False
                for idx, les in enumerate(t.lessons):
                    if les.id not in completed_lesson_ids:
                        resume_topic = t
                        resume_lesson = les
                        lesson_idx = idx + 1
                        found_next = True
                        break
                if not found_next:
                    # Topic is complete, find next unlocked topic
                    for meta in CANONICAL_LEARNING_METADATA:
                        ts = meta["slug"]
                        if not topic_completed_map.get(ts, False) and all(topic_completed_map.get(p, False) for p in meta["prerequisites"]):
                            cand_t = db_topics.get(ts)
                            if cand_t and cand_t.lessons:
                                resume_topic = cand_t
                                resume_lesson = cand_t.lessons[0]
                                total_l = len(cand_t.lessons)
                                lesson_idx = 1
                                break

        if not resume_topic:
            # Fallback to first incomplete unlocked topic
            for meta in CANONICAL_LEARNING_METADATA:
                ts = meta["slug"]
                if not topic_completed_map.get(ts, False):
                    cand_t = db_topics.get(ts)
                    if cand_t and cand_t.lessons:
                        resume_topic = cand_t
                        for idx, les in enumerate(cand_t.lessons):
                            if les.id not in completed_lesson_ids:
                                resume_lesson = les
                                lesson_idx = idx + 1
                                break
                        total_l = len(cand_t.lessons)
                        break

        if resume_topic and resume_lesson:
            pct = round((lesson_idx - 1) / total_l * 100) if total_l > 0 else 0.0
            current_learning = CurrentLearningState(
                has_progress=True,
                topic_slug=resume_topic.slug,
                topic_title=resume_topic.title,
                topic_description=resume_topic.description,
                lesson_slug=resume_lesson.slug,
                lesson_title=resume_lesson.title,
                lesson_index=lesson_idx,
                total_lessons=total_l,
                progress_percentage=pct,
            )

    # 7. Deterministic Recommendation Engine
    # Priority: 1. Prerequisite unlock -> 2. Weakest skill -> 3. Continue path -> 4. Default Foundations
    recommendation: LearningRecommendation | None = None

    # Priority 1: Check if an unlocked topic is ready to start
    for meta in CANONICAL_LEARNING_METADATA:
        ts = meta["slug"]
        if not topic_completed_map.get(ts, False) and meta["prerequisites"]:
            if all(topic_completed_map.get(p, False) for p in meta["prerequisites"]):
                db_t = db_topics.get(ts)
                l_slug = db_t.lessons[0].slug if db_t and db_t.lessons else meta["first_lesson_slug"]
                l_title = db_t.lessons[0].title if db_t and db_t.lessons else meta["title"]
                recommendation = LearningRecommendation(
                    topic_slug=ts,
                    topic_title=meta["title"],
                    lesson_slug=l_slug,
                    lesson_title=l_title,
                    reason=f"Prerequisites completed! Unlock your {meta['category']} foundation.",
                    priority="prerequisite_unlock",
                    target_domain=meta["category"],
                    estimated_minutes=meta["estimated_minutes"],
                )
                break

    # Priority 2: Weakest skill with satisfied prerequisites
    if not recommendation and weakest_domain:
        for meta in CANONICAL_LEARNING_METADATA:
            if meta["skill_slug"] == weakest_domain.slug:
                ts = meta["slug"]
                if not topic_completed_map.get(ts, False) and all(topic_completed_map.get(p, False) for p in meta["prerequisites"]):
                    db_t = db_topics.get(ts)
                    l_slug = db_t.lessons[0].slug if db_t and db_t.lessons else meta["first_lesson_slug"]
                    l_title = db_t.lessons[0].title if db_t and db_t.lessons else meta["title"]
                    recommendation = LearningRecommendation(
                        topic_slug=ts,
                        topic_title=meta["title"],
                        lesson_slug=l_slug,
                        lesson_title=l_title,
                        reason=f"Identified as your lowest-scoring skill domain ({weakest_domain.mastery_score}%). Strengthen this area.",
                        priority="weakest_skill",
                        target_domain=meta["category"],
                        estimated_minutes=meta["estimated_minutes"],
                    )
                    break

    # Priority 3: Continue active path
    if not recommendation and current_learning and current_learning.lesson_slug:
        recommendation = LearningRecommendation(
            topic_slug=current_learning.topic_slug or "fundamentals",
            topic_title=current_learning.topic_title or "System Design Foundations",
            lesson_slug=current_learning.lesson_slug,
            lesson_title=current_learning.lesson_title or "Latency vs Throughput",
            reason="Continue where you left off in your current learning curriculum.",
            priority="continue_path",
            target_domain="Active Path",
            estimated_minutes=20,
        )

    # Priority 4: Default for new users
    if not recommendation:
        recommendation = LearningRecommendation(
            topic_slug="fundamentals",
            topic_title="System Design Foundations",
            lesson_slug="latency-vs-throughput",
            lesson_title="Latency vs. Throughput: Sizing Systems from First Principles",
            reason="Start with first-principles system sizing, Little's Law, and capacity estimation.",
            priority="prerequisite_unlock",
            target_domain="Foundations",
            estimated_minutes=20,
        )

    # 8. Build enriched TopicSummary list for curriculum explorer
    topic_summaries: list[TopicSummary] = []
    for meta in CANONICAL_LEARNING_METADATA:
        ts = meta["slug"]
        db_t = db_topics.get(ts)
        t_id = db_t.id if db_t else uuid.uuid5(uuid.NAMESPACE_DNS, ts)
        title = db_t.title if db_t else meta["title"]
        desc = db_t.description if db_t else meta["description"]
        track = db_t.track if db_t else meta["track"]
        order = db_t.order_index if db_t else meta["order_index"]
        icon = db_t.icon if db_t else meta["icon"]
        total_l = len(db_t.lessons) if db_t and db_t.lessons else meta["concept_count"]
        done_l = sum(1 for les in db_t.lessons if les.id in completed_lesson_ids) if db_t and db_t.lessons else 0
        pct = topic_completion_pct_map.get(ts, 0.0)
        first_lesson = db_t.lessons[0].slug if db_t and db_t.lessons else meta["first_lesson_slug"]
        prereqs = topics_prerequisites.get(ts, [])

        topic_summaries.append(
            TopicSummary(
                id=t_id,
                slug=ts,
                title=title,
                description=desc,
                track=track,
                order_index=order,
                icon=icon,
                lesson_count=total_l,
                completed_count=done_l,
                difficulty=meta["difficulty"],
                estimated_minutes=meta["estimated_minutes"],
                mastery_percentage=pct,
                first_lesson_slug=first_lesson,
                prerequisites=prereqs,
            )
        )

    return LearningOverviewResponse(
        overall_mastery=overall_mastery,
        current_level=current_level,
        concepts_mastered=concepts_mastered,
        total_concepts=len(CANONICAL_LEARNING_METADATA),
        current_learning=current_learning,
        strongest_domain=strongest_domain,
        weakest_domain=weakest_domain,
        recommended_domain=recommended_domain,
        recommendation=recommendation,
        domains=domains,
        learning_paths=learning_paths,
        topics_prerequisites=topics_prerequisites,
        topics=topic_summaries,
    )
