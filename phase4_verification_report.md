# DESIGNKARO — PHASE 4 VERIFICATION REPORT
## Architecture Trade-offs, Experiment-Driven Learning & Evidence-Based Feedback

**Date**: 2026-10-13  
**Target Topic**: `distributed-cache-redis`  
**Target Exercise**: Distributed Caching (`exercise-distributed-caching`)  
**Status**: Completed & Verified  

---

## 1. Executive Summary

Phase 4 bridges architecture diagramming and deep distributed systems intuition. Instead of merely asking learners to connect nodes on a canvas until checkboxes turn green, Phase 4 introduces an interactive 5-step learning workflow:

1. **Predict**: Make architectural hypotheses regarding database read offload, cache failure stampedes, data consistency, and validation metrics before running simulations.
2. **Experiment**: Run comparative simulations between an unshielded database baseline and the learner's active canvas topology under configurable traffic presets (`baseline`, `normal`, `surge`, `stress_test`).
3. **Observe**: Inspect side-by-side empirical metrics in a truthfully labeled matrix (`[Simulator Output]`, `[Model Assumption]`, `[Unsupported Dimension]`).
4. **Explain**: Receive deterministic, evidence-based feedback evaluating predictions against observed measurements, diagnosing canvas topology gaps, and highlighting tail latency and database offload deltas.
5. **Transfer**: Apply learned concepts to a real-world scenario (flash sale product catalog freshness) with immediate evaluation of optimal vs. suboptimal choices and explicit misconception analysis.

All functionality was built on top of the existing `runClientSimulation` engine without external LLM dependencies, without fabricating unsimulated metrics, and without destabilizing any existing curriculum, practice problems, or landing page polish.

---

## 2. Architecture & Data Flow

```
                      +------------------------------------------+
                      |  Guided Lab: distributed-cache-redis     |
                      |  (SimulatorGuidedExercisePanel.tsx)      |
                      +--------------------+---------------------+
                                           |
                  +------------------------+------------------------+
                  | Subtab: Canvas Objectives                       | Subtab: Trade-off Lab
                  v                                                 v
        +-------------------+                             +--------------------+
        | exerciseValidator |                             | SimulatorTradeoffLab|
        +-------------------+                             +---------+----------+
                                                                    |
               +----------------------------------------------------+
               |
               v
     +---------------------------------------------------------------------------------+
     | 1. PREDICT   | 2. EXPERIMENT           | 3. OBSERVE      | 4. EXPLAIN           | 5. TRANSFER     |
     | 4 Questions  | Baseline vs Canvas      | Strict Metric   | Empirical Deltas     | E-Commerce      |
     | Hypotheses   | runClientSimulation()   | Dimensions      | & Topology Diagnosis | Freshness Trade |
     +---------------------------------------------------------------------------------+
               |
               v
     +-------------------+
     |   tradeoffStore   |  (Isolated from exercise completion / backend XP)
     +-------------------+
```

### Core Components

1. **Domain Model (`frontend/src/types/tradeoffs.ts`)**:
   - `TradeoffOption`, `TradeoffQuestion`, `ExperimentMetrics`, `ExperimentRunResult`.
   - `TransferChallengeOption`, `TransferChallenge`, `EvidenceFeedback`, `CachingLabProgressState`.
2. **Deterministic Engine (`frontend/src/lib/cachingTradeoffs.ts`)**:
   - `runBaselineExperiment(presetId)`: Evaluates `CACHE_EXERCISE_INITIAL_GRAPH` in memory under the selected load preset without mutating the learner's active canvas.
   - `runCacheActiveExperiment(currentGraph, presetId)`: Inspects topology (Redis presence, `read_path`, `write_path`, replicas) and runs `runClientSimulation(currentGraph, profile)`.
   - `generateEvidenceFeedback(baseline, cacheRun, predictions, currentGraph)`: Computes empirical deltas (DB utilization drop, p99 latency speedup factor, error rate reduction) and evaluates prediction hypotheses.
   - `CACHE_UNSUPPORTED_METRICS`: Explicitly declares dimensions not computed by the discrete simulation model (`[Unsupported Dimension]`).
3. **Persistent State Store (`frontend/src/lib/tradeoffStore.ts`)**:
   - Zustand store with `persist` middleware (`designkaro_caching_tradeoff_lab_v1`).
   - Headless Node fallback with in-memory storage.
   - Strictly isolated from guided exercise task checklist and backend problem submission.
4. **Interactive UI (`frontend/src/components/simulator/SimulatorTradeoffLab.tsx`)**:
   - Stepper navigation with visual status badges: `[1. Predict] -> [2. Experiment] -> [3. Observe] -> [4. Explain] -> [5. Transfer]`.
   - Integrated as a dedicated sub-tab within `SimulatorGuidedExercisePanel.tsx`.

---

## 3. The 5-Step Learning Journey

### Step 1: Predict
- **Scenario**: *Peak Hour Read Surge vs. Unshielded Database* (15K–50K QPS peak hour traffic, PostgreSQL connection pool saturation).
- **Questions**:
  1. *Database Read Offload*: What happens to database read queries as the cache hit rate increases?
  2. *Cache Outage Consequence*: What happens to the database if the Redis cache cluster suddenly crashes under heavy traffic?
  3. *Data Consistency Risk*: What primary architectural risk is introduced by caching mutable data in Redis?
  4. *Validation Metric*: Which metric best reveals whether your caching architecture is successfully protecting the system?

