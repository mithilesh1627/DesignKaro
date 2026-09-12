# ADR-001: Modular Monolith Architecture Pattern

## Status
Accepted

## Context
DesignKaro provides multiple capabilities: structured learning, interactive practice challenges, React Flow architecture canvas, deterministic system simulation, AI mentoring, system design interviews, and telemetry.
A premature microservices architecture introduces distributed transaction overhead, network latency between internal boundaries, complex local developer setup, orchestration sprawl (Kubernetes), and deployment fragility.

## Decision
We adopt a **Modular Monolith** architecture implemented in FastAPI (Python 3.11+).
All domain logic is partitioned into explicit Python packages (`learning`, `practice`, `design`, `simulation`, `interview`, `mentor`, `validation`) with well-defined schema interfaces and database access boundaries.

## Consequences
### Positive
- Single deployable backend container with zero inter-service network latency.
- Simple transactional consistency across domains using SQLAlchemy 2.0 and PostgreSQL.
- Streamlined local development without needing Kubernetes or service mesh.
- Clean domain boundaries allow selective extraction into standalone microservices in the future if specific modules (e.g., simulation engine) demand independent autoscaling.

### Trade-offs
- Shared runtime resources (CPU/RAM); heavy simulation workloads must be managed via background task workers (Celery/Redis Streams) to prevent starving HTTP endpoints.
