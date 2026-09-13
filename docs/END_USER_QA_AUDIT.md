# DesignKaro — Master End-User QA & Security Audit Report
**Date**: September 13, 2026  
**Auditor**: Senior Product QA Engineer, UX Researcher, System Design Educator, SDET & Security Specialist  
**Platform**: DesignKaro — *"Socho. Design Karo. Scale Karo."*  
**Repository State**: Git Main / Local Development & Build Verification  

---

# 1. Executive Summary

A comprehensive, aggressive, hostile end-user quality assurance, UX research, security, and architectural audit was performed on **DesignKaro**. The platform markets itself as an interactive engineering platform merging *LeetCode + Interactive Architecture Playground + AI Senior Engineer Mentor + System Simulator + System Design Interview Platform*.

While the project features a visually striking design system, fluid React Flow canvas rendering, and well-structured database schemas, the actual end-user experience reveals a **critical gap between product claims and working functionality**.

Key findings include:
- **Critical Architectural Deceptions**: The platform advertises an AI Senior Mentor, an Interactive Simulator, a 5-Stage System Design Interviewer, and Qdrant+BM25 Hybrid RAG. In reality, the AI Mentor is never called in the frontend; the Interview Engine is a 100% hardcoded script that awards a 92% "Strong Hire" to gibberish input; the Traffic Simulator ignores graph edges and applies uniform QPS to every node regardless of caching or load balancers; and the RAG engine is a 5-item in-memory Python array filtered using `.lower()`.
- **Session & Persistence Breakage**: Navigating the platform or refreshing any page immediately wipes authentication state because Zustand lacks hydration from `localStorage`. Canvas saves are "black holes" that create duplicate database records on every click and can never be re-opened by the user.
- **Docker & Deployment Blockers**: The production frontend Dockerfile fails during build due to a missing `/app/public` directory, and the Compose configuration points client-side environment variables to Docker-internal hostnames (`http://backend:8000`).

---

# 2. Overall Product Score

```
UX & Navigation:           3.5 / 10
Learning Experience:       4.0 / 10
Architecture Builder:      5.5 / 10
Simulation & Chaos:        2.0 / 10
AI Socratic Mentor:        1.0 / 10
Interview Mode:            1.5 / 10
Performance:               6.5 / 10
Reliability & State:       2.5 / 10
Security:                  3.0 / 10
Accessibility:             3.5 / 10
──────────────────────────────────────
OVERALL PRODUCT SCORE:     3.3 / 10   (HIGH FAILURE RISK / DEMO ONLY)
```

---

# 3. Critical Bugs (P0)

### [BUG-001] Immediate Session Wipe & Canvas Lockout on Page Refresh
- **Severity**: P0 (Product Unusable / Critical Data Loss)
- **Impact**: Any user who refreshes a page, opens a link in a new tab, or uses browser back/forward is instantly logged out. If they are working on `/design`, the page resets to an unauthenticated gate and their unsaved diagram work is destroyed.
- **Root Cause**: In `frontend/src/lib/authStore.ts`, the Zustand store initializes with `user: null, isAuthenticated: false`. It stores JWT tokens in `localStorage` on login but does not store the user object, nor does it implement an initial hydration effect (`useEffect` / `persist` middleware).

### [BUG-002] Hardcoded `127.0.0.1:8000` URLs Across All Frontend Fetch Calls
- **Severity**: P0 (Deployment & Remote Environment Blocker)
- **Impact**: The application completely fails whenever it is accessed from a remote device, mobile browser, local network IP, staging domain, or production container.
- **Root Cause**: In `design/page.tsx`, `interview/page.tsx`, `learn/page.tsx`, `learn/[slug]/page.tsx`, `practice/page.tsx`, `practice/[slug]/page.tsx`, `review/page.tsx`, `simulate/page.tsx`, and `AuthModal.tsx`, the API URL is hardcoded as `http://127.0.0.1:8000/...` instead of using environment variables or relative paths routed through Next.js rewrites.

