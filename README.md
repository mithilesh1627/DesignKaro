# DesignKaro
> **"Socho. Design Karo. Scale Karo."**  
> *Interactive System Design Learning, Architecture Practice, Simulation, and Interview Platform.*

---

## 1. The Problem

Traditional system design education is broken:
- **Static memorization**: Candidates memorize static diagrams for "Design TinyURL" or "Design Netflix" without knowing why specific databases, caches, or partition keys were selected.
- **Answer-spoiling chatbots**: Generic AI assistants immediately write out the end solution, stripping the engineer of the opportunity to reason through trade-offs.
- **Unchecked hallucinations**: Static PDFs and diagram websites cannot simulate real traffic, do not test component failure, and never verify quantitative constraints (e.g., *Does your database run out of disk IOPS at 100K QPS?*).

---

## 2. Product Vision

**DesignKaro** is an interactive engineering platform that merges:
$$\text{LeetCode} + \text{Interactive Architecture Playground} + \text{AI Senior Engineer Mentor} + \text{System Simulator} + \text{Interview Platform}$$

### The Core Philosophy
> *"Don't memorize architectures. Learn how to think about architectures."*

Every challenge and simulation forces you to answer:
1. **WHAT?** (Functional requirements and quantitative SLA boundaries)
2. **WHY?** (Mathematical rationale for selecting a component)
3. **WHAT IF?** (Handling 10x traffic spikes and sudden flash crowds)
4. **WHAT BREAKS?** (Detecting Single Points of Failure and cascading dependencies)
5. **HOW DO YOU SCALE?** (Sharding schemes, consistent hashing, distributed caching)
6. **WHAT ARE THE TRADE-OFFS?** (Consistency vs. Latency, Cost vs. Durability)

---

## 3. Core Features

- **Interactive Architecture Canvas**: Drag-and-drop 30+ distributed components (Redis, PostgreSQL, Kafka, Envoy, Vector DBs, ML Servers) powered by `@xyflow/react` with typed JSON graph export.
- **Deterministic Rule Engine**: Static graph validation checks for `SINGLE_POINT_OF_FAILURE`, `MISSING_LOAD_BALANCER`, `UNBOUNDED_QUEUE`, and `NO_CACHE`.
- **Socratic AI Senior Mentor**: Uses a 4-level progressive hint ladder to probe your thinking without revealing solutions prematurely.
- **System Traffic Simulator**: Discrete-event traffic simulation from 100 QPS to 1,000,000 QPS with bottleneck detection.
- **Chaos & Failure Injection**: Kill databases, drop network packets, or crash caches to test system resiliency in real time.
- **System Design Interview Mode**: Socratic AI interviewer that analyzes your whiteboard canvas and challenges your architectural decisions across a 9-dimension rubric.
- **0–100 Adaptive Skill Graph**: Fine-grained mastery tracking across Caching, Databases, Messaging, Distributed Systems, and ML System Design.

---

## 4. Architecture

DesignKaro is built as a **Modular Monolith** to maximize developer ergonomics and eliminate distributed microservice overhead:

```
                                 [ Browser / Mobile Client ]
                                              │
                                              ▼
                             [ Next.js 14 App Router Frontend ]
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
```

---

## 5. Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, `@xyflow/react`, Zustand, Lucide React.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (AsyncIO), Alembic, Uvicorn.
- **Datastore**: PostgreSQL 16 (`asyncpg`), Redis 7.2 (`redis.asyncio`).
- **Vector Search (RAG)**: Qdrant + BM25 Hybrid Lexical/Dense Retrieval.
- **Quality & Testing**: Pytest, Httpx, Ruff linter, TypeScript compiler.
- **Containerization**: Multi-stage Dockerfiles, Docker Compose.

---

## 6. Local Setup & Quickstart

### Native Setup

1. **Activate Python Virtual Environment**:
   ```powershell
   conda activate .\designkaro_env
   ```
2. **Install & Run Backend**:
   ```powershell
   $env:PYTHONPATH="."
   pytest backend/tests -v
   uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
3. **Install & Run Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

### Docker Compose Setup

Run the complete production-grade stack in containers:
```bash
docker compose up -d --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health Probes: `http://localhost:8000/health`, `http://localhost:8000/ready`

---

## 7. Testing & Verification

Run automated test suites and linting:

```powershell
# Backend tests & linting
$env:PYTHONPATH="."
.\designkaro_env\python.exe -m pytest backend/tests -v
.\designkaro_env\python.exe -m ruff check backend

# Frontend typecheck & build
cd frontend
npm run typecheck
npm run build
```

---

## 8. Master Implementation Plan

See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for the complete 24-phase roadmap.

---

## 9. License

Proprietary © 2026 DesignKaro. All Rights Reserved.
