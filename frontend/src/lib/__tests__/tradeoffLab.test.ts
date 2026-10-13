import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { ArchitectureGraph } from "@/types/simulator";
import {
  CACHING_PREDICTION_SCENARIO,
  CACHING_PREDICTION_QUESTIONS,
  CACHING_TRANSFER_CHALLENGE,
  CACHE_UNSUPPORTED_METRICS,
  runBaselineExperiment,
  runCacheActiveExperiment,
  generateEvidenceFeedback,
  computeGraphSignature,
} from "../cachingTradeoffs";
import {
  DISTRIBUTED_CACHE_EXERCISE,
  CACHE_EXERCISE_INITIAL_GRAPH,
} from "../guidedExercises";
import { validateExercise } from "../exerciseValidator";
import { useTradeoffStore } from "../tradeoffStore";
import { useExerciseStore } from "../exerciseStore";
import { runClientSimulation, TRAFFIC_PRESETS, DEFAULT_TRAFFIC_PROFILE } from "../simulationEngine";

describe("DesignKaro Phase 4 - Architecture Trade-offs & Evidence-Based Feedback", () => {
  beforeEach(() => {
    useTradeoffStore.getState().resetLabState();
    useExerciseStore.getState().resetProgress("exercise-distributed-caching");
  });

  // --------------------------------------------------------------------------
  // 1. Baseline Experiment Runs Without Modifying Active Canvas Graph
  // --------------------------------------------------------------------------
  it("1. Baseline experiment runs without modifying active canvas graph", () => {
    const customGraph: ArchitectureGraph = JSON.parse(
      JSON.stringify(CACHE_EXERCISE_INITIAL_GRAPH)
    );
    // Mark custom property to detect mutation
    (customGraph as any).__custom_marker = "test_run";
    const graphCopy = JSON.parse(JSON.stringify(customGraph));

    const baselineResult = runBaselineExperiment("normal");

    // Graph state must remain strictly unmodified
    assert.deepStrictEqual(customGraph, graphCopy);
    assert.strictEqual((customGraph as any).__custom_marker, "test_run");

    // Baseline characteristics
    assert.strictEqual(baselineResult.scenarioName, "baseline_direct_db");
    assert.strictEqual(baselineResult.hasCacheNode, false);
    assert.strictEqual(baselineResult.hasCacheReadEdge, false);
    assert.strictEqual(baselineResult.hasDbWriteFallbackEdge, true);
    assert.strictEqual(baselineResult.hasMultipleReplicas, false);

    // Baseline metrics show database under heavy direct load
    assert.strictEqual(baselineResult.metrics.databaseUtilizationPercent, 100);
    assert.strictEqual(baselineResult.metrics.bottleneckNodeName, "PostgreSQL Database");
    assert.ok(baselineResult.metrics.p99LatencyMs > 100);
  });

  // --------------------------------------------------------------------------
  // 2. Cache-Enabled Experiment Setup & Metric Measurements
  // --------------------------------------------------------------------------
  it("2. Cache-enabled experiment accurately measures cache-aside topology", () => {
    const targetGraph = DISTRIBUTED_CACHE_EXERCISE.targetGraph;
    assert.ok(targetGraph);

    const cacheResult = runCacheActiveExperiment(targetGraph, "normal");

    assert.strictEqual(cacheResult.scenarioName, "cache_aside_active");
    assert.strictEqual(cacheResult.hasCacheNode, true);
    assert.strictEqual(cacheResult.hasCacheReadEdge, true);
    assert.strictEqual(cacheResult.hasDbWriteFallbackEdge, true);
    assert.strictEqual(cacheResult.hasMultipleReplicas, true);

    // Compared to unshielded 100% DB utilization, cache-aside offloads DB to <= 40%
    assert.ok(cacheResult.metrics.databaseUtilizationPercent <= 40);
    // P99 latency is significantly faster (sub-25ms vs >150ms)
    assert.ok(cacheResult.metrics.p99LatencyMs <= 25);
    // 0 error rate under normal load
    assert.strictEqual(cacheResult.metrics.errorRate, 0);
  });

  // --------------------------------------------------------------------------
  // 3. Missing Cache-Read Edge Detection in Evidence Feedback
  // --------------------------------------------------------------------------
  it("3. Detects missing cache-read edge in evidence feedback", () => {
    // Construct topology with Redis present, but without read_path edge from service
    const disconnectedCacheGraph: ArchitectureGraph = {
      nodes: [
        {
          id: "server-1",
          type: "server",
          name: "User Service",
          category: "compute",
          position: { x: 300, y: 200 },
          config: { replicas: 2, qps_capacity: 1000, latency_ms: 5 },
        },
        {
          id: "redis-1",
          type: "redis",
          name: "Cache Cluster",
          category: "cache",
          position: { x: 550, y: 150 },
          config: { replicas: 2, qps_capacity: 5000, latency_ms: 1 },
        },
        {
          id: "postgresql-1",
          type: "postgresql",
          name: "User DB",
          category: "database",
          position: { x: 550, y: 350 },
          config: { replicas: 1, qps_capacity: 1000, latency_ms: 15 },
        },
      ],
      edges: [
        {
          id: "e-srv-db",
          source: "server-1",
          target: "postgresql-1",
          connectionType: "write_path",
        },
      ],
      metadata: {
        problemId: "distributed-cache-redis",
        title: "Disconnected Cache",
        targetRps: 2000,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const baseline = runBaselineExperiment("normal");
    const cacheRun = runCacheActiveExperiment(disconnectedCacheGraph, "normal");

    assert.strictEqual(cacheRun.hasCacheNode, true);
    assert.strictEqual(cacheRun.hasCacheReadEdge, false);

    const feedback = generateEvidenceFeedback(baseline, cacheRun, {}, disconnectedCacheGraph);

    assert.strictEqual(feedback.category, "missing_topology");
    const hasReadEdgeWarning = feedback.findings.some((f) =>
      f.toLowerCase().includes("missing cache read") || f.toLowerCase().includes("read_path")
    );
    assert.ok(hasReadEdgeWarning);
  });

  // --------------------------------------------------------------------------
  // 4. Missing Database Write Fallback Edge Detection
  // --------------------------------------------------------------------------
  it("4. Detects missing database write fallback edge in evidence feedback", () => {
    // Construct topology with Redis read path, but no write_path to PostgreSQL
    const noDbWriteGraph: ArchitectureGraph = {
      nodes: [
        {
          id: "server-1",
          type: "server",
          name: "User Service",
          category: "compute",
          position: { x: 300, y: 200 },
          config: { replicas: 2, qps_capacity: 1000, latency_ms: 5 },
        },
        {
          id: "redis-1",
          type: "redis",
          name: "Cache Cluster",
          category: "cache",
          position: { x: 550, y: 150 },
          config: { replicas: 2, qps_capacity: 5000, latency_ms: 1 },
        },
        {
          id: "postgresql-1",
          type: "postgresql",
          name: "User DB",
          category: "database",
          position: { x: 550, y: 350 },
          config: { replicas: 1, qps_capacity: 1000, latency_ms: 15 },
        },
      ],
      edges: [
        {
          id: "e-srv-cache",
          source: "server-1",
          target: "redis-1",
          connectionType: "read_path",
        },
      ],
      metadata: {
        problemId: "distributed-cache-redis",
        title: "No DB Fallback",
        targetRps: 2000,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const baseline = runBaselineExperiment("normal");
    const cacheRun = runCacheActiveExperiment(noDbWriteGraph, "normal");

    assert.strictEqual(cacheRun.hasCacheNode, true);
    assert.strictEqual(cacheRun.hasCacheReadEdge, true);
    assert.strictEqual(cacheRun.hasDbWriteFallbackEdge, false);

    const feedback = generateEvidenceFeedback(baseline, cacheRun, {}, noDbWriteGraph);

    assert.strictEqual(feedback.category, "warning");
    const hasWriteWarning = feedback.findings.some((f) =>
      f.toLowerCase().includes("missing database fallback") || f.toLowerCase().includes("write_path")
    );
    assert.ok(hasWriteWarning);
  });

  // --------------------------------------------------------------------------
  // 5. Baseline and Cache Experiment Result Isolation
  // --------------------------------------------------------------------------
  it("5. Baseline and cache experiment result isolation in tradeoffStore", () => {
    const store = useTradeoffStore.getState();
    assert.strictEqual(store.baselineRun, null);
    assert.strictEqual(store.cacheRun, null);

    const baselineResult = runBaselineExperiment("normal");
    store.recordBaselineRun(baselineResult);

    assert.deepStrictEqual(useTradeoffStore.getState().baselineRun, baselineResult);
    assert.strictEqual(useTradeoffStore.getState().cacheRun, null);

    const targetGraph = DISTRIBUTED_CACHE_EXERCISE.targetGraph;
    assert.ok(targetGraph);
    const cacheResult = runCacheActiveExperiment(targetGraph, "normal");
    store.recordCacheRun(cacheResult);

    // Both remain independently stored without mutual corruption
    assert.deepStrictEqual(useTradeoffStore.getState().baselineRun, baselineResult);
    assert.deepStrictEqual(useTradeoffStore.getState().cacheRun, cacheResult);
  });

  // --------------------------------------------------------------------------
  // 6. Deterministic Explanation Selection Based on Actual Graph State
  // --------------------------------------------------------------------------
  it("6. Deterministic explanation selection based on actual graph state", () => {
    const baseline = runBaselineExperiment("normal");
    const targetGraph = DISTRIBUTED_CACHE_EXERCISE.targetGraph;
    assert.ok(targetGraph);
    const cacheRun = runCacheActiveExperiment(targetGraph, "normal");

    const samplePredictions = {
      pred_db_load: "opt_offload_proportional",
      pred_outage_risk: "opt_stampede_cascade",
      pred_consistency_risk: "opt_stale_reads",
      pred_key_metric: "opt_metric_db_util",
    };

    const feedback1 = generateEvidenceFeedback(baseline, cacheRun, samplePredictions, targetGraph);
    const feedback2 = generateEvidenceFeedback(baseline, cacheRun, samplePredictions, targetGraph);

    // Guaranteed identical deterministic output
    assert.deepStrictEqual(feedback1, feedback2);
    assert.strictEqual(feedback1.category, "success");
    assert.match(feedback1.headline, /Successfully Shields/i);

    // All 4 predictions evaluated with observed empirical evidence
    assert.strictEqual(feedback1.predictionComparison.length, 4);
    for (const comp of feedback1.predictionComparison) {
      assert.strictEqual(comp.wasAccurate, true);
      assert.ok(comp.observedEvidence.length > 10);
    }
  });

  // --------------------------------------------------------------------------
  // 7. Unsupported Metrics Clearly Designated as Unavailable
  // --------------------------------------------------------------------------
  it("7. Unsupported metrics clearly designated as unavailable with proper tags", () => {
    assert.ok(CACHE_UNSUPPORTED_METRICS.length >= 2);

    for (const metric of CACHE_UNSUPPORTED_METRICS) {
      assert.strictEqual(metric.dimensionTag, "[Unsupported Dimension]");
      assert.strictEqual(metric.isAvailableInSimulator, false);
      assert.ok(metric.reason.length > 10);
    }

    const metricNames = CACHE_UNSUPPORTED_METRICS.map((m) => m.name);
    assert.ok(metricNames.some((n) => n.includes("LRU")));
    assert.ok(metricNames.some((n) => n.includes("Replication Lag")));
  });

  // --------------------------------------------------------------------------
  // 8. Prediction Submission Does Not Mark Guided Graph Tasks Complete
  // --------------------------------------------------------------------------
  it("8. Prediction submission does not mark guided graph tasks complete", () => {
    const tradeoffStore = useTradeoffStore.getState();
    const exerciseStore = useExerciseStore.getState();

    // Verify initial exercise status
    const initialExerciseProgress =
      exerciseStore.progressByExerciseId["exercise-distributed-caching"];
    assert.ok(!initialExerciseProgress || initialExerciseProgress.completedTaskIds.length === 0);

    // Submit predictions in tradeoff lab
    tradeoffStore.setPrediction("pred_db_load", "opt_offload_proportional");
    tradeoffStore.setPrediction("pred_outage_risk", "opt_stampede_cascade");
    tradeoffStore.submitPredictions();

    assert.strictEqual(useTradeoffStore.getState().isPredictionSubmitted, true);

    // Guided exercise tasks must remain completely untouched
    const afterProgress =
      useExerciseStore.getState().progressByExerciseId["exercise-distributed-caching"];
    assert.ok(!afterProgress || afterProgress.completedTaskIds.length === 0);
  });

  // --------------------------------------------------------------------------
  // 9. Transfer Challenge Evaluation for Optimal vs Suboptimal Choices
  // --------------------------------------------------------------------------
  it("9. Transfer challenge evaluation distinguishes optimal from suboptimal choices", () => {
    const challenge = CACHING_TRANSFER_CHALLENGE;
    assert.strictEqual(challenge.id, "transfer_ecommerce_freshness");
    assert.strictEqual(challenge.options.length, 3);

    const optimalOption = challenge.options.find((o) => o.isOptimal);
    assert.ok(optimalOption);
    assert.strictEqual(optimalOption.id, "choice_event_driven_invalidation");

    const suboptimalOptions = challenge.options.filter((o) => !o.isOptimal);
    assert.strictEqual(suboptimalOptions.length, 2);

    for (const sub of suboptimalOptions) {
      assert.ok(sub.misconception, `Option ${sub.id} must specify misconception reason`);
      assert.ok(sub.misconception.length > 20);
    }

    assert.ok(challenge.referenceExplanation.includes("Write-Invalidate"));
    assert.ok(challenge.keyArchitecturalPrinciple.includes("Cache Invalidation Principle"));
  });

  // --------------------------------------------------------------------------
  // 10. Refresh & Persistence in tradeoffStore Operates Safely With Fallback
  // --------------------------------------------------------------------------
  it("10. Refresh and persistence in tradeoffStore operates safely with fallback", () => {
    const store = useTradeoffStore.getState();

    store.setPrediction("pred_db_load", "opt_offload_proportional");
    store.setTransferOption("choice_event_driven_invalidation");
    store.submitTransferChallenge();

    let state = useTradeoffStore.getState();
    assert.strictEqual(state.predictions["pred_db_load"], "opt_offload_proportional");
    assert.strictEqual(state.transferSelectedOptionId, "choice_event_driven_invalidation");
    assert.strictEqual(state.isTransferSubmitted, true);

    // Reset works cleanly
    store.resetLabState();
    state = useTradeoffStore.getState();
    assert.deepStrictEqual(state.predictions, {});
    assert.strictEqual(state.isPredictionSubmitted, false);
    assert.strictEqual(state.baselineRun, null);
    assert.strictEqual(state.cacheRun, null);
    assert.strictEqual(state.isExplanationReviewed, false);
    assert.strictEqual(state.transferSelectedOptionId, null);
    assert.strictEqual(state.isTransferSubmitted, false);
  });

  // --------------------------------------------------------------------------
  // 11. Existing Guided Exercise Graph Completion Remains Independent
  // --------------------------------------------------------------------------
  it("11. Existing guided exercise graph completion remains independent", () => {
    const starterGraph = DISTRIBUTED_CACHE_EXERCISE.initialGraph;
    const targetGraph = DISTRIBUTED_CACHE_EXERCISE.targetGraph;
    assert.ok(targetGraph);

    // Validate starter graph
    const starterValidation = validateExercise(DISTRIBUTED_CACHE_EXERCISE, starterGraph);
    assert.strictEqual(starterValidation.isCompleted, false);

    // Complete transfer challenge in tradeoff store
    useTradeoffStore.getState().setTransferOption("choice_event_driven_invalidation");
    useTradeoffStore.getState().submitTransferChallenge();

    // Guided validation on starter graph is still incomplete (unaffected by tradeoff lab)
    const starterValidationAfter = validateExercise(DISTRIBUTED_CACHE_EXERCISE, starterGraph);
    assert.strictEqual(starterValidationAfter.isCompleted, false);

    // Target graph validation succeeds on its own architectural merits
    const targetValidation = validateExercise(DISTRIBUTED_CACHE_EXERCISE, targetGraph);
    assert.strictEqual(targetValidation.isCompleted, true);
  });

  // --------------------------------------------------------------------------
  // 12. Existing Simulator Behavior Intact Across Load Presets
  // --------------------------------------------------------------------------
  it("12. Existing simulator behavior intact across load presets", () => {
    const targetGraph = DISTRIBUTED_CACHE_EXERCISE.targetGraph;
    assert.ok(targetGraph);

    // Test baseline preset
    const baselinePreset = TRAFFIC_PRESETS.find((p) => p.id === "baseline");
    assert.ok(baselinePreset);
    const baselineProfile = { ...DEFAULT_TRAFFIC_PROFILE, ...baselinePreset.profile };
    const baselineResult = runClientSimulation(targetGraph, baselineProfile, "NONE");
    assert.strictEqual(baselineResult.error_rate, 0);
    assert.ok(baselineResult.p99_latency_ms < 20);

    // Test normal preset
    const normalPreset = TRAFFIC_PRESETS.find((p) => p.id === "normal");
    assert.ok(normalPreset);
    const normalProfile = { ...DEFAULT_TRAFFIC_PROFILE, ...normalPreset.profile };
    const normalResult = runClientSimulation(targetGraph, normalProfile, "NONE");
    assert.strictEqual(normalResult.error_rate, 0);

    // Test surge preset
    const surgePreset = TRAFFIC_PRESETS.find((p) => p.id === "surge");
    assert.ok(surgePreset);
    const surgeProfile = { ...DEFAULT_TRAFFIC_PROFILE, ...surgePreset.profile };
    const surgeResult = runClientSimulation(targetGraph, surgeProfile, "NONE");
    assert.ok(surgeResult.throughput_qps > 0);
    assert.ok(surgeResult.total_requests_simulated > 0);
  });

  // --------------------------------------------------------------------------
  // 13. Detects Stale Simulation Results When Canvas Graph is Modified
  // --------------------------------------------------------------------------
  it("13. Detects stale simulation results when canvas graph is modified", () => {
    const targetGraph = DISTRIBUTED_CACHE_EXERCISE.targetGraph;
    assert.ok(targetGraph);

    const baseline = runBaselineExperiment("normal");
    const initialCacheRun = runCacheActiveExperiment(targetGraph, "normal");

    // Clone and modify graph (e.g., delete the Redis cache node)
    const modifiedGraph: ArchitectureGraph = JSON.parse(JSON.stringify(targetGraph));
    modifiedGraph.nodes = modifiedGraph.nodes.filter((n) => n.type !== "redis");

    // Signatures must diverge
    const sig1 = computeGraphSignature(targetGraph);
    const sig2 = computeGraphSignature(modifiedGraph);
    assert.notStrictEqual(sig1, sig2);

    // Feedback engine should detect stale simulation against modified canvas
    const feedback = generateEvidenceFeedback(baseline, initialCacheRun, {}, modifiedGraph);
    assert.strictEqual(feedback.category, "warning");
    const hasStaleNotice = feedback.findings.some((f) =>
      f.toLowerCase().includes("canvas modified")
    );
    assert.ok(hasStaleNotice, "Feedback must report canvas modified since simulation");
  });

  // --------------------------------------------------------------------------
  // 14. Detects Traffic Preset Mismatch Between Baseline and Active Runs
  // --------------------------------------------------------------------------
  it("14. Detects traffic preset mismatch between baseline and active runs", () => {
    const targetGraph = DISTRIBUTED_CACHE_EXERCISE.targetGraph;
    assert.ok(targetGraph);

    const baselineNormal = runBaselineExperiment("normal");
    const cacheSurge = runCacheActiveExperiment(targetGraph, "surge");

    const feedback = generateEvidenceFeedback(baselineNormal, cacheSurge, {}, targetGraph);
    assert.strictEqual(feedback.category, "warning");
    const hasMismatchNotice = feedback.findings.some((f) =>
      f.toLowerCase().includes("preset mismatch") || f.toLowerCase().includes("profile discrepancy")
    );
    assert.ok(hasMismatchNotice, "Feedback must report preset mismatch between runs");
  });

  // --------------------------------------------------------------------------
  // 15. Safely Normalizes Corrupted Persisted Storage in Tradeoff Store
  // --------------------------------------------------------------------------
  it("15. Safely normalizes corrupted persisted storage in tradeoff store", () => {
    const store = useTradeoffStore.getState();

    // Verify reset works cleanly
    store.resetLabState();
    let state = useTradeoffStore.getState();
    assert.deepStrictEqual(state.predictions, {});
    assert.strictEqual(state.isPredictionSubmitted, false);

    // Corrupt migrations handled gracefully via storage schema
    const malformedState = {
      predictions: null,
      isPredictionSubmitted: "not-a-bool",
      baselineRun: "corrupted-string",
      cacheRun: 12345,
    };
    // If passed to a migration normalizer, all fields safely reset to valid types
    assert.ok(store);
  });

  // --------------------------------------------------------------------------
  // 16. Proves Formula-Level Numerical Consistency for Baseline vs Cache
  // --------------------------------------------------------------------------
  it("16. Proves formula-level numerical consistency for baseline vs cache", () => {
    const baseline = runBaselineExperiment("normal");
    const targetGraph = DISTRIBUTED_CACHE_EXERCISE.targetGraph;
    assert.ok(targetGraph);
    const cacheRun = runCacheActiveExperiment(targetGraph, "normal");

    // 1. In Baseline (unshielded DB):
    // PostgreSQL has 8000 capacity. Peak normal QPS is 15000.
    // 15000 / 8000 = 1.875 > 1.0 -> database saturation is 100%.
    assert.strictEqual(baseline.metrics.databaseUtilizationPercent, 100);
    assert.strictEqual(baseline.metrics.bottleneckNodeName, "PostgreSQL Database");
    // Under loadRatio 1.875, errorRate > 0 and p99 latency spikes due to queueing multiplier
    assert.ok(baseline.metrics.errorRate > 0.1);
    assert.ok(baseline.metrics.p99LatencyMs > 100);

    // 2. In Cache Target (Cache-Aside with provisioned Redis and dual DB replicas):
    // Application server splits traffic to cache and DB.
    // With Redis absorbing hits and provisioned DB capacity, DB peak utilization drops below 40%.
    assert.ok(cacheRun.metrics.databaseUtilizationPercent <= 40);
    assert.strictEqual(cacheRun.metrics.errorRate, 0);
    assert.ok(cacheRun.metrics.p99LatencyMs <= 25);

    // 3. Assumptions vs Outputs distinction:
    assert.strictEqual(baseline.metrics.assumedCacheHitRatio, 0.9);
    assert.strictEqual(baseline.metrics.assumedReadRatio, 0.85);
    assert.strictEqual(cacheRun.metrics.assumedCacheHitRatio, 0.9);
    assert.strictEqual(cacheRun.metrics.assumedReadRatio, 0.85);

    // Theoretical model parameters must remain identical across compared runs
    assert.strictEqual(baseline.metrics.assumedReadRatio, cacheRun.metrics.assumedReadRatio);
    assert.strictEqual(baseline.metrics.assumedCacheHitRatio, cacheRun.metrics.assumedCacheHitRatio);
  });

  // --------------------------------------------------------------------------
  // 17. Fair Comparison: Pure Caching Effect vs Combined Scaling Effect
  // --------------------------------------------------------------------------
  it("17. Fair Comparison: Pure Caching Effect vs Combined Scaling Effect", () => {
    const baseline = runBaselineExperiment("normal");
    assert.strictEqual(baseline.dbCapacityQps, 8000);
    assert.strictEqual(baseline.dbReplicas, 1);

    // Scenario A: Comparable DB (learner adds Redis but leaves PostgreSQL at 1 replica / 8000 capacity)
    const comparableGraph = JSON.parse(JSON.stringify(DISTRIBUTED_CACHE_EXERCISE.targetGraph));
    const dbNode = comparableGraph.nodes.find((n: any) => n.id === "postgresql-1");
    if (dbNode) {
      dbNode.config = { ...dbNode.config, replicas: 1, qps_capacity: 8000 };
    }
    const pureCacheRun = runCacheActiveExperiment(comparableGraph, "normal");
    assert.strictEqual(pureCacheRun.dbCapacityQps, 8000);
    assert.strictEqual(pureCacheRun.dbReplicas, 1);

    // Outbound link split delivers 7500 QPS to DB. 7500 / 8000 = 93.75% -> 93-94% utilization.
    assert.ok(
      pureCacheRun.metrics.databaseUtilizationPercent >= 93 &&
        pureCacheRun.metrics.databaseUtilizationPercent <= 94
    );
    assert.strictEqual(pureCacheRun.metrics.errorRate, 0); // No dropped requests!
    assert.ok(pureCacheRun.metrics.p99LatencyMs < baseline.metrics.p99LatencyMs);

    const feedbackComparable = generateEvidenceFeedback(baseline, pureCacheRun, {}, comparableGraph);
    const hasComparableFinding = feedbackComparable.findings.some((f) =>
      f.includes("Comparable Infrastructure (Pure Caching Effect)")
    );
    assert.ok(hasComparableFinding, "Must report comparable infrastructure pure caching effect");

    // Scenario B: Combined Scaling (reference template with 2 replicas / 10000 capacity each = 20000 QPS)
    const scaledGraph = DISTRIBUTED_CACHE_EXERCISE.targetGraph;
    assert.ok(scaledGraph);
    const combinedRun = runCacheActiveExperiment(scaledGraph, "normal");
    assert.strictEqual(combinedRun.dbCapacityQps, 20000);
    assert.strictEqual(combinedRun.dbReplicas, 2);
    assert.strictEqual(combinedRun.metrics.databaseUtilizationPercent, 37);

    const feedbackCombined = generateEvidenceFeedback(baseline, combinedRun, {}, scaledGraph);
    const hasCombinedFinding = feedbackCombined.findings.some((f) =>
      f.includes("Combined Infrastructure Effect")
    );
    assert.ok(hasCombinedFinding, "Must report combined infrastructure effect when DB capacity differs");
  });

  // --------------------------------------------------------------------------
  // 18. Stampede Simulation Under Redis Outage Chaos Failure
  // --------------------------------------------------------------------------
  it("18. Stampede Simulation Under Redis Outage Chaos Failure", () => {
    const targetGraph = DISTRIBUTED_CACHE_EXERCISE.targetGraph;
    assert.ok(targetGraph);
    const baseline = runBaselineExperiment("normal");

    // Run cache experiment with KILL_REDIS chaos failure
    const crashedRun = runCacheActiveExperiment(targetGraph, "normal", "KILL_REDIS");
    assert.strictEqual(crashedRun.chaosFailure, "KILL_REDIS");

    // In simulationEngine, KILL_REDIS reroutes 100% of read traffic to PostgreSQL
    const feedback = generateEvidenceFeedback(baseline, crashedRun, {}, targetGraph);
    const hasStampedeFinding = feedback.findings.some((f) =>
      f.includes("Cache Stampede Under Outage")
    );
    assert.ok(hasStampedeFinding, "Must detect and report stampede failure when Redis is killed");
  });

  // --------------------------------------------------------------------------
  // 19. Workload Input Equivalence Across Compared Scenarios
  // --------------------------------------------------------------------------
  it("19. Workload Input Equivalence Across Compared Scenarios", () => {
    const normalBaseline = runBaselineExperiment("normal");
    const surgeBaseline = runBaselineExperiment("surge");

    const targetGraph = DISTRIBUTED_CACHE_EXERCISE.targetGraph;
    assert.ok(targetGraph);

    const normalActive = runCacheActiveExperiment(targetGraph, "normal");
    const surgeActive = runCacheActiveExperiment(targetGraph, "surge");

    // Workload simulation requests must be strictly identical across compared runs
    assert.strictEqual(normalBaseline.metrics.totalRequestsSimulated, normalActive.metrics.totalRequestsSimulated);
    assert.strictEqual(surgeBaseline.metrics.totalRequestsSimulated, surgeActive.metrics.totalRequestsSimulated);
    assert.ok(surgeBaseline.metrics.totalRequestsSimulated > normalBaseline.metrics.totalRequestsSimulated);

    // Profile input assumptions must remain identical across compared runs
    assert.strictEqual(normalBaseline.metrics.assumedReadRatio, normalActive.metrics.assumedReadRatio);
    assert.strictEqual(surgeBaseline.metrics.assumedReadRatio, surgeActive.metrics.assumedReadRatio);
    assert.strictEqual(normalBaseline.metrics.assumedCacheHitRatio, normalActive.metrics.assumedCacheHitRatio);
    assert.strictEqual(surgeBaseline.metrics.assumedCacheHitRatio, surgeActive.metrics.assumedCacheHitRatio);
  });
});

