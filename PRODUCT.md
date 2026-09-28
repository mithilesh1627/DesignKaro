# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Software engineers across two distinct tracks:
- **Foundational Learners (Junior Engineers / CS Students)**: Seeking conceptual clarity, first-principles derivations (Little's Law, latency vs. throughput, CAP theorem, consistent hashing), and structured curriculum progression without getting lost in abstract jargon.
- **Experienced & Interview Candidates (Mid / Senior / Staff / FAANG Candidates)**: Preparing for high-stakes system design whiteboard rounds and real-world distributed architectures, requiring realistic sandbox validation, failure testing, quantitative bottleneck identification, and Socratic challenge.

## Product Purpose

DesignKaro (*"Socho. Design Karo. Scale Karo."*) replaces passive memorization and answer-spoiling chatbots with an active, mathematically verified engineering workbench. Success means engineers can reason about trade-offs, design resilient architectures under 10x traffic spikes or component failures, and articulate architectural rationale with high confidence.

## Positioning

Interactive architectural rigor: Unlike static cheat sheets (ByteByteGo, System Design Primer) or generic AI bots that immediately regurgitate complete solutions, DesignKaro combines an interactive whiteboard canvas with deterministic topology validation, discrete-event traffic simulation (100 QPS to 1,000,000 QPS), real-time failure injection, and a 4-level progressive Socratic mentor that tests whether a proposed system actually works mathematically and operationally.

## Operating Context

- Desktop/laptop web browser environments (dual-pane canvas + telemetry dashboards, code/configuration inspectors, traffic graphs, and Socratic mentor drawer).
- Real-time drag-and-drop node graph canvas (`@xyflow/react`) connected to a responsive backend simulation and validation pipeline.
- Fast iteration cycle: Design -> Validate Topology -> Run Traffic Simulation -> Inject Chaos/Failures -> Review Bottlenecks & Socratic Rubric.
- Discovery-first model: Public exploration for curriculum and problem statements, moving into persistent authenticated sessions for tracking mastery and saved architectural blueprints.

## Capabilities and Constraints

- **Confirmed Capabilities**:
  - Interactive whiteboarding canvas with 30+ distributed components (databases, caches, queues, load balancers, reverse proxies, vector stores).
  - Deterministic static rule engine (`SINGLE_POINT_OF_FAILURE`, `MISSING_LOAD_BALANCER`, `UNBOUNDED_QUEUE`, `NO_CACHE`).
  - Discrete-event traffic simulation engine simulating 100 to 1,000,000 QPS with latency/IOPS/memory bottleneck detection.
  - Chaos engineering and fault injection (killing nodes, dropping packets, cache failure).
  - Socratic AI mentor with 4-level progressive hint ladder.
  - System design interview simulator evaluating whiteboards against a 9-dimension rubric.
  - 0–100 adaptive skill mastery tracking across distributed systems topics.
- **Technical Stack & Constraints**:
  - Frontend: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Zustand, `@xyflow/react`, Lucide React.
  - Backend: FastAPI (Python 3.11+), SQLAlchemy 2.0 (AsyncIO), Redis 7.2, PostgreSQL 16 (`asyncpg`).
  - Architecture: Modular Monolith.
- **Explicitly Undecided / Open**:
  - Deep ML System Design tooling (feature stores, embedding drift, distributed training) is planned in later roadmap phases.
  - High-density interactive canvas operations currently target desktop viewports; mobile viewports focus on reading, review, and curriculum consumption.

## Brand Commitments

- **Name**: DesignKaro
- **Tagline**: *"Socho. Design Karo. Scale Karo."*
- **Voice**: Rigorous, authoritative, encouraging senior engineering mentor. Demands mathematical rationale ("What? Why? What breaks? How do you scale?") without being pedantic or dismissive.
- **Identity Tone**: Clean, technical, high-density developer ergonomics; dark/slate-forward architectural dashboard aesthetic.

## Evidence on Hand

- Working Next.js 14 + FastAPI codebase with implemented endpoints and client routes (`/`, `/learn`, `/practice`, `/simulator`, `/progress`).
- Architectural Decision Records: `docs/ADR-001-modular-monolith.md` through `ADR-007`.
- QA Audits: `docs/USER_JOURNEY_AUDIT.md` and `docs/END_USER_QA_AUDIT.md` documenting verified user journeys, friction points, and gaps.
- Master roadmap: `IMPLEMENTATION_PLAN.md` covering phases 1–24.
- Visual references: `home_page.png`, `docs/screenshots/`.
- Absences: No third-party enterprise customer logos or commercial case studies yet exist; future copy must not fabricate fictitious corporate endorsements.

## Product Principles

- **Rigor Over Memorization**: Never reduce architecture to static boxes and arrows; enforce quantitative limits (IOPS, bandwidth, connection pools, latency SLAs).
- **Socratic Guidance Over Solution Spoiling**: Nudge engineers to discover architectural bottlenecks themselves through progressive hints rather than dumping answers.
- **First-Principles Transparency**: Ground every rule, warning, and calculation in clear physics/mathematics (Little's Law, CAP, Amdahl's Law).
- **Zero-Barrier Discovery**: Allow visitors to immediately explore curriculum, inspect problem constraints, and test-drive the canvas before forcing authentication.

## Accessibility & Inclusion

- WCAG AA standard compliance across text contrast, keyboard navigation for modals and forms, and visible focus rings.
- Proper mathematical typesetting (KaTeX or semantic math markup) rather than raw unparsed LaTeX/dollar delimiters.
- Intentional alternatives for motion/animations (`prefers-reduced-motion`) without breaking canvas interaction state.