### [BUG-003] Frontend Docker Build Failure Due to Missing `/app/public` Directory
- **Severity**: P0 (Container Deployment Failure)
- **Impact**: Running `docker compose up --build` fails immediately during the frontend image build step.
- **Root Cause**: Line 33 of `frontend/Dockerfile` specifies `COPY --from=builder /app/public ./public`. The repository does not contain a `frontend/public` directory, causing Docker to abort with `stat /app/public: file does not exist`.

### [BUG-004] Broken Client-Side Networking in Docker Compose (`http://backend:8000`)
- **Severity**: P0 (Container Deployment Failure)
- **Impact**: If the frontend image were built, client-side requests from the user's browser would attempt to connect to `http://backend:8000`, which fails to resolve outside the Docker bridge network.
- **Root Cause**: In `docker-compose.yml` (Line 91), `NEXT_PUBLIC_BACKEND_URL` is set to `http://backend:8000`. `NEXT_PUBLIC_*` variables are executed in the user's browser, which cannot resolve container names.

---

# 4. Major Bugs (P1)

### [BUG-005] Interview Mode is 100% Hardcoded Mock Dialogue & Scoring
- **Severity**: P1 (Core Product Feature Broken / Fake Functionality)
- **Impact**: The candidate is deceived into thinking an AI Staff Architect is reviewing their responses. Even if the candidate types "asdfghjkl" or "I store all data in a single text file", the interviewer praises them for "great scope clarification", "spot-on calculation", and awards a 92% "Strong Hire".
- **Root Cause**: In `backend/app/services/interview_engine/engine.py`, `process_turn()` does not evaluate the input message or graph data, returning hardcoded strings based on stage number, and `finish_interview()` returns a static 92% score dictionary.

### [BUG-006] Traffic Simulator Completely Ignores Graph Topology and Caching
- **Severity**: P1 (Simulation Engine Defective)
- **Impact**: The discrete-event simulation engine provides misleading educational results. Placing an Edge CDN and Redis Cache with a 99% hit rate in front of a database has zero effect on the database's simulated CPU or queue depth.
- **Root Cause**: In `backend/app/services/simulation_engine/traffic_simulator.py`, the simulation loop iterates over `nodes` without traversing `edges`. Every node receives the raw `current_qps` regardless of architecture.

### [BUG-007] AI Senior Mentor Completely Orphaned from Frontend UI
- **Severity**: P1 (Core Product Feature Missing)
- **Impact**: The platform's headline feature ("AI Socratic Mentor") cannot be accessed by the user anywhere on the canvas or practice workspace. On `ArchitecturePreview.tsx`, "Ask Mentor" is an unclickable static span.
- **Root Cause**: No frontend component imports or calls `/api/v1/mentor/chat` or `/api/v1/mentor/hint`. The backend service itself is a 143-line script with static keyword regex matching.

### [BUG-008] Capacity Estimation Engine Orphaned from Frontend UI
- **Severity**: P1 (Core Feature Missing in UI)
- **Impact**: Users cannot run capacity estimations or interactively size systems. The backend mathematical derivation engine (`calculator.py`) is never invoked from the frontend.
- **Root Cause**: Zero fetch calls exist in `frontend/src` to `/api/v1/capacity/calculate`.

### [BUG-009] Canvas Save is a Read-Only Black Hole (Saved Designs Cannot Be Opened)
- **Severity**: P1 (Data Accessibility & Workflow Blocker)
- **Impact**: Users save architectures to the cloud, but the canvas UI has no mechanism to reload or open saved designs. Clicking "Open" in the progress dashboard navigates to `/design` without parameters, resetting to the default template.
- **Root Cause**: `design/page.tsx` does not inspect `id` or `public_id` search params, and there is no "My Saved Designs" modal or loader.

