import {
  ArchitectureGraph,
  SimulationTrafficProfile,
  SimulationResult,
  SimulationTick,
  SimulationNodeMetric,
} from "@/types/simulator";
import { mapToBackendGraph } from "./architectureGraph";

export const DEFAULT_TRAFFIC_PROFILE: SimulationTrafficProfile = {
  base_qps: 10000,
  peak_qps: 50000,
  duration_sec: 30,
  step_sec: 2,
  concurrent_users: 100000,
  read_ratio: 0.85,
  payload_kb: 8.0,
  cache_hit_ratio: 0.85,
  network_latency_ms: 15.0,
};

export interface TrafficPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  profile: Partial<SimulationTrafficProfile>;
}

export const TRAFFIC_PRESETS: TrafficPreset[] = [
  {
    id: "normal",
    name: "Standard Traffic",
    badge: "10K RPS",
    description: "Steady baseline traffic, 85% reads, normal network latency.",
    profile: {
      base_qps: 5000,
      peak_qps: 15000,
      concurrent_users: 100000,
      read_ratio: 0.85,
      payload_kb: 5.0,
      cache_hit_ratio: 0.9,
      network_latency_ms: 12.0,
    },
  },
  {
    id: "surge",
    name: "Peak Hour Surge",
    badge: "50K RPS",
    description: "Daily peak surge with 50K peak RPS and elevated cache pressure.",
    profile: {
      base_qps: 15000,
      peak_qps: 50000,
      concurrent_users: 500000,
      read_ratio: 0.9,
      payload_kb: 10.0,
      cache_hit_ratio: 0.85,
      network_latency_ms: 18.0,
    },
  },
  {
    id: "black_friday",
    name: "Black Friday Surge",
    badge: "120K RPS",
    description: "Heavy checkout and purchase storm with 35% write transactions.",
    profile: {
      base_qps: 30000,
      peak_qps: 120000,
      concurrent_users: 1500000,
      read_ratio: 0.65,
      payload_kb: 16.0,
      cache_hit_ratio: 0.8,
      network_latency_ms: 25.0,
    },
  },
  {
    id: "write_heavy",
    name: "Write Storm (IoT/Telemetry)",
    badge: "80K RPS",
    description: "Intense ingest workload with 80% write ratio testing DB & queues.",
    profile: {
      base_qps: 20000,
      peak_qps: 80000,
      concurrent_users: 800000,
      read_ratio: 0.2,
      payload_kb: 4.0,
      cache_hit_ratio: 0.3,
      network_latency_ms: 15.0,
    },
  },
  {
    id: "viral_event",
    name: "Viral Video Outbreak",
    badge: "250K RPS",
    description: "Massive concurrent ingress spike testing CDN edge and caches.",
    profile: {
      base_qps: 50000,
      peak_qps: 250000,
      concurrent_users: 3000000,
      read_ratio: 0.96,
      payload_kb: 25.0,
      cache_hit_ratio: 0.92,
      network_latency_ms: 30.0,
    },
  },
];

/**
 * Deterministic First-Principles Client-Side Simulation Engine (0ms Latency).
 * Executes M/M/c queueing theory and network topology flow across ArchitectureGraph.
 */
