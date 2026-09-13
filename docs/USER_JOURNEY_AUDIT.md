# DesignKaro — User Journey Audit Report
**Date**: September 13, 2026  
**Auditor**: Senior Product QA Engineer, UX Researcher, System Design Educator, SDET & Security Specialist  
**Platform**: DesignKaro — *"Socho. Design Karo. Scale Karo."*  
**Repository State**: Git Main / Local Development & Build Verification  

---

## Executive Summary of User Journeys

A rigorous, end-to-end evaluation was performed from the perspective of an external user who has never seen the source code. Ten distinct journeys were audited across four user personas:
1. **Persona 1**: Complete Beginner ("I know almost nothing about system design")
2. **Persona 2**: Intermediate Developer ("I know APIs, databases, caching and basic distributed systems")
3. **Persona 3**: Experienced Engineer / FAANG Candidate ("I am preparing for Staff/Principal interviews")
4. **Persona 4**: ML Systems Engineer ("I want production ML system design preparation")

### Journey Verdict Matrix

| # | User Journey | Status | Primary Blocker / Architectural Flaw |
|---|---|:---:|---|
| 1 | **First-Time User Experience** | **FAIL** | Primary navigation hidden from non-logged-in visitors; unhandled 422 errors render `[object Object]`; no onboarding tour. |
| 2 | **Beginner Journey** | **FAIL** | Zero introductory onboarding; diagnostic assessment modal is orphaned/unreachable; lessons display raw unparsed Markdown text without KaTeX/diagrams; mini-exercises hardcoded to Little's Law `200`. |
| 3 | **Intermediate Journey** | **PARTIAL** | Can view curriculum and practice catalog, but progress is lost upon page refresh due to Zustand store reset; no ability to skip beginner content; lesson completion is hardcoded to `is_completed: false`. |
| 4 | **Advanced Engineer Journey** | **FAIL** | Canvas cannot load saved designs (read-only black hole); simulation ignores graph connections/caching; problem completion score is hardcoded to 95%. |
| 5 | **System Design Interview Journey** | **FAIL** | Interviewer responses and final hiring scorecard (92% "Strong Hire") are 100% hardcoded mock dialogue; ignores user input, canvas graph, and answers completely. |
| 6 | **ML System Design Journey** | **FAIL** | Only 1 question and 1 lesson tagged for ML; zero tooling for feature stores, batch/streaming inference, model drift, vector search, or RAG (RAG is an in-memory 5-item string filter). |
| 7 | **Architecture Design Journey (Canvas)** | **PARTIAL** | React Flow canvas operates smoothly for adding/dragging nodes, but Save button spawns duplicate cloud records on every click, has no Undo/Redo, no Duplicate Node, and cannot reload saved designs. |
| 8 | **Simulation & Chaos Journey** | **FAIL** | Traffic simulation is completely disconnected from graph topology (edges); backend applies uniform QPS to every node ignoring CDN, Load Balancer, and Redis cache; frontend simulates a hardcoded 6-node graph. |
| 9 | **AI Mentor Journey** | **FAIL** | External LLM and Socratic mentor are completely absent in the frontend UI ("Ask Mentor" is an unclickable static span); backend implementation is a 143-line keyword matching script with 4 hardcoded hints. |
| 10 | **Progress & Mastery Journey** | **PARTIAL** | Progress dashboard renders telemetry KPI cards and skill mastery bars, but defaults to hardcoded values (78% readiness, 7-day streak) when unauthenticated; saved designs list links to empty canvas without ID. |

---

## Detailed Journey Audits

---

### Journey 1: First-Time User Experience (FTUX)
**Verdict**: **FAIL**  
**Persona**: Any first-time visitor discovering DesignKaro via search or link.

#### 1. Journey Flow
`Landing Page (http://localhost:3000)` → `Hero Section` → `Top Navigation` → `Sign In / Sign Up Modal` → `Post-Auth Redirect`

#### 2. Friction Points & Failures
1. **Hidden Navigation for Non-Logged-In Users**:
   - In `frontend/src/components/Navigation.tsx` (Line 76) and `frontend/src/app/page.tsx` (Line 433), the entire navigation bar (`LEARN`, `PRACTICE`, `CANVAS`, `SIMULATE`, `INTERVIEW`, `PROGRESS`) is conditionally wrapped in `{isAuthenticated && user && ...}`.
   - An unauthenticated first-time visitor arriving at the site sees **zero navigation links** in the header. They cannot browse the catalog, inspect the curriculum, or preview the product without first creating an account.