### Step 2: Experiment
- **Baseline (Direct PostgreSQL)**: Runs in-memory without touching the learner's canvas. Shows DB saturated at 100% utilization, ~167ms p99 latency, and 16.2% error rate under normal load.
- **Active Canvas**: Runs against the learner's current graph. If properly configured with Cache-Aside, DB utilization drops to ~37%, p99 latency drops to ~17ms (10x faster), and error rate drops to 0%.
- **Chaos & Failure Inoculation**: Supports load presets (`baseline`, `normal`, `surge`, `stress_test`) to verify behavior under extreme concurrency.

### Step 3: Observe
A side-by-side comparative table with strict, honest labeling:
- **`[Simulator Output]`**:
  - PostgreSQL Peak Utilization (%): 100% vs. 37%
  - p99 Tail Latency: 167 ms vs. 17 ms
  - Request Error Rate: 16.2% vs. 0.0%
  - Delivered Throughput: 12,570 QPS vs. 15,000 QPS
  - Primary Saturated Component: `PostgreSQL Database` vs. `None`
- **`[Model Assumption]`**:
  - Assumed Cache Hit Ratio: 85.0%
  - Assumed Read / Write Ratio: 85% Reads / 15% Writes
- **`[Unsupported Dimension]`**:
  - Cache Eviction Churn (LRU): *Not calculated by discrete event simulator (tracked in theoretical trade-offs)*
  - Replication Lag: *Not simulated in discrete single-cluster simulation mode*

### Step 4: Explain
Deterministic feedback generated directly from empirical simulation deltas:
- **Database Offload Observed**: Quantifies exact percentage drop in PostgreSQL utilization.
- **Tail Latency Speedup**: Quantifies integer multiplier speedup in tail latency.
- **Reliability Assessment**: Highlights elimination of connection pool dropouts.
- **Hypothesis Evaluation**: Compares learner's pre-simulation predictions with observed facts.
- **Topology Diagnostics**: Detects missing cache nodes, missing `read_path` edges, missing DB `write_path` fallbacks, or single-point-of-failure replica counts (<2).

### Step 5: Transfer Challenge
- **Scenario**: Product catalog service during flash sales (80K QPS reads, frequent merchant price/stock updates).
- **Options Evaluated**:
  - *Option A (Long TTL, 24h)*: Suboptimal. Flagged with misconception: *"Relying solely on time expiration for frequently updated data risks major data staleness and business discrepancy."*
  - *Option B (Ultra-short TTL, 3s)*: Suboptimal. Flagged with misconception: *"Extremely short TTLs reduce the benefits of caching because keys constantly expire simultaneously under high QPS, causing cache stampedes."*
  - *Option C (Cache-Aside with Write-Invalidate / Event Stream)*: **Optimal**. Instant in-memory reads combined with immediate invalidation upon database write.
- **Reference Explanation & Architectural Principle**: Detailed explanation of the *Cache Invalidation Principle*.

---

## 4. Verification & Test Matrix

### Test Suite Execution (`npm test`)

```
TAP version 13
# Subtest: DesignKaro Phase 2 - Guided Exercises & Validation Engine (10 tests)
ok 1 - DesignKaro Phase 2 - Guided Exercises & Validation Engine
  --- duration_ms: 5.56ms ---

# Subtest: DesignKaro Phase 3 - Learning Journey Integration & Reliability (15 tests)
ok 2 - DesignKaro Phase 3 - Learning Journey Integration & Reliability
  --- duration_ms: 5.51ms ---

# Subtest: DesignKaro Phase 4 - Architecture Trade-offs & Evidence-Based Feedback (12 tests)
    ok 1 - 1. Baseline experiment runs without modifying active canvas graph
    ok 2 - 2. Cache-enabled experiment accurately measures cache-aside topology
    ok 3 - 3. Detects missing cache-read edge in evidence feedback
    ok 4 - 4. Detects missing database write fallback edge in evidence feedback
    ok 5 - 5. Baseline and cache experiment result isolation in tradeoffStore
    ok 6 - 6. Deterministic explanation selection based on actual graph state
    ok 7 - 7. Unsupported metrics clearly designated as unavailable with proper tags
    ok 8 - 8. Prediction submission does not mark guided graph tasks complete
    ok 9 - 9. Transfer challenge evaluation distinguishes optimal from suboptimal choices
    ok 10 - 10. Refresh and persistence in tradeoffStore operates safely with fallback
    ok 11 - 11. Existing guided exercise graph completion remains independent
    ok 12 - 12. Existing simulator behavior intact across load presets
ok 3 - DesignKaro Phase 4 - Architecture Trade-offs & Evidence-Based Feedback
  --- duration_ms: 23.63ms ---

1..3
# tests 37
# suites 3
# pass 37
# fail 0
# duration_ms 342.40ms
```

### Typecheck & Lint Checks

| Check | Command | Result |
|---|---|---|
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | **0 errors, Exit code 0** |
| **ESLint Check** | `npm run lint` (`next lint`) | **0 errors, Exit code 0** |
| **Production Build** | `npm run build` (`next build`) | **Exit code 0, 8 static pages compiled** |
| **Backend Pytest** | `pytest backend/tests -q` | **138 passed in 26.53s, Exit code 0** |

---

## 5. Guardrail Adherence

1. **`frontend/src/app/page.tsx` Protection**: Unaltered by Phase 4. All landing page hero styling and layout preserved.
2. **Deterministic Rules Only**: Zero external LLM calls or API keys required for trade-off evaluation or feedback generation.
3. **Honest Simulation Truthfulness**: Dimensions not modeled by the simulator (e.g. LRU eviction churn, replication lag) are explicitly flagged as `[Unsupported Dimension]` rather than displaying hallucinated values.
4. **State Isolation**: Submitting predictions or completing the transfer challenge does not artificially mark canvas objectives complete.
5. **Preserved Existing Features**: Practice problems, Progress dashboard, guided exercise checklists, and backend test suite remain 100% operational.
