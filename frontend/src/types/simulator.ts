export type ArchitectureComponentCategory =
  | "networking"
  | "compute"
  | "database"
  | "cache"
  | "messaging"
  | "storage";

export type ConnectionType = "sync" | "async" | "replication" | "read_path" | "write_path";

export type ProtocolType = "http" | "grpc" | "tcp" | "websocket" | "amqp" | "kafka" | "sql";

export interface ArchitectureNodeConfig {
  replicas: number;
  qps_capacity: number;
  latency_ms: number;
  memory_gb?: number;
  storage_gb?: number;
  cache_policy?: "LRU" | "LFU" | "FIFO" | "ARC";
  cache_ttl_sec?: number;
  replication_mode?: "sync" | "async" | "semi_sync";
  partition_count?: number;
  rate_limit_rps?: number;
  timeout_ms?: number;
  max_connections?: number;
  custom_properties?: Record<string, any>;
}

export interface ArchitectureNode {
  id: string;
  type: string;
  name: string;
  category: ArchitectureComponentCategory;
  position: { x: number; y: number };
  config: ArchitectureNodeConfig;
  status?: "healthy" | "degraded" | "failed";
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  connectionType: ConnectionType;
  protocol?: ProtocolType;
  label?: string;
  animated?: boolean;
}

export interface ArchitectureGraphMetadata {
  problemId: string;
  title: string;
  targetRps: string | number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArchitectureGraph {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  metadata: ArchitectureGraphMetadata;
}

export type ArchitectureEventType =
  | "ADD_COMPONENT"
  | "REMOVE_COMPONENT"
  | "CONNECT_COMPONENTS"
  | "DISCONNECT_COMPONENTS"
  | "UPDATE_COMPONENT"
  | "UPDATE_CONFIGURATION"
  | "CHANGE_CONNECTION_TYPE"
  | "LOAD_TEMPLATE"
  | "CLEAR_ARCHITECTURE"
  | "UNDO"
  | "REDO";

export interface ArchitectureEvent {
  id: string;
  type: ArchitectureEventType;
  timestamp: string;
  architectureVersion: number;
  componentType?: string;
  nodeId?: string;
  edgeId?: string;
  description: string;
  payload?: Record<string, any>;
}

export interface GraphValidationIssue {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  message: string;
  affectedNodeIds: string[];
  remediation: string;
}

export interface GraphValidationReport {
  isValid: boolean;
  score: number;
  nodeCount: number;
  edgeCount: number;
  isolatedNodeCount: number;
  issues: GraphValidationIssue[];
  summary: string;
}

export type RuleCategory = "topology" | "capacity" | "resilience" | "consistency" | "cost";
export type RuleSeverity = "critical" | "warning" | "info";

export interface RuleViolation {
  rule_id: string;
  rule_name: string;
  category: RuleCategory;
  severity: RuleSeverity;
  node_ids: string[];
  message: string;
  remediation: string;
}

export interface ValidationResponse {
  health_score: number;
  status: "PASS" | "NEEDS_IMPROVEMENT" | "CRITICAL_ISSUES";
  violations: RuleViolation[];
  passed_rules: string[];
  summary: string;
  component_counts: Record<string, number>;
  estimated_monthly_cost: number;
  cost_breakdown: Record<string, number>;
}

export interface AIArchitectSuggestion {
  category: "architecture" | "scalability" | "reliability" | "cost";
  title: string;
  description: string;
  action: string;
}

export interface AIArchitectCritiqueResponse {
  critique: string;
  suggestions: AIArchitectSuggestion[];
  interview_question: string;
  estimated_monthly_cost: string;
  provider: string;
  fallback_used: boolean;
}


