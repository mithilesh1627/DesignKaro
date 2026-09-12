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
- [ ] **PHASE 4 — PRACTICE ENGINE**
  - 50+ real-world problems with progressive constraints, prerequisite gates, and evaluation criteria.
- [ ] **PHASE 5 — ARCHITECTURE CANVAS**
  - React Flow canvas with custom component nodes (Databases, Caches, Gateways, Queues, ML Servers), traffic edges, properties inspector, and autosave.
- [ ] **PHASE 6 — DETERMINISTIC RULE ENGINE**
  - Rule evaluations: `SINGLE_POINT_OF_FAILURE`, `MISSING_LOAD_BALANCER`, `NO_CACHE`, `UNBOUNDED_QUEUE`, `DATABASE_BOTTLENECK`.
- [ ] **PHASE 7 — CAPACITY ESTIMATION ENGINE**
  - Mathematical calculator for QPS, peak multipliers, bandwidth, and multi-year storage calculations with formula transparency.
- [ ] **PHASE 8 — AI MENTOR**
  - Multi-tier Socratic guidance (Levels 1–4 hints), provider abstraction (OpenAI, Anthropic, Gemini, local models).
- [ ] **PHASE 9 — AI ARCHITECTURE REVIEW**
  - Hybrid review pipeline: Graph JSON -> Rule Engine -> Metrics -> LLM Reasoning -> 9-dimension scorecard.
- [ ] **PHASE 10 — SYSTEM DESIGN INTERVIEW MODE**
  - Interactive multi-stage interview flow with progressive follow-ups and whiteboard graph inspection.
- [ ] **PHASE 11 — SYSTEM TRAFFIC SIMULATOR**
  - Discrete-event traffic simulation (100 QPS to 1M QPS) testing queue saturation, memory pressure, and latency spikes.
- [ ] **PHASE 12 — FAILURE INJECTION & RESILIENCE TESTING**
  - Chaos scenarios (Kill DB, split-brain, network partition, traffic surge) with post-mortem diagnostic questions.
- [ ] **PHASE 13 — PRODUCTION INCIDENT MODE**
  - Simulated production outages with mock Prometheus metrics, distributed traces, and log analysis.
- [ ] **PHASE 14 — KNOWLEDGE BASE & HYBRID RAG**
  - Ingestion pipeline with chunking, Qdrant vector indexing, BM25 keyword search, and reciprocal rank fusion.
- [ ] **PHASE 15 — ML SYSTEM DESIGN TRACK**
  - Specialized architectures for feature stores, embedding search, model serving, vector databases, and LLM orchestration.
- [ ] **PHASE 16 — ADAPTIVE LEARNING & SKILL GRAPH**
  - 0–100 mastery tracking per concept and dynamic personalized practice recommendations.
- [ ] **PHASE 17 — UNIFIED DEVELOPER DASHBOARD**
  - System Design Readiness score, weak area drill-downs, streak tracking, and recent designs.
- [ ] **PHASE 18 — ARCHITECTURE VERSIONING & SHARING**
  - Deep diff between v1/v2 architectures (added/removed nodes, performance/cost implications) and public read-only shares.
- [ ] **PHASE 19 — GAMIFICATION & ENGAGEMENT**
  - Milestone badges, streaks, and architectural rank titles without excessive gimmickry.
- [ ] **PHASE 20 — OBSERVABILITY & METRICS**
  - OpenTelemetry tracing, Prometheus `/metrics` endpoint, and structured logging.
- [ ] **PHASE 21 — SECURITY HARDENING**
  - Rate limiting, prompt injection defenses, sanitized canvas payloads, and CORS controls.
- [ ] **PHASE 22 — COMPREHENSIVE TEST SUITE**
  - Unit tests, integration tests, rule engine edge cases, and frontend component tests.
- [ ] **PHASE 23 — PERFORMANCE BENCHMARKING & OPTIMIZATION**
  - Large canvas rendering (100+ nodes), query optimization, and response caching.
- [ ] **PHASE 24 — PRODUCTION PACKAGING & CLOUD DEPLOYMENT**
  - Multi-stage Docker builds, Nginx reverse proxy configs, and cloud deployment guides.

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