2. **Abrupt Authentication Walls on Hero CTAs**:
   - Clicking *"Start System Design"* or *"Practice FAANG Problems"* on the landing page does not direct the user to a public sandbox or catalog preview; it abruptly pops up an authentication modal.
3. **Pydantic 422 Error Display Bug (`[object Object]`)**:
   - In `frontend/src/components/AuthModal.tsx` (Line 60), the error handler extracts `data.detail`. When FastAPI returns a standard Pydantic validation error (e.g. invalid email format or password under 8 characters), `data.detail` is an array of objects: `[{ loc: ['body', 'email'], msg: 'value is not a valid email address' }]`.
   - The modal executes `new Error(data.detail)` which stringifies in JavaScript to `[object Object]`. The user is presented with a red error banner saying `[object Object]` with zero actionable guidance on what was wrong with their input.
4. **No Post-Signup Onboarding or Welcome Flow**:
   - After a user signs up successfully, the modal closes and leaves the user on the exact same landing page. There is no welcome greeting, no onboarding questionnaire, no skill assessment, and no redirection to the learning dashboard.

---

### Journey 2: Beginner Journey ("I know almost nothing about system design")
**Verdict**: **FAIL**  
**Persona**: Persona 1 (Junior Developer / CS Student)

#### 1. Journey Flow
`Sign Up` → `Diagnostic Assessment` → `Curriculum Directory (/learn)` → `First Lesson (/learn/latency-vs-throughput)` → `Interactive Mini-Exercise`

#### 2. Friction Points & Failures
1. **Unreachable Diagnostic Assessment**:
   - The platform includes a diagnostic modal component (`QuickDiagnosticModal.tsx`), designed to assess beginner vs. intermediate knowledge across 3 multiple-choice questions.
   - However, `QuickDiagnosticModal` is **never imported, mounted, or called anywhere in the entire frontend**.
   - In `Navigation.tsx`, `onOpenDiagnostic` is defined as an optional prop, but none of the pages (`layout.tsx`, `page.tsx`, `learn/page.tsx`) pass this callback. As a result, the beginner can never take a diagnostic test to identify their starting point.
2. **Broken Markdown & LaTeX Rendering in Lessons**:
   - In `frontend/src/app/learn/[slug]/page.tsx` (Lines 227–237), markdown is rendered by splitting on `---` and dumping raw text inside a `<div className="whitespace-pre-wrap">`.
   - The application does not use `react-markdown`, `remark`, or `rehype`.
   - Mathematical derivations (e.g. `$$L = \lambda \times W$$`) render literally with dollar signs. Headings render with raw `#` characters. Markdown tables render as raw text with pipe characters (`| Optimization Strategy | Latency Impact |`).
   - For a beginner trying to learn first principles, reading unparsed syntax creates a disjointed, amateurish impression.
3. **Hardcoded Mini-Exercise Validation**:
   - Every single lesson across all tracks includes an identical interactive mini-exercise form in `learn/[slug]/page.tsx` (Line 131):
     ```typescript
     if (val === "200" || val === "200 connections") {
       setExerciseFeedback("Correct! 5,000 QPS × 0.040s = 200 concurrent active connections.");
     } else {
       setExerciseFeedback("Try again! Remember Little's Law: L = Throughput (QPS) × Average Latency (seconds). 5000 × 0.040 = ?");
     }
     ```
   - Even when a beginner is studying the **CAP Theorem** (`/learn/cap-theorem-in-practice`), **Redis Caching**, **Consistent Hashing**, or **Kafka Partitioning**, the exercise rejects all answers unless the user enters "200"!
4. **Lesson Progress Is Never Saved in Lesson View**:
   - In `backend/app/api/v1/endpoints/learning.py` (Line 161), the `get_lesson` endpoint hardcodes `is_completed=False`.
   - When a beginner completes a lesson and refreshes the page, the button resets to *"Mark as Completed (+50 XP)"*, causing confusion regarding whether progress was recorded.

---

### Journey 3: Intermediate Developer Journey
**Verdict**: **PARTIAL**  
**Persona**: Persona 2 (Backend Engineer with 2–4 years experience)

#### 1. Journey Flow
`Browse Practice Labs (/practice)` → `Filter by Intermediate Difficulty` → `Open Challenge (/practice/distributed-rate-limiter)` → `Review Constraints & Hints` → `Solve Challenge`