### [BUG-010] Canvas Save Spawns Duplicate Database Records on Every Click
- **Severity**: P1 (Data Consistency & Database Bloat)
- **Impact**: Clicking "Save Canvas" multiple times creates distinct duplicate designs with new `public_id`s rather than incrementing design versions.
- **Root Cause**: `handleSaveToCloud` always sends `POST /api/v1/designs` instead of `PUT /api/v1/designs/{id}` for existing designs.

### [BUG-015] Simulation and Review Pages Only Evaluate Hardcoded Static Graphs
- **Severity**: P1 (Workflow Integration Broken)
- **Impact**: Navigating to `/simulate` or `/review` runs checks on hardcoded static mock topologies, completely disconnected from what the user drew on `/design`.
- **Root Cause**: `simulate/page.tsx` and `review/page.tsx` hardcode static node and edge arrays in their payloads.

### [BUG-018] Insecure Hardcoded JWT Secret & Production Debug Mode Enabled
- **Severity**: P1 (Security Vulnerability)
- **Impact**: Attackers can forge administrative JWT tokens and sign arbitrary user sessions.
- **Root Cause**: `backend/app/core/config.py` defaults to `SECRET_KEY = "super-secret-key-change-in-production-designkaro-2026"` and `DEBUG = True`.

### [BUG-019] Zero Rate Limiting Protection on Ingress Endpoints
- **Severity**: P1 (Security & Abuse Vulnerability)
- **Impact**: Attackers can execute denial-of-service, brute-force credential stuffing on `/api/v1/auth/login`, or resource exhaustion on simulation endpoints.
- **Root Cause**: Despite documentation claiming "Reverse proxy, Rate Limiting, Auth Middleware", no rate-limiting middleware is installed in FastAPI.

---

# 5. Medium Bugs (P2)

### [BUG-011] Lesson Content Renders as Raw Unparsed Markdown & LaTeX
- **Severity**: P2 (Poor Learning UX)
- **Impact**: Headings render as `# Latency`, math formulas render as `$$L = \lambda \times W$$`, and tables render as raw pipe strings.
- **Root Cause**: `learn/[slug]/page.tsx` splits content on `---` and renders plain text in `<div className="whitespace-pre-wrap">` without a Markdown/KaTeX parser.

### [BUG-012] Mini-Exercise Interactive Feedback Hardcoded to "200" on All Lessons
- **Severity**: P2 (Educational Credibility Flaw)
- **Impact**: All lessons reject correct answers unless the user enters "200", even for CAP theorem or Kafka lessons.
- **Root Cause**: Hardcoded condition `if (val === "200" || val === "200 connections")` in `learn/[slug]/page.tsx`.

### [BUG-013] Primary Navigation Bar Hidden from Unauthenticated Visitors
- **Severity**: P2 (Navigation & Discovery Flaw)
- **Impact**: New visitors see an empty header with only "Sign In" and "HealthBadge".
- **Root Cause**: Navigation items are conditionally rendered behind `{isAuthenticated && user && ...}` in `Navigation.tsx`.

### [BUG-014] Diagnostic Skill Assessment Modal is Orphaned and Unreachable
- **Severity**: P2 (Feature Inaccessible)
- **Impact**: Users cannot take a skill assessment to determine their level.
- **Root Cause**: `QuickDiagnosticModal.tsx` is never mounted or triggered by any page.

### [BUG-016] Practice Lab Attempt Submission Accepts Arbitrary Client-Supplied Score
- **Severity**: P2 (Integrity Flaw)
- **Impact**: Users can manipulate scores to 100% without solving the challenge.
- **Root Cause**: `submit_problem_attempt` takes `payload.score` directly from the client without server-side validation.

### [BUG-017] Validation Engine Missing 9 of 14 Required Production Invariants
- **Severity**: P2 (Functional Incompleteness)
- **Impact**: Deep call stacks, cyclic topologies, missing timeouts, and database bottlenecks are not detected.
- **Root Cause**: `rule_checker.py` only implements 8 basic rules.

### [BUG-020] Pydantic 422 Errors Render `[object Object]` in Auth Modal
- **Severity**: P2 (UX Glitch)
- **Impact**: Users see a cryptic `[object Object]` banner when form validation fails.
- **Root Cause**: `AuthModal.tsx` passes an array of error objects to `new Error(data.detail)`.

