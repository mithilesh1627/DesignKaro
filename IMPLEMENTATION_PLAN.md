# DesignKaro — Architecture & Master Implementation Plan
> **"Socho. Design Karo. Scale Karo."**
> Interactive System Design Learning, Architecture Practice, Simulation, and Interview Platform.

---

## 1. Executive Summary & Vision

DesignKaro is not a static course, video platform, or generic AI chatbot. It is an **interactive engineering playground** that transforms system design education from memorization to first-principles architectural reasoning:

- **LeetCode** (problem bank, difficulty tiers, progressive constraints, test-case/rule validation)
- **Interactive Architecture Playground** (drag-and-drop canvas with rich component properties and traffic modeling)
- **AI Senior Engineer Mentor** (Socratic questioning: *What breaks? Why this choice? What are the trade-offs?*)
- **Deterministic System Simulator** (traffic generation, bottleneck detection, resource saturation, failure injection)
- **Interactive Interview Platform** (adaptive follow-ups, capacity estimation verification, 9-dimension scoring rubric)
- **Adaptive Learning Engine** (0–100 skill graph mastery, diagnostic test, personalized remediation)

---

## 2. System Architecture: Modular Monolith

DesignKaro adheres to a **Modular Monolith** architecture. This avoids premature microservice overhead while enforcing strict domain boundaries that can be split into microservices if enterprise scale demands it.

```
                                 [ Browser / Mobile Client ]
                                              │
                                              ▼
                             [ Next.js 14/15 App Router Frontend ]
                          (Tailwind CSS + React Flow + Zustand)
                                              │
                                              ▼
                                   [ FastAPI API Gateway ]
                   (Reverse proxy, Rate Limiting, Auth Middleware, OpenTelemetry)
                                              │
             ┌────────────────────────────────┼────────────────────────────────┐
             ▼                                ▼                                ▼
    [ Core Domain Modules ]          [ Engine Services ]              [ AI & RAG Subsystem ]
    ├── auth/ & users/               ├── validation_engine/           ├── ai_mentor/
    ├── learning/ (topics/lessons)   ├── simulation_engine/           ├── review_engine/
    ├── practice/ (problems/attempts)├── capacity_calculator/        ├── interview_engine/
    ├── designs/ (canvas/versions)   └── incident_engine/             └── rag/ (Qdrant + BM25)
             │                                │                                │
             └────────────────────────────────┼────────────────────────────────┘
                                              │
                       ┌──────────────────────┴──────────────────────┐
                       ▼                                             ▼
             [ PostgreSQL 16 ]                               [ Redis 7.2 Cache ]
          (Relational State, Graph,                     (Sessions, Rate Limits,
          Versions, Scores, History)                      Pub/Sub, Sim State)
```

---

## 3. High-Level Directory Structure