#### 2. Friction Points & Failures
1. **Catalog Filters Work, But Progress Lost on F5 Refresh**:
   - Filtering problems by difficulty (`intermediate`, `hard`) and domain (`API Gateway`, `Storage`) works properly on `practice/page.tsx`.
   - However, because `useAuthStore` in `frontend/src/lib/authStore.ts` does not persist or hydrate the `user` object from `localStorage` on page initialization, hitting F5 immediately clears the user's session in memory. The problem list reverts to showing unauthenticated state with zero completed challenge badges.
2. **Capacity Calculator Missing from Practice Workspace**:
   - The challenge workspace (`practice/[slug]/page.tsx`) features four tabs: *Requirements*, *Capacity & Constraints*, *AI Socratic Hints*, and *Evaluation Criteria*.
   - In the *Capacity & Constraints* tab, the page only displays static JSON key-value pairs (`incoming_qps: 100000`, `active_client_keys: 5 Million`).
   - There is no interactive capacity calculator, no input sliders to adjust DAU, payload size, or peak multipliers, and no connection to the backend `/api/v1/capacity/calculate` engine.
3. **No Solution Verification / Fake Mark Completed**:
   - When an intermediate developer wants to submit their solution, clicking *"Mark as Completed"* (Line 120 of `practice/[slug]/page.tsx`) sends a hardcoded payload:
     ```json
     { "status": "passed", "score": 95 }
     ```
   - The backend accepts this score without verifying whether the user drew an architecture on the canvas or met the problem's SLA constraints.

---

### Journey 4: Experienced Engineer / FAANG Candidate Journey
**Verdict**: **FAIL**  
**Persona**: Persona 3 (Senior/Staff Candidate preparing for System Design interviews)

#### 1. Journey Flow
`Open Architecture Canvas (/design)` → `Select Template or Build From Scratch` → `Run Health Check (Rule Engine)` → `Save to Cloud` → `Simulate Under 100K QPS` → `Retrieve Previous Architecture`

#### 2. Friction Points & Failures
1. **Saved Designs Disappear into a Read-Only Black Hole**:
   - When the candidate builds a topology and clicks *"Save Canvas"*, the frontend executes a `POST /api/v1/designs` call, generating a `public_id` (e.g. `design-abc123456789`).
   - Every subsequent click on *"Save Canvas"* executes another `POST`, creating redundant duplicate rows in the database instead of updating versions (`PUT`).
   - On the `/design` page, there is no *"Open Design"*, *"My Saved Designs"*, or version selector.
   - In the Progress Dashboard (`/progress`), clicking *"Open"* on a saved blueprint links to `href="/design"` without an ID parameter. Navigating to `/design` simply resets the canvas to the default TinyURL template. The candidate's custom architecture cannot be reopened.
2. **Missing Crucial Production Rules in Validation Engine**:
   - The candidate attempts to validate production safety, but the backend rule engine (`backend/app/services/validation_engine/rule_checker.py`) only implements 8 static checks.
   - It is missing checks for:
     - `MISSING_TIMEOUT`
     - `MISSING_RETRY_POLICY`
     - `MISSING_IDEMPOTENCY`
     - `HOT_PARTITION_RISK`
     - `DATABASE_BOTTLENECK`
     - `SYNCHRONOUS_CHAIN_TOO_LONG`
     - `MISSING_RATE_LIMITING`
     - `MISSING_OBSERVABILITY`
     - `NO_DISASTER_RECOVERY`
   - Graphs with self-loops or cyclic dependencies (`Service A -> Service B -> Service A`) pass with 100/100 score.

---

### Journey 5: System Design Interview Journey
**Verdict**: **FAIL**  
**Persona**: Persona 3 (Staff Architect Candidate)

#### 1. Journey Flow
`Navigate to /interview` → `Select Topic (Design TinyURL)` → `Select Target Role (Principal Architect)` → `Start Session` → `Stage 1 to 5 Q&A` → `Receive Scorecard`

#### 2. Friction Points & Failures
1. **100% Hardcoded Mock Dialogue**:
   - In `backend/app/services/interview_engine/engine.py` (Lines 47–123), `process_turn()` completely ignores the candidate's input.
   - Entering gibberish ("asdfghjkl"), nonsense ("I will store all data in a single CSV file on my desktop"), or hostile prompts triggers the identical response:
     - Stage 1: *"Great scope clarification. Focusing on the core user flow first is the right approach..."*
     - Stage 2: *"Spot-on calculation! 500M daily actions / 86,400s ≈ 5,800 avg QPS..."*
     - Stage 3: *"The high-level topology looks solid with the API Gateway..."*
     - Stage 4: *"Excellent choice on synthetic salting or wide-column composite partition keys..."*
     - Stage 5: *"Outstanding explanation of circuit breakers..."*
