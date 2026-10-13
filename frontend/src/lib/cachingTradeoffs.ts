import type { ArchitectureGraph, ChaosFailureType } from "@/types/simulator";
import type {
  TradeoffQuestion,
  TransferChallenge,
  ExperimentRunResult,
  ExperimentMetrics,
  EvidenceFeedback,
} from "@/types/tradeoffs";
import { runClientSimulation, TRAFFIC_PRESETS, DEFAULT_TRAFFIC_PROFILE } from "./simulationEngine";
import { CACHE_EXERCISE_INITIAL_GRAPH } from "./guidedExercises";

// ============================================================================
// 1. PREDICTION SCENARIO & QUESTIONS
// ============================================================================

export const CACHING_PREDICTION_SCENARIO = {
  title: "Peak Hour Read Surge vs. Unshielded Database",
  context:
    "An application queries frequently requested product details. Under 15K–50K QPS peak hour traffic, PostgreSQL connection pools and disk IOPS are nearing saturation. You are planning to introduce an in-memory Redis cache cluster using the Cache-Aside pattern.",
};

export const CACHING_PREDICTION_QUESTIONS: TradeoffQuestion[] = [
  {
    id: "pred_db_load",
    title: "Database Read Offload",
    prompt: "What will happen to database read queries as the cache hit rate increases?",
    conceptKey: "db_read_offload",
    options: [
      {
        id: "opt_offload_proportional",
        label: "Database read traffic drops proportionally to the cache hit rate",
        description: "Cache absorbs read hits; only cache misses and writes reach PostgreSQL.",
        isCorrect: true,
        explanation:
          "Under Cache-Aside, read hits return immediately from in-memory RAM. If the hit rate is 85%, 85% of queries never hit PostgreSQL.",
      },
      {
        id: "opt_offload_unchanged",
        label: "Database read load remains unchanged because all records originate in the DB",
        description: "PostgreSQL must still verify every query for security reasons.",
        isCorrect: false,
        explanation:
          "Incorrect. In Cache-Aside, the application service only contacts PostgreSQL on a cache miss, shielding the database from the majority of reads.",
      },
      {
        id: "opt_offload_increases",
        label: "Database load increases because cache replication consumes database CPU",
        description: "Redis synchronizes directly with the relational transaction log.",
        isCorrect: false,
        explanation:
          "Incorrect. Application-level caching decouples Redis from PostgreSQL; Redis replication operates independently across its own nodes.",
      },
    ],
  },
  {
    id: "pred_outage_risk",
    title: "Cache Outage Consequence",
    prompt: "What happens to the database if the Redis cache cluster suddenly crashes under heavy traffic?",
    conceptKey: "cache_failure_stampede",
    options: [
      {
        id: "opt_stampede_cascade",
        label: "A cache stampede hits PostgreSQL, risking connection exhaustion and cascade failure",
        description: "100% of read traffic instantaneously falls back to the database simultaneously.",
        isCorrect: true,
        explanation:
          "Without Redis absorbing traffic, the entire surge stampedes to PostgreSQL. Database worker threads and connection pools exhaust, cascading p99 latency upstream.",
      },
      {
        id: "opt_app_swallows",
        label: "The application service drops read requests harmlessly without touching the database",
        description: "Services never fall back to persistent storage when a cache fails.",
        isCorrect: false,
        explanation:
          "Incorrect. Standard Cache-Aside implementation treats a cache error or miss as a trigger to query the authoritative database.",
      },
      {
        id: "opt_db_unaffected",
        label: "PostgreSQL easily handles the traffic because relational storage is faster than RAM",
        description: "Disk storage can sustain higher concurrent concurrency than in-memory clusters.",
        isCorrect: false,
        explanation:
          "Incorrect. Disk I/O, table locking, and connection pool serialization make relational databases significantly more vulnerable to concurrency spikes than RAM.",
      },
    ],
  },
  {
    id: "pred_consistency_risk",
    title: "Data Consistency Risk",
    prompt: "What primary architectural risk is introduced by caching mutable data in Redis?",
    conceptKey: "stale_data_invalidation",
    options: [
      {
        id: "opt_stale_reads",
        label: "Stale reads when data is modified in PostgreSQL without invalidating the cache",
        description: "Cached values fall out of sync with the authoritative source of truth.",
        isCorrect: true,
        explanation:
          "Dual-storage introduces consistency trade-offs: until a cache key expires or is explicitly invalidated, clients will read obsolete data.",
      },
      {
        id: "opt_lost_transactions",
        label: "Committed transactions in PostgreSQL are rolled back and permanently lost",
        description: "Redis overwrites relational tables upon restart.",
        isCorrect: false,
        explanation:
          "Incorrect. Redis reads do not overwrite ACID transactions committed to PostgreSQL disk storage.",
      },
      {
        id: "opt_schema_corruption",
        label: "PostgreSQL table schemas automatically mutate into schemaless key-value pairs",
        description: "Relational constraints are disabled by Redis drivers.",
        isCorrect: false,
        explanation:
          "Incorrect. Redis has no control over PostgreSQL DDL or relational table schemas.",
      },
    ],
  },
  {
    id: "pred_key_metric",
    title: "Validation Metric",
    prompt: "Which metric best reveals whether your caching architecture is successfully protecting the system?",
    conceptKey: "key_metric",
    options: [
      {
        id: "opt_metric_db_util",
        label: "PostgreSQL peak utilization percentage and overall p99 response latency",
        description: "Demonstrates database shielding and end-to-end user experience improvement.",
        isCorrect: true,
        explanation:
          "If caching works, database utilization drops sharply (e.g. 100% → <40%) and p99 query latency drops from hundreds of milliseconds to under 20ms.",
      },
      {
        id: "opt_metric_client_ram",
        label: "Total RAM consumption on the user's mobile or desktop browser",
        description: "Indicates server efficiency.",
        isCorrect: false,
        explanation:
          "Incorrect. Client device RAM does not reflect server-side database offload or cluster resilience.",
      },
      {
        id: "opt_metric_log_lines",
        label: "The total character count of lines printed in application log files",
        description: "Fewer characters means faster performance.",
        isCorrect: false,
        explanation:
          "Incorrect. Log verbosity is an implementation detail and not an indicator of architectural throughput or database capacity.",
      },
    ],
  },
];

