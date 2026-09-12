# ADR-003: Redis as In-Memory Cache, Rate Limiter, and Real-Time State Broker

## Status
Accepted

## Context
High-frequency operations such as token-bucket rate limiting, transient simulation state, pub/sub for real-time interview collaboration, and response caching require sub-millisecond read/write latency.

## Decision
We deploy **Redis 7.2** using `redis.asyncio` with connection pooling.

## Consequences
### Positive
- Sub-millisecond latency for token verification, user session caching, and rate limiting counters.
- Redis Pub/Sub and Streams provide real-time event distribution for interactive whiteboard updates.
- Decouples volatile simulation counters from PostgreSQL I/O.

### Trade-offs
- In-memory data is volatile; all permanent state must be flushed or asynchronously synced to PostgreSQL.