export function runClientSimulation(
  graph: ArchitectureGraph,
  profile: SimulationTrafficProfile
): SimulationResult {
  const { nodes, edges } = graph;
  const simId = `sim-client-${Date.now().toString(36)}`;

  if (nodes.length === 0) {
    return {
      simulation_id: simId,
      total_requests_simulated: 0,
      dropped_requests: 0,
      peak_observed_qps: 0,
      overall_p99_latency_ms: 0,
      blast_radius_summary: "Canvas is empty. Place components to begin simulation.",
      incident_rca: null,
      ticks: [],
      recommendations: ["Add ingress clients, load balancers, and compute servers to start."],
      disclaimer: "Estimated Simulation",
      throughput_qps: 0,
      p50_latency_ms: 0,
      p95_latency_ms: 0,
      p99_latency_ms: 0,
      error_rate: 0,
      cpu_utilization: 0,
      memory_utilization: 0,
      database_utilization: 0,
      cache_hit_ratio: 0,
      queue_depth: 0,
      bottleneck_node_id: null,
      bottleneck_node_name: null,
      bottleneck_type: null,
      bottleneck_utilization: 0,
      bottleneck_explanation: "Empty architecture graph.",
      ai_bottleneck_explanation: null,
      bottleneck_remediation: null,
      suggested_action: null,
    };
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adjOut = new Map<string, string[]>();
  const adjIn = new Map<string, string[]>();

  nodes.forEach((n) => {
    adjOut.set(n.id, []);
    adjIn.set(n.id, []);
  });

  edges.forEach((e) => {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      adjOut.get(e.source)!.push(e.target);
      adjIn.get(e.target)!.push(e.source);
    }
  });

  // Identify ingress tier
  const clientNodes = nodes.filter((n) => n.type === "client");
  const gatewayNodes = nodes.filter((n) =>
    ["gateway", "api_gateway", "load_balancer", "cdn"].includes(n.type)
  );
  const rootNodes = nodes.filter((n) => adjIn.get(n.id)!.length === 0);

  let ingressNodes = clientNodes;
  if (ingressNodes.length === 0) ingressNodes = gatewayNodes;
  if (ingressNodes.length === 0) ingressNodes = rootNodes;
  if (ingressNodes.length === 0) ingressNodes = nodes;

  const ticks: SimulationTick[] = [];
  let totalRequests = 0;
  let totalDropped = 0;
  let peakObservedQps = 0;
  const allLatencies: number[] = [];

  const nodePeakUtil: Record<string, number> = {};
  const nodeAvgUtil: Record<string, number> = {};
  const accumulatedQueue: Record<string, number> = {};

  nodes.forEach((n) => {
    nodePeakUtil[n.id] = 0;
    nodeAvgUtil[n.id] = 0;
    accumulatedQueue[n.id] = 0;
  });

  const hasCache = nodes.some((n) => ["cache", "redis", "memcached"].includes(n.type));
  const effectiveCacheHitRatio = hasCache ? profile.cache_hit_ratio : 0;

  for (let sec = 0; sec < profile.duration_sec; sec += profile.step_sec) {
    const progress = sec / Math.max(1, profile.duration_sec);
    const bellCurve = Math.sin(progress * Math.PI);
    const currentQps = Math.round(
      profile.base_qps + (profile.peak_qps - profile.base_qps) * bellCurve
    );
    peakObservedQps = Math.max(peakObservedQps, currentQps);
    totalRequests += currentQps * profile.step_sec;

    // Distribute ingress traffic
    const incomingQps: Record<string, number> = {};
    nodes.forEach((n) => (incomingQps[n.id] = 0));

    const ingressShare = currentQps / Math.max(1, ingressNodes.length);
    ingressNodes.forEach((inNode) => (incomingQps[inNode.id] += ingressShare));

    // Breadth-first graph propagation
    const queue: string[] = ingressNodes.map((n) => n.id);
    const visited = new Set<string>();

    while (queue.length > 0) {
      const uId = queue.shift()!;
      const uNode = nodeMap.get(uId);
      if (!uNode) continue;

      const uQps = incomingQps[uId] || 0;
      const targets = adjOut.get(uId) || [];
      if (targets.length === 0 || uQps <= 0) continue;

      let outQps = uQps;
      if (uNode.type === "cdn") {
        outQps = uQps * (1 - 0.8 * profile.read_ratio);
      } else if (["cache", "redis", "memcached"].includes(uNode.type)) {
        const misses = uQps * profile.read_ratio * (1 - effectiveCacheHitRatio);
        const writes = uQps * (1 - profile.read_ratio);
        outQps = misses + writes;
      } else if (["queue", "kafka", "rabbitmq"].includes(uNode.type)) {
        const workerCapacity = targets.reduce((sum, tid) => {
          const targetNode = nodeMap.get(tid);
          return (
            sum +
            (targetNode?.config.qps_capacity || 5000) * (targetNode?.config.replicas || 1)
          );
        }, 0);
        outQps = Math.min(uQps, Math.max(1000, workerCapacity));
        const excess = Math.max(0, uQps - outQps);
        accumulatedQueue[uId] = Math.min(200000, (accumulatedQueue[uId] || 0) + excess);
      }

      const splitQps = outQps / targets.length;
      for (const tId of targets) {
        incomingQps[tId] = (incomingQps[tId] || 0) + splitQps;
        if (!visited.has(tId)) {
          visited.add(tId);
          queue.push(tId);
        }
      }
    }

    let tickErrors = 0;
    const nodeMetrics: SimulationNodeMetric[] = [];

    nodes.forEach((n) => {
      const replicas = Math.max(1, n.config.replicas || 1);
      const nodeCapacity = Math.max(200, (n.config.qps_capacity || 10000) * replicas);
      const baseLat = Math.max(0.5, n.config.latency_ms || 1) + profile.network_latency_ms * 0.2;
      const assigned = incomingQps[n.id] || 0;

      const loadRatio = assigned / nodeCapacity;
      const utilPercent = Math.min(100, Math.round(loadRatio * 100));

      nodePeakUtil[n.id] = Math.max(nodePeakUtil[n.id], utilPercent);
      nodeAvgUtil[n.id] += utilPercent;

      const cpu = Math.min(99, Math.max(5, loadRatio * 80));
      const mem = Math.min(95, Math.max(15, loadRatio * 65));

      let qDepth = 0;
      if (["queue", "kafka", "rabbitmq"].includes(n.type)) {
        qDepth = accumulatedQueue[n.id] || 0;
      } else {
        qDepth = loadRatio > 0.85 ? Math.round((loadRatio - 0.85) * 8000) : 0;
      }

      let status: "HEALTHY" | "DEGRADED" | "CRASHED" = "HEALTHY";
      let errorRate = 0.0005;
      let latency = baseLat * (1 + loadRatio * 0.4);
      let delivered = assigned;

      if (loadRatio > 1.0) {
        status = "DEGRADED";
        errorRate = Math.min(0.55, (loadRatio - 1.0) * 0.45);
        // Exponential queuing delay near saturation: M/M/c approximation
        latency = baseLat * (1 + Math.pow(loadRatio, 2.4) * 3.5);
        const dropped = Math.round(assigned * errorRate);
        tickErrors += dropped;
        delivered = assigned - dropped;
      }

      allLatencies.push(latency);

      nodeMetrics.push({
        node_id: n.id,
        node_type: n.type,
        cpu_percent: Math.round(cpu),
        memory_percent: Math.round(mem),
        queue_depth: qDepth,
        error_rate: Number(errorRate.toFixed(4)),
        latency_p99_ms: Math.round(latency * 1.5),
        status,
        throughput_qps: Math.round(delivered),
        utilization_percent: utilPercent,
        is_bottleneck: false,
      });
    });

    totalDropped += tickErrors;
    const tickP99 = nodeMetrics.reduce((max, m) => Math.max(max, m.latency_p99_ms), 15);

    const systemStatus = nodeMetrics.some((m) => m.status === "CRASHED")
      ? "CRITICAL_FAILURE"
      : nodeMetrics.some((m) => m.status === "DEGRADED")
      ? "DEGRADED"
      : "HEALTHY";

    ticks.push({
      second: sec,
      qps: currentQps,
      total_errors: tickErrors,
      p99_latency_ms: Math.round(tickP99),
      system_status: systemStatus,
      node_metrics: nodeMetrics,
    });
  }

  // Calculate percentiles
  allLatencies.sort((a, b) => a - b);
  const totalL = allLatencies.length;
  const p50 = totalL > 0 ? allLatencies[Math.floor(totalL * 0.5)] : 10;
  const p95 = totalL > 0 ? allLatencies[Math.min(totalL - 1, Math.floor(totalL * 0.95))] : 45;
  const p99 = totalL > 0 ? allLatencies[Math.min(totalL - 1, Math.floor(totalL * 0.99))] : 120;

  const deliveredRequests = Math.max(0, totalRequests - totalDropped);
  const deliveredThroughput = Math.round(deliveredRequests / Math.max(1, profile.duration_sec));
  const overallErrorRate = Number((totalDropped / Math.max(1, totalRequests)).toFixed(4));

  // Average tier utilizations
  const computeNodes = nodes.filter((n) =>
    ["service", "server", "microservice", "worker"].includes(n.type)
  );
  const dbNodes = nodes.filter((n) =>
    ["relational_db", "postgresql", "mysql", "mongodb", "cassandra"].includes(n.type)
  );
  const queueNodes = nodes.filter((n) => ["queue", "kafka", "rabbitmq"].includes(n.type));

  const avgCpu =
    computeNodes.length > 0
      ? Math.round(
          computeNodes.reduce((sum, n) => sum + (nodePeakUtil[n.id] || 0), 0) / computeNodes.length
        )
      : 30;
  const avgMem = Math.min(96, Math.round(avgCpu * 0.85 + 12));
  const maxDbUtil =
    dbNodes.length > 0 ? Math.max(...dbNodes.map((n) => nodePeakUtil[n.id] || 0)) : 0;
  const maxQueueDepth =
    queueNodes.length > 0 ? Math.max(...queueNodes.map((n) => accumulatedQueue[n.id] || 0)) : 0;

  // Identify Bottleneck Node
  let bottleneckNodeId: string | null = null;
  let bottleneckNodeName: string | null = null;
  let bottleneckType: string | null = null;
  let bottleneckUtil = 0;
  let bottleneckExplanation: string | null = null;
  let aiBottleneckExplanation: string | null = null;
  let bottleneckRemediation: string | null = null;
  let suggestedAction: string | null = null;

  const sortedByUtil = [...nodes].sort(
    (a, b) => (nodePeakUtil[b.id] || 0) - (nodePeakUtil[a.id] || 0)
  );

  if (sortedByUtil.length > 0 && (nodePeakUtil[sortedByUtil[0].id] || 0) >= 65) {
    const bNode = sortedByUtil[0];
    bottleneckNodeId = bNode.id;
    bottleneckNodeName = bNode.name || bNode.id;
    bottleneckUtil = nodePeakUtil[bNode.id] || 0;

    // Mark bottleneck in ticks
    ticks.forEach((t) => {
      t.node_metrics.forEach((nm) => {
        if (nm.node_id === bottleneckNodeId) {
          nm.is_bottleneck = true;
        }
      });
    });

    if (["relational_db", "postgresql", "mysql", "mongodb", "cassandra"].includes(bNode.type)) {
      bottleneckType = "DATABASE";
      bottleneckExplanation = `${bottleneckNodeName} is currently the primary bottleneck (${bottleneckUtil}% capacity saturated). Adding more application servers will not solve this because all application servers still depend on the same database.`;
      aiBottleneckExplanation = `Architectural Bottleneck: ${bottleneckNodeName} is enduring severe read/write contention. At ${profile.peak_qps.toLocaleString()} Peak RPS (${Math.round(profile.read_ratio * 100)}% reads), direct database query execution exhausts disk IOPS and connection pools.`;

      if (!hasCache) {
        bottleneckRemediation = "Introduce a Redis in-memory cache in front of the database to absorb 85%+ of read queries.";
        suggestedAction = "add_component:redis";
      } else {
        bottleneckRemediation = `Scale database replicas from ${bNode.config.replicas || 1} to ${(bNode.config.replicas || 1) + 2} to distribute read queries.`;
        suggestedAction = `scale:${bNode.id}:${(bNode.config.replicas || 1) + 2}`;
      }
    } else if (["service", "server", "microservice"].includes(bNode.type)) {
      bottleneckType = "COMPUTE";
      bottleneckExplanation = `${bottleneckNodeName} is saturated at ${bottleneckUtil}% CPU/thread capacity. Incoming request arrival rate exceeds stateless worker concurrency.`;
      aiBottleneckExplanation = `Compute Bottleneck: ${bottleneckNodeName} is running ${bNode.config.replicas || 1} instance(s). Under peak traffic, thread pool starvation introduces cascading queuing latencies.`;
      bottleneckRemediation = `Scale compute cluster from ${bNode.config.replicas || 1} to ${(bNode.config.replicas || 1) + 2} replicas.`;
      suggestedAction = `scale:${bNode.id}:${(bNode.config.replicas || 1) + 2}`;
    } else if (["gateway", "api_gateway", "load_balancer"].includes(bNode.type)) {
      bottleneckType = "INGRESS";
      bottleneckExplanation = `${bottleneckNodeName} reverse proxy is saturated at ${bottleneckUtil}% capacity. Edge socket limits are bottlenecking inbound requests.`;
      aiBottleneckExplanation = `Edge Bottleneck: Ingress proxy ${bottleneckNodeName} is dropping TCP handshakes. Enable CDN edge caching or scale proxy instances.`;
      bottleneckRemediation = "Place CDN edge caching in front of the gateway to offload static requests.";
      suggestedAction = "add_component:cdn";
    } else {
      bottleneckType = "COMPONENT";
      bottleneckExplanation = `${bottleneckNodeName} is operating near peak threshold (${bottleneckUtil}% capacity).`;
      aiBottleneckExplanation = `Component ${bottleneckNodeName} is approaching operational limits under current traffic curves.`;
      bottleneckRemediation = `Increase capacity or replicas for ${bottleneckNodeName}.`;
      suggestedAction = `scale:${bNode.id}:${(bNode.config.replicas || 1) + 1}`;
    }
  } else {
    bottleneckExplanation = "Architecture is operating comfortably within capacity boundaries under the specified traffic profile.";
    aiBottleneckExplanation = "All tiers demonstrate adequate headroom (>35% buffer). Throughput delivery and tail latencies meet expected SLAs.";
    bottleneckRemediation = "Architecture handles specified traffic without bottlenecks.";
  }

  const recommendations = [
    "Introduce circuit breakers with fast fallback to prevent downstream timeout cascades.",
    "Implement read-through caching to decouple compute load from relational persistence.",
    "Tune upstream timeout budgets (connect: 50ms, read: 250ms) to guard against thread pool exhaustion.",
  ];
  if (bottleneckRemediation && !recommendations.includes(bottleneckRemediation)) {
    recommendations.unshift(bottleneckRemediation);
  }

  return {
    simulation_id: simId,
    total_requests_simulated: totalRequests,
    dropped_requests: totalDropped,
    peak_observed_qps: peakObservedQps,
    overall_p99_latency_ms: Math.round(p99),
    blast_radius_summary:
      totalDropped > 0
        ? `Traffic surge saturated system capacity, dropping ${totalDropped.toLocaleString()} requests across ${Math.round(profile.duration_sec)} seconds.`
        : "Nominal simulation. All requests processed within provisioned tier capacities.",
    incident_rca:
      totalDropped > 0
        ? `Capacity Saturation: Incoming QPS exceeded downstream processing capacity at ${bottleneckNodeName || "primary tier"}.`
        : null,
    ticks,
    recommendations,
    disclaimer: "Estimated Simulation",
    throughput_qps: deliveredThroughput,
    p50_latency_ms: Math.round(p50),
    p95_latency_ms: Math.round(p95),
    p99_latency_ms: Math.round(p99),
    error_rate: overallErrorRate,
    cpu_utilization: avgCpu,
    memory_utilization: avgMem,
    database_utilization: maxDbUtil,
    cache_hit_ratio: effectiveCacheHitRatio * 100,
    queue_depth: maxQueueDepth,
    bottleneck_node_id: bottleneckNodeId,
    bottleneck_node_name: bottleneckNodeName,
    bottleneck_type: bottleneckType,
    bottleneck_utilization: bottleneckUtil,
    bottleneck_explanation: bottleneckExplanation,
    ai_bottleneck_explanation: aiBottleneckExplanation,
    bottleneck_remediation: bottleneckRemediation,
    suggested_action: suggestedAction,
  };
}

/**
 * Execute Simulation via Backend API (Falls back to Client-Side on Network Error)
 */
export async function runBackendSimulation(
  graph: ArchitectureGraph,
  profile: SimulationTrafficProfile,
  failureType: string = "NONE",
  targetNodeId?: string
): Promise<SimulationResult> {
  try {
    const backendGraph = mapToBackendGraph(graph);
    const payload = {
      graph_data: backendGraph,
      traffic: profile,
      failure: {
        failure_type: failureType,
        target_node_id: targetNodeId || null,
        start_second: Math.round(profile.duration_sec * 0.3),
        duration_second: Math.round(profile.duration_sec * 0.3),
      },
    };

    const response = await fetch("http://127.0.0.1:8000/api/v1/simulations/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Simulation API responded with HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.warn("Backend simulation API failed, executing client simulation fallback:", err);
    return runClientSimulation(graph, profile);
  }
}