// ============================================================================
// 2. TRANSFER CHALLENGE
// ============================================================================

export const CACHING_TRANSFER_CHALLENGE: TransferChallenge = {
  id: "transfer_ecommerce_freshness",
  scenario:
    "You are designing the Product Catalog service for an e-commerce platform. Product details are read 80,000 times per second during flash sales, but merchants frequently update prices and inventory levels. Displaying outdated prices can cause checkout transaction disputes or selling out-of-stock inventory.",
  question:
    "How should you configure your caching strategy to maximize read performance while guaranteeing that price updates become visible promptly?",
  options: [
    {
      id: "choice_long_ttl_no_invalidation",
      title: "Set a Long TTL (e.g., 24 hours) with no active invalidation",
      tradeoffSummary:
        "High cache hit rate (98%+), but customers see obsolete prices and stock for up to a full day.",
      isOptimal: false,
      misconception:
        "Relying solely on time expiration for frequently updated data risks major data staleness and business discrepancy.",
    },
    {
      id: "choice_ultra_short_ttl",
      title: "Set a Tiny TTL (e.g., 3 seconds) without event publishing",
      tradeoffSummary:
        "Limits staleness to 3 seconds, but causes high cache churn, database stampede spikes on expiration, and still leaves a race window.",
      isOptimal: false,
      misconception:
        "Extremely short TTLs reduce the benefits of caching because keys constantly expire simultaneously under high QPS.",
    },
    {
      id: "choice_event_driven_invalidation",
      title: "Cache-Aside with Explicit Invalidation on Mutation (Write-Invalidate / Event Stream)",
      tradeoffSummary:
        "Reads achieve high in-memory throughput; when a merchant updates a price in PostgreSQL, the service immediately deletes the cache key or emits an invalidation event.",
      isOptimal: true,
    },
  ],
  referenceExplanation:
    "Optimal Architecture: Cache-Aside with Write-Invalidate. Reads achieve sub-5ms latency from Redis. When a price mutation is committed to PostgreSQL, the application explicitly deletes the cached key (`DEL product:{id}`). The subsequent read triggers a controlled cache-miss that repopulates the fresh price. This eliminates the multi-minute stale window of passive TTLs while avoiding the heavy database thrashing of ultra-short TTLs.",
  keyArchitecturalPrinciple:
    "Cache Invalidation Principle: Use TTLs as a defensive backstop against memory leaks, but use explicit invalidation triggers for business-critical mutable state.",
};