### [BUG-021] Single Lesson and Single Practice Problem for ML Systems
- **Severity**: P2 (Curriculum Incompleteness)
- **Impact**: The platform fails to support ML System Design preparation.
- **Root Cause**: Only one ML lesson and one ML practice problem are seeded in the database.

### [BUG-022] RAG Search is a Fictitious 5-Item In-Memory String Filter
- **Severity**: P2 (Technical Misrepresentation)
- **Impact**: Vector search and Qdrant RAG advertised in ADR-006 do not exist.
- **Root Cause**: `knowledge.py` filters a 5-item static list using `.lower()`.

### [BUG-026] Learning Endpoints Hardcode `is_completed=False` and `completed_count=0`
- **Severity**: P2 (Progress Tracking Broken)
- **Impact**: Topic lists and lesson views never show completed status.
- **Root Cause**: `learning.py` hardcodes completion fields without querying `UserLessonProgress`.

---

# 6. Minor Bugs (P3 / P4)

### [BUG-023] Progress Dashboard Displays Mock Telemetry for Unauthenticated Users (P3)
- **Root Cause**: Fallbacks in `progress/page.tsx` default to 78% readiness and 7-day streak when unauthenticated.

### [BUG-024] Accessibility Failures (WCAG AA Contrast, Focus Traps, Escape Key) (P3)
- **Root Cause**: Modals do not trap focus or listen to `Escape`; labels lack `htmlFor` bindings; muted text contrast is ~2.8:1.

### [BUG-025] Unicode `\u2248` Character Causes Crash on Windows Command Line (P3)
- **Root Cause**: Non-ASCII character in `engine.py` causes `UnicodeEncodeError` when printed on Windows cp1252 consoles.

### [BUG-027] Canvas Node Inspector Allows Negative Latency and Zero Replicas in UI (P4)
- **Root Cause**: Number inputs in `design/page.tsx` lack strict input boundary guards in the change handlers.

---

# 7. UX Problems

1. **Dead Navigation**: First-time visitors have no way to explore the catalog before signing up.
2. **Missing Breadcrumbs**: Navigation between curriculum, problems, canvas, and simulation has dead ends.
3. **No Canvas Undo/Redo**: Accidental node deletion or edge displacement cannot be reverted.
4. **Layout Jumping**: Dynamic metrics in simulation jump height when status badges change.
5. **Lack of Canvas Tooltips**: Palettes and toolbar icons lack descriptive tooltips explaining component roles.

---

# 8. Missing Features

1. **Working AI Socratic Mentor Interface**: Dedicated chat panel on canvas and practice workspace.
2. **Interactive Capacity Calculator**: Visual sizing tool with real-time derivations for storage, bandwidth, and QPS.
3. **Realistic Interview Engine**: LLM-backed interviewer evaluating actual user messages and canvas diagrams.
4. **Canvas-to-Simulation Integration**: Ability to test the live topology built on the whiteboard.
5. **Real-Time Collaboration**: Multi-user whiteboard sessions.
6. **Comprehensive ML Curriculum**: Dedicated modules on feature stores, model drift, inference engines, and vector search.

---

# 9. Technical Problems

1. **Next.js Standalone Docker Misconfiguration**: Missing static assets and incorrect public directory packaging.
2. **State Hydration Failure**: Zustand store is decoupled from persistent browser storage.
3. **SQLite Default**: Default configuration runs on SQLite file despite PostgreSQL requirements in ADRs.
4. **Orphaned Microservices**: Several schemas and endpoints exist in backend code but have zero frontend callers.

---

# 10. Security Problems

1. **Hardcoded Fallback JWT Secret**: Secret key committed in plaintext in `config.py`.
2. **No Rate Limiting on Ingress**: Public endpoints vulnerable to resource exhaustion.
3. **Client-Controlled Scoring**: `POST /problems/{slug}/attempt` trusts client-supplied scores.
4. **Session Lifetime**: Access tokens valid for 7 days without refresh rotation.