2. **Fixed 92% "Strong Hire" Scorecard**:
   - Calling `/finish` returns an immutable, hardcoded JSON response:
     - `overall_score`: 92
     - `hiring_decision`: "Strong Hire"
     - `interviewer_persona`: "Google / Meta Principal Infrastructure Architect"
   - There is no LLM evaluation, no graph inspection, no rubric scoring, and no session state persistence.
3. **Session Loss on Refresh**:
   - If the candidate refreshes the browser during the interview, the session ID and message history in React state are wiped out, returning them to the setup screen.

---

### Journey 6: ML System Design Journey
**Verdict**: **FAIL**  
**Persona**: Persona 4 (Machine Learning Engineer / AI Infrastructure Architect)

#### 1. Journey Flow
`Filter Catalog for ML` → `Study ML Model Serving` → `Design Recommendation Pipeline` → `Evaluate Vector Search & RAG`

#### 2. Friction Points & Failures
1. **Only One ML Question in Entire Platform**:
   - Out of 7 questions, only `ml-recommendation-system` is tagged under ML.
   - Crucial industry topics are completely missing:
     - Search & Ranking
     - Fraud Detection Systems
     - Real-Time Feature Stores
     - Batch vs. Real-Time Inference
     - Model Drift Monitoring & Retraining Triggers
     - Distributed Training Pipelines
     - Retrieval-Augmented Generation (RAG) Architectures
     - Agentic AI Topologies
2. **Fabricated RAG Implementation**:
   - Architectural Decision Record 006 (`docs/ADR-006-rag.md`) claims:
     > *"Hybrid Lexical / Dense RAG Retrieval with Qdrant and BM25"*
   - In reality, in `backend/app/api/v1/endpoints/knowledge.py`, the search engine is 5 static hardcoded Python objects filtered using standard substring search (`query_str in k.title.lower()`). Neither Qdrant, dense vector embeddings, nor BM25 lexical search are present in the codebase.
3. **Canvas ML Support is Cosmetic**:
   - The canvas palette includes an *"ML / Vector DB"* node, but the validation engine treats it as a generic node with no specific ML rules (e.g. missing offline feature store, training-serving skew risk, lack of inference fallback cache).

---

### Journey 7: Architecture Design Journey (Canvas)
**Verdict**: **PARTIAL**  
**Persona**: Any engineer building system diagrams

#### 1. Journey Flow
`Open /design` → `Add Nodes from Palette` → `Connect Edges` → `Inspect Node Properties` → `Validate Topology` → `Save`

#### 2. Strengths Observed
- `@xyflow/react` integration is smooth and responsive.
- Dragging, repositioning, and connecting nodes with animated edges works reliably.
- Custom component palette includes 11 visual node types with distinct icons and colors.
- Right-hand node inspector allows editing label, replicas, and latency overhead.

#### 3. Critical Flaws
1. **No Edge Configuration or Inspection**:
   - Clicking an edge does nothing. Users cannot specify protocol (HTTP/gRPC/WebSocket/Kafka), encryption (mTLS), timeout deadlines, or bandwidth limits.
2. **Missing Standard Canvas Controls**:
   - No Undo / Redo functionality (`Ctrl+Z` / `Ctrl+Y`).
   - No Duplicate Node button (`Ctrl+D`).
   - No Multi-select or box selection.
3. **Cloud Save Generates Multiple Rows**:
   - Every click on "Save Canvas" creates a new database record instead of updating the existing design.
4. **No Direct Export to Simulation or Review**:
   - The canvas has no button to "Run Simulation on this Architecture" or "Generate 9-Dimension Review".

---

### Journey 8: Simulation & Chaos Journey
**Verdict**: **FAIL**  
**Persona**: Any engineer testing architecture resilience

#### 1. Journey Flow
`Navigate to /simulate` → `Configure Traffic (5,000 to 35,000 QPS)` → `Select Chaos Failure (Kill Database)` → `Run Simulation` → `Observe Blast Radius`

