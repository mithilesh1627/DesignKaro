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
  change_summary?: string;
  last_event_type?: string;
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
  | "SCALE_COMPONENT"
  | "CHANGE_CONNECTION_TYPE"
  | "LOAD_TEMPLATE"
  | "CLEAR_ARCHITECTURE"
  | "AUTO_LAYOUT"
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

// ============================================================================
// PHASE 5: SIMULATION ENGINE TYPES
// ============================================================================

export interface SimulationTrafficProfile {
  base_qps: number;
  peak_qps: number;
  duration_sec: number;
  step_sec: number;
  concurrent_users: number;
  read_ratio: number;
  payload_kb: number;
  cache_hit_ratio: number;
  network_latency_ms: number;
}

export interface SimulationNodeMetric {
  node_id: string;
  node_type: string;
  cpu_percent: number;
  memory_percent: number;
  queue_depth: number;
  error_rate: number;
  latency_p99_ms: number;
  p95_latency_ms?: number;
  status: "HEALTHY" | "DEGRADED" | "CRASHED";
  throughput_qps: number;
  utilization_percent: number;
  is_bottleneck: boolean;
}

export interface SimulationTick {
  second: number;
  qps: number;
  total_errors: number;
  p99_latency_ms: number;
  p95_latency_ms?: number;
  system_status: string;
  node_metrics: SimulationNodeMetric[];
}

export interface SimulationResult {
  simulation_id: string;
  total_requests_simulated: number;
  dropped_requests: number;
  peak_observed_qps: number;
  overall_p99_latency_ms: number;
  blast_radius_summary: string;
  incident_rca: string | null;
  ticks: SimulationTick[];
  recommendations: string[];
  // Phase 5 Metrics
  disclaimer: string;
  throughput_qps: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  error_rate: number;
  cpu_utilization: number;
  memory_utilization: number;
  database_utilization: number;
  cache_hit_ratio: number;
  queue_depth: number;
  // Bottleneck Analysis
  bottleneck_node_id: string | null;
  bottleneck_node_name: string | null;
  bottleneck_type: string | null;
  bottleneck_utilization: number;
  bottleneck_explanation: string | null;
  ai_bottleneck_explanation: string | null;
  bottleneck_remediation: string | null;
  suggested_action: string | null;
  // Phase 6 Chaos Incident Report
  chaos_incident_report?: ChaosIncidentReport | null;
}

// ============================================================================
// PHASE 6: CHAOS MODE (FAILURE INJECTION) TYPES
// ============================================================================

export type ChaosFailureType =
  | "NONE"
  | "KILL_REDIS"
  | "KILL_POSTGRES"
  | "KILL_KAFKA"
  | "KILL_APP_SERVER"
  | "LATENCY_SPIKE"
  | "DROP_REQUESTS"
  | "DB_OVERLOAD"
  | "CACHE_FAILURE"
  | "KILL_NODE"
  | "HEAL_SYSTEM";

export interface ChaosIncidentReport {
  scenario: ChaosFailureType;
  title: string;
  severity?: "CRITICAL" | "DEGRADED" | "WARNING";
  failed_node_ids: string[];
  degraded_node_ids: string[];
  what_happened: string;
  why_it_happened: string;
  mitigation?: string;
  mitigation_strategies: string[];
  recommended_remediation?: string | null;
}

// ============================================================================
// PHASE 7: INTERVIEW MODE (SOCRATIC INTERVIEWER) TYPES
// ============================================================================

export interface InterviewMessage {
  id: string;
  sender: "interviewer" | "candidate" | "system";
  text: string;
  timestamp: string;
  feedback?: string;
  score_delta?: number;
  is_hint?: boolean;
}

export interface InterviewRubricScores {
  requirements_understanding: number; // 0-10
  scale_estimation: number;           // 0-10
  architecture: number;               // 0-10
  trade_offs: number;                 // 0-10
  scalability: number;                // 0-10
  reliability: number;                // 0-10
  communication: number;              // 0-10
}

export interface InterviewStageInfo {
  stage: number;
  title: string;
  shortTitle: string;
  description: string;
  interviewerQuestion: string;
  expectedKeywords: string[];
  hint: string;
}

// ============================================================================
// PHASE 8: EVALUATION & VERSION DIFF TYPES
// ============================================================================

export interface StrongDecision {
  title: string;
  description: string;
  impact: string;
}

export interface WeakDecision {
  title: string;
  risk: string;
  remediation: string;
  severity: "critical" | "warning";
}

export interface ArchitectureEvaluationReport {
  overall_score: number;
  scalability_score: number;
  reliability_score: number;
  performance_score: number;
  cost_score: number;
  strong_decisions: StrongDecision[];
  weak_decisions: WeakDecision[];
  ai_verdict: {
    decision: "Strong Hire" | "Hire" | "Leaning Hire" | "Needs Improvement";
    level: "Principal / Staff Architect (L6+)" | "Senior Architect (L5)" | "Software Engineer (L4)";
    summary: string;
    key_strengths: string[];
    critical_risks: string[];
    production_roadmap: string[];
  };
}

export interface NodeDiffItem {
  id: string;
  name: string;
  type: string;
  changeType: "ADDED" | "REMOVED" | "MODIFIED";
  deltas?: Record<string, { old: any; new: any }>;
}

export interface EdgeDiffItem {
  id: string;
  source: string;
  target: string;
  changeType: "ADDED" | "REMOVED";
}

export interface ArchitectureVersionDiff {
  v1: number;
  v2: number;
  nodes: NodeDiffItem[];
  edges: EdgeDiffItem[];
  summary: string;
}