---

# 11. Performance Problems

1. **Unindexed Substring Search**: Knowledge base searches perform in-memory linear scans.
2. **Synchronous Simulation Computation**: Multi-tick simulations calculate blocking loops on the main thread.
3. **Redundant React Rerenders**: Node dragging triggers continuous re-evaluations across parent components.

---

# 12. Learning Experience Problems

1. **Raw Markdown Display**: Visual architecture diagrams and formulas render as broken text.
2. **Curriculum Breadth**: Only 6 lessons and 7 problems seeded in database.
3. **Identical Mini-Exercises**: Every lesson evaluates answers against "200".

---

# 13. AI Problems

1. **Zero LLM Integration**: Advertised AI features are static Python string templates.
2. **Generic Hint Ladder**: Level 4 hints provide identical blueprints regardless of problem context.
3. **Absence of Socratic Prompting**: Hardcoded interview turns accept gibberish as brilliant architecture.

---

# 14. Product Strategy Problems

1. **Premature Marketing**: The product claims production-grade AI mentorship and real-time simulation while the underlying engines are static prototypes.
2. **Disconnected Modular Workflows**: Canvas, Practice, Simulate, and Review exist as isolated silos rather than an integrated learning pipeline.

---

# 15. Top 10 Things To Fix First

1. **Fix Auth Persistence & Rehydration**: Add Zustand `persist` middleware to hydrate tokens and user session from `localStorage` on initial page load.
2. **Replace Hardcoded URLs with Relative Rewrites**: Update all frontend fetches to use relative `/api/v1/...` routes backed by Next.js `rewrites()`.
3. **Fix Dockerfile & Docker Compose Setup**: Create `frontend/public` directory and set `NEXT_PUBLIC_BACKEND_URL` to public hostname or relative proxy.
4. **Connect Canvas to Saved Designs**: Allow `/design?id={public_id}` to load saved architectures, and change cloud save to `PUT` for existing designs.
5. **Integrate Real LLM Provider for Interview & Mentor**: Connect OpenAI/Gemini/Anthropic API to evaluate user answers against rubrics.
6. **Graph-Aware Traffic Simulator**: Implement topological BFS/DFS traversal in `traffic_simulator.py` so cache hits and load balancers attenuate downstream load.
7. **Mount Markdown & Math Renderer in Lessons**: Install and configure `react-markdown` and `rehype-katex` in `learn/[slug]/page.tsx`.
8. **Make Primary Navigation Universally Visible**: Allow unauthenticated visitors to view the header navigation and browse the learning catalog.
9. **Build Frontend UI for Capacity Calculator & AI Mentor**: Create accessible drawer components for interactive capacity calculations and mentor chats.
10. **Install FastAPI Rate Limiter & Sanitize Secrets**: Implement `slowapi` rate limiting and enforce environment-variable secrets in production.

---

# 16. Structured Bug Reports