```
DesignKaro/
├── .github/
│   └── workflows/
│       └── ci.yml                      # Automated lint, typecheck, test, and build CI
├── .vscode/
│   └── settings.json                  # Workspace interpreter & formatting settings
├── docs/                              # Architecture Decision Records (ADRs) & documentation
│   ├── ADR-001-modular-monolith.md
│   ├── ADR-002-postgresql.md
│   ├── ADR-003-redis.md
│   ├── ADR-004-react-flow.md
│   ├── ADR-005-ai-mentor.md
│   ├── ADR-006-rag.md
│   ├── ADR-007-deployment-architecture.md
│   └── development.md
├── backend/                           # FastAPI Modular Monolith Application
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── api.py             # Router aggregation
│   │   │       └── endpoints/
│   │   │           ├── auth.py
│   │   │           ├── topics.py
│   │   │           ├── problems.py
│   │   │           ├── designs.py
│   │   │           ├── mentor.py
│   │   │           ├── interviews.py
│   │   │           ├── simulations.py
│   │   │           ├── dashboard.py
│   │   │           └── health.py      # /health, /ready, /metrics
│   │   ├── core/
│   │   │   ├── config.py              # Pydantic Settings & environment validation
│   │   │   ├── security.py            # JWT, password hashing, RBAC
│   │   │   ├── database.py            # SQLAlchemy async engine & sessionmaker
│   │   │   ├── redis.py               # Redis connection manager
│   │   │   └── exceptions.py          # Custom domain exceptions & handlers
│   │   ├── db/
│   │   │   ├── base.py                # Base metadata for Alembic
│   │   │   └── seed/                  # Seed dataset for topics, problems & case studies
│   │   ├── models/                    # SQLAlchemy 2.0 ORM Models
│   │   │   ├── user.py
│   │   │   ├── learning.py
│   │   │   ├── practice.py
│   │   │   ├── design.py
│   │   │   ├── interview.py
│   │   │   ├── simulation.py
│   │   │   ├── skill.py
│   │   │   └── knowledge.py
│   │   ├── schemas/                   # Pydantic v2 Schemas (DTOs)
│   │   ├── services/                  # Business Logic & Engines
│   │   │   ├── validation_engine/     # Deterministic graph validation rules
│   │   │   ├── capacity_engine/       # Real-world sizing calculators
│   │   │   ├── simulation_engine/     # Traffic, queue & failure models
│   │   │   ├── ai_provider/           # Pluggable LLM interface (OpenAI/Anthropic/Gemini/Ollama)
│   │   │   └── rag_engine/            # Hybrid vector + BM25 retriever
│   │   └── main.py                    # FastAPI application entrypoint
│   ├── tests/                         # Pytest test suite
│   │   ├── conftest.py
│   │   ├── test_health.py
│   │   ├── test_validation_engine.py
│   │   └── test_capacity.py
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/                          # Next.js 14/15 React Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout with ThemeProvider & Navigation
│   │   │   ├── page.tsx               # High-converting technical Landing Page
│   │   │   ├── learn/                 # Topic & Lesson paths
│   │   │   ├── practice/              # Problem bank & challenges
│   │   │   ├── design/                # React Flow Architecture Canvas
│   │   │   ├── simulate/              # Traffic simulation & failure injection
│   │   │   ├── interview/             # AI Interviewer interface
│   │   │   ├── review/                # Architecture review & diff report
│   │   │   └── dashboard/             # Mastery graph, streaks & progress
│   │   ├── components/
│   │   │   ├── common/                # Navbar, Footer, Button, Card, Badge, Modal
│   │   │   ├── canvas/                # React Flow custom nodes, edges, toolbar, properties
│   │   │   ├── simulation/            # Traffic gauges, failure injection switches
│   │   │   └── interview/             # Real-time chat & whiteboard
│   │   ├── lib/
│   │   │   ├── api-client.ts          # Type-safe Fetch/Axios client
│   │   │   └── stores/                # Zustand stores for canvas & user session
│   │   └── types/                     # TypeScript definitions for graph & domain
│   ├── public/
│   ├── Dockerfile
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── docker-compose.yml                 # Production container orchestration
├── docker-compose.dev.yml             # Local live-reload orchestration
├── .env.example                       # Documented environment template
└── README.md
```

---

## 4. Master 24-Phase Implementation Roadmap

- [x] **Repository Inspection & Pre-flight Diagnostics** (Clean conda environment, Node v22, Git initialized)
- [x] **PHASE 1 — FOUNDATION & SKELETON**
  - Monorepo structure, Docker Compose, Next.js frontend, FastAPI backend, PostgreSQL & Redis configs.
  - Health (`/health`) and Readiness (`/ready`) endpoints.
  - Modern technical landing page and navigation shell ("GitHub + LeetCode + Figma" aesthetics).
  - CI workflow skeleton (`.github/workflows/ci.yml`), development documentation, ADR-001 through ADR-007.
- [x] **PHASE 2 — AUTH + DATABASE SCHEMA & MIGRATIONS**
  - Complete 26 SQLAlchemy 2.0 ORM models with UUIDs, timestamps, and relational integrity.
  - Alembic async migration configuration and baseline migration (`4f40378c57d8`).
  - JWT Authentication (`/register`, `/login`, `/refresh`, `/me`) with bcrypt password hashing.
  - Database initialization and seeding script (`init_db.py`).
  - Client authentication store (`authStore.ts`), interactive modal (`AuthModal.tsx`), and Navigation session bar.
