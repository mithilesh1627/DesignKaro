import {
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureEdge,
  ArchitectureEvent,
  ArchitectureEventType,
  GraphValidationReport,
  GraphValidationIssue,
  ConnectionType,
  RuleViolation,
  ValidationResponse,
  AIArchitectCritiqueResponse,
  AIArchitectSuggestion,
} from "@/types/simulator";

// ============================================================================
// DETERMINISTIC GRAPH VALIDATION & FIRST-PRINCIPLES RULE ENGINE (0ms LATENCY)
// ============================================================================

export function evaluateArchitectureRules(
  graph: ArchitectureGraph,
  scaleOverrides?: Record<string, any>
): ValidationResponse {
  const { nodes, edges } = graph;

  const nodeMap = new Map<string, ArchitectureNode>(nodes.map((n) => [n.id, n]));
  const adjacencyOut = new Map<string, string[]>();
  const adjacencyIn = new Map<string, string[]>();
  const edgeMap = new Map<string, ArchitectureEdge>();

  nodes.forEach((n) => {
    adjacencyOut.set(n.id, []);
    adjacencyIn.set(n.id, []);
  });

  edges.forEach((e) => {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      adjacencyOut.get(e.source)!.push(e.target);
      adjacencyIn.get(e.target)!.push(e.source);
      edgeMap.set(`${e.source}->${e.target}`, e);
    }
  });

  const violations: RuleViolation[] = [];
  const passedRules: string[] = [];

  // Component category counts
  const categoryCounts: Record<string, number> = {
    networking: 0,
    compute: 0,
    database: 0,
    cache: 0,
    messaging: 0,
    storage: 0,
  };
  const typeCounts: Record<string, number> = {};

  nodes.forEach((n) => {
    if (n.category) categoryCounts[n.category] = (categoryCounts[n.category] || 0) + 1;
    typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
  });

  // Scale & Workload metrics
  const targetRpsNum =
    typeof graph.metadata?.targetRps === "string"
      ? parseInt(graph.metadata.targetRps.replace(/[^0-9]/g, "")) || 10000
      : graph.metadata?.targetRps || 10000;

  const readQps = Number(scaleOverrides?.read_qps ?? targetRpsNum * 0.8);
  const writeQps = Number(scaleOverrides?.write_qps ?? targetRpsNum * 0.2);
  const effectiveTraffic = Math.max(targetRpsNum, readQps + writeQps);

  // --------------------------------------------------------------------------
  // RULE-000: Empty Architecture Canvas
  // --------------------------------------------------------------------------
  if (nodes.length === 0) {
    return {
      health_score: 0,
      status: "CRITICAL_ISSUES",
      violations: [
        {
          rule_id: "RULE-000",
          rule_name: "EMPTY_ARCHITECTURE",
          category: "topology",
          severity: "critical",
          node_ids: [],
          message: "The architecture canvas contains no components.",
          remediation: "Drag Client, API Gateway, Services, and Storage from the component drawer to construct your topology.",
        },
      ],
      passed_rules: [],
      summary: "Canvas is empty. Place initial system components to begin evaluation.",
      component_counts: {},
      estimated_monthly_cost: 0,
      cost_breakdown: {},
    };
  }

  // --------------------------------------------------------------------------
  // 1. TOPOLOGY RULES
  // --------------------------------------------------------------------------

  // RULE-008: Missing Persistent Storage
  const hasStorage =
    categoryCounts.database > 0 ||
    categoryCounts.storage > 0 ||
    Boolean(typeCounts.postgresql || typeCounts.mongodb || typeCounts.cassandra || typeCounts.s3);

  if (!hasStorage && (categoryCounts.compute > 0 || Boolean(typeCounts.service || typeCounts.worker))) {
    violations.push({
      rule_id: "RULE-008",
      rule_name: "MISSING_PERSISTENT_STORAGE",
      category: "topology",
      severity: "critical",
      node_ids: nodes.filter((n) => n.category === "compute").map((n) => n.id),
      message: "Architecture lacks durable storage. Application compute services have nowhere to persist relational or document state.",
      remediation: "Attach a PostgreSQL database, MongoDB cluster, or Object Storage tier.",
    });
  } else {
    passedRules.push("DURABLE_STORAGE_PRESENT");
  }

  // RULE-002: Missing Load Balancer / Gateway on Ingress
  const directClientBypasses: string[] = [];
  nodes.forEach((n) => {
    if (n.type === "client") {
      const targets = adjacencyOut.get(n.id) || [];
      targets.forEach((tgtId) => {
        const tgt = nodeMap.get(tgtId);
        if (tgt && (tgt.category === "compute" || tgt.category === "database" || tgt.category === "cache")) {
          directClientBypasses.push(n.id);
        }
      });
    }
  });

  if (directClientBypasses.length > 0) {
    violations.push({
      rule_id: "RULE-002",
      rule_name: "MISSING_LOAD_BALANCER_OR_GATEWAY",
      category: "topology",
      severity: "critical",
      node_ids: directClientBypasses,
      message: "Clients connect directly to internal backend compute or databases without an Ingress Proxy or Load Balancer.",
      remediation: "Place an API Gateway or L4/L7 Load Balancer at the edge for rate limiting, SSL termination, and routing.",
    });
  } else {
    if (Boolean(typeCounts.client)) passedRules.push("INGRESS_PROPERLY_GATED");
  }

  // RULE-005: Direct Client-to-Database Access (Security Anti-Pattern)
  const directClientDb: string[] = [];
  nodes.forEach((n) => {
    if (n.type === "client") {
      const targets = adjacencyOut.get(n.id) || [];
      targets.forEach((tgtId) => {
        const tgt = nodeMap.get(tgtId);
        if (tgt && tgt.category === "database") {
          directClientDb.push(n.id);
        }
      });
    }
  });

  if (directClientDb.length > 0) {
    violations.push({
      rule_id: "RULE-005",
      rule_name: "DIRECT_CLIENT_DATABASE_ACCESS",
      category: "topology",
      severity: "critical",
      node_ids: directClientDb,
      message: "Client applications directly query the database tier, exposing internal database connection ports and credentials.",
      remediation: "Isolate databases behind application services and API Gateways. Never expose database listeners directly to public clients.",
    });
  } else {
    if (Boolean(typeCounts.client) && hasStorage) passedRules.push("DATABASE_ISOLATED_FROM_CLIENTS");
  }

  // RULE-013: Cache Misplaced or Client Direct Connection
  const clientToCache: string[] = [];
  nodes.forEach((n) => {
    if (n.type === "client") {
      const targets = adjacencyOut.get(n.id) || [];
      targets.forEach((tgtId) => {
        const tgt = nodeMap.get(tgtId);
        if (tgt && tgt.category === "cache") {
          clientToCache.push(n.id);
        }
      });
    }
  });

  if (clientToCache.length > 0) {
    violations.push({
      rule_id: "RULE-013",
      rule_name: "CACHE_MISPLACED_OR_CLIENT_DIRECT",
      category: "topology",
      severity: "critical",
      node_ids: clientToCache,
      message: "Clients connect directly to the in-memory Cache tier. Caches must sit securely between compute services and persistent databases.",
      remediation: "Route requests through API Gateway and Application Services. Query cache using Cache-Aside inside backend handlers.",
    });
  } else {
    if (categoryCounts.cache > 0) passedRules.push("CACHE_PROPERLY_TIERED");
  }

  // RULE-006: Direct Object Storage Exposure (Missing CDN)
  const directStorageHits: string[] = [];
  nodes.forEach((n) => {
    if (n.type === "client") {
      const targets = adjacencyOut.get(n.id) || [];
      targets.forEach((tgtId) => {
        const tgt = nodeMap.get(tgtId);
        if (tgt && (tgt.category === "storage" || tgt.type === "s3")) {
          directStorageHits.push(tgtId);
        }
      });
    }
  });

  if (directStorageHits.length > 0) {
    violations.push({
      rule_id: "RULE-006",
      rule_name: "DIRECT_OBJECT_STORAGE_EXPOSURE",
      category: "topology",
      severity: "warning",
      node_ids: directStorageHits,
      message: "Clients directly fetch media/chunks from origin Object Storage without an edge Content Delivery Network.",
      remediation: "Place a CDN (Cloudflare / CloudFront) in front of Object Storage to cache static assets and prevent egress cost spikes.",
    });
  } else {
    if (categoryCounts.storage > 0) passedRules.push("OBJECT_STORAGE_PROTECTED");
  }

  // RULE-014: High Ingress Workload Missing CDN Edge
  if (effectiveTraffic >= 10000 && Boolean(typeCounts.client) && !typeCounts.cdn) {
    const ingressNodes = nodes.filter((n) => n.type === "api_gateway" || n.type === "load_balancer").map((n) => n.id);
    if (ingressNodes.length > 0) {
      violations.push({
        rule_id: "RULE-014",
        rule_name: "INGRESS_MISSING_CDN_EDGE",
        category: "topology",
        severity: "warning",
        node_ids: ingressNodes,
        message: `Architecture handles high peak traffic (${effectiveTraffic.toLocaleString()} RPS) without an edge CDN to absorb spikes and DDoS attacks.`,
        remediation: "Front API Gateways with a global CDN (Cloudflare / Fastly) for edge caching, WAF, and DDoS mitigation.",
      });
    }
  }

  // RULE-009: Disconnected Orphan Nodes
  const orphanNodes: string[] = [];
  nodes.forEach((n) => {
    const inCount = (adjacencyIn.get(n.id) || []).length;
    const outCount = (adjacencyOut.get(n.id) || []).length;
    if (inCount === 0 && outCount === 0) {
      orphanNodes.push(n.id);
    }
  });

  if (orphanNodes.length > 0) {
    violations.push({
      rule_id: "RULE-009",
      rule_name: "DISCONNECTED_ORPHAN_NODES",
      category: "topology",
      severity: "warning",
      node_ids: orphanNodes,
      message: `${orphanNodes.length} component(s) are completely isolated with no incoming or outgoing network edges.`,
      remediation: "Connect these components to route traffic through them, or delete unused nodes.",
    });
  } else {
    passedRules.push("ALL_COMPONENTS_NETWORKED");
  }

  // RULE-007: Cyclic Dependencies in Synchronous Call Chain
  const visitedColor = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
  const cycleNodes = new Set<string>();

  function dfsCycle(currId: string, stack: string[]) {
    visitedColor.set(currId, 1);
    stack.push(currId);
    const neighbors = adjacencyOut.get(currId) || [];
    for (const nbrId of neighbors) {
      if (nodeMap.has(nbrId)) {
        const color = visitedColor.get(nbrId) || 0;
        if (color === 1) {
          const idx = stack.indexOf(nbrId);
          stack.slice(idx).forEach((id) => cycleNodes.add(id));
        } else if (color === 0) {
          dfsCycle(nbrId, stack);
        }
      }
    }
    stack.pop();
    visitedColor.set(currId, 2);
  }

  nodes.forEach((n) => {
    if ((visitedColor.get(n.id) || 0) === 0) {
      dfsCycle(n.id, []);
    }
  });

  if (cycleNodes.size > 0) {
    violations.push({
      rule_id: "RULE-007",
      rule_name: "CYCLIC_DEPENDENCY_DETECTED",
      category: "topology",
      severity: "critical",
      node_ids: Array.from(cycleNodes),
      message: `Circular dependency loop detected involving: ${Array.from(cycleNodes).join(", ")}. Risks distributed deadlocks and cascade crashes.`,
      remediation: "Break synchronous dependency loops using asynchronous message queues (Kafka / RabbitMQ) or event pub/sub.",
    });
  } else {
    if (nodes.length > 1) passedRules.push("NO_CYCLIC_DEPENDENCIES");
  }

  // --------------------------------------------------------------------------
  // 2. CAPACITY RULES
  // --------------------------------------------------------------------------

  // RULE-003: Missing Cache Tier for High Read Workload
  const hasCache = categoryCounts.cache > 0 || Boolean(typeCounts.redis || typeCounts.memcached);
  if (categoryCounts.database > 0 && categoryCounts.compute >= 2 && !hasCache && readQps >= 5000) {
    violations.push({
      rule_id: "RULE-003",
      rule_name: "MISSING_CACHE_TIER",
      category: "capacity",
      severity: "warning",
      node_ids: nodes.filter((n) => n.category === "database").map((n) => n.id),
      message: `System targets ${readQps.toLocaleString()} read QPS without an In-Memory Caching layer. Database disk IOPS will saturate.`,
      remediation: "Add an In-Memory Cache (Redis / Memcached) with Cache-Aside or Write-Through pattern to offload up to 90% of read traffic.",
    });
  } else {
    if (hasCache) passedRules.push("MEMORY_CACHE_ACCELERATION");
  }

  // RULE-010: Shared Database Fan-in Bottleneck
  const overburdenedDbs: string[] = [];
  nodes.forEach((n) => {
    if (n.category === "database") {
      const incomingServices = (adjacencyIn.get(n.id) || []).filter((srcId) => {
        const src = nodeMap.get(srcId);
        return src && src.category === "compute";
      });
      if (incomingServices.length > 3) {
        overburdenedDbs.push(n.id);
      }
    }
  });

  if (overburdenedDbs.length > 0) {
    violations.push({
      rule_id: "RULE-010",
      rule_name: "DATABASE_BOTTLENECK_TOO_MANY_SERVICES",
      category: "capacity",
      severity: "warning",
      node_ids: overburdenedDbs,
      message: `Database(s) ${overburdenedDbs.join(", ")} are directly shared by >3 separate services, risking connection exhaustion and noisy neighbor lock contention.`,
      remediation: "Apply Database-per-Service pattern, add read replicas, or encapsulate tables behind a dedicated domain microservice API.",
    });
  } else {
    if (categoryCounts.database > 0) passedRules.push("DATABASE_CONNECTION_FANIN_BALANCED");
  }

  // RULE-012: High Burst Traffic Without Queue Buffer
  const hasQueue = categoryCounts.messaging > 0 || Boolean(typeCounts.kafka || typeCounts.rabbitmq);
  if (writeQps >= 10000 && !hasQueue) {
    violations.push({
      rule_id: "RULE-012",
      rule_name: "HIGH_BURST_WITHOUT_ASYNC_BUFFER",
      category: "capacity",
      severity: "warning",
      node_ids: nodes.filter((n) => n.category === "compute").map((n) => n.id),
      message: `High write workload (${writeQps.toLocaleString()} writes/sec) without a message queue. Spikes will overwhelm transactional databases.`,
      remediation: "Introduce an asynchronous queue (Kafka / RabbitMQ / AWS SQS) to buffer bursts and rate-limit ingestion.",
    });
  } else {
    if (hasQueue || writeQps > 0) passedRules.push("BURST_TRAFFIC_PROTECTED");
  }

  // RULE-015: Service Capacity Bottleneck
  const bottleneckedServices: string[] = [];
  if (effectiveTraffic >= 5000) {
    nodes.forEach((n) => {
      if (n.category === "compute" || n.type === "service" || n.type === "server") {
        const totalCapacity = (n.config.replicas || 1) * (n.config.qps_capacity || 5000);
        if (effectiveTraffic > totalCapacity) {
          bottleneckedServices.push(n.id);
        }
      }
    });
  }

  if (bottleneckedServices.length > 0) {
    violations.push({
      rule_id: "RULE-015",
      rule_name: "SERVICE_CAPACITY_BOTTLENECK",
      category: "capacity",
      severity: "critical",
      node_ids: bottleneckedServices,
      message: `Workload traffic (${effectiveTraffic.toLocaleString()} QPS) exceeds total provisioned capacity of service(s): ${bottleneckedServices.join(", ")}.`,
      remediation: "Scale horizontal replicas or increase node container capacity to comfortably absorb peak RPS.",
    });
  } else {
    if (categoryCounts.compute > 0 && effectiveTraffic > 0) passedRules.push("SERVICE_CAPACITY_SUFFICIENT");
  }

  // RULE-016: Database Write Bottleneck
  const bottleneckedDbs: string[] = [];
  if (writeQps > 0) {
    nodes.forEach((n) => {
      if (n.category === "database") {
        const writeLimit = (n.config.replicas || 1) * ((n.config.qps_capacity || 5000) * 0.4);
        if (writeQps > writeLimit) {
          bottleneckedDbs.push(n.id);
        }
      }
    });
  }

  if (bottleneckedDbs.length > 0) {
    violations.push({
      rule_id: "RULE-016",
      rule_name: "DATABASE_WRITE_BOTTLENECK",
      category: "capacity",
      severity: "critical",
      node_ids: bottleneckedDbs,
      message: `Write QPS (${writeQps.toLocaleString()} writes/sec) exceeds disk write IOPS throughput of database(s) ${bottleneckedDbs.join(", ")}.`,
      remediation: "Shard databases horizontally, buffer write bursts through Kafka, or migrate write path to LSM-Tree storage (Cassandra/ScyllaDB).",
    });
  } else {
    if (categoryCounts.database > 0 && writeQps > 0) passedRules.push("DATABASE_WRITE_CAPACITY_HEALTHY");
  }

  // --------------------------------------------------------------------------
  // 3. RESILIENCE RULES
  // --------------------------------------------------------------------------

  // RULE-001: Single Point of Failure (SPOF) on Database
  const spofDatabases = nodes.filter((n) => n.category === "database" && (n.config.replicas || 1) <= 1);
  if (spofDatabases.length > 0) {
    violations.push({
      rule_id: "RULE-001",
      rule_name: "SINGLE_POINT_OF_FAILURE_DATABASE",
      category: "resilience",
      severity: "critical",
      node_ids: spofDatabases.map((n) => n.id),
      message: `Database '${spofDatabases[0].name}' runs on a single instance without high-availability failover replication.`,
      remediation: "Increase replica count >= 2 to enable primary-replica or multi-AZ high availability failover.",
    });
  } else {
    if (hasStorage) passedRules.push("DATABASE_HIGH_AVAILABILITY");
  }

  // RULE-004: Unbounded Message Queue (No Consumer Attached)
  const unconsumedQueues: string[] = [];
  nodes.forEach((n) => {
    if (n.category === "messaging" || n.type === "kafka" || n.type === "rabbitmq") {
      const consumers = adjacencyOut.get(n.id) || [];
      if (consumers.length === 0) {
        unconsumedQueues.push(n.id);
      }
    }
  });

  if (unconsumedQueues.length > 0) {
    violations.push({
      rule_id: "RULE-004",
      rule_name: "UNBOUNDED_MESSAGE_QUEUE",
      category: "resilience",
      severity: "critical",
      node_ids: unconsumedQueues,
      message: `Message Queue(s) ${unconsumedQueues.join(", ")} have no consumers connected. Queue depth will explode and exhaust disk space.`,
      remediation: "Connect worker consumer services to process incoming messages from the queue topics.",
    });
  } else {
    if (categoryCounts.messaging > 0) passedRules.push("MESSAGE_QUEUE_CONSUMERS_ATTACHED");
  }

  // RULE-011: Synchronous Call Chain Too Deep
  function getServiceDepth(currId: string, visitedSet: Set<string>): number {
    let maxDepth = 0;
    const neighbors = adjacencyOut.get(currId) || [];
    for (const tgtId of neighbors) {
      const tgt = nodeMap.get(tgtId);
      if (tgt && tgt.category === "compute" && !visitedSet.has(tgtId)) {
        const nextSet = new Set(visitedSet);
        nextSet.add(tgtId);
        maxDepth = Math.max(maxDepth, 1 + getServiceDepth(tgtId, nextSet));
      }
    }
    return maxDepth;
  }

  const deepChains: string[] = [];
  nodes.forEach((n) => {
    if (n.category === "compute") {
      if (getServiceDepth(n.id, new Set([n.id])) >= 3) {
        deepChains.push(n.id);
      }
    }
  });

  if (deepChains.length > 0) {
    violations.push({
      rule_id: "RULE-011",
      rule_name: "SYNCHRONOUS_CHAIN_TOO_DEEP",
      category: "resilience",
      severity: "warning",
      node_ids: deepChains,
      message: `Synchronous service call chain exceeds 3 hops starting at ${deepChains.join(", ")}. Compounding latencies risk cascade timeouts.`,
      remediation: "Decouple synchronous chains using asynchronous pub/sub messaging or CQRS event sourcing.",
    });
  } else {
    if (categoryCounts.compute > 0) passedRules.push("SYNCHRONOUS_CALL_DEPTH_OPTIMAL");
  }

  // RULE-017: Compute Service Single Point of Failure
  const spofServices: string[] = [];
  if (effectiveTraffic >= 3000) {
    nodes.forEach((n) => {
      if ((n.category === "compute" || n.type === "service") && (n.config.replicas || 1) <= 1) {
        if ((adjacencyIn.get(n.id) || []).length > 0) {
          spofServices.push(n.id);
        }
      }
    });
  }

  if (spofServices.length > 0) {
    violations.push({
      rule_id: "RULE-017",
      rule_name: "SERVICE_SINGLE_POINT_OF_FAILURE",
      category: "resilience",
      severity: "critical",
      node_ids: spofServices,
      message: `Service(s) ${spofServices.join(", ")} run with 1 single instance under ${effectiveTraffic.toLocaleString()} QPS load. A crash causes total outage.`,
      remediation: "Increase replica count >= 2 with health checks and auto-restart policy.",
    });
  } else {
    if (categoryCounts.compute > 0 && effectiveTraffic >= 3000) passedRules.push("SERVICE_TIER_HIGH_AVAILABILITY");
  }

  // RULE-018: Queue Worker Backpressure Hazard
  const highRiskQueues: string[] = [];
  if (effectiveTraffic >= 5000) {
    nodes.forEach((n) => {
      if (n.category === "messaging") {
        const consumers = (adjacencyOut.get(n.id) || [])
          .map((id) => nodeMap.get(id))
          .filter((tgt) => tgt && tgt.category === "compute");
        if (consumers.length === 1 && (consumers[0]!.config.replicas || 1) <= 1) {
          highRiskQueues.push(n.id);
        }
      }
    });
  }

  if (highRiskQueues.length > 0) {
    violations.push({
      rule_id: "RULE-018",
      rule_name: "QUEUE_WORKER_BACKPRESSURE_HAZARD",
      category: "resilience",
      severity: "warning",
      node_ids: highRiskQueues,
      message: `Queue(s) ${highRiskQueues.join(", ")} rely on a single unscaled worker pod under high traffic. Poison pills will stall the queue.`,
      remediation: "Scale worker instances and configure a Dead Letter Queue (DLQ) with exponential backoff retries.",
    });
  }

  // --------------------------------------------------------------------------
  // 4. CONSISTENCY RULES
  // --------------------------------------------------------------------------

  // RULE-019: Read Replica Consistency Hazard
  const staleReadNodes: string[] = [];
  edges.forEach((edge) => {
    if (edge.connectionType === "read_path") {
      const tgt = nodeMap.get(edge.target);
      if (tgt && tgt.config.replication_mode === "async") {
        staleReadNodes.push(tgt.id);
      }
    }
  });

  if (staleReadNodes.length > 0) {
    violations.push({
      rule_id: "RULE-019",
      rule_name: "READ_REPLICA_CONSISTENCY_HAZARD",
      category: "consistency",
      severity: "warning",
      node_ids: staleReadNodes,
      message: `Read path queries asynchronous replica ${staleReadNodes.join(", ")}. Users may experience read-your-own-writes staleness.`,
      remediation: "Switch to semi-synchronous replication or route critical user reads to the primary database immediately following writes.",
    });
  } else {
    if (hasStorage) passedRules.push("REPLICATION_CONSISTENCY_VERIFIED");
  }

  // RULE-020: Cache Invalidation Missing on Write Path
  if (hasCache && hasStorage) {
    const cacheIds = nodes.filter((n) => n.category === "cache").map((n) => n.id);
    const bypassServices: string[] = [];

    nodes.forEach((n) => {
      if (n.category === "compute") {
        const outTargets = adjacencyOut.get(n.id) || [];
        const touchesCache = outTargets.some((id) => cacheIds.includes(id));
        const hasDirectWritePathToDb = outTargets.some((tgtId) => {
          const edge = edgeMap.get(`${n.id}->${tgtId}`);
          const tgt = nodeMap.get(tgtId);
          return edge?.connectionType === "write_path" && tgt?.category === "database";
        });

        if (hasDirectWritePathToDb && !touchesCache) {
          bypassServices.push(n.id);
        }
      }
    });

    if (bypassServices.length > 0) {
      violations.push({
        rule_id: "RULE-020",
        rule_name: "CACHE_INCONSISTENCY_WRITE_BYPASS",
        category: "consistency",
        severity: "warning",
        node_ids: bypassServices,
        message: `Service(s) ${bypassServices.join(", ")} write to database without invalidating or updating Redis cache entries.`,
        remediation: "Add a cache invalidation / eviction edge from the service to cache on every state-mutating write.",
      });
    } else {
      passedRules.push("CACHE_INVALIDATION_COHERENT");
    }
  }

  // --------------------------------------------------------------------------
  // 5. COST ESTIMATION & OVER-PROVISIONING
  // --------------------------------------------------------------------------
  const costBreakdown: Record<string, number> = {
    compute: 0,
    database: 0,
    cache: 0,
    messaging: 0,
    networking: 0,
    storage: 0,
  };

  const overProvisionedNodes: string[] = [];

  nodes.forEach((n) => {
    const reps = Math.max(1, n.config.replicas || 1);
    if (n.category === "compute" || n.type === "service" || n.type === "worker") {
      costBreakdown.compute += reps * 40.0;
      if (reps >= 10 && effectiveTraffic > 0 && effectiveTraffic < 500) {
        overProvisionedNodes.push(n.id);
      }
    } else if (n.category === "database" || n.type === "postgres") {
      costBreakdown.database += reps * 120.0;
    } else if (n.type === "mongodb" || n.type === "cassandra") {
      costBreakdown.database += reps * 140.0;
    } else if (n.category === "cache" || n.type === "redis" || n.type === "memcached") {
      costBreakdown.cache += reps * 60.0;
    } else if (n.category === "messaging" || n.type === "kafka" || n.type === "rabbitmq") {
      costBreakdown.messaging += reps * 45.0;
    } else if (n.type === "api_gateway" || n.type === "load_balancer") {
      costBreakdown.networking += reps * 30.0;
    } else if (n.type === "cdn") {
      costBreakdown.networking += 20.0;
    } else if (n.category === "storage" || n.type === "s3") {
      costBreakdown.storage += 25.0;
    }
  });

  const estimatedMonthlyCost = Math.round(
    Object.values(costBreakdown).reduce((a, b) => a + b, 0)
  );

  if (overProvisionedNodes.length > 0) {
    violations.push({
      rule_id: "RULE-021",
      rule_name: "RESOURCE_OVER_PROVISIONED",
      category: "cost",
      severity: "info",
      node_ids: overProvisionedNodes,
      message: `Component(s) ${overProvisionedNodes.join(", ")} are over-provisioned (>10 replicas for <500 QPS).`,
      remediation: "Scale down replicas to 2-3 instances or enable Horizontal Pod Autoscaling (HPA) to reduce monthly bill.",
    });
  }

  passedRules.push("COST_ESTIMATION_COMPLETED");

  // --------------------------------------------------------------------------
  // Health Score Calculation
  // --------------------------------------------------------------------------
  let penalty = 0;
  violations.forEach((v) => {
    if (v.severity === "critical") penalty += 20;
    else if (v.severity === "warning") penalty += 8;
    else if (v.severity === "info") penalty += 2;
  });

  const healthScore = Math.max(0, Math.min(100, 100 - penalty));

  let status: "PASS" | "NEEDS_IMPROVEMENT" | "CRITICAL_ISSUES" = "PASS";
  let summary = `Production-grade architecture (${healthScore}/100). High availability, proper tiering, and fault tolerance verified. Estimated cost: $${estimatedMonthlyCost.toLocaleString()}/mo.`;

  if (healthScore < 60) {
    status = "CRITICAL_ISSUES";
    summary = `Critical architectural flaws detected (${healthScore}/100). High probability of downtime or data loss under load. Estimated cost: $${estimatedMonthlyCost.toLocaleString()}/mo.`;
  } else if (healthScore < 85) {
    status = "NEEDS_IMPROVEMENT";
    summary = `Viable topology with non-critical warnings (${healthScore}/100). Review warnings to improve reliability. Estimated cost: $${estimatedMonthlyCost.toLocaleString()}/mo.`;
  }

  return {
    health_score: healthScore,
    status,
    violations,
    passed_rules: passedRules,
    summary,
    component_counts: {
      ...categoryCounts,
      total_nodes: nodes.length,
      total_edges: edges.length,
    },
    estimated_monthly_cost: estimatedMonthlyCost,
    cost_breakdown: costBreakdown,
  };
}

