"""
Practice questions seed data for DesignKaro.
Covers beginner, intermediate, advanced, and ML system design problems
with progressive constraints, evaluation criteria, and 4-tier hints.
"""

QUESTIONS_SEED_DATA = [
    {
        "slug": "url-shortener-tinyurl",
        "title": "Design a High-Throughput URL Shortener (TinyURL)",
        "difficulty": "beginner",
        "category": "Fundamentals & Storage",
        "description": "Design a globally scalable URL shortening service like TinyURL or Bitly that converts long URLs into compact 7-character aliases with high read availability and sub-20ms latency.",
        "requirements": [
            "Given a long URL, generate a unique, short URL alias (e.g., https://dk.io/7xK9w2).",
            "When users access the short link, redirect them to the original URL via HTTP 301 or 302.",
            "Support optional custom short aliases if available.",
            "Shortened URLs should expire after a configurable default TTL (e.g., 2 years).",
            "Collect basic telemetry (click counts, referrer, user-agent) asynchronously without impacting redirect latency."
        ],
        "constraints": {
            "write_qps": 500,
            "read_qps": 25000,
            "read_write_ratio": "50:1 (Read heavy)",
            "p99_latency_ms": 20,
            "availability_sla": "99.99% (Four Nines)",
            "storage_duration_years": 5,
            "max_alias_length": 7
        },
        "expected_scale": {
            "monthly_new_urls": "130 Million",
            "total_urls_5_years": "7.8 Billion",
            "storage_required_tb": 3.9,
            "read_bandwidth_mbps": 100,
            "cache_memory_gb": 48
        },
        "hints": [
            {
                "level": 1,
                "title": "Socratic Nudge",
                "content": "Why is Base62 (a-z, A-Z, 0-9) preferred over Base64 for URL aliases? What happens if you use standard MD5 or SHA-256 and truncate it to 7 chars?"
            },
            {
                "level": 2,
                "title": "Constraint Analysis",
                "content": "A 50:1 read-to-write ratio means 98% of your traffic is cacheable. If 20% of the URLs generate 80% of the traffic (Pareto 80/20 rule), how much Redis RAM do you need to serve 80% of reads from memory?"
            },
            {
                "level": 3,
                "title": "Trade-off & Architecture",
                "content": "HTTP 301 (Permanent Redirect) vs 302 (Found / Temporary Redirect): 301 is cached by client browsers, which reduces your server load to zero for repeat visitors but destroys your click analytics. 302 forces every hit through your service for accurate tracking."
            },
            {
                "level": 4,
                "title": "Concrete Blueprint",
                "content": "Pre-generate unique 64-bit integer IDs using a Key Generation Service (KGS) or Twitter Snowflake. Encode the ID into Base62 (e.g. 62^7 = 3.5 trillion URLs). Store the mapping in a wide-column store (Cassandra) or PostgreSQL with a Redis LRU read-through cache."
            }
        ],
        "evaluation_criteria": {
            "required_components": ["API Gateway", "Application Service", "In-Memory Cache (Redis)", "Database (PostgreSQL / Cassandra)"],
            "anti_patterns": ["Direct database hits on every redirect", "Single point of failure database without replica", "Synchronous analytics writes on the critical redirect path"],
            "scalability_checklist": [
                "Base62 encoding or pre-generated KGS tokens",
                "Read-through cache layer",
                "Asynchronous message queue for click telemetry",
                "Database partitioning by short URL hash or range"
            ]
        }
    },
    {
        "slug": "distributed-rate-limiter",
        "title": "Design a Distributed Rate Limiter (Cloudflare / Stripe)",
        "difficulty": "intermediate",
        "category": "API Gateway & Security",
        "description": "Design a resilient, low-latency distributed rate limiter middleware capable of protecting downstream microservices against API abuse, DDoS, and runaway crawler scripts across multiple availability zones.",
        "requirements": [
            "Limit API requests per user IP or API token (e.g., 100 requests per minute).",
            "Return standard HTTP 429 Too Many Requests with headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After.",
            "Sub-5ms evaluation latency overhead per incoming request.",
            "Support configurable rate tiers per API tenant (Basic: 10 req/s, Enterprise: 10,000 req/s).",
            "Gracefully fail-open if the rate-limiting infrastructure experiences transient degradation."
        ],
        "constraints": {
            "incoming_qps": 100000,
            "max_check_latency_ms": 5,
            "availability_sla": "99.999% (Five Nines)",
            "consistency_guarantee": "Eventual consistency acceptable under partition"
        },
        "expected_scale": {
            "active_client_keys": "5 Million",
            "operations_per_sec": 100000,
            "cluster_memory_gb": 16,
            "redis_nodes": 6
        },
        "hints": [
            {
                "level": 1,
                "title": "Socratic Nudge",
                "content": "What are the trade-offs between Token Bucket, Leaky Bucket, Fixed Window Counter, and Sliding Window Log algorithms?"
            },
            {
                "level": 2,
                "title": "Constraint Analysis",
                "content": "At 100,000 QPS, if every check does a multi-step read-then-write over the network to Redis, race conditions will cause under-counting. How can you execute atomic operations without blocking?"
            },
            {
                "level": 3,
                "title": "Trade-off & Architecture",
                "content": "Use Redis with an atomic Lua script or Redis Cell to execute token bucket decrement and timestamp update in a single in-memory transaction. Alternatively, use local in-memory L1 cache with periodic asynchronous batch synchronization to reduce cross-network hops."
            },
            {
                "level": 4,
                "title": "Concrete Blueprint",
                "content": "Deploy rate limiter logic directly in an Envoy / API Gateway proxy. Use Sliding Window Counter algorithm stored in a Redis Cluster partitioned by client_id hash. Fallback to local memory token bucket if Redis is unreachable (fail-open strategy)."
            }
        ],
        "evaluation_criteria": {
            "required_components": ["API Gateway", "Redis Cluster / Memory Store", "Fail-open Circuit Breaker", "Rules Configuration Store"],
            "anti_patterns": ["Storing rate limit timestamps in a relational disk database", "Blocking network locks across app instances", "Failing closed and blocking all customer traffic during cache hiccups"],
            "scalability_checklist": [
                "Atomic token updates (Lua script or Redis hashes)",
                "Local L1 thread-safe memory cache for hot tokens",
                "Proper HTTP 429 and Retry-After header construction",
                "Multi-AZ Redis replication with Sentinel or Cluster"
            ]
        }
    },
    {
        "slug": "real-time-chat-engine",
        "title": "Design a Real-Time Scalable Chat & Presence Engine (Discord / Slack)",
        "difficulty": "hard",
        "category": "Real-Time & Networking",
        "description": "Design a high-concurrency real-time messaging platform supporting direct 1-to-1 conversations, group channels with up to 100,000 members, live user presence (Online/Idle/Offline), and message delivery guarantees.",
        "requirements": [
            "Instant 1-to-1 and multi-user group chat with sub-100ms delivery latency.",
            "Real-time user presence indicators updated every few seconds.",
            "Persistent chat history searchable by timestamp and keyword.",
            "Delivery acknowledgment (Sent, Delivered, Read receipts).",
            "Offline push notifications when recipients are disconnected."
        ],
        "constraints": {
            "daily_active_users": "50 Million",
            "concurrent_websockets": "2 Million",
            "messages_per_second_peak": "80,000",
            "max_delivery_latency_ms": 100,
            "history_retention": "Unlimited"
        },
        "expected_scale": {
            "daily_messages": "1.2 Billion",
            "daily_storage_gb": 360,
            "websocket_gateway_servers": 100,
            "pubsub_bandwidth_gbps": 12
        },
        "hints": [
            {
                "level": 1,
                "title": "Socratic Nudge",
                "content": "Why is HTTP polling inadequate for 2 million concurrent users? How does WebSocket connection state affect horizontal autoscaling of your gateway servers?"
            },
            {
                "level": 2,
                "title": "Constraint Analysis",
                "content": "If User A is connected to Gateway Server 3 and User B is connected to Gateway Server 47, how do they exchange messages without routing every single message to all 100 servers?"
            },
            {
                "level": 3,
                "title": "Trade-off & Architecture",
                "content": "Use a distributed Pub/Sub message broker (Redis Pub/Sub or Apache Kafka / Pulsar) partitioned by `channel_id` or `conversation_id`. Store user connection mappings (`user_id -> gateway_server_id`) in a fast distributed key-value store."
            },
            {
                "level": 4,
                "title": "Concrete Blueprint",
                "content": "Deploy WebSocket Gateway cluster behind an L4/L7 Load Balancer. Use Cassandra / ScyllaDB for message storage partitioned by `(channel_id, bucket_month)` with clustering key `message_id (Snowflake)`. Use Kafka for message ordering and fan-out, and Redis for ephemeral presence heartbeats."
            }
        ],
        "evaluation_criteria": {
            "required_components": ["Load Balancer", "WebSocket Gateway Cluster", "Message Broker (Kafka / Redis)", "Message Store (Cassandra / NoSQL)", "Presence Service", "Push Notification Worker"],
            "anti_patterns": ["Storing active WebSocket connections in a single server memory", "Using relational DB transactions for every real-time message fan-out", "Broadcast presence updates naively to all users in the system"],
            "scalability_checklist": [
                "Connection manager tracking user socket affinity",
                "Snowflake ID generation for strict chronological ordering",
                "Wide-column storage partitioned by channel ID",
                "Heartbeat presence aggregation to prevent thundering herd"
            ]
        }
    },
    {
        "slug": "video-transcoding-cdn",
        "title": "Design a Video Ingestion, Transcoding & Global CDN Platform (YouTube / Netflix)",
        "difficulty": "hard",
        "category": "Media & Distributed Storage",
        "description": "Architect an end-to-end video streaming pipeline capable of ingesting raw multi-gigabyte video uploads, chunking and transcoding them into multi-bitrate HLS/DASH streams in parallel, and delivering them globally with instant playback start.",
        "requirements": [
            "Resumable multipart uploads of raw video files up to 50 GB.",
            "Asynchronous distributed transcoding into multiple resolutions (1080p, 720p, 480p, 360p) using H.264/AV1.",
            "Adaptive Bitrate Streaming (ABR) manifest generation (HLS master playlist + .ts/.m4s chunks).",
            "Global CDN caching with >95% edge cache hit ratio for popular videos.",
            "Video metadata catalog with search, view counts, and thumbnail generation."
        ],
        "constraints": {
            "daily_uploads_hours": 15000,
            "concurrent_viewers_peak": 1000000,
            "video_start_time_sla_s": 1.5,
            "transcode_completion_p90_m": 5
        },
        "expected_scale": {
            "daily_raw_storage_tb": 150,
            "daily_transcoded_storage_tb": 350,
            "edge_egress_bandwidth_tbps": 8,
            "transcoding_worker_nodes": 500
        },
        "hints": [
            {
                "level": 1,
                "title": "Socratic Nudge",
                "content": "Why should video uploads never pass through your API application servers? What AWS S3 / Object Store feature allows direct-to-storage uploads securely?"
            },
            {
                "level": 2,
                "title": "Constraint Analysis",
                "content": "Transcoding a 2-hour 4K video as a single monolithic job takes 40 minutes on a single machine. How can you parallelize this job across 50 worker nodes to finish in under 2 minutes?"
            },
            {
                "level": 3,
                "title": "Trade-off & Architecture",
                "content": "Split the raw video file into GOP (Group of Pictures) chunks of 2-5 seconds each. Enqueue chunk transcoding tasks onto an SQS / Kafka queue processed by an auto-scaling worker fleet. Merge transcoded chunks and generate the HLS index file upon completion."
            },
            {
                "level": 4,
                "title": "Concrete Blueprint",
                "content": "Client requests presigned S3 URL from API Gateway. Raw upload triggers S3 Event Notification -> Transcoding DAG Coordinator. Workers stream chunks, convert formats, and write to Public Media Bucket. Multi-tier CDN (Edge PoP -> Origin Shield) caches video segments."
            }
        ],
        "evaluation_criteria": {
            "required_components": ["API Gateway", "Object Storage (S3)", "Transcoding DAG Orchestrator", "Worker Pool", "Global CDN", "Metadata DB"],
            "anti_patterns": ["Streaming raw video files through API web pods", "Monolithic non-chunked video transcoding jobs", "Serving streaming media directly from origin storage without CDN"],
            "scalability_checklist": [
                "Presigned upload URLs with multipart chunking",
                "GOP chunk slicing and parallel worker pool",
                "Origin Shield CDN architecture to protect storage",
                "Storage tiering (Hot NVMe -> S3 Standard -> S3 Glacier)"
            ]
        }
    },
    {
        "slug": "distributed-ride-dispatch",
        "title": "Design a Real-Time Geospatial Ride Dispatching System (Uber / Lyft)",
        "difficulty": "hard",
        "category": "Geospatial & High Throughput",
        "description": "Design the core ride dispatching and driver-rider matching engine for a global ride-sharing service, handling continuous driver GPS pings, radius geospatial searches, and high-concurrency dispatch transactions.",
        "requirements": [
            "Ingest driver GPS coordinates every 4 seconds for 1 million active drivers.",
            "Riders can query nearby available drivers within a 3 km radius with <500ms latency.",
            "Match ride requests to the optimal driver and atomically complete the dispatch without double-booking.",
            "Calculate dynamic surge pricing based on local supply and demand ratios.",
            "Track ride trips with live route telemetry."
        ],
        "constraints": {
            "active_drivers": 1000000,
            "driver_gps_frequency_s": 4,
            "gps_ingestion_qps": 250000,
            "ride_requests_per_sec": 12000,
            "match_latency_sla_s": 1.0
        },
        "expected_scale": {
            "gps_telemetry_mbps": 50,
            "redis_geospatial_memory_gb": 32,
            "active_trip_state_events_sec": 40000
        },
        "hints": [
            {
                "level": 1,
                "title": "Socratic Nudge",
                "content": "Why is a traditional SQL database with B-Tree indexes on (latitude, longitude) completely unusable at 250,000 writes per second?"
            },
            {
                "level": 2,
                "title": "Constraint Analysis",
                "content": "Compare Uber H3 (Hexagonal hierarchical spatial index) vs Google S2 vs Geohash. Why are hexagons ideal for distance approximations and cell boundary transitions?"
            },
            {
                "level": 3,
                "title": "Trade-off & Architecture",
                "content": "Separate the high-volume ephemeral location pipeline from the transactional ride state. Buffer GPS pings in Kafka -> Redis Geospatial / In-memory H3 Index. Keep ride state and driver dispatch in PostgreSQL with distributed locks."
            },
            {
                "level": 4,
                "title": "Concrete Blueprint",
                "content": "Driver app sends UDP/gRPC location pings to Location Ingestion Gateways. Gateways write directly to Redis Geospatial cluster partitioned by city/geohash. Match Engine queries Redis GEOSEARCH, selects top candidate, and executes atomic Redlock/DB reservation."
            }
        ],
        "evaluation_criteria": {
            "required_components": ["Location Ingest Gateway", "Redis Geospatial / In-Memory Grid", "Matching Engine", "Dispatch State DB", "Event Broker (Kafka)"],
            "anti_patterns": ["Writing raw GPS pings directly to a relational disk table", "Querying all drivers worldwide with linear scan", "Race conditions allowing two riders to claim the same driver"],
            "scalability_checklist": [
                "Geospatial cell partitioning (H3 or Geohash)",
                "Decoupled fast-path GPS stream from slow-path trip ledger",
                "Distributed lock or optimistic concurrency control for ride matching",
                "Dead-letter queues for failed driver dispatch responses"
            ]
        }
    },
    {
        "slug": "ticketmaster-distributed-lock",
        "title": "Design a High-Contention Flash Sale & Seat Reservation Engine (Ticketmaster)",
        "difficulty": "advanced",
        "category": "Distributed Locking & ACID",
        "description": "Design an online ticketing platform capable of handling extreme flash-sale spikes (e.g. 50,000 users attempting to buy 1,000 front-row concert seats simultaneously) with zero overselling, 10-minute cart holds, and payment reconciliation.",
        "requirements": [
            "Display stadium seat map with real-time seat availability (Available, Held, Sold).",
            "When a user selects seats, place an atomic 10-minute hold preventing other buyers from selecting them.",
            "If payment is completed within 10 minutes, transition seat state to Sold and issue digital ticket.",
            "If checkout timer expires, automatically release held seats back into the available pool.",
            "Strict zero-oversell guarantee under extreme concurrent race conditions."
        ],
        "constraints": {
            "flash_sale_concurrent_users": 100000,
            "burst_seat_claim_qps": 25000,
            "hold_duration_minutes": 10,
            "consistency_requirement": "Strict Serializability / ACID for seat status"
        },
        "expected_scale": {
            "stadium_seat_capacity": 60000,
            "peak_request_surge_multiplier": "100x baseline",
            "database_lock_contention_index": "Severe"
        },
        "hints": [
            {
                "level": 1,
                "title": "Socratic Nudge",
                "content": "If 10,000 users click 'Reserve Seat A1' at the exact same millisecond, what happens to your relational database if you use SELECT FOR UPDATE?"
            },
            {
                "level": 2,
                "title": "Constraint Analysis",
                "content": "Database row lock starvation and connection pool exhaustion will crash the database. How can a virtual waiting room (Token Bucket Queue) throttle and order incoming traffic before it ever touches inventory?"
            },
            {
                "level": 3,
                "title": "Trade-off & Architecture",
                "content": "Use an in-memory lock engine in Redis (SET key token NX EX 600) or Lua scripts for atomic test-and-set hold operations. Use Redis Key Expiration Pub/Sub or delayed task queues to handle the 10-minute automatic release."
            },
            {
                "level": 4,
                "title": "Concrete Blueprint",
                "content": "Place Cloudflare Virtual Waiting Room in front of API. Inventory hold managed atomically in Redis via Lua script. Successful holds create a pending order in PostgreSQL with an idempotency key. Delayed message in RabbitMQ/SQS handles TTL rollback if payment webhook does not fire."
            }
        ],
        "evaluation_criteria": {
            "required_components": ["Virtual Waiting Room / Ingress Queue", "API Gateway", "Distributed Lock Engine (Redis Lua)", "Transactional Order DB", "Delayed Task Scheduler"],
            "anti_patterns": ["Relying solely on pessimistic database locks under 25,000 QPS", "Missing TTL cleanup for abandoned carts", "Non-idempotent payment webhook callbacks causing duplicate tickets"],
            "scalability_checklist": [
                "Traffic shaping via fair queue waiting room",
                "Atomic seat state transition (Available -> Held -> Sold)",
                "Idempotency keys on checkout endpoints",
                "Automatic TTL expiration rollback via delayed queues"
            ]
        }
    },
    {
        "slug": "ml-recommendation-system",
        "title": "Design a Real-Time Recommendation & Embedding Search Engine (TikTok / Spotify)",
        "difficulty": "advanced",
        "category": "ML System Design",
        "description": "Architect a production ML recommendation pipeline operating at massive scale, executing two-stage candidate retrieval (millions to thousands) and real-time deep neural ranking (thousands to top 50) with sub-50ms latency.",
        "requirements": [
            "Given user context and past interactions, deliver personalized top-50 recommendations.",
            "Sub-50ms end-to-end serving latency at 20,000 QPS.",
            "Two-stage pipeline: Retrieval / Candidate Generation (10M items -> 500) followed by Heavy Neural Ranking (500 -> 50).",
            "Real-time feature store delivering millisecond feature lookups for online inference.",
            "Continuous model retraining and near-instant feedback loop ingestion (video watch duration, likes, skips)."
        ],
        "constraints": {
            "catalog_items": 100000000,
            "active_users": 200000000,
            "inference_qps": 20000,
            "p99_latency_budget_ms": 50
        },
        "expected_scale": {
            "feature_store_read_qps": 100000,
            "vector_embedding_dimension": 256,
            "vector_index_size_gb": 200,
            "daily_interaction_events": 5000000000
        },
        "hints": [
            {
                "level": 1,
                "title": "Socratic Nudge",
                "content": "Why is it impossible to evaluate a 100-layer deep neural ranking model directly against 100 million items in your catalog within a 50ms latency budget?"
            },
            {
                "level": 2,
                "title": "Constraint Analysis",
                "content": "Candidate retrieval must filter 100M items down to 500 in <15ms. How does Approximate Nearest Neighbor (ANN) vector search (like HNSW or ScaNN) achieve logarithmic search complexity?"
            },
            {
                "level": 3,
                "title": "Trade-off & Architecture",
                "content": "Precompute item embeddings offline via batch pipeline and index them in a Vector Database (Qdrant / Milvus / FAISS). Combine collaborative filtering candidates, popular trending candidates, and vector ANN candidates into a hybrid candidate set."
            },
            {
                "level": 4,
                "title": "Concrete Blueprint",
                "content": "Ingest user event stream via Kafka into Flink for real-time feature updates (Feast / Redis). Online inference service generates user vector, queries Vector DB for 500 candidates, pulls real-time features from Redis, passes to Triton Inference Server (ranking model), applies business diversity rules, and returns top 50."
            }
        ],
        "evaluation_criteria": {
            "required_components": ["API Gateway", "Candidate Generation Service", "Vector DB (Qdrant / Milvus)", "Online Feature Store (Redis / Feast)", "Triton Model Serving Cluster", "Streaming Event Pipeline (Kafka + Flink)"],
            "anti_patterns": ["Running heavy deep neural inference on all 100M items", "Fetching features from a slow relational database during online scoring", "Failing to deduplicate or apply diversity filters in final recommendation stage"],
            "scalability_checklist": [
                "Two-stage funnel (Retrieval -> Scoring -> Re-ranking)",
                "Vector database with HNSW indexing",
                "Low-latency feature store with sub-5ms SLA",
                "Model versioning and A/B testing canary deployment"
            ]
        }
    },
    {
        "slug": "distributed-web-crawler",
        "title": "Design a High-Throughput Distributed Web Crawler (Googlebot)",
        "difficulty": "hard",
        "category": "Distributed Systems & Batch",
        "description": "Design a fault-tolerant, polite, and distributed web crawler capable of traversing billions of web pages per month, discovering new hyperlinks, respecting robots.txt directives, and detecting duplicate content.",
        "requirements": [
            "Crawl 5 billion web pages per month (approx. 2,000 pages per second continuous).",
            "Strict politeness policy: avoid overloading individual web servers by enforcing per-domain crawl delays.",
            "Respect robots.txt exclusions and no-crawl directives with fast caching.",
            "Identify and skip duplicate content using cryptographic and similarity hashing (SimHash).",
            "Handle crawler traps, cyclic redirects, and malformed HTML gracefully."
        ],
        "constraints": {
            "monthly_pages": 5000000000,
            "crawl_qps": 2000,
            "dns_resolution_latency_budget_ms": 10,
            "storage_raw_pages_tb_month": 500
        },
        "expected_scale": {
            "url_frontier_queue_size": "20 Billion URLs",
            "bloom_filter_memory_gb": 32,
            "distributed_dns_cache_servers": 10
        },
        "hints": [
            {
                "level": 1,
                "title": "Socratic Nudge",
                "content": "If a simple FIFO queue contains 10,000 URLs belonging to `nytimes.com`, fetching them sequentially would constitute a denial-of-service attack. How must the URL Frontier be structured to guarantee politeness?"
            },
            {
                "level": 2,
                "title": "Constraint Analysis",
                "content": "Checking whether a URL has already been visited out of 20 billion URLs cannot do a disk seek. How does a Scalable Bloom Filter in RAM provide millisecond membership testing with a zero false negative guarantee?"
            },
            {
                "level": 3,
                "title": "Trade-off & Architecture",
                "content": "Mercator URL Frontier design: Prioritizer queues split URLs into Priority Queues (importance/PageRank), followed by Politeness Queues mapped one-per-host with delay timers. Dedicated local DNS cache resolver avoids choking public DNS servers."
            },
            {
                "level": 4,
                "title": "Concrete Blueprint",
                "content": "URL Frontier built with Kafka topics partitioned by hostname hash. Fetcher workers read from designated host queue, download HTML, compute SimHash signature against DocStore (HBase / Bigtable), parse outbound URLs, filter via Bloom Filter, and push new URLs back to Frontier."
            }
        ],
        "evaluation_criteria": {
            "required_components": ["URL Frontier (Priority + Politeness Queues)", "Fetcher Worker Cluster", "DNS Resolver Cache", "Content Storage (Object Store / Bigtable)", "Deduplication Engine (Bloom Filter + SimHash)"],
            "anti_patterns": ["Unbounded FIFO queue without per-domain politeness throttling", "Querying relational DB for URL deduplication at thousands of checks per second", "Failing to detect circular redirection crawler traps"],
            "scalability_checklist": [
                "Two-tier URL Frontier (Priority / Politeness)",
                "Distributed Bloom filter in memory for URL set membership",
                "Local DNS caching cluster",
                "SimHash content near-duplicate detection"
            ]
        }
    }
]