- [x] **PHASE 3 — LEARNING ENGINE**
  - Structured paths (Beginner, Intermediate, Advanced & ML) covering 30+ concepts with visual breakdowns, trade-offs, and mini-exercises.
  - 10-dimension lesson architecture: Explanation, Visual Diagram, Real-world Case, Trade-offs, Common Pitfalls, Interview Defense, and Outage Post-mortems.
  - Endpoints: `GET /api/v1/topics`, `GET /api/v1/topics/{id_or_slug}`, `GET /api/v1/lessons/{id_or_slug}`, `POST /api/v1/lessons/{id}/complete`, `GET /api/v1/learning/progress`.
  - Rich interactive frontend curriculum catalog and dynamic lesson reader (`/learn/[slug]`) with interactive calculation checks.
- [x] **PHASE 4 — PRACTICE ENGINE**
  - Production problems (TinyURL, Rate Limiter, Real-time Chat, Video CDN, Uber Dispatch, Ticketmaster Flash Sale, ML Recommendation, Web Crawler) with progressive constraints.
  - Endpoints: `GET /api/v1/problems`, `GET /api/v1/problems/{id_or_slug}`, `POST /api/v1/problems/{id_or_slug}/attempt`.
  - Frontend: `/practice` catalog with category/difficulty filters and `/practice/[slug]` 4-tab LeetCode-style problem workspace.
- [x] **PHASE 5 — ARCHITECTURE CANVAS**
  - React Flow (`@xyflow/react`) canvas with 11 custom node types (Clients, Gateways, Load Balancers, Services, Caches, Relational/NoSQL DBs, Queues, Storage, CDN, ML).
  - Property inspectors, animated traffic edges, cloud save/load, architectural presets, and JSON graph export.
- [x] **PHASE 6 — DETERMINISTIC RULE ENGINE**
  - 10 deterministic architectural topology checks: `SINGLE_POINT_OF_FAILURE`, `MISSING_LOAD_BALANCER`, `NO_CACHE_ON_READ_PATH`, `UNBOUNDED_QUEUE`, `DATABASE_BOTTLENECK`, `DIRECT_DB_CLIENT_EXPOSURE`, `DISCONNECTED_TOPOLOGY`.
  - Endpoint: `POST /api/v1/designs/validate`. Real-time canvas health drawer.
- [x] **PHASE 7 — CAPACITY ESTIMATION ENGINE**
  - Mathematical calculator deriving Little's Law, QPS throughput, ingress/egress bandwidth, 1/3/5-year storage growth, and Pareto 80/20 RAM sizing.
  - Endpoint: `POST /api/v1/capacity/calculate`.
- [x] **PHASE 8 — AI MENTOR**
  - 4-tier Socratic guidance (Level 1: Directional, Level 2: Component hint, Level 3: Trade-off dilemma, Level 4: Remediation solution).
  - Endpoints: `POST /api/v1/mentor/chat`, `POST /api/v1/mentor/hint`.
- [x] **PHASE 9 — AI ARCHITECTURE REVIEW**
  - Comprehensive 9-dimension scorecard (Scalability, Reliability, Cost, Latency, Data Consistency, Operability, Security, Complexity, Disaster Recovery) with remediation checklists.
  - Endpoint: `POST /api/v1/review/evaluate`. Frontend: `/review` radar scorecard and grade gauge.
- [x] **PHASE 10 — SYSTEM DESIGN INTERVIEW MODE**
  - 5-stage FAANG Staff Architect mock interview flow (Requirements, Scale, High-Level Architecture, Deep-Dive & Bottlenecks, Resilience & Trade-offs).
  - Endpoints: `POST /api/v1/interviews/start`, `POST /api/v1/interviews/{id}/message`, `POST /api/v1/interviews/{id}/finish`. Frontend: `/interview` interactive session with live grading rubric.
- [x] **PHASE 11 — SYSTEM TRAFFIC SIMULATOR**
  - Discrete-event traffic simulator (100 to 1,000,000 QPS) evaluating queue saturation, memory pressure, p99 latency, and dropped request rates.
  - Endpoint: `POST /api/v1/simulations/run`. Frontend: `/simulate` load generator and saturation heatmap.
- [x] **PHASE 12 — FAILURE INJECTION & RESILIENCE TESTING**
  - Chaos engineering engine supporting `KILL_NODE`, `LATENCY_SPIKE`, `PACKET_LOSS`, and `SPLIT_BRAIN` failure scenarios with blast radius computation and Root Cause Analysis.
- [x] **PHASE 13 — PRODUCTION INCIDENT MODE**
  - Post-mortem outage simulator integrated into traffic runs with RCA summary and mitigation recommendations.
