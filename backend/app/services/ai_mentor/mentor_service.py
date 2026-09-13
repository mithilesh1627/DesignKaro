
from backend.app.schemas.mentor import (
    MentorChatRequest,
    MentorChatResponse,
    MentorHintRequest,
    MentorHintResponse,
)


class SeniorEngineerMentorService:
    """
    Staff / Principal Distributed Systems Architect Mentor.
    Delivers multi-tier Socratic guidance with first-principles trade-off analysis.
    Works reliably both with external LLM providers and with offline deterministic architectural heuristics.
    """

    def generate_chat_response(self, request: MentorChatRequest) -> MentorChatResponse:
        user_msg = ""
        for m in reversed(request.messages):
            if m.role == "user":
                user_msg = m.content.lower()
                break

        graph = request.graph_data

        # Heuristic Socratic reasoning engine
        reply_lines = []
        followups = []
        dimension = "Scalability & Invariants"  

        # Check graph topology if available
        if graph and graph.nodes:
            node_types = {n.type for n in graph.nodes}
            has_db = "relational_db" in node_types or "nosql_db" in node_types
            has_cache = "cache" in node_types
            has_queue = "queue" in node_types
            has_gw = "gateway" in node_types or "load_balancer" in node_types

            if not has_gw:
                reply_lines.append(
                    "Looking at your canvas, your clients connect directly to services without an Ingress Proxy. How will you enforce authentication, TLS termination, and rate-limiting without duplicating logic across every single microservice?"
                )
                followups.append("Should I use Envoy or Nginx for API Gateway?")

            if not has_cache and has_db:
                reply_lines.append(
                    "You have persistent storage without an In-Memory Caching tier. If 80% of your requests are repetitive reads (Pareto principle), why make your database perform expensive B-Tree disk seeks for immutable or hot data?"
                )
                followups.append("How should we handle cache invalidation on write?")

            if not has_queue:
                reply_lines.append(
                    "Are you executing write-heavy tasks (such as analytics, notifications, or image resizing) synchronously in the client request cycle? What happens to client p99 latency when downstream third-party APIs slow down?"
                )
                followups.append("What is the trade-off between Kafka and RabbitMQ here?")

        # Contextual inquiry response
        if "cache" in user_msg or "redis" in user_msg:
            reply_lines.append(
                "When introducing Redis, the fundamental dilemma is consistency vs latency. Are you using **Cache-Aside** (lazy loading, stale reads possible during race conditions) or **Write-Through** (consistent, but write latency includes cache + DB)? How do you prevent cache stampedes when a high-traffic key expires?"
            )
            followups.extend([
                "How does Probabilistic Early Expiration (XFetch) prevent cache stampedes?",
                "Should we use Redis Sentinel or Redis Cluster for 100k QPS?",
            ])
            dimension = "Caching & Consistency"

        elif "database" in user_msg or "sql" in user_msg or "nosql" in user_msg:
            reply_lines.append(
                "Let's look at access patterns. Relational DBs (PostgreSQL) give ACID transactions and rich relational indexes at the cost of vertical scaling limits and replication lag. Wide-column stores (Cassandra/ScyllaDB) give infinite linear write scalability with peer-to-peer gossip, but you cannot perform ad-hoc JOINs. Does your access pattern require join flexibility or high-write append throughput?"
            )
            followups.extend([
                "How do we partition the database table to avoid hot partitions?",
                "When should we transition from read replicas to database sharding?",
            ])
            dimension = "Storage & Partitioning"

        elif "kafka" in user_msg or "queue" in user_msg:
            reply_lines.append(
                "In message queuing, remember the three delivery guarantees: *At-most-once*, *At-least-once*, and *Exactly-once*. In real-world distributed systems, almost everyone builds on **At-least-once + Idempotent Consumers**. How does your consumer handle duplicated delivery?"
            )
            followups.extend([
                "How do we structure idempotency keys in payment processing?",
                "What happens when consumer lag spikes to 100,000 messages?",
            ])
            dimension = "Asynchronous Decoupling & Reliability"

        elif not reply_lines:
            reply_lines.append(
                "As a Senior Architect, my first question is: **What are your scale invariants?**\n"
                "1. What is your Read-to-Write ratio?\n"
                "2. What is your p99 latency SLA (e.g. <50ms)?\n"
                "3. What breaks first when peak traffic surges 5x?\n\n"
                "Walk me through the lifecycle of a single request from the moment it leaves the client's mobile app to the database transaction commit."
            )
            followups.extend([
                "How do we calculate Little's Law for concurrent connections?",
                "What is our single point of failure in this design?",
            ])

        return MentorChatResponse(
            reply="\n\n".join(reply_lines),
            suggested_followups=followups[:3],
            dimension_focus=dimension,
        )

    def generate_hint(self, request: MentorHintRequest) -> MentorHintResponse:
        level = request.target_level

        hints_db = {
            1: {
                "title": "Level 1: Socratic Nudge",
                "content": "Before adding components, state your primary constraint: Is this system read-heavy or write-heavy? What is the strict latency budget allowed for the primary user flow?",
                "trade_offs": "Optimizing for write throughput (LSM-trees) inherently degrades random read performance compared to B-Tree indexes.",
            },
            2: {
                "title": "Level 2: Quantitative Constraint Analysis",
                "content": "Calculate the concurrency using Little's Law: L = Throughput * Latency. If you have 50,000 QPS with 200ms latency, you must support 10,000 active concurrent in-flight connections simultaneously.",
                "trade_offs": "Maintaining 10,000 open connections requires non-blocking async event loops (epoll/kqueue) or Goroutines rather than one-thread-per-connection thread pools.",
            },
            3: {
                "title": "Level 3: Architectural Trade-off Breakdown",
                "content": "Decouple synchronous read paths from asynchronous ingestion. Put an API Gateway in front, serve reads from a replicated memory cache with 90%+ hit target, and enqueue mutations to a partitioned log broker.",
                "trade_offs": "Synchronous writes give immediate consistency; asynchronous queue ingestion gives instant response but eventual read visibility.",
            },
            4: {
                "title": "Level 4: Concrete Production Blueprint",
                "content": "Complete Blueprint: Clients -> Cloudflare Edge Anycast -> L7 Envoy Gateway -> Stateless Microservices (HPA autoscaling) -> Redis Cluster (LRU eviction) -> ScyllaDB (partition key = user_id) + Kafka Event Stream -> Async Workers.",
                "trade_offs": "Zero single point of failure. Multi-AZ active-active deployment guarantees 99.99% availability.",
            },
        }

        hint_info = hints_db.get(level, hints_db[1])
        return MentorHintResponse(
            level=level,
            title=hint_info["title"],
            content=hint_info["content"],
            trade_off_analysis=hint_info["trade_offs"],
        )


mentor_service = SeniorEngineerMentorService()
