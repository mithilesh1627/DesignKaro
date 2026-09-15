import {
  ArchitectureGraph,
  ArchitectureEvaluationReport,
  ArchitectureVersionDiff,
  NodeDiffItem,
  EdgeDiffItem,
  StrongDecision,
  WeakDecision,
} from "@/types/simulator";

// ============================================================================
// PHASE 8: COMPREHENSIVE ARCHITECTURE EVALUATION ENGINE
// ============================================================================

export function evaluateArchitectureComprehensive(
  graph: ArchitectureGraph
): ArchitectureEvaluationReport {
  const { nodes, edges } = graph;

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

  const cdnNodes = nodes.filter((n) => n.type === "cdn");
  const lbNodes = nodes.filter((n) =>
    ["gateway", "api_gateway", "load_balancer"].includes(n.type)
  );
  const computeNodes = nodes.filter((n) =>
    ["service", "server", "microservice", "worker"].includes(n.type)
  );
  const cacheNodes = nodes.filter((n) => ["cache", "redis", "memcached"].includes(n.type));
  const dbNodes = nodes.filter((n) =>
    ["relational_db", "postgresql", "mysql", "mongodb", "cassandra"].includes(n.type)
  );
  const queueNodes = nodes.filter((n) => ["queue", "kafka", "rabbitmq"].includes(n.type));

  const strongDecisions: StrongDecision[] = [];
  const weakDecisions: WeakDecision[] = [];

  let scalabilityScore = 40;
  let reliabilityScore = 40;
  let performanceScore = 40;
  let costScore = 80;

  // 1. Edge & Caching Assessment
  if (cdnNodes.length > 0) {
    strongDecisions.push({
      title: "Distributed Edge CDN Layer",
      description: "Static assets and video streaming chunks are cached and served from global edge Points of Presence (PoPs).",
      impact: "+80% reduction in origin server network bandwidth and sub-50ms TTFB for static media.",
    });
    scalabilityScore += 15;
    performanceScore += 20;
  } else {
    weakDecisions.push({
      title: "Missing CDN Edge Tier",
      risk: "All media and video traffic directly bombards application gateways, risking origin network interface saturation.",
      remediation: "Deploy a Cloudflare or CloudFront CDN in front of ingress load balancers.",
      severity: "warning",
    });
    performanceScore -= 10;
  }

  // 2. Load Balancing & Gateway Ingress
  if (lbNodes.length > 0) {
    const totalLbReplicas = lbNodes.reduce((acc, n) => acc + (n.config.replicas || 1), 0);
    if (totalLbReplicas >= 2) {
      strongDecisions.push({
        title: "High-Availability Reverse Proxy / Load Balancer",
        description: `Traffic ingress is distributed across ${totalLbReplicas} redundant load balancing instances.`,
        impact: "Zero single point of failure at the network ingress boundary with automated health checks.",
      });
      reliabilityScore += 15;
      scalabilityScore += 10;
    } else {
      weakDecisions.push({
        title: "Load Balancer Single Point of Failure (SPOF)",
        risk: "Only 1 load balancer replica configured. An ingress instance failure drops all inbound client traffic.",
        remediation: "Scale load balancer instances to at least 2 across multiple Availability Zones.",
        severity: "critical",
      });
      reliabilityScore -= 15;
    }
  } else {
    weakDecisions.push({
      title: "Direct Client-to-Service Ingress",
      risk: "Clients connect directly to compute instances without an L7 reverse proxy or rate limiter.",
      remediation: "Add an API Gateway or Load Balancer to manage SSL termination, authentication, and traffic routing.",
      severity: "critical",
    });
    reliabilityScore -= 20;
    scalabilityScore -= 15;
  }

  // 3. Compute Tier Horizontal Scaling
  if (computeNodes.length > 0) {
    const minComputeReplicas = Math.min(...computeNodes.map((n) => n.config.replicas || 1));
    const totalComputeReplicas = computeNodes.reduce((acc, n) => acc + (n.config.replicas || 1), 0);

    if (minComputeReplicas >= 3) {
      strongDecisions.push({
        title: "Stateless Elastic Compute Cluster",
        description: `Application tier runs ${totalComputeReplicas} instances across microservices, enabling horizontal autoscaling.`,
        impact: "Absorbs flash traffic spikes without CPU saturation and supports zero-downtime rolling deploys.",
      });
      scalabilityScore += 15;
      reliabilityScore += 10;
    } else if (minComputeReplicas === 1) {
      weakDecisions.push({
        title: "Compute Service Instance SPOF",
        risk: "One or more compute services run with a single replica (replicas = 1). Process crash will cause downtime.",
        remediation: "Scale compute service replicas to at least 2 or 3.",
        severity: "critical",
      });
      reliabilityScore -= 10;
    }
  }

  // 4. In-Memory Caching (Redis/Memcached)
  if (cacheNodes.length > 0) {
    strongDecisions.push({
      title: "In-Memory Read Caching (Redis)",
      description: "Fast in-memory cache shields relational database from high-frequency read queries.",
      impact: "Absorbs 85%+ of read traffic, lowering database IOPS and sub-5ms metadata query latency.",
    });
    scalabilityScore += 15;
    performanceScore += 20;
  } else if (dbNodes.length > 0) {
    weakDecisions.push({
      title: "Database Without Read Cache",
      risk: "Every client read query executes directly against relational storage, leading to thread pool saturation under peak load.",
      remediation: "Place a Redis or Memcached cache tier between compute services and database.",
      severity: "critical",
    });
    scalabilityScore -= 15;
    performanceScore -= 15;
  }

  // 5. Database HA & Replication
  if (dbNodes.length > 0) {
    const hasDbReplicas = dbNodes.some((n) => (n.config.replicas || 1) >= 2);
    if (hasDbReplicas) {
      strongDecisions.push({
        title: "Multi-Replica Database Resilience",
        description: "Database is configured with replicas for read scalability and automated failover.",
        impact: "Ensures primary-replica data availability with failover standby protection.",
      });
      reliabilityScore += 15;
      scalabilityScore += 10;
    } else {
      weakDecisions.push({
        title: "Single-Master Database Without Replicas",
        risk: "Database has only 1 replica (replicas = 1). Hardware failure or crash causes catastrophic service outage.",
        remediation: "Configure database with at least 2 replicas (Primary + Standby/Read Replica).",
        severity: "critical",
      });
      reliabilityScore -= 20;
    }
  }

  // 6. Asynchronous Messaging & Queues
  if (queueNodes.length > 0) {
    strongDecisions.push({
      title: "Asynchronous Message Queue Decoupling (Kafka)",
      description: "Heavy ingestion and background transcoding workloads are decoupled from the user-facing request loop.",
      impact: "Guarantees zero-data-loss burst absorption and insulates synchronous APIs from backend processing latency.",
    });
    scalabilityScore += 15;
    reliabilityScore += 10;
  }

  // Clamp category scores 0-100
  const clamp = (val: number) => Math.min(100, Math.max(10, val));
  scalabilityScore = clamp(scalabilityScore);
  reliabilityScore = clamp(reliabilityScore);
  performanceScore = clamp(performanceScore);
  costScore = clamp(costScore);

  // Overall Weighted Score
  const overallScore = Math.round(
    scalabilityScore * 0.3 +
      reliabilityScore * 0.3 +
      performanceScore * 0.25 +
      costScore * 0.15
  );

  // AI Verdict Calibration
  let decision: "Strong Hire" | "Hire" | "Leaning Hire" | "Needs Improvement";
  let level: "Principal / Staff Architect (L6+)" | "Senior Architect (L5)" | "Software Engineer (L4)";
  let summary = "";

  if (overallScore >= 85) {
    decision = "Strong Hire";
    level = "Principal / Staff Architect (L6+)";
    summary =
      "Exceptional architectural design demonstrating mastery of hyper-scale distributed systems. The multi-tiered topology correctly separates synchronous read paths from asynchronous processing, incorporates robust caching, and eliminates single points of failure.";
  } else if (overallScore >= 70) {
    decision = "Hire";
    level = "Senior Architect (L5)";
    summary =
      "Solid, well-structured architecture meeting core capacity and reliability requirements. Minor resilience optimizations (such as replica redundancy or circuit breaking) are recommended before production go-live.";
  } else if (overallScore >= 55) {
    decision = "Leaning Hire";
    level = "Software Engineer (L4)";
    summary =
      "Functional baseline architecture with acceptable component connectivity, but leaves critical scalability and fault-tolerance vulnerabilities exposed under peak traffic or hardware outages.";
  } else {
    decision = "Needs Improvement";
    level = "Software Engineer (L4)";
    summary =
      "Architecture possesses critical single points of failure (SPOFs) or lacks essential caching and queueing tiers necessary to withstand production loads.";
  }

  return {
    overall_score: overallScore,
    scalability_score: scalabilityScore,
    reliability_score: reliabilityScore,
    performance_score: performanceScore,
    cost_score: costScore,
    strong_decisions: strongDecisions,
    weak_decisions: weakDecisions,
    ai_verdict: {
      decision,
      level,
      summary,
      key_strengths: strongDecisions.map((d) => d.title),
      critical_risks: weakDecisions.filter((d) => d.severity === "critical").map((d) => d.title),
      production_roadmap: [
        "Enable distributed tracing (OpenTelemetry) with correlation IDs across all microservices.",
        "Configure automated chaos failure drills in staging to verify failover SLAs.",
        "Deploy client-side circuit breakers with graceful degradation fallbacks.",
        "Set up auto-scaling triggers on CPU utilization (>70%) and queue consumer lag.",
      ],
    },
  };
}

