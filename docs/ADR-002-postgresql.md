# ADR-002: PostgreSQL as Primary Datastore

## Status
Accepted

## Context
DesignKaro needs to persist user accounts, progress, graph-based architecture versions, structured evaluation rubrics, interview transcripts, and mastery matrices. ACID guarantees, foreign key integrity, JSONB support for semi-structured node properties, and rich indexing are critical.

## Decision
We select **PostgreSQL 16** with SQLAlchemy 2.0 (asyncpg driver) and Alembic for schema migrations.

## Consequences
### Positive
- Strict relational consistency for accounts, attempts, and interview records.
- Native `JSONB` support with GIN indexing for architecture graph payloads (nodes, edges, properties).
- Standardized tooling and battle-tested backup/restore operations.
- Strong compatibility with cloud providers (AWS RDS, Supabase, Neon, Cloud SQL).

### Trade-offs
- Ephemeral state (live simulation ticks, rate limiting tokens) should not hit PostgreSQL directly; offloaded to Redis.