// ============================================================================
// BACKEND DESIGNS VALIDATE API BRIDGE
// ============================================================================

export function mapToBackendGraph(graph: ArchitectureGraph, scaleMetadata?: Record<string, any>) {
  const nodes = graph.nodes.map((n) => {
    let backendType = n.type;
    if (n.type === "api_gateway") backendType = "gateway";
    else if (n.type === "postgres") backendType = "relational_db";
    else if (n.type === "mongodb" || n.type === "cassandra") backendType = "nosql_db";
    else if (n.type === "redis" || n.type === "memcached") backendType = "cache";
    else if (n.type === "kafka" || n.type === "rabbitmq") backendType = "queue";
    else if (n.type === "s3") backendType = "storage";
    else if (n.type === "worker") backendType = "service";

    return {
      id: n.id,
      type: backendType,
      label: n.name,
      position: n.position,
      properties: {
        replicas: n.config.replicas || 1,
        qps_capacity: n.config.qps_capacity || 10000,
        memory_gb: n.config.memory_gb || 8.0,
        storage_gb: n.config.storage_gb || 100.0,
        latency_ms: n.config.latency_ms || 1.0,
        failover_mode: n.config.replication_mode || "active-passive",
        custom: n.config.custom_properties || {},
      },
    };
  });

  const edges = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label || e.connectionType,
    animated: e.animated !== false,
    properties: {
      connectionType: e.connectionType,
      protocol: e.protocol || "http",
    },
  }));

  return {
    nodes,
    edges,
    scale_metadata: scaleMetadata || {
      target_rps:
        typeof graph.metadata?.targetRps === "string"
          ? parseInt(graph.metadata.targetRps.replace(/[^0-9]/g, "")) || 10000
          : graph.metadata?.targetRps || 10000,
    },
  };
}

