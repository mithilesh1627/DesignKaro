
import re
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
    KnowledgeItem(
        id="cs-006",
        title="WhatsApp: Scaling to 2+ Billion Users with Erlang / BEAM Concurrency",
        category="Real-Time & Storage",
        document_type="case_study",
        company="WhatsApp",
        summary="How WhatsApp achieves 2+ million concurrent TCP connections per FreeBSD server using Erlang lightweight processes and Mnesia.",
        key_takeaways=[
            "Erlang actor model isolates connection state into lightweight heap allocations (~2KB per process).",
            "Kernel tuning with epoll/kqueue and TCP buffer optimization to prevent OS socket exhaustion.",
            "Custom BEAM VM patches for atomic message dispatch and zero-copy binary payload forwarding.",
        ],
        tags=["Erlang", "Concurrency", "WebSockets", "Real-Time", "Networking"],
        url="https://engineering.fb.com",
    ),
    KnowledgeItem(
        id="cs-007",
        title="Pinterest: Sharding 100 Billion Pins with Virtual Buckets & Redis",
        category="Storage & Databases",
        document_type="case_study",
        company="Pinterest",
        summary="How Pinterest scaled from an overwhelmed MySQL cluster to sharded MySQL and Redis with deterministic virtual bucketing.",
        key_takeaways=[
            "Fixed 8,192 virtual shard IDs mapped to physical DB instances via static configuration files.",
            "64-bit ID generation scheme encoding shard ID, sequence, and epoch timestamp.",
            "Redis clusters fronting user feed timelines with pre-computed sorted sets (ZSET).",
        ],
        tags=["Sharding", "Redis", "MySQL", "Caching", "Databases"],
        url="https://medium.com/pinterest-engineering",
    ),
    KnowledgeItem(
        id="cs-008",
        title="Amazon DynamoDB: Leaderless Replication, Sloppy Quorums & Anti-Entropy",
        category="Storage & Databases",
        document_type="case_study",
        company="Amazon",
        summary="The architectural blueprint of Dynamo: leaderless distributed key-value store optimizing for 99.999% write availability.",
        key_takeaways=[
            "Consistent hashing with virtual nodes ensures even partitioning across physical storage nodes.",
            "Sloppy Quorum (R + W > N) and Hinted Handoff ensure high write availability during partition faults.",
            "Merkle tree anti-entropy background synchronization detects out-of-sync replicas without full scans.",
        ],
        tags=["DynamoDB", "Distributed Systems", "Replication", "Storage", "NoSQL"],
        url="https://www.allthingsdistributed.com",
    ),
    KnowledgeItem(
        id="cs-009",
        title="Twitter / X: Hybrid Timeline Architecture (Push vs Pull Fan-out)",
        category="Real-Time & Storage",
        document_type="case_study",
        company="Twitter",
        summary="How Twitter solved the 'Lady Gaga Problem' using hybrid fan-out on write for regular users and fan-out on read for high-follower accounts.",
        key_takeaways=[
            "Fan-out on write pushes tweet IDs directly into Redis home timelines of followers.",
            "Celebrity / high-follower accounts bypass write fan-out; their tweets are merged at read time.",
            "Decoupled timeline cache cluster maintains sub-50ms p99 home timeline render latency.",
        ],
        tags=["Fan-out", "Timeline", "Redis", "PubSub", "Real-Time"],
        url="https://blog.x.com/engineering",
    ),
]


@router.get("/search", response_model=KnowledgeSearchResponse)
async def search_knowledge_base(
    q: str | None = Query(None, description="Search query keywords (e.g. Redis, Cassandra, Kafka, ML, WhatsApp, Dynamo)"),
    category: str | None = Query(None, description="Filter by category"),
) -> KnowledgeSearchResponse:
    """Search curated system design knowledge base, engineering blogs, and architectural post-mortems."""
    items = KNOWLEDGE_DATA
    if category:
        items = [k for k in items if k.category.lower() == category.lower()]

    if not q or not q.strip():
        return KnowledgeSearchResponse(
            query=q or "",
            total_results=len(items),
            results=items,
        )

    query_str = q.strip().lower()
    tokens = [t for t in re.findall(r"\w+", query_str) if len(t) > 1]
    if not tokens:
        tokens = [query_str]

    scored_items: list[tuple[int, KnowledgeItem]] = []

    for item in items:
        score = 0
        title_l = item.title.lower()
        summary_l = item.summary.lower()
        company_l = item.company.lower()
        tags_l = [t.lower() for t in item.tags]
        takeaways_l = [tk.lower() for tk in item.key_takeaways]

        # Exact phrase bonus
        if query_str in title_l:
            score += 25
        elif query_str in summary_l or query_str in company_l:
            score += 15

        for tok in tokens:
            if tok in title_l:
                score += 8
            if tok in company_l:
                score += 6
            if any(tok in t for t in tags_l):
                score += 7
            if tok in summary_l:
                score += 3
            if any(tok in tk for tk in takeaways_l):
                score += 2

        if score > 0:
            scored_items.append((score, item))

    # Sort descending by score
    scored_items.sort(key=lambda x: x[0], reverse=True)
    ranked_results = [item for _, item in scored_items]

    return KnowledgeSearchResponse(
        query=q,
        total_results=len(ranked_results),
        results=ranked_results,
    )