```
BUG ID: BUG-001
CATEGORY: State Management & Authentication
SEVERITY: P0
PRIORITY: Urgent
FEATURE: User Session & Navigation
USER PERSONA: All Personas
REPRODUCTION STEPS:
1. Open http://localhost:3000 and sign in with demo@designkaro.io / Password123!.
2. Verify user badge appears in top header.
3. Refresh page (F5) or navigate directly to http://localhost:3000/design.
EXPECTED RESULT: User remains logged in and canvas loads with active user session.
ACTUAL RESULT: User is instantly logged out; canvas displays "Sign-In Required" barrier.
WHY THIS MATTERS: Forces users to re-authenticate on every page navigation; destroys work in progress.
USER IMPACT: Severe frustration and data loss.
ROOT CAUSE: authStore.ts does not persist or hydrate user object from localStorage.
SUGGESTED FIX: Wrap Zustand store in persist middleware with localStorage synchronization.
EVIDENCE: frontend/src/lib/authStore.ts lines 30-49.
STATUS: Open

BUG ID: BUG-002
CATEGORY: Networking & Deployment
SEVERITY: P0
PRIORITY: Urgent
FEATURE: API Client Layer
USER PERSONA: All Personas
REPRODUCTION STEPS:
1. Deploy platform to staging or access via local IP (http://192.168.1.50:3000).
2. Attempt to view curriculum, solve a challenge, or check architecture health.
EXPECTED RESULT: Frontend communicates with backend via relative URL or configured hostname.
ACTUAL RESULT: Browser attempts to fetch http://127.0.0.1:8000/... and fails with Connection Refused.
WHY THIS MATTERS: Platform cannot be deployed or tested outside a single local machine.
USER IMPACT: Complete failure on mobile and remote browsers.
ROOT CAUSE: Hardcoded "http://127.0.0.1:8000" in 10+ frontend component files.
SUGGESTED FIX: Use NEXT_PUBLIC_BACKEND_URL or relative API paths with Next.js rewrites.
EVIDENCE: frontend/src/app/design/page.tsx line 300; practice/page.tsx line 65; interview/page.tsx line 63.
STATUS: Open

BUG ID: BUG-003
CATEGORY: Docker & DevOps
SEVERITY: P0
PRIORITY: Urgent
FEATURE: Container Packaging
USER PERSONA: DevOps / Developer
REPRODUCTION STEPS:
1. Run "docker compose build frontend" from root directory.
EXPECTED RESULT: Next.js standalone container builds successfully.
ACTUAL RESULT: Build aborts with "COPY failed: stat /app/public: file does not exist".
WHY THIS MATTERS: Docker deployment workflow advertised in README is non-functional.
USER IMPACT: Cannot deploy via Docker.
ROOT CAUSE: Dockerfile line 33 copies /app/public, but folder does not exist.
SUGGESTED FIX: Create frontend/public directory or make COPY step conditional.
EVIDENCE: frontend/Dockerfile line 33.
STATUS: Open

BUG ID: BUG-005
CATEGORY: System Design Interview Engine
SEVERITY: P1
PRIORITY: High
FEATURE: Interview Simulation Mode
USER PERSONA: Experienced Engineer / Interview Candidate
REPRODUCTION STEPS:
1. Navigate to http://localhost:3000/interview and start an interview.
2. In Stage 1, submit "asldkfjaslkdfj nonsense".
3. In Stage 2, submit "I will use Microsoft Excel".
4. Proceed through all 5 stages with nonsense text and click "Finish Interview".
EXPECTED RESULT: Interviewer flags non-viable answers and gives failing feedback.
ACTUAL RESULT: Interviewer gives "Strong Hire" at each step and awards 92% score.
WHY THIS MATTERS: Destroys platform credibility for interview preparation.
USER IMPACT: Zero learning value; misleading interview feedback.
ROOT CAUSE: engine.py process_turn and finish_interview use static hardcoded strings.
SUGGESTED FIX: Integrate real LLM evaluation with prompt rubrics and stage state machines.
EVIDENCE: backend/app/services/interview_engine/engine.py lines 47-150.
STATUS: Open

BUG ID: BUG-006
CATEGORY: Traffic Simulation Engine
SEVERITY: P1
PRIORITY: High
FEATURE: Discrete-Event Simulator
USER PERSONA: All Personas
REPRODUCTION STEPS:
1. Build Architecture A: Client -> Database (1,000 QPS capacity).
2. Build Architecture B: Client -> CDN -> Gateway -> Redis Cache -> Database.
3. Run simulation with 10,000 QPS on both architectures.
EXPECTED RESULT: Architecture B database load is shielded by Redis cache.
ACTUAL RESULT: Database in Architecture B receives 10,000 QPS and crashes with identical metrics to Architecture A.
WHY THIS MATTERS: Teaches incorrect distributed systems principles; ignores caching.
USER IMPACT: Simulation results disconnected from user architecture.
ROOT CAUSE: traffic_simulator.py iterates over nodes without traversing edges.
SUGGESTED FIX: Implement graph traversal with per-tier QPS attenuation based on cache hit rates.
EVIDENCE: backend/app/services/simulation_engine/traffic_simulator.py lines 63-120.
STATUS: Open

BUG ID: BUG-007
CATEGORY: AI Senior Mentor
SEVERITY: P1
PRIORITY: High
FEATURE: Socratic Mentorship
USER PERSONA: All Personas
REPRODUCTION STEPS:
1. Navigate to /design or /practice/[slug].
2. Search for mentor chat or Socratic guidance interface.
EXPECTED RESULT: Interactive AI mentor panel is available to answer questions.
ACTUAL RESULT: No AI mentor UI exists; "Ask Mentor" on preview card is an unclickable span.
WHY THIS MATTERS: Advertised core feature is entirely absent from the user interface.
USER IMPACT: Users cannot access mentorship.
ROOT CAUSE: Frontend has zero API integrations with /api/v1/mentor endpoints.
SUGGESTED FIX: Build an interactive Socratic Mentor drawer on canvas and practice pages.
EVIDENCE: frontend/src/components/ArchitecturePreview.tsx line 352.
STATUS: Open

BUG ID: BUG-009
CATEGORY: Architecture Canvas
SEVERITY: P1
PRIORITY: High
FEATURE: Design Persistence & Versioning
USER PERSONA: All Personas
REPRODUCTION STEPS:
1. Build a custom architecture on /design and click "Save Canvas".
2. Note the generated public ID (e.g. design-xxxxxx).
3. Navigate to /progress and find the design in "Saved Blueprints".
4. Click "Open".
EXPECTED RESULT: Canvas opens with the user's saved architecture.
ACTUAL RESULT: Canvas opens with the default TinyURL template; custom architecture cannot be opened.
WHY THIS MATTERS: Users cannot revisit or continue work on saved designs.
USER IMPACT: Permanent loss of access to created architectures.
ROOT CAUSE: design/page.tsx does not accept or load design IDs from query parameters.
SUGGESTED FIX: Support /design?id={public_id} and fetch existing graph data on load.
EVIDENCE: frontend/src/app/progress/page.tsx line 403; frontend/src/app/design/page.tsx line 160.
STATUS: Open

BUG ID: BUG-011
CATEGORY: Learning UI / Markdown
SEVERITY: P2
PRIORITY: Medium
FEATURE: Lesson Reader
USER PERSONA: Beginner / Intermediate
REPRODUCTION STEPS:
1. Navigate to http://localhost:3000/learn/latency-vs-throughput.
2. Inspect the lesson content text.
EXPECTED RESULT: Formatted headings, bold text, rendered LaTeX formulas, and styled tables.
ACTUAL RESULT: Raw plain text with visible "#", "$$L = \lambda \times W$$", and "|" table characters.
WHY THIS MATTERS: Degrades readability and visual quality of educational material.
USER IMPACT: Difficult to read mathematical formulas and comparison tables.
ROOT CAUSE: learn/[slug]/page.tsx renders raw text in whitespace-pre-wrap div without a markdown parser.
SUGGESTED FIX: Integrate react-markdown with remark-gfm and rehype-katex.
EVIDENCE: frontend/src/app/learn/[slug]/page.tsx lines 227-237.
STATUS: Open

BUG ID: BUG-012
CATEGORY: Learning Exercises
SEVERITY: P2
PRIORITY: Medium
FEATURE: Interactive Mini-Exercises
USER PERSONA: Beginner
REPRODUCTION STEPS:
1. Navigate to /learn/cap-theorem-in-practice.
2. Scroll down to Interactive Mini-Exercise widget.
3. Submit the correct CAP theorem answer.
EXPECTED RESULT: Answer is evaluated against CAP theorem question.
ACTUAL RESULT: Feedback says: "Try again! Remember Little's Law: 5000 x 0.040 = ?". Only entering "200" passes.
WHY THIS MATTERS: Obvious prototype bug that damages technical credibility.
USER IMPACT: Confuses students studying non-throughput topics.
ROOT CAUSE: Hardcoded check val === "200" in learn/[slug]/page.tsx line 131.
SUGGESTED FIX: Model mini-exercises dynamically per lesson in database.
EVIDENCE: frontend/src/app/learn/[slug]/page.tsx lines 128-136.
STATUS: Open

BUG ID: BUG-013
CATEGORY: UI / Navigation
SEVERITY: P2
PRIORITY: Medium
FEATURE: Global Header Navigation
USER PERSONA: First-Time Visitor
REPRODUCTION STEPS:
1. Open http://localhost:3000 in an Incognito/Private window.
2. Inspect the top header.
EXPECTED RESULT: Navigation links (Learn, Practice, Canvas, Simulate, Interview) are visible.
ACTUAL RESULT: Navigation links are completely hidden. Header only shows Logo and "Sign In".
WHY THIS MATTERS: Prevents visitors from discovering what the platform offers.
USER IMPACT: Severe bounce rate; users cannot evaluate product before signing up.
ROOT CAUSE: Navigation.tsx line 76 conditionally wraps nav items in {isAuthenticated && user && ...}.
SUGGESTED FIX: Make navigation bar public; prompt for auth only when performing write actions.
EVIDENCE: frontend/src/components/Navigation.tsx lines 76-102.
STATUS: Open

BUG ID: BUG-018
CATEGORY: Security
SEVERITY: P1
PRIORITY: High
FEATURE: Authentication & Tokens
USER PERSONA: Security / All Users
REPRODUCTION STEPS:
1. Inspect backend/app/core/config.py line 32.
EXPECTED RESULT: Secrets loaded exclusively from environment with strict validation.
ACTUAL RESULT: Fallback default SECRET_KEY is hardcoded in repository source code.
WHY THIS MATTERS: Attackers can forge valid administrative JWT tokens.
USER IMPACT: Total account compromise.
ROOT CAUSE: Insecure default string in Settings schema.
SUGGESTED FIX: Require SECRET_KEY from environment in production; raise error if missing.
EVIDENCE: backend/app/core/config.py lines 12, 32.
STATUS: Open

BUG ID: BUG-019
CATEGORY: Security & Resiliency
SEVERITY: P1
PRIORITY: High
FEATURE: API Gateway & Protection
USER PERSONA: Platform
REPRODUCTION STEPS:
1. Send 1,000 rapid POST requests to /api/v1/auth/login with wrong password.
EXPECTED RESULT: Requests throttled with HTTP 429 Too Many Requests after threshold.
ACTUAL RESULT: Server processes every request without throttling.
WHY THIS MATTERS: Vulnerable to credential brute-forcing and denial-of-service.
USER IMPACT: Service degradation or account compromise.
ROOT CAUSE: No rate-limiting middleware configured in FastAPI application.
SUGGESTED FIX: Implement slowapi rate-limiting middleware keyed on client IP and token.
EVIDENCE: backend/app/main.py lines 43-56.
STATUS: Open

BUG ID: BUG-020
CATEGORY: Error Handling & UX
SEVERITY: P2
PRIORITY: Medium
FEATURE: Authentication Modal
USER PERSONA: New User
REPRODUCTION STEPS:
1. Click "Sign In", switch to "Create Account".
2. Enter an invalid email (e.g. "notanemail") and short password.
3. Submit form.
EXPECTED RESULT: Friendly message: "Please enter a valid email address".
ACTUAL RESULT: Red banner displays: "[object Object]".
WHY THIS MATTERS: Users cannot identify what needs correction to complete signup.
USER IMPACT: Blocks registration.
ROOT CAUSE: data.detail array from Pydantic 422 converted to string via Error constructor.
SUGGESTED FIX: Parse data.detail array and extract individual error msg fields.
EVIDENCE: frontend/src/components/AuthModal.tsx lines 57-67.
STATUS: Open
```