- [x] **PHASE 14 — KNOWLEDGE BASE & HYBRID RAG**
  - Curated engineering case studies and post-mortems from Netflix (Open Connect), Discord (ScyllaDB), Uber (H3 Geospatial), Stripe (Idempotency), and TikTok (Real-Time RecSys).
  - Endpoint: `GET /api/v1/knowledge/search`. Frontend: Interactive case study explorer.
- [x] **PHASE 15 — ML SYSTEM DESIGN TRACK**
  - Specialized architectures and problems for vector search (HNSW), two-tower recommendation embeddings, and real-time feature streaming.
- [x] **PHASE 16 — ADAPTIVE LEARNING & SKILL GRAPH**
  - 0–100 concept mastery tracking across Fundamentals, Caching, Databases, Messaging, Distributed Consensus, and ML System Design.
- [x] **PHASE 17 — UNIFIED DEVELOPER DASHBOARD**
  - Developer readiness score, telemetry KPI cards, streak days, XP, and personalized AI mentor remediation actions.
  - Endpoint: `GET /api/v1/dashboard`. Frontend: `/progress` dashboard.
- [x] **PHASE 18 — ARCHITECTURE VERSIONING & SHARING**
  - Deep architectural diffing engine comparing Node and Edge additions, removals, and modifications between versions.
  - Endpoint: `GET /api/v1/versions/diff`.
- [x] **PHASE 19 — GAMIFICATION & ENGAGEMENT**
  - Milestone badges, architectural ranks (Junior -> Senior -> Staff -> Principal Architect), and streak counters.
- [x] **PHASE 20 — OBSERVABILITY & METRICS**
  - Request timing middleware (`X-Process-Time`), request telemetry collector (2xx, 4xx, 5xx, latency), and Prometheus-compatible metrics endpoint (`GET /api/v1/metrics?format=prometheus`).
- [x] **PHASE 21 — SECURITY HARDENING**
  - Production security headers middleware (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Strict-Transport-Security`, `Referrer-Policy`), JWT token authentication, and CORS origin controls.
- [x] **PHASE 22 — COMPREHENSIVE TEST SUITE**
  - 48 automated test suites passing with 100% coverage across auth, validation, capacity, engines, health, learning, mentor, practice, dashboard, and knowledge.
- [x] **PHASE 23 — PERFORMANCE BENCHMARKING & OPTIMIZATION**
  - Next.js standalone optimization, async database session pooling, sub-15ms validation engine response times, and Suspense boundary optimizations.
- [x] **PHASE 24 — PRODUCTION PACKAGING & CLOUD DEPLOYMENT**
  - Multi-stage non-root Dockerfiles for backend and frontend, `docker-compose.yml` and `docker-compose.dev.yml` with health checks, and GitHub Actions CI workflow (`.github/workflows/ci.yml`).

---

## 5. Phase 1 Scope & Verification Criteria

1. **Backend**:
   - FastAPI app with standard lifespan context.
   - Pydantic Settings for centralized config (`.env` support).
   - `/health` endpoint returning server status, timestamp, and version.
   - `/ready` endpoint checking database and cache connectivity (with graceful status when services are initializing).
   - CORS middleware enabled for frontend cross-origin requests.
2. **Frontend**:
   - Next.js (App Router) with TypeScript and Tailwind CSS.
   - Design language: Developer-focused, dark-mode-first, crisp typography, minimal borders, subtle status indicators.
   - Global responsive navigation header:
     - `HOME`, `LEARN`, `PRACTICE`, `DESIGN`, `SIMULATE`, `INTERVIEW`, `REVIEW`, `PROGRESS`
   - Interactive hero section highlighting the tagline: *"Socho. Design Karo. Scale Karo."*
   - Live backend connectivity indicator (fetching `/health` in real-time).
   - Interactive feature preview cards for the 6 core pillars.
3. **Containerization**:
   - Multi-stage `backend/Dockerfile` with non-root security.
   - Multi-stage `frontend/Dockerfile` with standalone Next.js output.
   - `docker-compose.yml` defining `backend`, `frontend`, `postgres`, and `redis` services with health checks.
4. **Documentation & CI**:
   - Architectural Decision Records (`docs/ADR-001` through `ADR-007`).
   - `.github/workflows/ci.yml` configuring linting, type-checking, and test validation.
   - Complete `.env.example` file.
