
from backend.app.schemas.knowledge import KnowledgeItem, KnowledgeSearchResponse
from fastapi import APIRouter, Query

router = APIRouter()

KNOWLEDGE_DATA = [
    KnowledgeItem(
        id="cs-001",
        title="How Netflix Streams Video at 20 Tbps Peak with Open Connect CDN",
        category="Streaming & Storage",
        document_type="case_study",
        company="Netflix",
        summary="Deep-dive into Netflix's Open Connect custom appliance network, encoding pipelines, and adaptive bitrate HLS/DASH chunking.",
        key_takeaways=[
            "Custom FreeBSD Open Connect Appliances deployed inside ISP networks to eliminate transit costs.",
            "Proactive off-peak content pre-positioning caches popular movies overnight.",
            "Chunked parallel encoding using Group of Pictures (GOP) micro-tasks.",
        ],
        tags=["CDN", "Video", "Storage", "Caching"],
        url="https://netflixtechblog.com",
    ),
    KnowledgeItem(
        id="cs-002",
        title="How Discord Stores Billions of Messages with ScyllaDB & Rust",
        category="Real-Time & Storage",
        document_type="case_study",
        company="Discord",
        summary="How Discord migrated from MongoDB to Cassandra, and ultimately to ScyllaDB (C++ rewrite) to eliminate JVM garbage collection pauses.",
        key_takeaways=[
            "Partitioning by (channel_id, bucket_id) ensures balanced token ring distribution.",
            "ScyllaDB thread-per-core shared-nothing architecture achieved consistent sub-15ms p99 read latencies.",
            "Data service layer written in Rust handles request coalescing to prevent cache stampedes.",
        ],
        tags=["ScyllaDB", "Cassandra", "Real-Time", "Rust"],
        url="https://discord.com/blog",
    ),
    KnowledgeItem(
        id="cs-003",
        title="Uber's Geospatial Marketplace: Scaling Real-time Driver GPS Pings with H3",
        category="Geospatial & Ingestion",
        document_type="case_study",
        company="Uber",
        summary="Architecture of Uber's Hexagonal Hierarchical Spatial Index (H3) processing 1M+ driver locations every 4 seconds.",
        key_takeaways=[
            "Hexagons have uniform neighbor distance properties compared to squares or triangles.",
            "Separating fast-path ephemeral location streams (Kafka -> Redis) from slow-path trip ledger (PostgreSQL).",
            "Ring buffer spatial indexing enables millisecond radius search without full table scans.",
        ],
        tags=["Geospatial", "H3", "Kafka", "Redis"],
        url="https://www.uber.com/blog/engineering",
    ),
    KnowledgeItem(
        id="cs-004",
        title="Monolith to Microservices at Stripe: Distributed Idempotency Engine",
        category="FinTech & Reliability",
        document_type="case_study",
        company="Stripe",
        summary="How Stripe guarantees zero double-charges during network partitions using idempotent request keys and state machines.",
        key_takeaways=[
            "Client generates unique Idempotency-Key header on mutation requests.",
            "Atomic test-and-set lock placed in Redis/PostgreSQL with automatic TTL.",
            "Stored responses replayed verbatim to callers upon network timeout retries.",
        ],
        tags=["FinTech", "Idempotency", "Transactions", "Reliability"],
        url="https://stripe.com/blog/engineering",
    ),
    KnowledgeItem(
        id="cs-005",
        title="TikTok / ByteDance: Real-Time Deep Recommendation & Vector Search at Scale",
        category="ML System Design",
        document_type="case_study",
        company="TikTok",
        summary="Two-stage recommendation pipeline handling billions of daily video interactions with sub-50ms inference.",
        key_takeaways=[
            "Two-tower neural network decouples user embedding computation from 100M+ candidate retrieval.",
            "HNSW vector indexing in memory searches millions of candidate videos in under 15ms.",
            "Real-time feature store powered by Flink streaming and low-latency Redis lookups.",
        ],
        tags=["ML", "Recommendation", "Vector DB", "Embeddings", "HNSW"],
        url="https://bytedance.com/blog",
    ),
]


@router.get("/search", response_model=KnowledgeSearchResponse)
async def search_knowledge_base(
    q: str | None = Query(None, description="Search query keywords (e.g. Redis, Cassandra, Kafka, ML)"),
    category: str | None = Query(None, description="Filter by category"),
) -> KnowledgeSearchResponse:
    """Search curated system design knowledge base, engineering blogs, and architectural post-mortems."""
    results = KNOWLEDGE_DATA
    if category:
        results = [k for k in results if k.category.lower() == category.lower()]
    if q:
        query_str = q.lower()
        results = [
            k
            for k in results
            if query_str in k.title.lower()
            or query_str in k.summary.lower()
            or query_str in k.company.lower()
            or any(query_str in t.lower() for t in k.tags)
        ]

    return KnowledgeSearchResponse(
        query=q or "",
        total_results=len(results),
        results=results,
    )