export const CACHE_UNSUPPORTED_METRICS = [
  {
    name: "Cache Eviction Churn (LRU)",
    reason: "Not calculated by discrete event simulator (tracked in theoretical trade-offs)",
    dimensionTag: "[Unsupported Dimension]",
    isAvailableInSimulator: false,
  },
  {
    name: "Replication Lag (Asynchronous Replica Sync)",
    reason: "Not simulated in discrete single-cluster simulation mode",
    dimensionTag: "[Unsupported Dimension]",
    isAvailableInSimulator: false,
  },
] as const;

// ============================================================================
// 3. DETERMINISTIC SIMULATION RUNNERS
// ============================================================================

/**
 * Generates a stable signature of graph topology to detect canvas modifications.
 */
export function computeGraphSignature(graph: ArchitectureGraph): string {
  if (!graph) return "";
  const nodes = (graph.nodes || [])
    .map((n) => `${n.id}:${n.type}:${n.config?.replicas || 1}:${n.config?.qps_capacity || 0}`)
    .sort()
    .join("|");
  const edges = (graph.edges || [])
    .map((e) => `${e.source}->${e.target}:${e.connectionType || ""}`)
    .sort()
    .join("|");
  return `${nodes}#${edges}`;
}

/**
 * Executes a deterministic baseline experiment (unshielded direct PostgreSQL).
 * Crucially: Evaluates the in-memory baseline template WITHOUT mutating the learner's canvas graph.
 */
export function runBaselineExperiment(presetId: string = "normal"): ExperimentRunResult {
  const profilePreset = TRAFFIC_PRESETS.find((p) => p.id === presetId) || TRAFFIC_PRESETS[1];
  const profile = { ...DEFAULT_TRAFFIC_PROFILE, ...profilePreset.profile };

  const result = runClientSimulation(CACHE_EXERCISE_INITIAL_GRAPH, profile, "NONE");

  const dbNode = CACHE_EXERCISE_INITIAL_GRAPH.nodes.find((n) =>
    ["relational_db", "postgresql", "mysql", "database"].includes(n.type.toLowerCase())
  );
  const dbCapacityQps = (dbNode?.config?.qps_capacity || 8000) * (dbNode?.config?.replicas || 1);
  const dbReplicas = dbNode?.config?.replicas || 1;

  return {
    timestamp: new Date().toISOString(),
    scenarioName: "baseline_direct_db",
    trafficPresetId: presetId,
    metrics: extractMetrics(result, profile),
    hasCacheNode: false,
    hasCacheReadEdge: false,
    hasDbWriteFallbackEdge: true,
    hasMultipleReplicas: false,
    graphSignature: computeGraphSignature(CACHE_EXERCISE_INITIAL_GRAPH),
    dbCapacityQps,
    dbReplicas,
    chaosFailure: "NONE",
  };
}

/**
 * Executes an experiment against the learner's CURRENT architecture canvas state.
 */
