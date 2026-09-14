import {
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureEdge,
  ArchitectureEvent,
  ArchitectureEventType,
  GraphValidationReport,
  GraphValidationIssue,
  ConnectionType,
} from "@/types/simulator";

// ============================================================================
// DETERMINISTIC GRAPH VALIDATION ENGINE (CLIENT-SIDE)
// ============================================================================

export function validateArchitectureGraph(graph: ArchitectureGraph): GraphValidationReport {
  const { nodes, edges } = graph;
  const issues: GraphValidationIssue[] = [];

  const nodeMap = new Map<string, ArchitectureNode>(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    outDegree.set(n.id, 0);
  });

  edges.forEach((e) => {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      outDegree.set(e.source, (outDegree.get(e.source) || 0) + 1);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  // 1. Empty Graph Check
  if (nodes.length === 0) {
    return {
      isValid: false,
      score: 0,
      nodeCount: 0,
      edgeCount: 0,
      isolatedNodeCount: 0,
      issues: [
        {
          id: "GRAPH_EMPTY",
          severity: "info",
          title: "Canvas is Empty",
          message: "Place components onto the canvas to construct your architecture topology.",
          affectedNodeIds: [],
          remediation: "Drag Client, Gateway, Compute, and Storage from the library to begin.",
        },
      ],
      summary: "Empty canvas. Place initial components.",
    };
  }

  // 2. Isolated Components Check
  const isolatedNodes: string[] = [];
  nodes.forEach((n) => {
    if ((inDegree.get(n.id) || 0) === 0 && (outDegree.get(n.id) || 0) === 0) {
      isolatedNodes.push(n.id);
    }
  });

  if (isolatedNodes.length > 0) {
    issues.push({
      id: "ISOLATED_COMPONENTS",
      severity: "warning",
      title: "Disconnected Components Detected",
      message: `${isolatedNodes.length} component(s) have no ingress or egress connections in the architecture topology.`,
      affectedNodeIds: isolatedNodes,
      remediation: "Connect these components using directional edges or remove them if unused.",
    });
  }

  // 3. Ingress Tier Check
  const hasClientOrGateway = nodes.some(
    (n) => n.type === "client" || n.type === "api_gateway" || n.type === "load_balancer"
  );
  if (!hasClientOrGateway) {
    issues.push({
      id: "MISSING_INGRESS_TIER",
      severity: "warning",
      title: "Missing Ingress & Entry Tier",
      message: "Architecture lacks an entry point (Client, API Gateway, or Load Balancer) to accept user requests.",
      affectedNodeIds: [],
      remediation: "Add a Client and API Gateway to establish the boundary entry point.",
    });
  }

  // 4. Client Directly Connected to Database (Security Anti-Pattern)
  const clientToDbEdges = edges.filter((e) => {
    const src = nodeMap.get(e.source);
    const tgt = nodeMap.get(e.target);
    return (
      src?.type === "client" &&
      (tgt?.category === "database" || tgt?.type === "redis")
    );
  });

  if (clientToDbEdges.length > 0) {
    issues.push({
      id: "DIRECT_CLIENT_DATABASE_ACCESS",
      severity: "error",
      title: "Direct Client Database Access (Anti-Pattern)",
      message: "Client tier connects directly to internal database/cache without an intervening API Gateway or application service layer.",
      affectedNodeIds: clientToDbEdges.map((e) => e.source).concat(clientToDbEdges.map((e) => e.target)),
      remediation: "Route traffic through an API Gateway and application server cluster to authenticate and enforce business logic.",
    });
  }

  // 5. Database Single Point of Failure (SPOF)
  const spofDatabases = nodes.filter(
    (n) => n.category === "database" && n.config.replicas <= 1
  );
  if (spofDatabases.length > 0) {
    issues.push({
      id: "DATABASE_SPOF",
      severity: "error",
      title: "Single Point of Failure (Database)",
      message: `Database '${spofDatabases[0].name}' runs on a single instance without failover replication.`,
      affectedNodeIds: spofDatabases.map((n) => n.id),
      remediation: "Increase database replica count >= 2 to enable primary-replica or multi-AZ high availability.",
    });
  }

  // 6. Compute Without Downstream Storage
  const computeNodes = nodes.filter((n) => n.category === "compute");
  const storageNodes = nodes.filter((n) => n.category === "database" || n.category === "storage");
  if (computeNodes.length > 0 && storageNodes.length === 0) {
    issues.push({
      id: "MISSING_PERSISTENCE",
      severity: "warning",
      title: "Stateless Compute Lacks Durable Storage",
      message: "Application servers are deployed without a database or persistent object storage to store system state.",
      affectedNodeIds: computeNodes.map((n) => n.id),
      remediation: "Attach a PostgreSQL, MongoDB, or Object Storage tier to persist user and application data.",
    });
  }

  // Compute Overall Structural Score
  let score = 100;
  issues.forEach((issue) => {
    if (issue.severity === "error") score -= 25;
    else if (issue.severity === "warning") score -= 10;
    else if (issue.severity === "info") score -= 5;
  });
  score = Math.max(0, Math.min(100, score));

  const isValid = issues.filter((i) => i.severity === "error").length === 0;
  let summary = "Architecture graph topology is structured and healthy.";
  if (score < 50) {
    summary = "Critical structural issues detected: security or availability risks present.";
  } else if (score < 80) {
    summary = "Viable topology with recommended reliability improvements.";
  }

  return {
    isValid,
    score,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    isolatedNodeCount: isolatedNodes.length,
    issues,
    summary,
  };
}

// ============================================================================
// EDGE VISUAL STYLING BY CONNECTION TYPE
// ============================================================================

export function getEdgeVisualProps(connectionType: ConnectionType) {
  switch (connectionType) {
    case "async":
      return {
        stroke: "#f59e0b", // Amber-500
        strokeDasharray: "6 4",
        strokeWidth: 2,
        animated: true,
        label: "Async Event",
        labelStyle: { fill: "#f59e0b", fontSize: 10, fontFamily: "monospace", fontWeight: 700 },
        labelBgStyle: { fill: "#091122", fillOpacity: 0.9, stroke: "#f59e0b", strokeWidth: 1 },
      };
    case "replication":
      return {
        stroke: "#38bdf8", // Sky-400
        strokeDasharray: "3 3",
        strokeWidth: 2,
        animated: true,
        label: "Replication",
        labelStyle: { fill: "#38bdf8", fontSize: 10, fontFamily: "monospace", fontWeight: 700 },
        labelBgStyle: { fill: "#091122", fillOpacity: 0.9, stroke: "#38bdf8", strokeWidth: 1 },
      };
    case "read_path":
      return {
        stroke: "#10b981", // Emerald-500
        strokeWidth: 2,
        animated: false,
        label: "Read Path",
        labelStyle: { fill: "#10b981", fontSize: 10, fontFamily: "monospace", fontWeight: 700 },
        labelBgStyle: { fill: "#091122", fillOpacity: 0.9, stroke: "#10b981", strokeWidth: 1 },
      };
    case "write_path":
      return {
        stroke: "#f43f5e", // Rose-500
        strokeWidth: 2,
        animated: true,
        label: "Write Path",
        labelStyle: { fill: "#f43f5e", fontSize: 10, fontFamily: "monospace", fontWeight: 700 },
        labelBgStyle: { fill: "#091122", fillOpacity: 0.9, stroke: "#f43f5e", strokeWidth: 1 },
      };
    case "sync":
    default:
      return {
        stroke: "#0ea5e9", // Sky-500
        strokeWidth: 1.5,
        animated: true,
        label: "Sync Request",
        labelStyle: { fill: "#0ea5e9", fontSize: 10, fontFamily: "monospace", fontWeight: 600 },
        labelBgStyle: { fill: "#091122", fillOpacity: 0.9, stroke: "#0ea5e9", strokeWidth: 1 },
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