export async function validateGraphOnBackend(
  graph: ArchitectureGraph,
  scaleMetadata?: Record<string, any>
): Promise<ValidationResponse> {
  const payload = mapToBackendGraph(graph, scaleMetadata);
  const response = await fetch("http://127.0.0.1:8000/api/v1/designs/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Validation backend responded with HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchAIArchitectCritique(
  graph: ArchitectureGraph,
  scaleMetadata?: Record<string, any>
): Promise<AIArchitectCritiqueResponse> {
  const payload = mapToBackendGraph(graph, scaleMetadata);
  try {
    const response = await fetch("http://127.0.0.1:8000/api/v1/designs/critique", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Critique backend responded with HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.warn("API critique call failed, using client fallback:", err);
    const val = evaluateArchitectureRules(graph);
    return {
      critique:
        val.health_score >= 85
          ? `Solid architecture topology (${val.health_score}/100). Redundancy and isolation are well configured.`
          : `Detected ${val.violations.length} critical invariants or potential bottlenecks to remediate (${val.health_score}/100).`,
      suggestions: val.violations.slice(0, 3).map((v) => ({
        category: (v.category as any) || "architecture",
        title: v.rule_name.replace(/_/g, " "),
        description: v.remediation,
        action:
          v.rule_id === "RULE-001"
            ? "scale:database:2"
            : v.rule_id === "RULE-002"
            ? "add_component:api_gateway"
            : v.rule_id === "RULE-003"
            ? "add_component:cache"
            : "scale:service:3",
      })),
      interview_question:
        "How will you handle split-brain or data loss during network partitions between primary and replica nodes?",
      estimated_monthly_cost: `$${val.estimated_monthly_cost.toLocaleString()} - $${(
        val.estimated_monthly_cost * 1.35
      ).toLocaleString()}/mo`,
      provider: "client-heuristic-fallback",
      fallback_used: true,
    };
  }
}

// Backward compatible helper
export function validateArchitectureGraph(graph: ArchitectureGraph): GraphValidationReport {
  const res = evaluateArchitectureRules(graph);
  const issues: GraphValidationIssue[] = res.violations.map((v) => ({
    id: v.rule_id,
    severity: v.severity === "critical" ? "error" : v.severity === "warning" ? "warning" : "info",
    title: v.rule_name.replace(/_/g, " "),
    message: v.message,
    affectedNodeIds: v.node_ids,
    remediation: v.remediation,
  }));

  const isolatedNodes = graph.nodes
    .filter((n) => {
      const inC = graph.edges.filter((e) => e.target === n.id).length;
      const outC = graph.edges.filter((e) => e.source === n.id).length;
      return inC === 0 && outC === 0;
    })
    .map((n) => n.id);

  return {
    isValid: res.status === "PASS",
    score: res.health_score,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    isolatedNodeCount: isolatedNodes.length,
    issues,
    summary: res.summary,
  };
}

// ============================================================================
// EDGE VISUAL STYLING BY CONNECTION TYPE
// ============================================================================

export function getEdgeVisualProps(connectionType: ConnectionType) {
  switch (connectionType) {
    case "async":
      return {
        stroke: "#a855f7", // Purple-500
        strokeDasharray: "6 4",
        strokeWidth: 2,
        animated: true,
        label: "Async Event",
        labelStyle: { fill: "#c084fc", fontSize: 10, fontFamily: "monospace", fontWeight: 700 },
        labelBgStyle: { fill: "#091122", fillOpacity: 0.9, stroke: "#a855f7", strokeWidth: 1 },
      };
    case "replication":
      return {
        stroke: "#10b981", // Emerald-500
        strokeDasharray: "3 3",
        strokeWidth: 2,
        animated: true,
        label: "Replication",
        labelStyle: { fill: "#34d399", fontSize: 10, fontFamily: "monospace", fontWeight: 700 },
        labelBgStyle: { fill: "#091122", fillOpacity: 0.9, stroke: "#10b981", strokeWidth: 1 },
      };
    case "read_path":
      return {
        stroke: "#38bdf8", // Sky-400
        strokeWidth: 2,
        animated: false,
        label: "Read Path",
        labelStyle: { fill: "#38bdf8", fontSize: 10, fontFamily: "monospace", fontWeight: 700 },
        labelBgStyle: { fill: "#091122", fillOpacity: 0.9, stroke: "#38bdf8", strokeWidth: 1 },
      };
    case "write_path":
      return {
        stroke: "#f59e0b", // Amber-500
        strokeWidth: 2,
        animated: true,
        label: "Write Path",
        labelStyle: { fill: "#fbbf24", fontSize: 10, fontFamily: "monospace", fontWeight: 700 },
        labelBgStyle: { fill: "#091122", fillOpacity: 0.9, stroke: "#f59e0b", strokeWidth: 1 },
      };
    case "sync":
    default:
      return {
        stroke: "#06b6d4", // Cyan-500
        strokeWidth: 1.8,
        animated: true,
        label: "Sync RPC",
        labelStyle: { fill: "#22d3ee", fontSize: 10, fontFamily: "monospace", fontWeight: 600 },
        labelBgStyle: { fill: "#091122", fillOpacity: 0.9, stroke: "#06b6d4", strokeWidth: 1 },
      };
  }
}

// ============================================================================
// ARCHITECTURE EVENT FACTORY
// ============================================================================

export function createArchitectureEvent(
  type: ArchitectureEventType,
  version: number,
  description: string,
  extra: {
    componentType?: string;
    nodeId?: string;
    edgeId?: string;
    payload?: Record<string, any>;
  } = {}
): ArchitectureEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    timestamp: new Date().toISOString(),
    architectureVersion: version,
    description,
    componentType: extra.componentType,
    nodeId: extra.nodeId,
    edgeId: extra.edgeId,
    payload: extra.payload,
  };
}