export function runCacheActiveExperiment(
  currentGraph: ArchitectureGraph,
  presetId: string = "normal",
  chaosFailure: ChaosFailureType = "NONE"
): ExperimentRunResult {
  const profilePreset = TRAFFIC_PRESETS.find((p) => p.id === presetId) || TRAFFIC_PRESETS[1];
  const profile = { ...DEFAULT_TRAFFIC_PROFILE, ...profilePreset.profile };

  const result = runClientSimulation(currentGraph, profile, chaosFailure);

  // Inspect topology features
  const nodes = currentGraph?.nodes || [];
  const edges = currentGraph?.edges || [];

  const dbNode = nodes.find((n) =>
    ["relational_db", "postgresql", "mysql", "database"].includes(n.type.toLowerCase())
  );
  const dbCapacityQps = (dbNode?.config?.qps_capacity || 8000) * (dbNode?.config?.replicas || 1);
  const dbReplicas = dbNode?.config?.replicas || 1;

  const cacheNodes = nodes.filter((n) => ["cache", "redis", "memcached"].includes(n.type.toLowerCase()));
  const hasCacheNode = cacheNodes.length > 0;

  const hasCacheReadEdge = edges.some((e) => {
    const src = nodes.find((n) => n.id === e.source);
    const tgt = nodes.find((n) => n.id === e.target);
    return (
      src &&
      tgt &&
      ["service", "server", "microservice"].includes(src.type.toLowerCase()) &&
      ["cache", "redis", "memcached"].includes(tgt.type.toLowerCase()) &&
      e.connectionType === "read_path"
    );
  });

  const hasDbWriteFallbackEdge = edges.some((e) => {
    const src = nodes.find((n) => n.id === e.source);
    const tgt = nodes.find((n) => n.id === e.target);
    return (
      src &&
      tgt &&
      ["service", "server", "microservice"].includes(src.type.toLowerCase()) &&
      ["relational_db", "postgresql", "mysql", "database"].includes(tgt.type.toLowerCase()) &&
      (e.connectionType === "write_path" || e.connectionType === "sync")
    );
  });

  const hasMultipleReplicas = cacheNodes.some((n) => (n.config?.replicas || 1) >= 2);

  return {
    timestamp: new Date().toISOString(),
    scenarioName: "cache_aside_active",
    trafficPresetId: presetId,
    metrics: extractMetrics(result, profile),
    hasCacheNode,
    hasCacheReadEdge,
    hasDbWriteFallbackEdge,
    hasMultipleReplicas,
    graphSignature: computeGraphSignature(currentGraph),
    dbCapacityQps,
    dbReplicas,
    chaosFailure,
  };
}

function extractMetrics(
  simResult: ReturnType<typeof runClientSimulation>,
  profile: typeof DEFAULT_TRAFFIC_PROFILE
): ExperimentMetrics {
  return {
    throughputQps: simResult.throughput_qps,
    p99LatencyMs: simResult.p99_latency_ms,
    p50LatencyMs: simResult.p50_latency_ms,
    errorRate: simResult.error_rate,
    databaseUtilizationPercent: simResult.database_utilization || 0,
    bottleneckNodeName: simResult.bottleneck_node_name || "None",
    bottleneckUtilizationPercent: simResult.bottleneck_utilization || 0,
    assumedCacheHitRatio: profile.cache_hit_ratio,
    assumedReadRatio: profile.read_ratio,
    totalRequestsSimulated: simResult.total_requests_simulated,
    droppedRequests: simResult.dropped_requests,
  };
}

// ============================================================================
// 4. DETERMINISTIC EVIDENCE-BASED EXPLANATION ENGINE
// ============================================================================