#### 2. Critical Flaws
1. **Simulation Disconnected from Custom Canvas**:
   - In `frontend/src/app/simulate/page.tsx` (Lines 73–90), the simulation payload contains a **hardcoded 6-node topology** (Envoy, App Pods, Redis, Postgres, Kafka).
   - The user cannot simulate the architecture they just built on `/design`.
2. **Backend Engine Disregards Graph Topology (Edges)**:
   - In `backend/app/services/simulation_engine/traffic_simulator.py` (Lines 63–120), the simulator iterates through `nodes` in a flat loop and applies `current_qps` uniformly to every component:
     ```python
     for n in nodes:
         load_ratio = current_qps / max(1, capacity)
     ```
   - Graph edges are never traversed.
   - If a candidate places a Cloudflare CDN and Redis Cache in front of a PostgreSQL database with a 99% cache hit rate, the database is still subjected to 100% of incoming QPS and crashes. The simulator completely ignores caching, load balancers, and queue buffering.

---

### Journey 9: AI Mentor Journey
**Verdict**: **FAIL**  
**Persona**: Any engineer seeking Socratic guidance

#### 1. Journey Flow
`Open Canvas or Practice Lab` → `Seek Socratic Guidance` → `Ask Mentor a Question`

#### 2. Critical Flaws
1. **AI Mentor UI is Missing Across the Entire Frontend**:
   - Searches across all `.tsx` files in `frontend/src` reveal that the backend endpoints `/api/v1/mentor/chat` and `/api/v1/mentor/hint` are **never fetched anywhere in the frontend application**.
   - On the landing page preview component (`ArchitecturePreview.tsx`, Line 352), the *"Ask Mentor"* button is an unclickable static `<span>` element with no `onClick` handler.
2. **Backend Mentor is a Static Regex Script**:
   - In `backend/app/services/ai_mentor/mentor_service.py`, there is no external LLM integration (OpenAI, Gemini, or Claude).
   - It performs keyword checks on `"cache"`, `"database"`, and `"kafka"`.
   - Any other prompt (e.g. *"Give me the answer"*, *"How do I scale search?"*, or prompt injections) returns an identical fallback message: *"As a Senior Architect, my first question is: What are your scale invariants?..."*
   - Hint Level 4 always returns the exact same hardcoded blueprint (Envoy -> Stateless Microservices -> Redis Cluster -> ScyllaDB + Kafka) regardless of the problem topic.

---

### Journey 10: Progress & Mastery Journey
**Verdict**: **PARTIAL**  
**Persona**: Returning user tracking skill improvement

#### 1. Journey Flow
`Navigate to /progress` → `View Skill Telemetry` → `Inspect Unlocked Achievements` → `Review Saved Blueprints`

#### 2. Critical Flaws
1. **Telemetry Defaults to Inflated Values for Unauthenticated Users**:
   - In `frontend/src/app/progress/page.tsx`, if the user is unauthenticated or the API call fails, KPI cards fall back to mock numbers: 78% Readiness Score, 7-Day Streak, 1,250 XP, and "Principal Architect" rank.
2. **Saved Blueprints Cannot Be Loaded**:
   - The "Saved Architectural Blueprints" section displays saved designs, but the "Open" button links to `/design` without passing the design ID.
3. **Hardcoded Hard-to-Reach Goals**:
   - The user's skill graph displays scores from `/api/v1/dashboard`, but because lesson completions don't track correctly across page views, mastery scores remain static.

---

## User Journey Audit Summary Scorecard

| Phase | Journey Dimension | Score | Status |
|---|---|:---:|:---:|
| 1 | First-Time User Experience | 3/10 | **FAIL** |
| 2 | Beginner Experience | 2/10 | **FAIL** |
| 3 | Intermediate Experience | 5/10 | **PARTIAL** |
| 4 | Advanced / FAANG Prep | 3/10 | **FAIL** |
| 5 | Interview Mode Realism | 1/10 | **FAIL** |
| 6 | ML System Design Support | 2/10 | **FAIL** |
| 7 | Architecture Builder (Canvas) | 6/10 | **PARTIAL** |
| 8 | Simulation & Failure Chaos | 2/10 | **FAIL** |
| 9 | AI Senior Mentor | 1/10 | **FAIL** |
| 10 | Progress & Skill Graph | 4/10 | **PARTIAL** |
| **Total** | **Aggregate User Journey Rating** | **29 / 100** | **CRITICAL OVERHAUL REQUIRED** |