// ============================================================================
// VERSION DIFF ENGINE
// ============================================================================

export function computeGraphDiff(
  v1Graph: ArchitectureGraph,
  v2Graph: ArchitectureGraph
): ArchitectureVersionDiff {
  const v1Nodes = new Map(v1Graph.nodes.map((n) => [n.id, n]));
  const v2Nodes = new Map(v2Graph.nodes.map((n) => [n.id, n]));

  const nodeDiffs: NodeDiffItem[] = [];

  // Added nodes
  v2Graph.nodes.forEach((n2) => {
    if (!v1Nodes.has(n2.id)) {
      nodeDiffs.push({
        id: n2.id,
        name: n2.name,
        type: n2.type,
        changeType: "ADDED",
      });
    }
  });

  // Removed nodes
  v1Graph.nodes.forEach((n1) => {
    if (!v2Nodes.has(n1.id)) {
      nodeDiffs.push({
        id: n1.id,
        name: n1.name,
        type: n1.type,
        changeType: "REMOVED",
      });
    }
  });

  // Modified nodes
  v2Graph.nodes.forEach((n2) => {
    const n1 = v1Nodes.get(n2.id);
    if (n1) {
      const deltas: Record<string, { old: any; new: any }> = {};
      const c1 = n1.config;
      const c2 = n2.config;

      if (c1.replicas !== c2.replicas) {
        deltas["replicas"] = { old: c1.replicas, new: c2.replicas };
      }
      if (c1.qps_capacity !== c2.qps_capacity) {
        deltas["qps_capacity"] = { old: c1.qps_capacity, new: c2.qps_capacity };
      }
      if (c1.latency_ms !== c2.latency_ms) {
        deltas["latency_ms"] = { old: c1.latency_ms, new: c2.latency_ms };
      }

      if (Object.keys(deltas).length > 0) {
        nodeDiffs.push({
          id: n2.id,
          name: n2.name,
          type: n2.type,
          changeType: "MODIFIED",
          deltas,
        });
      }
    }
  });

  // Edge diffs
  const v1Edges = new Set(v1Graph.edges.map((e) => `${e.source}->${e.target}`));
  const v2Edges = new Set(v2Graph.edges.map((e) => `${e.source}->${e.target}`));

  const edgeDiffs: EdgeDiffItem[] = [];

  v2Graph.edges.forEach((e2) => {
    const key = `${e2.source}->${e2.target}`;
    if (!v1Edges.has(key)) {
      edgeDiffs.push({
        id: e2.id,
        source: e2.source,
        target: e2.target,
        changeType: "ADDED",
      });
    }
  });

  v1Graph.edges.forEach((e1) => {
    const key = `${e1.source}->${e1.target}`;
    if (!v2Edges.has(key)) {
      edgeDiffs.push({
        id: e1.id,
        source: e1.source,
        target: e1.target,
        changeType: "REMOVED",
      });
    }
  });

  const summary = `Diff between v${v1Graph.metadata.version} and v${v2Graph.metadata.version}: ${nodeDiffs.length} node changes, ${edgeDiffs.length} connection changes.`;

  return {
    v1: v1Graph.metadata.version,
    v2: v2Graph.metadata.version,
    nodes: nodeDiffs,
    edges: edgeDiffs,
    summary,
  };
}