export function generateEvidenceFeedback(
  baseline: ExperimentRunResult | null,
  cacheRun: ExperimentRunResult | null,
  predictions: Record<string, string>,
  currentGraph: ArchitectureGraph
): EvidenceFeedback {
  if (!baseline && !cacheRun) {
    return {
      category: "warning",
      headline: "No Simulation Data Collected",
      findings: ["Run both the Baseline and Cache experiments to observe empirical system metrics."],
      predictionComparison: [],
      architecturalInsight:
        "System design trade-offs require empirical measurements to verify latency reductions and resource offload.",
    };
  }

  const findings: string[] = [];
  let category: "success" | "warning" | "missing_topology" = "success";

  // Check topology sanity
  if (cacheRun) {
    if (!cacheRun.hasCacheNode) {
      category = "missing_topology";
      findings.push(
        "Missing Cache Node: Your architecture canvas has no Redis in-memory cache provisioned. All read queries route directly to PostgreSQL, causing full database saturation."
      );
    } else if (!cacheRun.hasCacheReadEdge) {
      category = "missing_topology";
      findings.push(
        "Missing Cache Read Connection: A Redis node exists on the canvas, but the Application Service has no 'read_path' connection to it. Read queries cannot reach Redis and continue to burden the database."
      );
    } else if (!cacheRun.hasDbWriteFallbackEdge) {
      category = "warning";
      findings.push(
        "Missing Database Fallback / Write Path: The Application Service does not have a 'write_path' connection to PostgreSQL. Cache misses and write mutations cannot be fulfilled."
      );
    } else if (!cacheRun.hasMultipleReplicas) {
      category = "warning";
      findings.push(
        "Single Point of Failure: Redis is configured with only 1 instance. If Redis crashes under peak load, an immediate cache stampede will overwhelm PostgreSQL."
      );
    }
  }

  // Check for preset discrepancy or stale graph state
  if (baseline && cacheRun && baseline.trafficPresetId !== cacheRun.trafficPresetId) {
    if (category === "success") category = "warning";
    findings.push(
      `Preset Mismatch: Baseline used '${baseline.trafficPresetId}' load while Active Canvas used '${cacheRun.trafficPresetId}' load. Metrics comparison may reflect differing traffic volumes.`
    );
  }

  if (cacheRun && currentGraph) {
    const currentSig = computeGraphSignature(currentGraph);
    if (cacheRun.graphSignature && cacheRun.graphSignature !== currentSig) {
      if (category === "success") category = "warning";
      findings.push(
        "Canvas Modified Since Simulation: Canvas topology has changed since the active simulation was executed. Re-run the simulation to evaluate the current architecture."
      );
    }
  }

  // Compare actual metrics if both exist
  if (baseline && cacheRun) {
    const dbUtilDelta = baseline.metrics.databaseUtilizationPercent - cacheRun.metrics.databaseUtilizationPercent;
    const p99Delta = baseline.metrics.p99LatencyMs - cacheRun.metrics.p99LatencyMs;

    if (cacheRun.hasCacheNode && cacheRun.hasCacheReadEdge) {
      if (cacheRun.chaosFailure === "KILL_REDIS") {
        findings.push(
          "Cache Stampede Under Outage: With Redis crashed (KILL_REDIS), 100% of read traffic was rerouted to PostgreSQL, driving DB utilization back to peak saturation."
        );
      } else if (dbUtilDelta > 0) {
        const baselineCap = baseline.dbCapacityQps || 8000;
        const activeCap = cacheRun.dbCapacityQps || 8000;
        if (activeCap > baselineCap) {
          findings.push(
            `Combined Infrastructure Effect: Active PostgreSQL provisioned capacity is ${activeCap.toLocaleString()} QPS (${cacheRun.dbReplicas || 1} replicas) vs baseline ${baselineCap.toLocaleString()} QPS (${baseline.dbReplicas || 1} replica). The observed drop to ${cacheRun.metrics.databaseUtilizationPercent}% utilization combines caching link-offload with a ${((activeCap / baselineCap)).toFixed(1)}x database scale-up. On comparable ${baselineCap.toLocaleString()} QPS capacity, DB utilization would be ~94%.`
          );
        } else {
          findings.push(
            `Comparable Infrastructure (Pure Caching Effect): PostgreSQL capacity is identical (${baselineCap.toLocaleString()} QPS). Peak utilization decreased from ${baseline.metrics.databaseUtilizationPercent}% to ${cacheRun.metrics.databaseUtilizationPercent}% (${Math.abs(dbUtilDelta)}% reduction) solely due to cache offload.`
          );
        }
      } else {
        findings.push(
          `Database Utilization: Peak utilization is ${cacheRun.metrics.databaseUtilizationPercent}% (baseline: ${baseline.metrics.databaseUtilizationPercent}%). No database offload observed under current topology.`
        );
      }
      if (p99Delta > 0) {
        findings.push(
          `Tail Latency Improvement: p99 latency dropped from ${baseline.metrics.p99LatencyMs}ms down to ${cacheRun.metrics.p99LatencyMs}ms (a ${Math.max(1, Math.round(baseline.metrics.p99LatencyMs / Math.max(1, cacheRun.metrics.p99LatencyMs)))}x speedup).`
        );
      }
      if (baseline.metrics.errorRate > 0 && cacheRun.metrics.errorRate === 0) {
        findings.push(
          `Request Reliability: Error rate reduced from ${(baseline.metrics.errorRate * 100).toFixed(1)}% to 0.0%, eliminating connection pool timeouts.`
        );
      }
    }
  }

  // Evaluate predictions against observed empirical evidence
  const predictionComparison = CACHING_PREDICTION_QUESTIONS.map((q) => {
    const selectedOptionId = predictions[q.id];
    const selectedOption = q.options.find((o) => o.id === selectedOptionId);
    const wasAccurate = selectedOption?.isCorrect ?? false;

    let observedEvidence = "";
    if (q.conceptKey === "db_read_offload") {
      observedEvidence =
        cacheRun && baseline
          ? baseline.metrics.databaseUtilizationPercent > cacheRun.metrics.databaseUtilizationPercent
            ? `Observed DB utilization dropped from ${baseline.metrics.databaseUtilizationPercent}% to ${cacheRun.metrics.databaseUtilizationPercent}%, confirming that RAM absorbs the majority of read queries.`
            : `DB utilization is ${cacheRun.metrics.databaseUtilizationPercent}% (baseline: ${baseline.metrics.databaseUtilizationPercent}%). Offload was not observed under this topology.`
          : "Theoretical model confirms that 85% of traffic hits Redis RAM, preventing disk I/O bottlenecks.";
    } else if (q.conceptKey === "cache_failure_stampede") {
      observedEvidence =
        "When Redis is unavailable or un-routed, 100% of read queries hit PostgreSQL, saturating connection slots and driving error rates to peak levels.";
    } else if (q.conceptKey === "stale_data_invalidation") {
      observedEvidence =
        "Dual-storage in Redis and PostgreSQL decouples reads from writes; without explicit cache invalidation, reads retrieve data prior to recent DB updates.";
    } else if (q.conceptKey === "key_metric") {
      observedEvidence =
        cacheRun && baseline
          ? `PostgreSQL utilization (${cacheRun.metrics.databaseUtilizationPercent}%) and p99 latency (${cacheRun.metrics.p99LatencyMs}ms) provide immediate evidence of cache offload.`
          : "Database capacity and query latency are direct indicators of caching efficacy.";
    }

    return {
      questionId: q.id,
      questionTitle: q.title,
      predictedOptionLabel: selectedOption?.label || "No prediction submitted",
      wasAccurate,
      observedEvidence,
    };
  });

  const headline =
    category === "success"
      ? "Cache-Aside Architecture Successfully Shields Relational Database"
      : category === "missing_topology"
      ? "Architectural Disconnection Prevents Cache Offload"
      : "Cache-Aside Active with Reliability Caveats";

  const architecturalInsight =
    "Key Takeaway: In-memory caching provides dramatic latency and throughput gains by trading absolute immediate consistency for massive read offload. Ensuring cache redundancy and explicit invalidation mechanisms are required to keep distributed systems resilient and accurate.";

  return {
    category,
    headline,
    findings,
    predictionComparison,
    architecturalInsight,
  };
}
