# ADR-007: Containerized Deployment Architecture (Docker Compose to Cloud PaaS)

## Status
Accepted

## Context
DesignKaro must run seamlessly across all operating systems (Windows, macOS, Linux), mobile browsers, and tablets without requiring local installations for end users. For developers, local orchestration must be lightweight, cost-effective, and reproducible.

## Decision
We standardize on **Docker & Multi-Stage Containerization**:
1. **Frontend**: Multi-stage `node:20-alpine` producing a standalone Next.js production build executed as a non-root `nextjs` user.
2. **Backend**: Multi-stage `python:3.11-slim` running Uvicorn as a non-root `appuser`.
3. **Local Orchestration**: `docker-compose.yml` defining PostgreSQL 16, Redis 7.2, backend, and frontend with robust health check dependencies.
4. **Cloud Production Target**: Container PaaS (e.g., AWS ECS, Render, Railway, Fly.io, or GCP Cloud Run) with managed PostgreSQL and Redis instances.

## Consequences
### Positive
- Strict parity between local development, CI testing, and cloud production.
- Minimal attack surface through non-root users and slim container bases.
- Zero local dependencies beyond Docker for containerized deployment.
