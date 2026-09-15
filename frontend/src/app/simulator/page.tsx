"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  Connection,
  Handle,
  Position,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Layers,
  Globe,
  Database,
  Radio,
  HardDrive,
  Cpu,
  Server,
  Zap,
  ShieldCheck,
  Search,
  Sliders,
  X,
  Copy,
  Trash2,
  Plus,
  Play,
  RotateCcw,
  RotateCw,
  Clock,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Maximize2,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  History,
  FileCode,
  Share2,
  Workflow,
  AlertCircle,
  DollarSign,
  Wrench,
  ExternalLink,
  Target,
  Bot,
  Brain,
  Check,
  HelpCircle,
  RefreshCw,
  Send,
  MessageSquare,
  Flame,
  Pause,
  Gauge,
  TrendingUp,
  BarChart3,
  SlidersHorizontal,
  GitCompare,
  FileDiff,
  ShieldAlert,
  Lightbulb,
  CheckSquare,
  XSquare,
} from "lucide-react";
import {
  ArchitectureComponentCategory,
  ArchitectureEdge,
  ArchitectureEvent,
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureNodeConfig,
  ConnectionType,
  GraphValidationReport,
  ProtocolType,
  RuleViolation,
  RuleSeverity,
  RuleCategory,
  ValidationResponse,
  AIArchitectSuggestion,
  AIArchitectCritiqueResponse,
  SimulationTrafficProfile,
  SimulationResult,
  SimulationTick,
  SimulationNodeMetric,
  ChaosFailureType,
  ChaosIncidentReport,
  InterviewMessage,
  InterviewRubricScores,
  ArchitectureEvaluationReport,
  ArchitectureVersionDiff,
} from "@/types/simulator";
import {
  createArchitectureEvent,
  getEdgeVisualProps,
  validateArchitectureGraph,
  evaluateArchitectureRules,
  validateGraphOnBackend,
  fetchAIArchitectCritique,
} from "@/lib/architectureGraph";
import {
  DEFAULT_TRAFFIC_PROFILE,
  TRAFFIC_PRESETS,
  TrafficPreset,
  runClientSimulation,
  runBackendSimulation,
} from "@/lib/simulationEngine";
import {
  INTERVIEW_STAGES,
  getInitialInterviewState,
  evaluateInterviewTurn,
  computeOverallRubricPercentage,
} from "@/lib/interviewEngine";
import {
  evaluateArchitectureComprehensive,
  computeGraphDiff,
} from "@/lib/evaluationEngine";


// ============================================================================
// COMPONENT LIBRARY DEFINITIONS
// ============================================================================

interface ComponentDefinition {
  type: string;
  name: string;
  category: ArchitectureComponentCategory;
  description: string;
  icon: React.ElementType;
  badge: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
  defaultConfig: ArchitectureNodeConfig;
}

const COMPONENT_CATALOG: ComponentDefinition[] = [
  // NETWORKING
  {
    type: "client",
    name: "Client",
    category: "networking",
    description: "Web browsers, mobile devices, or API callers.",
    icon: Globe,
    badge: "Ingress",
    borderClass: "border-sky-500/40",
    textClass: "text-sky-400",
    bgClass: "bg-sky-500/10",
    defaultConfig: { replicas: 1, qps_capacity: 50000, latency_ms: 1 },
  },
  {
    type: "dns",
    name: "DNS",
    category: "networking",
    description: "Domain Name System with GeoDNS / Anycast routing.",
    icon: Globe,
    badge: "Routing",
    borderClass: "border-blue-500/40",
    textClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
    defaultConfig: { replicas: 2, qps_capacity: 100000, latency_ms: 2 },
  },
  {
    type: "cdn",
    name: "CDN",
    category: "networking",
    description: "Edge caching network for static media and assets.",
    icon: Globe,
    badge: "Edge",
    borderClass: "border-teal-500/40",
    textClass: "text-teal-400",
    bgClass: "bg-teal-500/10",
    defaultConfig: { replicas: 5, qps_capacity: 50000, latency_ms: 5, cache_policy: "LRU" },
  },
  {
    type: "load_balancer",
    name: "Load Balancer",
    category: "networking",
    description: "L4/L7 Traffic Distributor (NGINX / AWS ALB).",
    icon: Layers,
    badge: "Proxy",
    borderClass: "border-cyan-500/40",
    textClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10",
    defaultConfig: { replicas: 2, qps_capacity: 35000, latency_ms: 2 },
  },
  {
    type: "api_gateway",
    name: "API Gateway",
    category: "networking",
    description: "Auth, TLS termination, routing, and rate limiting.",
    icon: ShieldCheck,
    badge: "Gateway",
    borderClass: "border-purple-500/40",
    textClass: "text-purple-400",
    bgClass: "bg-purple-500/10",
    defaultConfig: { replicas: 3, qps_capacity: 25000, latency_ms: 3, rate_limit_rps: 10000 },
  },

  // COMPUTE
  {
    type: "server",
    name: "Server",
    category: "compute",
    description: "Monolithic or general stateless application server.",
    icon: Server,
    badge: "App",
    borderClass: "border-indigo-500/40",
    textClass: "text-indigo-400",
    bgClass: "bg-indigo-500/10",
    defaultConfig: { replicas: 4, qps_capacity: 8000, latency_ms: 12, memory_gb: 16 },
  },
  {
    type: "microservice",
    name: "Microservice",
    category: "compute",
    description: "Domain-isolated containerized backend service.",
    icon: Cpu,
    badge: "Service",
    borderClass: "border-violet-500/40",
    textClass: "text-violet-400",
    bgClass: "bg-violet-500/10",
    defaultConfig: { replicas: 3, qps_capacity: 10000, latency_ms: 8, memory_gb: 8 },
  },
  {
    type: "worker",
    name: "Worker",
    category: "compute",
    description: "Background async queue consumer and batch worker.",
    icon: Activity,
    badge: "Async",
    borderClass: "border-emerald-500/40",
    textClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    defaultConfig: { replicas: 2, qps_capacity: 4000, latency_ms: 25, memory_gb: 8 },
  },

  // DATABASE
  {
    type: "postgresql",
    name: "PostgreSQL",
    category: "database",
    description: "Relational ACID database with primary-replica HA.",
    icon: Database,
    badge: "RDBMS",
    borderClass: "border-blue-400/40",
    textClass: "text-blue-300",
    bgClass: "bg-blue-500/10",
    defaultConfig: {
      replicas: 2,
      qps_capacity: 5000,
      latency_ms: 14,
      storage_gb: 500,
      replication_mode: "sync",
    },
  },
  {
    type: "mysql",
    name: "MySQL",
    category: "database",
    description: "High-throughput InnoDB relational database.",
    icon: Database,
    badge: "RDBMS",
    borderClass: "border-amber-500/40",
    textClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    defaultConfig: {
      replicas: 2,
      qps_capacity: 5500,
      latency_ms: 12,
      storage_gb: 500,
      replication_mode: "semi_sync",
    },
  },
  {
    type: "mongodb",
    name: "MongoDB",
    category: "database",
    description: "Document store for dynamic schemas & fast writes.",
    icon: Database,
    badge: "NoSQL",
    borderClass: "border-emerald-400/40",
    textClass: "text-emerald-300",
    bgClass: "bg-emerald-500/10",
    defaultConfig: {
      replicas: 3,
      qps_capacity: 12000,
      latency_ms: 6,
      storage_gb: 1000,
      replication_mode: "async",
    },
  },
  {
    type: "cassandra",
    name: "Cassandra",
    category: "database",
    description: "Distributed masterless wide-column store for massive write scale.",
    icon: Database,
    badge: "Wide-Col",
    borderClass: "border-cyan-400/40",
    textClass: "text-cyan-300",
    bgClass: "bg-cyan-500/10",
    defaultConfig: {
      replicas: 3,
      qps_capacity: 25000,
      latency_ms: 5,
      storage_gb: 2000,
      partition_count: 8,
    },
  },

  // CACHE
  {
    type: "redis",
    name: "Redis",
    category: "cache",
    description: "In-memory key-value data structure store & LRU cache.",
    icon: Zap,
    badge: "In-Memory",
    borderClass: "border-rose-500/40",
    textClass: "text-rose-400",
    bgClass: "bg-rose-500/10",
    defaultConfig: {
      replicas: 2,
      qps_capacity: 40000,
      latency_ms: 1,
      memory_gb: 32,
      cache_policy: "LRU",
      cache_ttl_sec: 3600,
    },
  },
  {
    type: "memcached",
    name: "Memcached",
    category: "cache",
    description: "Multithreaded distributed memory object caching system.",
    icon: Zap,
    badge: "Cache",
    borderClass: "border-pink-500/40",
    textClass: "text-pink-400",
    bgClass: "bg-pink-500/10",
    defaultConfig: {
      replicas: 2,
      qps_capacity: 50000,
      latency_ms: 1,
      memory_gb: 64,
      cache_policy: "LRU",
    },
  },

  // MESSAGING
  {
    type: "kafka",
    name: "Kafka",
    category: "messaging",
    description: "Distributed partitioned append-only event streaming log.",
    icon: Radio,
    badge: "Stream",
    borderClass: "border-amber-400/40",
    textClass: "text-amber-300",
    bgClass: "bg-amber-500/10",
    defaultConfig: {
      replicas: 3,
      qps_capacity: 30000,
      latency_ms: 3,
      storage_gb: 500,
      partition_count: 12,
    },
  },
  {
    type: "rabbitmq",
    name: "RabbitMQ",
    category: "messaging",
    description: "AMQP message broker with exchange routing & acknowledgements.",
    icon: Radio,
    badge: "Broker",
    borderClass: "border-orange-500/40",
    textClass: "text-orange-400",
    bgClass: "bg-orange-500/10",
    defaultConfig: { replicas: 2, qps_capacity: 12000, latency_ms: 4 },
  },

  // STORAGE
  {
    type: "object_storage",
    name: "Object Storage",
    category: "storage",
    description: "S3-compatible immutable object store for video, audio & blobs.",
    icon: HardDrive,
    badge: "Blob",
    borderClass: "border-sky-400/40",
    textClass: "text-sky-300",
    bgClass: "bg-sky-500/10",
    defaultConfig: { replicas: 3, qps_capacity: 15000, latency_ms: 30, storage_gb: 50000 },
  },
  {
    type: "block_storage",
    name: "Block Storage",
    category: "storage",
    description: "Low-latency network attached block storage (EBS) for volumes.",
    icon: HardDrive,
    badge: "Block",
    borderClass: "border-slate-400/40",
    textClass: "text-slate-300",
    bgClass: "bg-slate-500/10",
    defaultConfig: { replicas: 2, qps_capacity: 20000, latency_ms: 3, storage_gb: 1000 },
  },
];

const CATEGORY_LABELS = [
  { key: "all", label: "ALL" },
  { key: "networking", label: "NETWORKING" },
  { key: "compute", label: "COMPUTE" },
  { key: "database", label: "DATABASE" },
  { key: "cache", label: "CACHE" },
  { key: "messaging", label: "MESSAGING" },
  { key: "storage", label: "STORAGE" },
];

// ============================================================================
// CUSTOM FLOW NODE COMPONENT
// ============================================================================

interface CustomFlowData extends Record<string, unknown> {
  archNode: ArchitectureNode;
  isSelected?: boolean;
  violationSeverity?: RuleSeverity | null;
  violations?: RuleViolation[];
  // Phase 5 Simulation Mode
  isSimulationMode?: boolean;
  isBottleneck?: boolean;
  utilizationPercent?: number;
  throughputQps?: number;
  nodeLatencyMs?: number;
  nodeStatus?: string;
}

const SimulatorCustomNode = ({ data }: { data: CustomFlowData }) => {
  const node = data?.archNode;
  if (!node) return null;
  const comp =
    COMPONENT_CATALOG.find((c) => c.type === node.type) || COMPONENT_CATALOG[0];
  const Icon = comp.icon;
  const replicas = node.config?.replicas || 1;
  const severity = data?.violationSeverity;
  const isSimulation = data?.isSimulationMode;
  const isBottleneck = data?.isBottleneck;
  const utilPercent = data?.utilizationPercent ?? 0;
  const throughput = data?.throughputQps ?? 0;

  let borderStyle = `${comp.borderClass} hover:border-cyan-500/60`;
  const isCrashed = data.nodeStatus === "CRASHED";
  const isDegraded = data.nodeStatus === "DEGRADED";

  if (isCrashed) {
    borderStyle = "border-red-600 ring-4 ring-red-600/90 shadow-[0_0_35px_rgba(239,68,68,0.9)] animate-pulse bg-red-950/40";
  } else if (isDegraded) {
    borderStyle = "border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.6)] bg-amber-950/30";
  } else if (data.isSelected) {
    borderStyle = "border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]";
  } else if (isBottleneck) {
    borderStyle = "border-red-500 ring-4 ring-red-500/80 shadow-[0_0_32px_rgba(239,68,68,0.75)] animate-pulse";
  } else if (isSimulation && utilPercent >= 85) {
    borderStyle = "border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.45)]";
  } else if (severity === "critical") {
    borderStyle = "border-red-500 ring-2 ring-red-500/70 shadow-[0_0_22px_rgba(239,68,68,0.55)] animate-pulse";
  } else if (severity === "warning") {
    borderStyle = "border-amber-400 ring-1 ring-amber-400/50 shadow-[0_0_16px_rgba(251,191,36,0.35)]";
  }

  return (
    <div
      className={`relative px-4 py-3 rounded-xl border bg-[#091122]/95 backdrop-blur-xl shadow-2xl min-w-[195px] transition-all duration-200 cursor-pointer ${borderStyle}`}
    >
      {/* Crashed Node Badge */}
      {isCrashed && (
        <div className="absolute -top-3.5 left-2 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-mono font-bold flex items-center gap-1 shadow-lg shadow-red-950/80 z-30 animate-bounce">
          <Flame className="w-3 h-3 text-amber-200" />
          <span>FAULT: CRASHED (0 QPS)</span>
        </div>
      )}

      {/* Degraded Node Badge */}
      {!isCrashed && isDegraded && !isBottleneck && (
        <div className="absolute -top-3.5 left-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-mono font-bold flex items-center gap-1 shadow-md shadow-amber-950/70 z-30">
          <AlertTriangle className="w-3 h-3 text-slate-950" />
          <span>DEGRADED</span>
        </div>
      )}

      {/* Primary Bottleneck Badge */}
      {!isCrashed && isBottleneck && (
        <div className="absolute -top-3.5 left-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-mono font-bold flex items-center gap-1 shadow-lg shadow-red-950/80 z-30 animate-bounce">
          <Flame className="w-3 h-3 text-amber-200" />
          <span>PRIMARY BOTTLENECK ({utilPercent}%)</span>
        </div>
      )}


      {/* Violation Severity Badge (when not bottleneck) */}
      {!isBottleneck && severity === "critical" && (
        <div
          className="absolute -top-3 -right-2 px-2 py-0.5 rounded-full bg-red-950/95 border border-red-500 text-[9px] font-bold text-red-300 flex items-center gap-1 shadow-lg shadow-red-950/60 z-20"
          title={data.violations?.map((v) => `[${v.rule_name}] ${v.message}`).join("\n")}
        >
          <AlertTriangle className="w-2.5 h-2.5 text-red-400 animate-pulse" />
          <span>Critical ({data.violations?.length || 1})</span>
        </div>
      )}
      {!isBottleneck && severity === "warning" && (
        <div
          className="absolute -top-3 -right-2 px-2 py-0.5 rounded-full bg-amber-950/95 border border-amber-500 text-[9px] font-bold text-amber-300 flex items-center gap-1 shadow-lg shadow-amber-950/60 z-20"
          title={data.violations?.map((v) => `[${v.rule_name}] ${v.message}`).join("\n")}
        >
          <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
          <span>Warning ({data.violations?.length || 1})</span>
        </div>
      )}

      {/* Ingress Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-cyan-400 border-2 border-[#050914] shadow-sm hover:scale-125 transition-transform"
      />

      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg border ${comp.borderClass} ${comp.bgClass} ${comp.textClass} shrink-0`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white tracking-wide truncate">
              {node.name}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 border border-white/[0.04]">
              {comp.badge}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
            <span className={replicas > 1 ? "text-cyan-400 font-semibold" : "text-slate-400"}>
              {replicas > 1 ? `${replicas}x Replicas` : "1 Instance"}
            </span>
            <span>•</span>
            <span>{node.config?.latency_ms || 1}ms</span>
          </div>
        </div>
      </div>

      {/* Simulation Load Meter */}
      {isSimulation && (
        <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Activity className="w-2.5 h-2.5 text-cyan-400" />
              <span>Capacity Load</span>
            </span>
            <span
              className={
                utilPercent >= 90
                  ? "text-red-400 font-bold"
                  : utilPercent >= 70
                  ? "text-amber-400 font-semibold"
                  : "text-emerald-400"
              }
            >
              {utilPercent}% ({throughput.toLocaleString()} RPS)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-950 border border-white/[0.04] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                utilPercent >= 90
                  ? "bg-gradient-to-r from-amber-500 to-red-500"
                  : utilPercent >= 70
                  ? "bg-amber-400"
                  : "bg-emerald-400"
              }`}
              style={{ width: `${Math.min(100, Math.max(3, utilPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* Egress Source Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-cyan-400 border-2 border-[#050914] shadow-sm hover:scale-125 transition-transform"
      />
    </div>
  );
};

const SIMULATOR_NODE_TYPES = {
  simulatorCustomNode: SimulatorCustomNode,
};

// ============================================================================
// INITIAL PROBLEM GRAPH PRESETS
// ============================================================================

const INITIAL_YOUTUBE_GRAPH: ArchitectureGraph = {
  metadata: {
    problemId: "youtube",
    title: "Design YouTube",
    targetRps: "50K RPS",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  nodes: [
    {
      id: "client-1",
      type: "client",
      name: "Video Viewers",
      category: "networking",
      position: { x: 50, y: 180 },
      config: { replicas: 1, qps_capacity: 50000, latency_ms: 1 },
    },
    {
      id: "api_gateway-1",
      type: "api_gateway",
      name: "API Gateway",
      category: "networking",
      position: { x: 280, y: 180 },
      config: { replicas: 3, qps_capacity: 30000, latency_ms: 2 },
    },
    {
      id: "load_balancer-1",
      type: "load_balancer",
      name: "Load Balancer",
      category: "networking",
      position: { x: 510, y: 180 },
      config: { replicas: 2, qps_capacity: 35000, latency_ms: 2 },
    },
    {
      id: "server-1",
      type: "server",
      name: "App Streaming Cluster",
      category: "compute",
      position: { x: 740, y: 180 },
      config: { replicas: 6, qps_capacity: 15000, latency_ms: 6, memory_gb: 32 },
    },
    {
      id: "redis-1",
      type: "redis",
      name: "Metadata Cache",
      category: "cache",
      position: { x: 990, y: 80 },
      config: { replicas: 3, qps_capacity: 50000, latency_ms: 1, memory_gb: 64, cache_policy: "LRU" },
    },
    {
      id: "postgresql-1",
      type: "postgresql",
      name: "Metadata DB",
      category: "database",
      position: { x: 990, y: 280 },
      config: { replicas: 2, qps_capacity: 8000, latency_ms: 12, storage_gb: 1000 },
    },
  ],
  edges: [
    { id: "e-c-gw", source: "client-1", target: "api_gateway-1", connectionType: "sync" },
    { id: "e-gw-lb", source: "api_gateway-1", target: "load_balancer-1", connectionType: "sync" },
    { id: "e-lb-srv", source: "load_balancer-1", target: "server-1", connectionType: "sync" },
    { id: "e-srv-redis", source: "server-1", target: "redis-1", connectionType: "read_path" },
    { id: "e-srv-db", source: "server-1", target: "postgresql-1", connectionType: "write_path" },
  ],
};

// ============================================================================
// MAIN SIMULATOR WORKSPACE COMPONENT
// ============================================================================

function SimulatorContent() {
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------------
  // ARCHITECTURE GRAPH STATE (SINGLE SOURCE OF TRUTH)
  // --------------------------------------------------------------------------
  const [graphState, setGraphState] = useState<ArchitectureGraph>(INITIAL_YOUTUBE_GRAPH);

  // History for Undo / Redo
  const [history, setHistory] = useState<ArchitectureGraph[]>([INITIAL_YOUTUBE_GRAPH]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Event Log
  const [events, setEvents] = useState<ArchitectureEvent[]>([
    createArchitectureEvent("LOAD_TEMPLATE", 1, "Loaded YouTube Initial Architecture Blueprint"),
  ]);

  // UI Selection State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // UI Panel Modes
  const [activeTab, setActiveTab] = useState<"requirements" | "architecture" | "simulation" | "evaluation">("architecture");
  const [showEventLog, setShowEventLog] = useState<boolean>(false);
  const [showValidationDrawer, setShowValidationDrawer] = useState<boolean>(false);

  // AI Architect State (Phase 4)
  const [showAiDrawer, setShowAiDrawer] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiCritique, setAiCritique] = useState<AIArchitectCritiqueResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [userInterviewAnswer, setUserInterviewAnswer] = useState<string>("");
  const [interviewSubmitted, setInterviewSubmitted] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // PHASE 5 & 6: SIMULATION, TRAFFIC & CHAOS ENGINE STATE
  // --------------------------------------------------------------------------
  const [trafficProfile, setTrafficProfile] = useState<SimulationTrafficProfile>(DEFAULT_TRAFFIC_PROFILE);
  const [activePresetId, setActivePresetId] = useState<string>("surge");
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [simTickIndex, setSimTickIndex] = useState<number>(0);
  const [isBackendSimulating, setIsBackendSimulating] = useState<boolean>(false);
  const [backendSimResult, setBackendSimResult] = useState<SimulationResult | null>(null);

  // Phase 6 Chaos Engineering State
  const [activeChaosFailure, setActiveChaosFailure] = useState<ChaosFailureType>("NONE");
  const [chaosTargetNodeId, setChaosTargetNodeId] = useState<string | null>(null);
  const [simulationSubTab, setSimulationSubTab] = useState<"traffic" | "chaos">("traffic");

  // Instant deterministic client-side simulation with 0ms Chaos injection
  const activeSimulationResult: SimulationResult = useMemo(() => {
    if (backendSimResult) return backendSimResult;
    return runClientSimulation(
      graphState,
      trafficProfile,
      activeChaosFailure,
      chaosTargetNodeId || undefined
    );
  }, [backendSimResult, graphState, trafficProfile, activeChaosFailure, chaosTargetNodeId]);

  // --------------------------------------------------------------------------
  // PHASE 7: INTERVIEW MODE (SOCRATIC INTERVIEWER) STATE
  // --------------------------------------------------------------------------
  const [showInterviewModal, setShowInterviewModal] = useState<boolean>(false);
  const [interviewStage, setInterviewStage] = useState<number>(1);
  const [interviewMessages, setInterviewMessages] = useState<InterviewMessage[]>(() => getInitialInterviewState().messages);
  const [interviewScores, setInterviewScores] = useState<InterviewRubricScores>(() => getInitialInterviewState().scores);
  const [interviewInput, setInterviewInput] = useState<string>("");
  const [isInterviewCritiqueLoading, setIsInterviewCritiqueLoading] = useState<boolean>(false);
  const [interviewFeedbackToast, setInterviewFeedbackToast] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // PHASE 8: EVALUATION & VERSION DIFF STATE
  // --------------------------------------------------------------------------
  const [evaluationSubTab, setEvaluationSubTab] = useState<"verdict" | "history">("verdict");
  const [diffBaseVersion, setDiffBaseVersion] = useState<number>(1);
  const [diffTargetVersion, setDiffTargetVersion] = useState<number>(1);

  // Keep diffTargetVersion synced with graphState version
  useEffect(() => {
    setDiffTargetVersion(graphState.metadata.version);
  }, [graphState.metadata.version]);

  const comprehensiveEvaluation: ArchitectureEvaluationReport = useMemo(() => {
    return evaluateArchitectureComprehensive(graphState);
  }, [graphState]);

  const versionDiffResult: ArchitectureVersionDiff | null = useMemo(() => {
    const baseGraph = history.find((h) => h.metadata.version === diffBaseVersion) || history[0];
    const targetGraph = history.find((h) => h.metadata.version === diffTargetVersion) || graphState;
    if (!baseGraph || !targetGraph) return null;
    return computeGraphDiff(baseGraph, targetGraph);
  }, [history, diffBaseVersion, diffTargetVersion, graphState]);


  // Discrete time playback ticker
  useEffect(() => {
    if (!isSimulationRunning) return;
    const ticks = activeSimulationResult.ticks;
    if (!ticks || ticks.length === 0) return;

    const timer = setInterval(() => {
      setSimTickIndex((prev) => (prev + 1) % ticks.length);
    }, 800);
    return () => clearInterval(timer);
  }, [isSimulationRunning, activeSimulationResult.ticks]);

  // Current active discrete tick
  const currentTick: SimulationTick | null = useMemo(() => {
    if (!activeSimulationResult.ticks || activeSimulationResult.ticks.length === 0) return null;
    const idx = Math.min(simTickIndex, activeSimulationResult.ticks.length - 1);
    return activeSimulationResult.ticks[idx] || null;
  }, [activeSimulationResult.ticks, simTickIndex]);

  // Map of node ID to live simulation metric (from current tick or peak)
  const nodeMetricsMap = useMemo(() => {
    const map = new Map<string, SimulationNodeMetric>();
    if (currentTick) {
      currentTick.node_metrics.forEach((m) => map.set(m.node_id, m));
    } else if (activeSimulationResult.ticks.length > 0) {
      const peakTick = activeSimulationResult.ticks.reduce(
        (max, t) => (t.qps > max.qps ? t : max),
        activeSimulationResult.ticks[0]
      );
      peakTick.node_metrics.forEach((m) => map.set(m.node_id, m));
    }
    return map;
  }, [currentTick, activeSimulationResult]);

  // Active Drag & Drop Tracking State (Ensures 100% Reliable Placement Across All Browsers)
  const [draggedType, setDraggedType] = useState<string | null>(null);
  const draggedTypeRef = useRef<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Validation Filters
  const [valSeverityFilter, setValSeverityFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [valCategoryFilter, setValCategoryFilter] = useState<"all" | RuleCategory>("all");
  const [valSearchQuery, setValSearchQuery] = useState<string>("");

  // Component Search & Filter
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Countdown timer: 18:42
  const [secondsRemaining, setSecondsRemaining] = useState<number>(18 * 60 + 42);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [secondsRemaining]);

  // Deterministic Graph Rule Engine Evaluation (Instant 0ms Latency)
  const validationResponse: ValidationResponse = useMemo(() => {
    return evaluateArchitectureRules(graphState);
  }, [graphState]);

  // Node violation map for fast canvas node styling
  const nodeViolationMap = useMemo(() => {
    const map = new Map<string, { severity: RuleSeverity; violations: RuleViolation[] }>();
    validationResponse.violations.forEach((v) => {
      v.node_ids.forEach((nodeId) => {
        const existing = map.get(nodeId);
        if (!existing) {
          map.set(nodeId, { severity: v.severity, violations: [v] });
        } else {
          existing.violations.push(v);
          if (v.severity === "critical") {
            existing.severity = "critical";
          } else if (v.severity === "warning" && existing.severity !== "critical") {
            existing.severity = "warning";
          }
        }
      });
    });
    return map;
  }, [validationResponse]);

  // Convert Architecture Graph to ReactFlow Nodes & Edges
  const flowNodes: Node<CustomFlowData>[] = useMemo(() => {
    return graphState.nodes.map((n) => {
      const vInfo = nodeViolationMap.get(n.id);
      const metric = nodeMetricsMap.get(n.id);
      const isBottleneck = activeSimulationResult.bottleneck_node_id === n.id;
      return {
        id: n.id,
        type: "simulatorCustomNode",
        position: n.position,
        initialWidth: 210,
        initialHeight: 80,
        data: {
          archNode: n,
          isSelected: n.id === selectedNodeId,
          violationSeverity: vInfo?.severity || null,
          violations: vInfo?.violations || [],
          isSimulationMode: activeTab === "simulation",
          isBottleneck: isBottleneck,
          utilizationPercent: metric?.utilization_percent ?? (isBottleneck ? activeSimulationResult.bottleneck_utilization : 0),
          throughputQps: metric?.throughput_qps ?? Math.round(activeSimulationResult.throughput_qps / Math.max(1, graphState.nodes.length)),
          nodeLatencyMs: metric?.latency_p99_ms ?? Math.round(activeSimulationResult.p95_latency_ms),
          nodeStatus: metric?.status ?? "HEALTHY",
        },
      };
    });
  }, [
    graphState.nodes,
    selectedNodeId,
    nodeViolationMap,
    nodeMetricsMap,
    activeSimulationResult,
    activeTab,
  ]);

  const flowEdges: Edge[] = useMemo(() => {
    return graphState.edges.map((e) => {
      const visualProps = getEdgeVisualProps(e.connectionType);
      const isSelected = e.id === selectedEdgeId;
      const isSim = activeTab === "simulation";
      const sourceMetric = nodeMetricsMap.get(e.source);
      const targetMetric = nodeMetricsMap.get(e.target);
      const hasCrashedNode = sourceMetric?.status === "CRASHED" || targetMetric?.status === "CRASHED";
      const hasDegradedNode = sourceMetric?.status === "DEGRADED" || targetMetric?.status === "DEGRADED";

      let strokeColor = isSelected ? "#38bdf8" : isSim ? "#06b6d4" : visualProps.stroke;
      let strokeDash = isSim ? "6, 6" : visualProps.strokeDasharray;
      let strokeW = isSelected ? 3 : isSim ? 2.5 : visualProps.strokeWidth;

      if (isSim && hasCrashedNode) {
        strokeColor = "#ef4444";
        strokeDash = "4, 4";
        strokeW = 3;
      } else if (isSim && hasDegradedNode) {
        strokeColor = "#f59e0b";
        strokeDash = "5, 5";
      }

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: isSim ? true : visualProps.animated,
        label: isSim && currentTick ? `${Math.round(currentTick.qps).toLocaleString()} RPS` : visualProps.label,
        labelStyle: visualProps.labelStyle,
        labelBgStyle: visualProps.labelBgStyle,
        markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor },
        style: {
          stroke: strokeColor,
          strokeWidth: strokeW,
          strokeDasharray: strokeDash,
        },
      };
    });
  }, [graphState.edges, selectedEdgeId, activeTab, currentTick, nodeMetricsMap]);


  const nodeTypes = SIMULATOR_NODE_TYPES;

  // Filtered component catalog
  const filteredComponents = useMemo(() => {
    return COMPONENT_CATALOG.filter((comp) => {
      const matchCategory =
        selectedCategory === "all" || comp.category === selectedCategory;
      const matchSearch =
        comp.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchFilter.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchFilter]);

  // --------------------------------------------------------------------------
  // STATE MUTATION WITH EVENT EMISSION & UNDO/REDO SNAPSHOTTING
  // --------------------------------------------------------------------------

  const commitGraphChange = useCallback(
    (
      newGraphProducer: (prev: ArchitectureGraph) => ArchitectureGraph,
      eventType: ArchitectureEvent["type"],
      description: string,
      extra: { componentType?: string; nodeId?: string; edgeId?: string; payload?: any } = {}
    ) => {
      setGraphState((currentGraph) => {
        const nextGraph = newGraphProducer(currentGraph);
        const newVersion = currentGraph.metadata.version + 1;
        nextGraph.metadata = {
          ...nextGraph.metadata,
          version: newVersion,
          updatedAt: new Date().toISOString(),
          change_summary: description,
          last_event_type: eventType,
        };

        // Record Architecture Event
        const newEvent = createArchitectureEvent(eventType, newVersion, description, extra);
        setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);

        // Push to History (truncate future redo steps if branching)
        setHistory((prevHistory) => {
          const newHistory = prevHistory.slice(0, historyIndex + 1);
          return [...newHistory, nextGraph];
        });
        setHistoryIndex((prevIndex) => prevIndex + 1);

        return nextGraph;
      });
    },
    [historyIndex]
  );

  // Undo / Redo Actions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetGraph = history[targetIndex];
      setHistoryIndex(targetIndex);
      setGraphState(targetGraph);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);

      const undoEvent = createArchitectureEvent(
        "UNDO",
        targetGraph.metadata.version,
        `Reverted architecture to version ${targetGraph.metadata.version}`
      );
      setEvents((prev) => [undoEvent, ...prev.slice(0, 49)]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const targetGraph = history[targetIndex];
      setHistoryIndex(targetIndex);
      setGraphState(targetGraph);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);

      const redoEvent = createArchitectureEvent(
        "REDO",
        targetGraph.metadata.version,
        `Restored architecture to version ${targetGraph.metadata.version}`
      );
      setEvents((prev) => [redoEvent, ...prev.slice(0, 49)]);
    }
  }, [history, historyIndex]);

  // Keyboard Shortcuts: Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const activeElem = document.activeElement?.tagName.toLowerCase();
        if (activeElem !== "input" && activeElem !== "textarea") {
          if (selectedNodeId) {
            e.preventDefault();
            handleDeleteSelectedNode();
          } else if (selectedEdgeId) {
            e.preventDefault();
            handleDeleteSelectedEdge();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, selectedNodeId, selectedEdgeId]);

  // --------------------------------------------------------------------------
  // NODE & EDGE MUTATIONS
  // --------------------------------------------------------------------------

  // Add Component
  const handleAddComponent = useCallback(
    (compType: string, position?: { x: number; y: number }) => {
      const comp = COMPONENT_CATALOG.find((c) => c.type === compType);
      if (!comp) return;

      const isManualDrop = position && !isNaN(position.x) && !isNaN(position.y);
      let pos = position;
      if (!pos || isNaN(pos.x) || isNaN(pos.y)) {
        if (reactFlowInstance && reactFlowWrapper.current) {
          try {
            const rect = reactFlowWrapper.current.getBoundingClientRect();
            pos = reactFlowInstance.screenToFlowPosition({
              x: rect.left + rect.width / 2 + (Math.random() * 80 - 40),
              y: rect.top + rect.height / 2 + (Math.random() * 80 - 40),
            });
          } catch {
            pos = { x: 350 + Math.random() * 60, y: 180 + Math.random() * 60 };
          }
        } else {
          pos = {
            x: 350 + Math.random() * 80,
            y: 180 + Math.random() * 80,
          };
        }
      }

      const newId = `${compType}-${Date.now().toString().slice(-4)}`;
      const newNode: ArchitectureNode = {
        id: newId,
        type: comp.type,
        name: comp.name,
        category: comp.category,
        position: pos,
        config: { ...comp.defaultConfig },
      };

      commitGraphChange(
        (prev) => ({
          ...prev,
          nodes: [...prev.nodes, newNode],
        }),
        "ADD_COMPONENT",
        `Added '${comp.name}' component to ${comp.category} tier`,
        { componentType: comp.type, nodeId: newId }
      );
      setSelectedNodeId(newId);
      showToast(`Added ${comp.name} to architecture canvas`);

      // Only pan to the newly placed component if it was added via click (not dropped under cursor)
      if (!isManualDrop && reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.setCenter(pos!.x + 90, pos!.y + 35, {
            duration: 350,
          });
        }, 50);
      }
    },
    [commitGraphChange, reactFlowInstance, showToast]
  );

  const handleUpdateNodeConfig = useCallback(
    (nodeId: string, partial: Partial<ArchitectureNodeConfig>) => {
      commitGraphChange(
        (prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, config: { ...n.config, ...partial } }
              : n
          ),
        }),
        "UPDATE_CONFIGURATION",
        `Updated configuration for node '${nodeId}'`,
        { nodeId, payload: partial }
      );
    },
    [commitGraphChange]
  );

  // Delete Component
  const handleDeleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    const targetNode = graphState.nodes.find((n) => n.id === selectedNodeId);
    if (!targetNode) return;

    commitGraphChange(
      (prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== selectedNodeId),
        edges: prev.edges.filter(
          (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
        ),
      }),
      "REMOVE_COMPONENT",
      `Removed component '${targetNode.name}' and attached connections`,
      { nodeId: selectedNodeId, componentType: targetNode.type }
    );
    setSelectedNodeId(null);
  }, [selectedNodeId, graphState.nodes, commitGraphChange]);

  // Duplicate Component
  const handleDuplicateNode = useCallback(() => {
    if (!selectedNodeId) return;
    const targetNode = graphState.nodes.find((n) => n.id === selectedNodeId);
    if (!targetNode) return;

    const newId = `${targetNode.type}-${Date.now().toString().slice(-4)}`;
    const duplicatedNode: ArchitectureNode = {
      ...targetNode,
      id: newId,
      name: `${targetNode.name} (Copy)`,
      position: {
        x: targetNode.position.x + 40,
        y: targetNode.position.y + 40,
      },
      config: { ...targetNode.config },
    };

    commitGraphChange(
      (prev) => ({
        ...prev,
        nodes: [...prev.nodes, duplicatedNode],
      }),
      "ADD_COMPONENT",
      `Duplicated component '${targetNode.name}'`,
      { nodeId: newId, componentType: targetNode.type }
    );
    setSelectedNodeId(newId);
  }, [selectedNodeId, graphState.nodes, commitGraphChange]);

  // Center / Pan Canvas to an affected Node
  const handleFocusNode = useCallback(
    (nodeId: string) => {
      const target = graphState.nodes.find((n) => n.id === nodeId);
      if (target && reactFlowInstance) {
        setSelectedNodeId(nodeId);
        reactFlowInstance.setCenter(target.position.x + 90, target.position.y + 40, {
          zoom: 1.1,
          duration: 500,
        });
      }
    },
    [graphState.nodes, reactFlowInstance]
  );

  // Quick Fix rule violations
  const handleApplyQuickFix = useCallback(
    (violation: RuleViolation) => {
      if (violation.rule_id === "RULE-001") {
        // DB SPOF -> scale replicas to 2
        if (violation.node_ids.length > 0) {
          commitGraphChange(
            (prev) => ({
              ...prev,
              nodes: prev.nodes.map((n) =>
                violation.node_ids.includes(n.id)
                  ? { ...n, config: { ...n.config, replicas: Math.max(2, (n.config.replicas || 1) + 1) } }
                  : n
              ),
            }),
            "UPDATE_CONFIGURATION",
            `Auto-remediated ${violation.rule_name}: Scaled database replicas to 2 for High Availability`,
            { nodeId: violation.node_ids[0], payload: { nodeIds: violation.node_ids } }
          );
        }
      } else if (violation.rule_id === "RULE-017") {
        // Service SPOF -> scale replicas to 2
        if (violation.node_ids.length > 0) {
          commitGraphChange(
            (prev) => ({
              ...prev,
              nodes: prev.nodes.map((n) =>
                violation.node_ids.includes(n.id)
                  ? { ...n, config: { ...n.config, replicas: Math.max(2, (n.config.replicas || 1) + 1) } }
                  : n
              ),
            }),
            "UPDATE_CONFIGURATION",
            `Auto-remediated ${violation.rule_name}: Scaled compute service replicas to 2`,
            { nodeId: violation.node_ids[0], payload: { nodeIds: violation.node_ids } }
          );
        }
      } else if (violation.rule_id === "RULE-002") {
        // Add API Gateway
        handleAddComponent("api_gateway", { x: 260, y: 180 });
      } else if (violation.rule_id === "RULE-003") {
        // Add Redis Cache
        handleAddComponent("redis", { x: 560, y: 110 });
      } else if (violation.rule_id === "RULE-006") {
        // Add CDN
        handleAddComponent("cdn", { x: 200, y: 120 });
      } else if (violation.rule_id === "RULE-012") {
        // Add Kafka Queue
        handleAddComponent("kafka", { x: 520, y: 260 });
      }
    },
    [commitGraphChange, handleAddComponent]
  );

  // Connect Components
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      const edgeId = `e-${params.source}-${params.target}-${Date.now().toString().slice(-3)}`;
      const newEdge: ArchitectureEdge = {
        id: edgeId,
        source: params.source,
        target: params.target,
        connectionType: "sync",
      };

      commitGraphChange(
        (prev) => ({
          ...prev,
          edges: [...prev.edges, newEdge],
        }),
        "CONNECT_COMPONENTS",
        `Connected '${params.source}' → '${params.target}' via Sync Request`,
        { edgeId, payload: { source: params.source, target: params.target } }
      );
      setSelectedEdgeId(edgeId);
    },
    [commitGraphChange]
  );

  // Delete Edge
  const handleDeleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    commitGraphChange(
      (prev) => ({
        ...prev,
        edges: prev.edges.filter((e) => e.id !== selectedEdgeId),
      }),
      "DISCONNECT_COMPONENTS",
      `Removed connection edge`,
      { edgeId: selectedEdgeId }
    );
    setSelectedEdgeId(null);
  }, [selectedEdgeId, commitGraphChange]);

  // Change Edge Connection Type
  const handleUpdateConnectionType = useCallback(
    (newType: ConnectionType) => {
      if (!selectedEdgeId) return;
      commitGraphChange(
        (prev) => ({
          ...prev,
          edges: prev.edges.map((e) =>
            e.id === selectedEdgeId ? { ...e, connectionType: newType } : e
          ),
        }),
        "CHANGE_CONNECTION_TYPE",
        `Changed connection type to '${newType}'`,
        { edgeId: selectedEdgeId, payload: { connectionType: newType } }
      );
    },
    [selectedEdgeId, commitGraphChange]
  );

  // Drag & Drop Handlers with Contextual Fallbacks for 100% Reliability
  const onDragStart = (event: React.DragEvent, compType: string) => {
    draggedTypeRef.current = compType;
    setDraggedType(compType);
    if (typeof window !== "undefined") {
      (window as any).__draggedComponentType = compType;
    }
    try {
      event.dataTransfer.setData("application/reactflow", compType);
      event.dataTransfer.setData("text/plain", compType);
      event.dataTransfer.setData("text", compType);
      event.dataTransfer.setData("application/reactflow/type", compType);
    } catch {}
    event.dataTransfer.effectAllowed = "copyMove";
  };

  const onDragEnd = () => {
    setIsDragOverCanvas(false);
    setTimeout(() => {
      draggedTypeRef.current = null;
      setDraggedType(null);
      if (typeof window !== "undefined") {
        (window as any).__draggedComponentType = null;
      }
    }, 400);
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOverCanvas(true);
  }, []);

  const onDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOverCanvas(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    // Only reset if exiting outer main boundaries
    const rect = reactFlowWrapper.current?.getBoundingClientRect();
    if (
      rect &&
      (event.clientX <= rect.left ||
        event.clientX >= rect.right ||
        event.clientY <= rect.top ||
        event.clientY >= rect.bottom)
    ) {
      setIsDragOverCanvas(false);
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOverCanvas(false);

      let compType: string | null = null;
      try {
        compType =
          event.dataTransfer?.getData("application/reactflow") ||
          event.dataTransfer?.getData("text/plain") ||
          event.dataTransfer?.getData("text") ||
          event.dataTransfer?.getData("application/reactflow/type") ||
          null;
      } catch {}

      if (!compType || compType.trim() === "") {
        compType =
          draggedTypeRef.current ||
          draggedType ||
          (typeof window !== "undefined" ? (window as any).__draggedComponentType : null);
      }

      if (!compType) {
        console.warn("Could not determine dropped component type");
        return;
      }

      let position = { x: 400, y: 220 };
      if (reactFlowInstance?.screenToFlowPosition) {
        try {
          const flowPos = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });
          if (
            typeof flowPos.x === "number" &&
            !isNaN(flowPos.x) &&
            typeof flowPos.y === "number" &&
            !isNaN(flowPos.y)
          ) {
            position = flowPos;
          }
        } catch (err) {
          console.warn("screenToFlowPosition failed, fallback to offset:", err);
          if (reactFlowWrapper.current) {
            const bounds = reactFlowWrapper.current.getBoundingClientRect();
            position = {
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top,
            };
          }
        }
      } else if (reactFlowWrapper.current) {
        const bounds = reactFlowWrapper.current.getBoundingClientRect();
        position = {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        };
      }

      handleAddComponent(compType, position);

      setTimeout(() => {
        draggedTypeRef.current = null;
        setDraggedType(null);
        if (typeof window !== "undefined") {
          (window as any).__draggedComponentType = null;
        }
      }, 300);
    },
    [reactFlowInstance, handleAddComponent, draggedType]
  );

  // --------------------------------------------------------------------------
  // AI ARCHITECT LOGIC & GRAPH MUTATIONS (PHASE 4)
  // --------------------------------------------------------------------------
  const handleFetchCritique = useCallback(async () => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const response = await fetchAIArchitectCritique(graphState, {
        target_rps: graphState.metadata.targetRps,
        problem_id: graphState.metadata.problemId,
      });
      setAiCritique(response);
    } catch (err: any) {
      console.error("AI Architect error:", err);
      setAiError(err.message || "Failed to analyze architecture.");
    } finally {
      setIsAiLoading(false);
    }
  }, [graphState]);

  const handleApplySuggestion = useCallback(
    (suggestion: AIArchitectSuggestion) => {
      const action = suggestion.action || "";
      const parts = action.split(":");
      const actionType = parts[0];

      if (actionType === "add_component") {
        const rawType = parts[1] || "redis";
        let compType = rawType;
        if (rawType === "cache") compType = "redis";
        if (rawType === "queue") compType = "kafka";
        if (rawType === "database") compType = "postgresql";
        if (rawType === "service") compType = "server";

        const nodeCount = graphState.nodes.length;
        const targetPos = {
          x: 420 + ((nodeCount * 55) % 280),
          y: 130 + ((nodeCount * 40) % 220),
        };
        handleAddComponent(compType, targetPos);
      } else if (actionType === "scale") {
        const targetCategoryOrType = parts[1] || "service";
        const replicaCount = parseInt(parts[2]) || 2;

        const matchingNodes = graphState.nodes.filter(
          (n) =>
            n.id === targetCategoryOrType ||
            n.type === targetCategoryOrType ||
            n.category === targetCategoryOrType ||
            (targetCategoryOrType === "database" &&
              (n.category === "database" ||
                n.type === "postgresql" ||
                n.type === "mysql" ||
                n.type === "cassandra" ||
                n.type === "mongodb")) ||
            (targetCategoryOrType === "service" &&
              (n.category === "compute" || n.type === "server" || n.type === "microservice"))
        );

        if (matchingNodes.length > 0) {
          commitGraphChange(
            (prev) => ({
              ...prev,
              nodes: prev.nodes.map((n) =>
                matchingNodes.some((mn) => mn.id === n.id)
                  ? {
                      ...n,
                      config: {
                        ...n.config,
                        replicas: Math.max(replicaCount, (n.config.replicas || 1) + 1),
                      },
                    }
                  : n
              ),
            }),
            "UPDATE_CONFIGURATION",
            `AI Architect Applied: Scaled ${targetCategoryOrType} replicas to ${replicaCount} (${suggestion.title})`,
            { payload: { action, suggestionTitle: suggestion.title } }
          );
        } else {
          commitGraphChange(
            (prev) => ({
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.category === "compute" || n.category === "database"
                  ? { ...n, config: { ...n.config, replicas: replicaCount } }
                  : n
              ),
            }),
            "UPDATE_CONFIGURATION",
            `AI Architect Applied: Scaled replicas to ${replicaCount} (${suggestion.title})`,
            { payload: { action } }
          );
        }
      } else if (actionType === "connect") {
        const sourceId = parts[1];
        const targetId = parts[2];
        if (sourceId && targetId) {
          const edgeId = `e-${sourceId}-${targetId}-${Date.now().toString().slice(-3)}`;
          commitGraphChange(
            (prev) => ({
              ...prev,
              edges: [
                ...prev.edges,
                {
                  id: edgeId,
                  source: sourceId,
                  target: targetId,
                  connectionType: "sync",
                },
              ],
            }),
            "CONNECT_COMPONENTS",
            `AI Architect Applied: Connected '${sourceId}' → '${targetId}'`,
            { edgeId }
          );
        }
      }

      setAppliedSuggestions((prev) => new Set(prev).add(suggestion.title));
    },
    [graphState.nodes, handleAddComponent, commitGraphChange]
  );

  // --------------------------------------------------------------------------
  // PHASE 5: SIMULATION ACTIONS & REMEDIATION
  // --------------------------------------------------------------------------
  const handleSelectPreset = useCallback(
    (preset: TrafficPreset) => {
      setActivePresetId(preset.id);
      setBackendSimResult(null);
      setTrafficProfile((prev) => ({
        ...prev,
        ...preset.profile,
      }));
      setSimTickIndex(0);
      showToast(`Applied preset: ${preset.name} (${preset.badge})`);
    },
    [showToast]
  );

  const handleApplySimulationFix = useCallback(
    (action: string) => {
      if (!action) return;
      setBackendSimResult(null);

      if (action.startsWith("scale:")) {
        const parts = action.split(":");
        const targetNodeId = parts[1];
        const replicaCount = parseInt(parts[2], 10) || 3;
        const targetNode = graphState.nodes.find((n) => n.id === targetNodeId);

        commitGraphChange(
          (prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) =>
              n.id === targetNodeId
                ? { ...n, config: { ...n.config, replicas: replicaCount } }
                : n
            ),
          }),
          "SCALE_COMPONENT",
          `Scaled ${targetNode?.name || targetNodeId} to ${replicaCount} replicas to relieve primary bottleneck`,
          { nodeId: targetNodeId, payload: { replicaCount } }
        );
        showToast(`⚡ Scaled ${targetNode?.name || targetNodeId} to ${replicaCount} replicas!`);
      } else if (action.startsWith("add_component:")) {
        const compType = action.split(":")[1] || "redis";
        const bNode = graphState.nodes.find((n) => n.id === activeSimulationResult.bottleneck_node_id);
        const posX = bNode ? bNode.position.x - 130 : 500;
        const posY = bNode ? bNode.position.y - 90 : 150;

        handleAddComponent(compType, { x: Math.max(50, posX), y: Math.max(50, posY) });
        showToast(`⚡ Added ${compType.toUpperCase()} to canvas to relieve primary bottleneck!`);
      }
    },
    [graphState.nodes, activeSimulationResult.bottleneck_node_id, commitGraphChange, handleAddComponent, showToast]
  );

  const handleRunBackendTrace = useCallback(async () => {
    setIsBackendSimulating(true);
    try {
      const res = await runBackendSimulation(graphState, trafficProfile);
      setBackendSimResult(res);
      setSimTickIndex(0);
      showToast("Discrete event simulation trace completed via Backend Engine!");
    } catch (err) {
      showToast("Backend simulation failed, running client simulation.");
    } finally {
      setIsBackendSimulating(false);
    }
  }, [graphState, trafficProfile, showToast]);

  // --------------------------------------------------------------------------
  // PHASE 6: CHAOS FAILURE INJECTION HANDLERS
  // --------------------------------------------------------------------------
  const handleTriggerChaos = useCallback((failureType: ChaosFailureType, targetId?: string) => {
    setBackendSimResult(null);
    setActiveChaosFailure(failureType);
    setChaosTargetNodeId(targetId || null);
    setSimTickIndex(0);

    if (failureType === "NONE" || failureType === "HEAL_SYSTEM") {
      showToast("🟢 Chaos healed: All systems restored to healthy state!");
    } else {
      showToast(`💥 Injected fault: ${failureType.replace(/_/g, " ")}`);
    }
  }, [showToast]);

  // --------------------------------------------------------------------------
  // PHASE 7: INTERVIEW MODE HANDLERS
  // --------------------------------------------------------------------------
  const handleSendInterviewTurn = useCallback(() => {
    if (!interviewInput.trim() || isInterviewCritiqueLoading) return;
    const candidateMsgText = interviewInput.trim();
    setInterviewInput("");

    const userMsg: InterviewMessage = {
      id: `msg-${Date.now()}-c`,
      sender: "candidate",
      text: candidateMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setInterviewMessages((prev) => [...prev, userMsg]);
    setIsInterviewCritiqueLoading(true);

    setTimeout(() => {
      const evalResult = evaluateInterviewTurn(
        interviewStage,
        candidateMsgText,
        graphState,
        interviewScores
      );

      const aiMsg: InterviewMessage = {
        id: `msg-${Date.now()}-i`,
        sender: "interviewer",
        text: evalResult.interviewerReply,
        feedback: evalResult.feedback,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setInterviewMessages((prev) => [...prev, aiMsg]);
      setInterviewScores(evalResult.updatedScores);
      if (evalResult.readyForNext) {
        setInterviewStage(evalResult.nextStage);
        showToast(`Advanced to Stage ${evalResult.nextStage}: ${INTERVIEW_STAGES[evalResult.nextStage - 1]?.title}`);
      }
      setIsInterviewCritiqueLoading(false);
    }, 450);
  }, [interviewInput, isInterviewCritiqueLoading, interviewStage, graphState, interviewScores, showToast]);

  const handleRequestInterviewHint = useCallback(() => {
    const currentStageInfo = INTERVIEW_STAGES.find((s) => s.stage === interviewStage) || INTERVIEW_STAGES[0];
    const hintMsg: InterviewMessage = {
      id: `msg-${Date.now()}-h`,
      sender: "interviewer",
      text: `💡 **Staff Architect Hint**: ${currentStageInfo.hint}`,
      is_hint: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setInterviewMessages((prev) => [...prev, hintMsg]);
  }, [interviewStage]);

  const handleRestartInterview = useCallback(() => {
    const init = getInitialInterviewState();
    setInterviewMessages(init.messages);
    setInterviewScores(init.scores);
    setInterviewStage(1);
    showToast("Restarted System Design Interview session");
  }, [showToast]);

  // Restore past architecture version snapshot (Phase 8)
  const handleRestoreVersion = useCallback((versionNum: number) => {
    const targetGraph = history.find((h) => h.metadata.version === versionNum);
    if (targetGraph) {
      setGraphState(targetGraph);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      showToast(`↺ Restored architecture canvas to version ${versionNum}`);
    }
  }, [history, showToast]);


  // Node Drag on Canvas
  const onNodesChange = useCallback((changes: any) => {
    const hasMeaningfulChange = changes.some(
      (c: any) => (c.type === "position" && c.position) || c.type === "remove"
    );
    if (!hasMeaningfulChange) return;

    setGraphState((prev) => {
      const updatedFlowNodes = applyNodeChanges(
        changes,
        prev.nodes.map((n) => ({
          id: n.id,
          type: "simulatorCustomNode",
          position: n.position,
          initialWidth: 210,
          initialHeight: 80,
          data: { archNode: n },
        }))
      );
      return {
        ...prev,
        nodes: prev.nodes
          .filter((n) => updatedFlowNodes.some((fn) => fn.id === n.id))
          .map((n) => {
            const match = updatedFlowNodes.find((fn) => fn.id === n.id);
            return match && match.position ? { ...n, position: match.position } : n;
          }),
      };
    });
  }, []);

  const onEdgesChange = useCallback((changes: any) => {
    setGraphState((prev) => {
      const updatedFlowEdges = applyEdgeChanges(
        changes,
        prev.edges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
      );
      return {
        ...prev,
        edges: prev.edges.filter((e) => updatedFlowEdges.some((fe) => fe.id === e.id)),
      };
    });
  }, []);

  // Active selected entities
  const activeNode = useMemo(
    () => graphState.nodes.find((n) => n.id === selectedNodeId) || null,
    [graphState.nodes, selectedNodeId]
  );

  const activeEdge = useMemo(
    () => graphState.edges.find((e) => e.id === selectedEdgeId) || null,
    [graphState.edges, selectedEdgeId]
  );

  // Filtered Violations & Counters
  const criticalCount = useMemo(
    () => validationResponse.violations.filter((v) => v.severity === "critical").length,
    [validationResponse.violations]
  );
  const warningCount = useMemo(
    () => validationResponse.violations.filter((v) => v.severity === "warning").length,
    [validationResponse.violations]
  );
  const infoCount = useMemo(
    () => validationResponse.violations.filter((v) => v.severity === "info").length,
    [validationResponse.violations]
  );

  const filteredViolations = useMemo(() => {
    return validationResponse.violations.filter((v) => {
      const matchSeverity = valSeverityFilter === "all" || v.severity === valSeverityFilter;
      const matchCategory = valCategoryFilter === "all" || v.category === valCategoryFilter;
      const matchSearch =
        !valSearchQuery ||
        v.rule_id.toLowerCase().includes(valSearchQuery.toLowerCase()) ||
        v.rule_name.toLowerCase().includes(valSearchQuery.toLowerCase()) ||
        v.message.toLowerCase().includes(valSearchQuery.toLowerCase());
      return matchSeverity && matchCategory && matchSearch;
    });
  }, [validationResponse.violations, valSeverityFilter, valCategoryFilter, valSearchQuery]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#050914] text-slate-200">
      {/* ==================================================================== */}
      {/* TOP BAR — DEVELOPER TOOL HEADER                                      */}
      {/* ==================================================================== */}
      <header className="h-14 border-b border-white/[0.08] bg-[#070d1a]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-40">
        {/* Left: Brand & Problem Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 p-[1px] shadow-md shadow-cyan-500/20">
              <div className="w-full h-full bg-[#050914] rounded-[7px] flex items-center justify-center">
                <Layers className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white font-display leading-tight">
                Design<span className="text-cyan-400">Karo</span>
              </span>
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">
                Simulator v2
              </span>
            </div>
          </Link>

          <div className="h-5 w-[1px] bg-white/[0.08] hidden sm:block" />

          {/* Problem Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-mono text-white">
            <span className="text-slate-400 font-normal">Problem:</span>
            <span className="font-bold text-cyan-300">{graphState.metadata.title}</span>
          </div>

          {/* Graph Status Pill with Live Deterministic Health Score */}
          <button
            onClick={() => setShowValidationDrawer(true)}
            className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition ${
              validationResponse.status === "PASS"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                : validationResponse.status === "NEEDS_IMPROVEMENT"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                : "border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 animate-pulse"
            }`}
            title="Inspect Deterministic Rule Engine Violations & Invariants"
          >
            {validationResponse.status === "PASS" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : validationResponse.status === "NEEDS_IMPROVEMENT" ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className="font-bold">{validationResponse.health_score}%</span>
            <span className="text-[10px] text-slate-400">
              {validationResponse.violations.length === 0
                ? "Clean"
                : `${validationResponse.violations.length} Issues`}
            </span>
          </button>

          {/* Monthly Cost Badge */}
          <button
            onClick={() => setShowValidationDrawer(true)}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-xs font-mono text-slate-300 transition"
            title="Estimated Monthly Cloud Infrastructure Cost"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>${validationResponse.estimated_monthly_cost.toLocaleString()}/mo</span>
          </button>
        </div>

        {/* Center: Stage Pills */}
        <div className="hidden xl:flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-white/[0.08] text-xs font-mono">
          <button
            onClick={() => setActiveTab("requirements")}
            className={`px-3 py-1 rounded-lg transition ${
              activeTab === "requirements"
                ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Requirements
          </button>
          <button
            onClick={() => setActiveTab("architecture")}
            className={`px-3 py-1 rounded-lg transition ${
              activeTab === "architecture"
                ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Architecture
          </button>
          <button
            onClick={() => setActiveTab("simulation")}
            className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "simulation"
                ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>Simulation</span>
            {activeSimulationResult.bottleneck_node_id && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("evaluation")}
            className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "evaluation"
                ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>Evaluation</span>
          </button>
        </div>

        {/* Right: Undo / Redo, Event Stream Toggle, Timer */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Undo / Redo Controls */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-white/[0.08] bg-slate-900/60 text-xs font-mono">
            <button
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className={`p-1.5 rounded-md transition ${
                historyIndex > 0
                  ? "text-slate-200 hover:text-cyan-300 hover:bg-white/[0.06]"
                  : "text-slate-600 cursor-not-allowed"
              }`}
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className={`p-1.5 rounded-md transition ${
                historyIndex < history.length - 1
                  ? "text-slate-200 hover:text-cyan-300 hover:bg-white/[0.06]"
                  : "text-slate-600 cursor-not-allowed"
              }`}
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* AI System Architect Drawer Toggle Button (Phase 4) */}
          <button
            onClick={() => {
              const next = !showAiDrawer;
              setShowAiDrawer(next);
              if (next) setShowValidationDrawer(false);
              if (next && !aiCritique && !isAiLoading) {
                handleFetchCritique();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition shadow-sm ${
              showAiDrawer
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                : "border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400/60"
            }`}
            title="Consult AI System Architect for Live Topology Critique & Actionable Advice"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>AI Architect</span>
            {isAiLoading ? (
              <RefreshCw className="w-2.5 h-2.5 text-cyan-400 animate-spin" />
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Live
              </span>
            )}
          </button>

          {/* Phase 7: Socratic System Design Interview Mode Button */}
          <button
            onClick={() => setShowInterviewModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition shadow-sm bg-gradient-to-r from-violet-600/25 via-indigo-600/20 to-cyan-600/20 border-violet-500/40 text-violet-300 hover:border-violet-400 hover:text-white shadow-[0_0_12px_rgba(139,92,246,0.2)]"
            title="Launch Interactive Socratic System Design Interview"
          >
            <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Interview</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-violet-500/25 text-violet-200 border border-violet-500/40">
              Stage {interviewStage}/9
            </span>
          </button>

          {/* Rules & Invariants Drawer Toggle Button */}
          <button

            onClick={() => {
              const next = !showValidationDrawer;
              setShowValidationDrawer(next);
              if (next) setShowAiDrawer(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition ${
              showValidationDrawer
                ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                : validationResponse.violations.some((v) => v.severity === "critical")
                ? "border-red-500/50 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                : validationResponse.violations.length > 0
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                : "border-white/[0.08] bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]"
            }`}
            title="Toggle Deterministic Rule Violations & Architectural Invariants"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Rules</span>
            {validationResponse.violations.length > 0 ? (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  validationResponse.violations.some((v) => v.severity === "critical")
                    ? "bg-red-500 text-white"
                    : "bg-amber-500 text-slate-950"
                }`}
              >
                {validationResponse.violations.length}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                0
              </span>
            )}
          </button>

          {/* Event Stream & Graph Inspector Button */}
          <button
            onClick={() => setShowEventLog(!showEventLog)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition ${
              showEventLog
                ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                : "border-white/[0.08] bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]"
            }`}
            title="Toggle Architecture Event Stream & State Graph"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">Events ({events.length})</span>
          </button>

          {/* Timer Widget */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.02] text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. THREE-PANE MAIN WORKSPACE                                         */}
      {/* ==================================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ================================================================== */}
        {/* LEFT PANE: COMPONENT LIBRARY                                       */}
        {/* ================================================================== */}
        <aside className="w-64 sm:w-72 border-r border-white/[0.08] bg-[#070c18] flex flex-col shrink-0 z-20">
          <div className="p-3.5 border-b border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
              <span>COMPONENT LIBRARY</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                {filteredComponents.length} Blocks
              </span>
            </div>

            {/* Component Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search components..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
              {CATEGORY_LABELS.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition ${
                    selectedCategory === cat.key
                      ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                      : "text-slate-500 hover:text-slate-300 bg-white/[0.02]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Draggable Component Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredComponents.map((comp) => {
              const CompIcon = comp.icon;
              return (
                <div
                  key={comp.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, comp.type)}
                  onDragEnd={onDragEnd}
                  onClick={() => handleAddComponent(comp.type)}
                  className={`group p-2.5 rounded-xl border ${comp.borderClass} bg-slate-950/60 hover:bg-slate-900/90 transition-all cursor-grab active:cursor-grabbing shadow-sm flex items-center justify-between select-none`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg border ${comp.borderClass} ${comp.bgClass} ${comp.textClass} shrink-0 group-hover:scale-105 transition-transform`}
                    >
                      <CompIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors truncate">
                          {comp.name}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.04] text-slate-400 border border-white/[0.04]">
                          {comp.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-light truncate mt-0.5">
                        {comp.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddComponent(comp.type);
                    }}
                    title="Click to add component to canvas"
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-cyan-500/20 text-cyan-400 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-white/[0.06] bg-slate-950/60 text-[10px] font-mono text-slate-500 text-center">
            Drag onto canvas or click (+) to place
          </div>
        </aside>

        {/* ================================================================== */}
        {/* CENTER PANE: ARCHITECTURE CANVAS                                   */}
        {/* ================================================================== */}
        <main
          ref={reactFlowWrapper}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`flex-1 h-full relative bg-[#040814] transition-all duration-150 ${
            isDragOverCanvas ? "ring-2 ring-inset ring-cyan-500/50 bg-[#040c1d]" : ""
          }`}
        >
          {/* Visual Drop Overlay Hint */}
          {isDragOverCanvas && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-cyan-950/30 backdrop-blur-[1px] border-2 border-dashed border-cyan-400/60 rounded-lg m-2">
              <div className="px-4 py-2.5 rounded-xl bg-slate-900/95 border border-cyan-400/50 text-cyan-300 text-xs font-mono font-bold flex items-center gap-2.5 shadow-2xl shadow-cyan-500/30">
                <Plus className="w-4 h-4 text-cyan-400 animate-bounce" />
                <span>Drop anywhere to place component</span>
              </div>
            </div>
          )}

          {/* Placement Toast Notification */}
          {toastMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-500/40 text-white text-xs font-mono flex items-center gap-2 shadow-2xl shadow-cyan-500/20 backdrop-blur-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            </div>
          )}

          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_e, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(null);
            }}
            onEdgeClick={(_e, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            fitView
            fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }}
            minZoom={0.3}
            maxZoom={1.8}
            className="bg-[#050914]"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.5}
              color="#1e293b"
            />
            <Controls className="!bg-[#070c18] !border-white/[0.1] !rounded-xl !text-slate-300 [&>button]:!bg-transparent [&>button]:!border-white/[0.06] [&>button:hover]:!bg-white/[0.08]" />
          </ReactFlow>

          {/* Floating Action Bar */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-white/[0.08] backdrop-blur-md shadow-xl text-xs font-mono">
            <button
              onClick={() => reactFlowInstance.fitView({ padding: 0.2 })}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition"
              title="Fit View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                commitGraphChange(
                  (prev) => ({ ...prev, nodes: [], edges: [] }),
                  "CLEAR_ARCHITECTURE",
                  "Cleared entire canvas architecture"
                );
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Clear Canvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {selectedNodeId && (
              <>
                <div className="h-4 w-[1px] bg-white/[0.08]" />
                <button
                  onClick={handleDuplicateNode}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition"
                  title="Duplicate Node"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDeleteSelectedNode}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Delete Selected Node (Del)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {selectedEdgeId && (
              <>
                <div className="h-4 w-[1px] bg-white/[0.08]" />
                <button
                  onClick={handleDeleteSelectedEdge}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Delete Selected Edge (Del)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Canvas Bottom Legend with Active Connection Indicators */}
          <div className="absolute bottom-4 left-4 z-10 hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/[0.06] backdrop-blur-md text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-[2px] bg-sky-400" />
              <span>Sync</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-[2px] border-b border-dashed border-amber-400" />
              <span>Async</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-[2px] border-b border-dotted border-sky-300" />
              <span>Replication</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-[2px] bg-emerald-400" />
              <span>Read</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-[2px] bg-rose-400" />
              <span>Write</span>
            </span>
          </div>
        </main>

        {/* ================================================================== */}
        {/* RIGHT PANE: CONFIGURATION DRAWER (NODE OR EDGE)                    */}
        {/* ================================================================== */}
        <aside
          className={`${
            activeTab === "simulation" || activeTab === "evaluation" ? "w-80 sm:w-[410px]" : "w-72 sm:w-80"
          } border-l border-white/[0.08] bg-[#070c18] flex flex-col shrink-0 z-20 transition-all duration-200`}
        >
          {activeTab === "simulation" ? (
            /* ============================================================== */
            /* PHASE 5 & 6: SIMULATION COCKPIT & CHAOS MODE PANEL            */
            /* ============================================================== */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Cockpit Header */}
              <div className="p-4 border-b border-white/[0.06] bg-slate-900/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                      Simulation Cockpit
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      M/M/c Queueing • Synthetic Load
                    </p>
                  </div>
                </div>

                {/* PROMINENT DISCLAIMER BADGE (Required by prompt) */}
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-[9px] font-mono font-bold text-amber-300 shadow-sm"
                  title="Estimated mathematical approximation based on queueing theory, not real production metrics"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Estimated Simulation</span>
                </div>
              </div>

              {/* Simulation Cockpit Sub-tab Selector */}
              <div className="flex border-b border-white/[0.08] bg-slate-950/70 p-1 shrink-0">
                <button
                  onClick={() => setSimulationSubTab("traffic")}
                  className={`flex-1 py-1.5 text-[11px] font-bold font-mono rounded-lg transition flex items-center justify-center gap-1.5 ${
                    simulationSubTab === "traffic"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Traffic Load</span>
                </button>
                <button
                  onClick={() => setSimulationSubTab("chaos")}
                  className={`flex-1 py-1.5 text-[11px] font-bold font-mono rounded-lg transition flex items-center justify-center gap-1.5 ${
                    simulationSubTab === "chaos"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>Chaos Mode</span>
                  {activeChaosFailure !== "NONE" && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </button>
              </div>

              {/* In-place Node Tuning Bar (if node selected) */}
              {activeNode && (
                <div className="px-4 py-2.5 bg-cyan-950/40 border-b border-cyan-500/30 flex items-center justify-between text-xs font-mono shrink-0">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 truncate">
                      <SlidersHorizontal className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{activeNode.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {activeNode.config?.replicas || 1}x Replicas • {(((activeNode.config?.replicas || 1) * (activeNode.config?.qps_capacity || 5000))).toLocaleString()} Max QPS
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        const curr = activeNode.config?.replicas || 1;
                        if (curr > 1) {
                          commitGraphChange(
                            (prev) => ({
                              ...prev,
                              nodes: prev.nodes.map((n) =>
                                n.id === activeNode.id
                                  ? { ...n, config: { ...n.config, replicas: curr - 1 } }
                                  : n
                              ),
                            }),
                            "SCALE_COMPONENT",
                            `Scaled down ${activeNode.name} to ${curr - 1} replicas`,
                            { nodeId: activeNode.id }
                          );
                        }
                      }}
                      disabled={(activeNode.config?.replicas || 1) <= 1}
                      className="w-6 h-6 rounded bg-slate-900 border border-white/[0.1] text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:text-slate-300 flex items-center justify-center font-bold text-xs"
                      title="Decrease Replicas"
                    >
                      -
                    </button>
                    <span className="w-7 text-center font-bold text-cyan-300 text-xs">
                      {activeNode.config?.replicas || 1}
                    </span>
                    <button
                      onClick={() => {
                        const curr = activeNode.config?.replicas || 1;
                        commitGraphChange(
                          (prev) => ({
                            ...prev,
                            nodes: prev.nodes.map((n) =>
                              n.id === activeNode.id
                                ? { ...n, config: { ...n.config, replicas: curr + 1 } }
                                : n
                            ),
                          }),
                          "SCALE_COMPONENT",
                          `Scaled up ${activeNode.name} to ${curr + 1} replicas`,
                          { nodeId: activeNode.id }
                        );
                      }}
                      className="w-6 h-6 rounded bg-slate-900 border border-white/[0.1] text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs"
                      title="Increase Replicas"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setSelectedNodeId(null)}
                      className="ml-1 p-1 text-slate-500 hover:text-white transition"
                      title="Deselect node"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Scrollable Cockpit Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
                {simulationSubTab === "traffic" ? (
                  <>
                    {/* 1. TRAFFIC PRESETS BAR */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Traffic Presets</span>
                        </span>
                        <span className="text-[10px] text-cyan-400">5 Scenarios</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {TRAFFIC_PRESETS.map((preset) => {
                          const isSelected = activePresetId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              onClick={() => handleSelectPreset(preset)}
                              className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                                isSelected
                                  ? "border-cyan-400 bg-cyan-500/15 text-white ring-1 ring-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                                  : "border-white/[0.08] bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-white/[0.15]"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold truncate">{preset.name}</span>
                                <span
                                  className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                                    isSelected ? "bg-cyan-950 text-cyan-300" : "bg-white/[0.06] text-slate-400"
                                  }`}
                                >
                                  {preset.badge}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-400 line-clamp-1 mt-1 font-light">
                                {preset.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. LIVE PARAMETER SLIDERS */}
                    <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-950/70 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Workload Controls</span>
                        </span>
                        <span className="text-[10px] text-cyan-400 font-normal">Realtime 60fps</span>
                      </div>

                      {/* Peak Target RPS Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Peak Ingress RPS</span>
                          <span className="font-bold text-cyan-300 font-mono">
                            {trafficProfile.peak_qps.toLocaleString()} RPS
                          </span>
                        </div>
                        <input
                          type="range"
                          min={5000}
                          max={250000}
                          step={5000}
                          value={trafficProfile.peak_qps}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setBackendSimResult(null);
                            setTrafficProfile((prev) => ({
                              ...prev,
                              peak_qps: val,
                              base_qps: Math.round(val * 0.2),
                            }));
                          }}
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                          <span>5K</span>
                          <span>50K</span>
                          <span>100K</span>
                          <span>250K</span>
                        </div>
                      </div>

                      {/* Concurrent Users Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Concurrent Users</span>
                          <span className="font-bold text-cyan-300 font-mono">
                            {trafficProfile.concurrent_users.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10000}
                          max={2000000}
                          step={10000}
                          value={trafficProfile.concurrent_users}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setBackendSimResult(null);
                            setTrafficProfile((prev) => ({ ...prev, concurrent_users: val }));
                          }}
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                        />
                      </div>

                      {/* Read / Write Ratio Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Read / Write Ratio</span>
                          <span className="font-bold font-mono">
                            <span className="text-emerald-400">
                              {Math.round(trafficProfile.read_ratio * 100)}% Read
                            </span>
                            <span className="text-slate-500"> / </span>
                            <span className="text-rose-400">
                              {Math.round((1 - trafficProfile.read_ratio) * 100)}% Write
                            </span>
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.05}
                          max={0.99}
                          step={0.05}
                          value={trafficProfile.read_ratio}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setBackendSimResult(null);
                            setTrafficProfile((prev) => ({ ...prev, read_ratio: val }));
                          }}
                          className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                        />
                      </div>

                      {/* Cache Hit Ratio Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Cache Hit Ratio</span>
                          <span className="font-bold text-rose-300 font-mono">
                            {Math.round(trafficProfile.cache_hit_ratio * 100)}% Hit
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={0.99}
                          step={0.05}
                          value={trafficProfile.cache_hit_ratio}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setBackendSimResult(null);
                            setTrafficProfile((prev) => ({ ...prev, cache_hit_ratio: val }));
                          }}
                          className="w-full accent-rose-400 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                        />
                      </div>

                      {/* Payload Size & Network Latency */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Payload</span>
                            <span className="font-bold text-slate-200">{trafficProfile.payload_kb} KB</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={50}
                            step={1}
                            value={trafficProfile.payload_kb}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setBackendSimResult(null);
                              setTrafficProfile((prev) => ({ ...prev, payload_kb: val }));
                            }}
                            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Net Latency</span>
                            <span className="font-bold text-slate-200">
                              {trafficProfile.network_latency_ms} ms
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={100}
                            step={1}
                            value={trafficProfile.network_latency_ms}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setBackendSimResult(null);
                              setTrafficProfile((prev) => ({ ...prev, network_latency_ms: val }));
                            }}
                            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ========================================================== */
                  /* PHASE 6: CHAOS FAULT INJECTION CONTROLS                   */
                  /* ========================================================== */
                  <div className="space-y-3.5">
                    {/* Chaos Mode Header Card */}
                    <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-950/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            <Flame className="w-4 h-4 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-rose-300 font-mono uppercase tracking-wide">
                              Chaos Engineering
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              Inject failures & inspect fault tolerance
                            </p>
                          </div>
                        </div>
                        {activeChaosFailure !== "NONE" && (
                          <button
                            onClick={() => handleTriggerChaos("HEAL_SYSTEM")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Heal All</span>
                          </button>
                        )}
                      </div>

                      {/* Component Selector */}
                      <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">Target:</span>
                        <select
                          value={chaosTargetNodeId || ""}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            setChaosTargetNodeId(val);
                            if (activeChaosFailure !== "NONE") {
                              handleTriggerChaos(activeChaosFailure, val || undefined);
                            }
                          }}
                          className="bg-slate-900 border border-white/[0.1] rounded-lg px-2 py-1 text-[10px] text-slate-200 font-mono focus:outline-none focus:border-rose-500 max-w-[200px] truncate"
                        >
                          <option value="">Auto-Detect by Failure Type</option>
                          {graphState.nodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.name} ({n.type})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Active Chaos Incident Card */}
                    {activeChaosFailure !== "NONE" && activeSimulationResult.chaos_incident_report && (
                      <div className="p-3.5 rounded-2xl border border-rose-500/60 bg-gradient-to-br from-rose-950/50 via-slate-950 to-slate-900 shadow-[0_0_25px_rgba(244,63,94,0.25)] space-y-3">
                        <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 font-mono">
                              Incident: {activeSimulationResult.chaos_incident_report.title}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            {activeSimulationResult.chaos_incident_report.severity}
                          </span>
                        </div>

                        {/* What Happened */}
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>What Happened?</span>
                          </div>
                          <p className="text-[10px] text-slate-300 font-light leading-relaxed bg-slate-900/80 p-2 rounded-lg border border-white/[0.05]">
                            {activeSimulationResult.chaos_incident_report.what_happened}
                          </p>
                        </div>

                        {/* Why It Happened */}
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                            <Info className="w-3 h-3 text-amber-400" />
                            <span>Why It Happened?</span>
                          </div>
                          <p className="text-[10px] text-slate-300 font-light leading-relaxed bg-slate-900/80 p-2 rounded-lg border border-white/[0.05]">
                            {activeSimulationResult.chaos_incident_report.why_it_happened}
                          </p>
                        </div>

                        {/* Mitigation */}
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-cyan-400" />
                            <span>Recommended Mitigation</span>
                          </div>
                          <p className="text-[10px] text-cyan-200 font-light leading-relaxed bg-cyan-950/40 p-2 rounded-lg border border-cyan-500/30">
                            {activeSimulationResult.chaos_incident_report.mitigation}
                          </p>
                        </div>

                        <div className="pt-1">
                          <button
                            onClick={() => handleTriggerChaos("HEAL_SYSTEM")}
                            className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] font-mono transition flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Heal & Restore Healthy State</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Fault Scenarios Grid */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Inject Fault Scenarios</span>
                        <span className="text-[10px] text-rose-400 font-mono">8 Failure Modes</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* 1. Kill Redis */}
                        <button
                          onClick={() => handleTriggerChaos("KILL_REDIS", chaosTargetNodeId || undefined)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            activeChaosFailure === "KILL_REDIS"
                              ? "border-rose-500 bg-rose-500/20 text-white ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                              : "border-white/[0.08] bg-slate-950/60 text-slate-300 hover:border-rose-500/40 hover:bg-rose-950/10"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-[11px] text-rose-300 flex items-center gap-1">
                              <Database className="w-3 h-3 text-rose-400" /> Kill Redis
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-950 text-rose-400">Cache</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">
                            0% cache hits, thunderous DB stampede.
                          </p>
                        </button>

                        {/* 2. Kill DB */}
                        <button
                          onClick={() => handleTriggerChaos("KILL_POSTGRES", chaosTargetNodeId || undefined)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            activeChaosFailure === "KILL_POSTGRES"
                              ? "border-rose-500 bg-rose-500/20 text-white ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                              : "border-white/[0.08] bg-slate-950/60 text-slate-300 hover:border-rose-500/40 hover:bg-rose-950/10"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-[11px] text-rose-300 flex items-center gap-1">
                              <Database className="w-3 h-3 text-rose-400" /> Kill DB
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-950 text-rose-400">DB</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">
                            Primary DB down, 100% write failures.
                          </p>
                        </button>

                        {/* 3. Kill Kafka */}
                        <button
                          onClick={() => handleTriggerChaos("KILL_KAFKA", chaosTargetNodeId || undefined)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            activeChaosFailure === "KILL_KAFKA"
                              ? "border-rose-500 bg-rose-500/20 text-white ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                              : "border-white/[0.08] bg-slate-950/60 text-slate-300 hover:border-rose-500/40 hover:bg-rose-950/10"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-[11px] text-rose-300 flex items-center gap-1">
                              <Radio className="w-3 h-3 text-rose-400" /> Kill Kafka
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-950 text-rose-400">Queue</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">
                            Message broker down, buffer saturation.
                          </p>
                        </button>

                        {/* 4. Kill App Server */}
                        <button
                          onClick={() => handleTriggerChaos("KILL_APP_SERVER", chaosTargetNodeId || undefined)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            activeChaosFailure === "KILL_APP_SERVER"
                              ? "border-rose-500 bg-rose-500/20 text-white ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                              : "border-white/[0.08] bg-slate-950/60 text-slate-300 hover:border-rose-500/40 hover:bg-rose-950/10"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-[11px] text-rose-300 flex items-center gap-1">
                              <Server className="w-3 h-3 text-rose-400" /> Crash Server
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-950 text-rose-400">Pod</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">
                            Node crash, load cascades to remaining pods.
                          </p>
                        </button>

                        {/* 5. Latency Spike */}
                        <button
                          onClick={() => handleTriggerChaos("LATENCY_SPIKE", chaosTargetNodeId || undefined)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            activeChaosFailure === "LATENCY_SPIKE"
                              ? "border-amber-500 bg-amber-500/20 text-white ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                              : "border-white/[0.08] bg-slate-950/60 text-slate-300 hover:border-amber-500/40 hover:bg-amber-950/10"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-[11px] text-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" /> +500ms Latency
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950 text-amber-400">Lag</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">
                            Cross-region transit latency & queue backpressure.
                          </p>
                        </button>

                        {/* 6. Drop Requests */}
                        <button
                          onClick={() => handleTriggerChaos("DROP_REQUESTS", chaosTargetNodeId || undefined)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            activeChaosFailure === "DROP_REQUESTS"
                              ? "border-amber-500 bg-amber-500/20 text-white ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                              : "border-white/[0.08] bg-slate-950/60 text-slate-300 hover:border-amber-500/40 hover:bg-amber-950/10"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-[11px] text-amber-300 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" /> Drop 30%
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950 text-amber-400">Loss</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">
                            Packet loss triggers aggressive retry storms.
                          </p>
                        </button>

                        {/* 7. DB Pool Exhaustion */}
                        <button
                          onClick={() => handleTriggerChaos("DB_OVERLOAD", chaosTargetNodeId || undefined)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            activeChaosFailure === "DB_OVERLOAD"
                              ? "border-rose-500 bg-rose-500/20 text-white ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                              : "border-white/[0.08] bg-slate-950/60 text-slate-300 hover:border-rose-500/40 hover:bg-rose-950/10"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-[11px] text-rose-300 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-rose-400" /> DB Saturation
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-950 text-rose-400">Locks</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">
                            Pool exhausted, gateway 504 timeouts.
                          </p>
                        </button>

                        {/* 8. Cache Cold-Start */}
                        <button
                          onClick={() => handleTriggerChaos("CACHE_FAILURE", chaosTargetNodeId || undefined)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            activeChaosFailure === "CACHE_FAILURE"
                              ? "border-amber-500 bg-amber-500/20 text-white ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                              : "border-white/[0.08] bg-slate-950/60 text-slate-300 hover:border-amber-500/40 hover:bg-amber-950/10"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-[11px] text-amber-300 flex items-center gap-1">
                              <Cpu className="w-3 h-3 text-amber-400" /> Cold-Start
                            </span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950 text-amber-400">Cold</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">
                            Key eviction wave & sudden query spike.
                          </p>
                        </button>
                      </div>

                      {/* Heal Button */}
                      <button
                        onClick={() => handleTriggerChaos("HEAL_SYSTEM")}
                        className="w-full py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm mt-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Heal Injected Faults & Restore Health</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. ESTIMATED METRICS TELEMETRY GRID */}
                <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-950/70 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Estimated Telemetry</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                      Estimated
                    </span>
                  </div>

                  {/* Throughput Metric */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Throughput Delivered</div>
                        <div className="text-xl font-bold font-mono text-cyan-300">
                          {activeSimulationResult.throughput_qps.toLocaleString()}{" "}
                          <span className="text-xs text-slate-400">RPS</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Peak Target</div>
                        <div className="text-xs font-mono text-slate-300">
                          {trafficProfile.peak_qps.toLocaleString()} RPS
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/[0.04]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          activeSimulationResult.error_rate > 5
                            ? "bg-gradient-to-r from-amber-500 to-red-500"
                            : "bg-cyan-400"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (activeSimulationResult.throughput_qps /
                                Math.max(1, trafficProfile.peak_qps)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Latency Percentiles Pill */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                      <div className="text-[10px] text-slate-400">p50</div>
                      <div className="text-xs font-bold font-mono text-slate-200 mt-0.5">
                        {activeSimulationResult.p50_latency_ms}ms
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                      <div className="text-[10px] text-slate-400">p95</div>
                      <div className="text-xs font-bold font-mono text-amber-300 mt-0.5">
                        {activeSimulationResult.p95_latency_ms}ms
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                      <div className="text-[10px] text-slate-400">p99</div>
                      <div
                        className={`text-xs font-bold font-mono mt-0.5 ${
                          activeSimulationResult.p99_latency_ms >= 150
                            ? "text-red-400"
                            : "text-emerald-300"
                        }`}
                      >
                        {activeSimulationResult.p99_latency_ms}ms
                      </div>
                    </div>
                  </div>

                  {/* Error Rate & Dropped Requests */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activeSimulationResult.error_rate > 0
                            ? "bg-red-400 animate-pulse"
                            : "bg-emerald-400"
                        }`}
                      />
                      <span className="text-[11px] text-slate-300">
                        {activeSimulationResult.error_rate > 0
                          ? `${activeSimulationResult.error_rate}% Error Rate`
                          : "0.0% Error Rate"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {activeSimulationResult.dropped_requests.toLocaleString()} dropped
                    </span>
                  </div>

                  {/* Resource Saturation Meters */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Hardware Saturation
                    </div>

                    {/* CPU */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">CPU Compute Load</span>
                        <span
                          className={`font-mono font-bold ${
                            activeSimulationResult.cpu_utilization >= 85
                              ? "text-red-400"
                              : activeSimulationResult.cpu_utilization >= 70
                              ? "text-amber-400"
                              : "text-slate-200"
                          }`}
                        >
                          {activeSimulationResult.cpu_utilization}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/[0.04]">
                        <div
                          className={`h-full transition-all duration-300 ${
                            activeSimulationResult.cpu_utilization >= 85
                              ? "bg-red-500"
                              : activeSimulationResult.cpu_utilization >= 70
                              ? "bg-amber-400"
                              : "bg-cyan-400"
                          }`}
                          style={{
                            width: `${Math.min(100, activeSimulationResult.cpu_utilization)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Memory */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Memory Pressure</span>
                        <span className="font-mono font-bold text-slate-200">
                          {activeSimulationResult.memory_utilization}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/[0.04]">
                        <div
                          className="h-full bg-indigo-400 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, activeSimulationResult.memory_utilization)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Database IOPS */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Database IOPS Load</span>
                        <span
                          className={`font-mono font-bold ${
                            activeSimulationResult.database_utilization >= 85
                              ? "text-red-400"
                              : activeSimulationResult.database_utilization >= 70
                              ? "text-amber-400"
                              : "text-slate-200"
                          }`}
                        >
                          {activeSimulationResult.database_utilization}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/[0.04]">
                        <div
                          className={`h-full transition-all duration-300 ${
                            activeSimulationResult.database_utilization >= 85
                              ? "bg-red-500"
                              : activeSimulationResult.database_utilization >= 70
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          }`}
                          style={{
                            width: `${Math.min(100, activeSimulationResult.database_utilization)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Queue Depth */}
                    <div className="flex items-center justify-between text-[10px] pt-1 text-slate-400">
                      <span>Message Queue Backlog</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {activeSimulationResult.queue_depth.toLocaleString()} msgs
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. AUTOMATED PRIMARY BOTTLENECK IDENTIFICATION & REMEDIATION */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-400" />
                    <span>Bottleneck Analysis</span>
                  </div>

                  {activeSimulationResult.bottleneck_node_id ? (
                    <div className="p-3.5 rounded-2xl border border-red-500/50 bg-gradient-to-br from-red-950/40 via-[#130b12] to-slate-950 shadow-xl shadow-red-950/20 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-red-600 text-white uppercase tracking-wider shadow-sm animate-pulse">
                              PRIMARY BOTTLENECK
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {activeSimulationResult.bottleneck_type}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white mt-1.5">
                            {activeSimulationResult.bottleneck_node_name}
                          </h4>
                        </div>

                        <span className="text-xs font-mono font-bold text-red-400 bg-red-950/80 px-2 py-1 rounded-lg border border-red-800/60">
                          {activeSimulationResult.bottleneck_utilization}% Saturated
                        </span>
                      </div>

                      {/* First Principles Queueing Explanation */}
                      <p className="text-[11px] text-slate-200 font-light leading-relaxed">
                        {activeSimulationResult.bottleneck_explanation}
                      </p>

                      {/* AI Architect Deep Analysis */}
                      {activeSimulationResult.ai_bottleneck_explanation && (
                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-[10px] space-y-1">
                          <div className="flex items-center gap-1 text-cyan-300 font-bold">
                            <Brain className="w-3 h-3 text-cyan-400" />
                            <span>AI Architect Queueing Critique</span>
                          </div>
                          <p className="text-slate-300 font-light leading-relaxed">
                            {activeSimulationResult.ai_bottleneck_explanation}
                          </p>
                        </div>
                      )}

                      {/* Suggested Remediation Box & One-Click Fix */}
                      <div className="p-2.5 rounded-xl bg-slate-950/90 border border-white/[0.08] space-y-2">
                        <div className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-amber-400" />
                          <span>Recommended Remediation</span>
                        </div>
                        <p className="text-[10px] text-slate-300 font-light leading-relaxed">
                          {activeSimulationResult.bottleneck_remediation}
                        </p>

                        {activeSimulationResult.suggested_action && (
                          <button
                            onClick={() =>
                              handleApplySimulationFix(activeSimulationResult.suggested_action!)
                            }
                            className="w-full py-2 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-yellow-600 hover:from-red-500 hover:to-yellow-500 text-slate-950 font-black text-[11px] shadow-lg shadow-red-950/50 transition flex items-center justify-center gap-1.5"
                          >
                            <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />
                            <span>⚡ Apply Fix to Canvas</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 text-emerald-300 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>System Healthy • No Bottlenecks</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-light leading-relaxed">
                        All architectural tiers operate safely with &gt;35% headroom under{" "}
                        {trafficProfile.peak_qps.toLocaleString()} peak RPS. Ingress, compute, and
                        persistence paths satisfy target SLAs.
                      </p>
                    </div>
                  )}
                </div>

                {/* 5. TIMELINE SCRUBBER & BACKEND SIMULATION ENGINE */}
                <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-950/70 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Timeline Scrubber</span>
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      Second {currentTick ? currentTick.second : 0}s / {trafficProfile.duration_sec}s
                    </span>
                  </div>

                  {/* Time Slider & Play Controls */}
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setIsSimulationRunning(!isSimulationRunning)}
                      className={`p-2 rounded-xl font-bold transition flex items-center justify-center ${
                        isSimulationRunning
                          ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                          : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                      }`}
                      title={
                        isSimulationRunning
                          ? "Pause timeline playback"
                          : "Play synthetic traffic timeline"
                      }
                    >
                      {isSimulationRunning ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </button>

                    <input
                      type="range"
                      min={0}
                      max={Math.max(1, activeSimulationResult.ticks.length - 1)}
                      value={simTickIndex}
                      onChange={(e) => {
                        setIsSimulationRunning(false);
                        setSimTickIndex(parseInt(e.target.value, 10));
                      }}
                      className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                    />

                    <button
                      onClick={() => {
                        setIsSimulationRunning(false);
                        setSimTickIndex(0);
                      }}
                      className="p-2 rounded-xl bg-slate-900 border border-white/[0.08] text-slate-400 hover:text-white transition"
                      title="Reset timeline to second 0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Current Tick Metrics Mini-Ticker */}
                  {currentTick && (
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">
                        Load at {currentTick.second}s:{" "}
                        <span className="text-cyan-300 font-bold">
                          {Math.round(currentTick.qps).toLocaleString()} RPS
                        </span>
                      </span>
                      <span className="text-slate-400">
                        Latency:{" "}
                        <span className="text-amber-300 font-bold">
                          {Math.round(currentTick.p95_latency_ms || currentTick.p99_latency_ms)}ms
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Deep Backend Discrete Event Trace */}
                  <div className="pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={handleRunBackendTrace}
                      disabled={isBackendSimulating}
                      className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-cyan-500/10 border border-white/[0.08] hover:border-cyan-500/30 text-slate-200 hover:text-cyan-300 font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isBackendSimulating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                          <span>Simulating on Backend Engine...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Run Deep Backend Simulation Trace</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "requirements" ? (
            /* ============================================================== */
            /* REQUIREMENTS SPECIFICATION PANEL                              */
            /* ============================================================== */
            <div className="flex-1 flex flex-col overflow-y-auto">
              <div className="p-4 border-b border-white/[0.06] bg-slate-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white font-mono uppercase">
                      Problem Requirements
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Design YouTube • Global Video Streaming
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4 font-mono text-xs">
                {/* Problem Summary Hero */}
                <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-950/70 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
                    <span>Design YouTube</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px]">
                      Target: 50K+ RPS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-light leading-relaxed">
                    Design a global, hyper-scale video sharing and streaming service capable of
                    handling millions of concurrent viewers, petabyte-scale video encoding, and
                    resilient sub-200ms playback startup.
                  </p>
                </div>

                {/* Functional Requirements */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Functional Requirements</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      "1. Asynchronous Video Upload: Chunked, resumable multi-part upload pipeline with distributed transcoding into multiple resolutions (1080p, 720p, 480p).",
                      "2. Global Low-Latency Streaming: Adaptive bitrate streaming (HLS/DASH) served from distributed CDN edge caches.",
                      "3. Metadata & Search: Fast search across video titles, tags, and creator channels with dedicated read replicas and cache.",
                      "4. Social Engagements: Record view counts, likes, and comments with eventual consistency.",
                    ].map((req, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-white/[0.06] bg-slate-950/50 text-[11px] text-slate-300 font-light leading-relaxed"
                      >
                        {req}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Non-Functional Requirements */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Non-Functional SLAs</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      "High Availability: 99.99% uptime. Streaming must never experience global downtime.",
                      "Low Latency Playback: Video buffering initiation p95 < 200ms globally.",
                      "Throughput: Support 50,000+ peak ingress requests/sec and millions of concurrent viewers.",
                      "Read-Heavy: Extreme 99:1 read-to-write traffic distribution.",
                    ].map((nfr, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-white/[0.06] bg-slate-950/50 text-[11px] text-slate-300 font-light leading-relaxed"
                      >
                        {nfr}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Capacity Estimation */}
                <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-950/70 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Capacity Estimations
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Daily Active Users:</span>
                      <span className="text-white font-bold">100M DAU</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ingress Metadata QPS:</span>
                      <span className="text-white font-bold">50,000 RPS</span>
                    </div>
                    <div className="flex justify-between">
                      <span>New Video Uploads:</span>
                      <span className="text-white font-bold">500 hrs / minute</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Storage Added:</span>
                      <span className="text-white font-bold">~25 TB / day</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "evaluation" ? (
            /* ============================================================== */
            /* PHASE 8: ARCHITECTURE EVALUATION & VERSION DIFF PANEL          */
            /* ============================================================== */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-white/[0.06] bg-slate-900/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white font-mono uppercase">
                      Architecture Evaluation
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Invariant Scoring & Version Diff
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  v{graphState.metadata.version} Active
                </span>
              </div>

              {/* Sub-tab Navigation */}
              <div className="flex border-b border-white/[0.08] bg-slate-950/70 p-1 shrink-0">
                <button
                  onClick={() => setEvaluationSubTab("verdict")}
                  className={`flex-1 py-1.5 text-[11px] font-bold font-mono rounded-lg transition flex items-center justify-center gap-1.5 ${
                    evaluationSubTab === "verdict"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Scorecard & AI Verdict</span>
                </button>
                <button
                  onClick={() => setEvaluationSubTab("history")}
                  className={`flex-1 py-1.5 text-[11px] font-bold font-mono rounded-lg transition flex items-center justify-center gap-1.5 ${
                    evaluationSubTab === "history"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>History & Diff ({history.length})</span>
                </button>
              </div>

              {/* Scrollable Evaluation Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
                {evaluationSubTab === "verdict" ? (
                  <>
                    {/* Overall Score Card */}
                    <div className="p-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-slate-900/90 to-[#091224] shadow-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            Principal Architecture Score
                          </div>
                          <div className="text-3xl font-black font-mono text-white mt-0.5 flex items-baseline gap-2">
                            <span>{comprehensiveEvaluation.overall_score}</span>
                            <span className="text-xs text-slate-400 font-normal">/ 100</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                              comprehensiveEvaluation.overall_score >= 85
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : comprehensiveEvaluation.overall_score >= 70
                                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                                : comprehensiveEvaluation.overall_score >= 50
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                : "bg-red-500/20 text-red-300 border-red-500/40"
                            }`}
                          >
                            {comprehensiveEvaluation.ai_verdict.decision}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {comprehensiveEvaluation.ai_verdict.level}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/[0.06]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            comprehensiveEvaluation.overall_score >= 80
                              ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                              : comprehensiveEvaluation.overall_score >= 60
                              ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                              : "bg-gradient-to-r from-red-600 to-rose-400"
                          }`}
                          style={{ width: `${comprehensiveEvaluation.overall_score}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-300 font-light leading-relaxed">
                        {comprehensiveEvaluation.ai_verdict.summary}
                      </p>
                    </div>

                    {/* 4 Category Dimension Score Meters */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-white/[0.06] space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Scalability</span>
                          <span className="font-bold text-cyan-300 font-mono">
                            {comprehensiveEvaluation.scalability_score}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-cyan-400 h-full rounded-full"
                            style={{ width: `${comprehensiveEvaluation.scalability_score}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/70 border border-white/[0.06] space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Reliability</span>
                          <span className="font-bold text-emerald-300 font-mono">
                            {comprehensiveEvaluation.reliability_score}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-400 h-full rounded-full"
                            style={{ width: `${comprehensiveEvaluation.reliability_score}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/70 border border-white/[0.06] space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Performance</span>
                          <span className="font-bold text-violet-300 font-mono">
                            {comprehensiveEvaluation.performance_score}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-violet-400 h-full rounded-full"
                            style={{ width: `${comprehensiveEvaluation.performance_score}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/70 border border-white/[0.06] space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Cost Efficiency</span>
                          <span className="font-bold text-amber-300 font-mono">
                            {comprehensiveEvaluation.cost_score}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-400 h-full rounded-full"
                            style={{ width: `${comprehensiveEvaluation.cost_score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Strong Architectural Decisions */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Strong Architectural Decisions ({comprehensiveEvaluation.strong_decisions.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {comprehensiveEvaluation.strong_decisions.map((sd, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-emerald-300">{sd.title}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                                Positive
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-300 font-light leading-relaxed">
                              {sd.description}
                            </p>
                            <div className="text-[9px] text-emerald-400/90 font-mono pt-0.5">
                              Impact: {sd.impact}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Weak Decisions & Architectural Risks */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        <span>Weak Decisions & Risks ({comprehensiveEvaluation.weak_decisions.length})</span>
                      </div>
                      {comprehensiveEvaluation.weak_decisions.length === 0 ? (
                        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/15 text-emerald-300 text-center text-[11px]">
                          Zero critical single points of failure detected!
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {comprehensiveEvaluation.weak_decisions.map((wd, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl border space-y-1 ${
                                wd.severity === "critical"
                                  ? "border-rose-500/30 bg-rose-950/15 text-rose-200"
                                  : "border-amber-500/30 bg-amber-950/15 text-amber-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold">{wd.title}</span>
                                <span
                                  className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded font-mono ${
                                    wd.severity === "critical"
                                      ? "bg-rose-950 text-rose-300 border border-rose-500/40"
                                      : "bg-amber-950 text-amber-300 border border-amber-500/40"
                                  }`}
                                >
                                  {wd.severity}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-300 font-light leading-relaxed">
                                {wd.risk}
                              </p>
                              <div className="text-[9px] text-cyan-300 font-mono pt-0.5">
                                Fix: {wd.remediation}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Production Readiness Roadmap */}
                    {comprehensiveEvaluation.ai_verdict.production_roadmap.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Production Readiness Roadmap</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-white/[0.06] space-y-1.5">
                          {comprehensiveEvaluation.ai_verdict.production_roadmap.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-[10px] text-slate-300">
                              <span className="text-cyan-400 font-bold shrink-0">{idx + 1}.</span>
                              <span className="font-light leading-relaxed">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Monthly Cost & Invariants drawer trigger */}
                    <div className="p-3 rounded-xl border border-white/[0.08] bg-slate-950/70 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] font-bold text-slate-300 uppercase">
                          Estimated Cloud Cost
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        ${validationResponse.estimated_monthly_cost.toLocaleString()}/mo
                      </span>
                    </div>

                    <button
                      onClick={() => setShowValidationDrawer(true)}
                      className="w-full py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>Open Full Rule Engine Drawer</span>
                    </button>
                  </>
                ) : (
                  /* ========================================================== */
                  /* PHASE 8: VERSION HISTORY TIMELINE & GRAPH DIFF COMPARATOR  */
                  /* ========================================================== */
                  <div className="space-y-4">
                    {/* Version Diff Comparator Selectors */}
                    <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-950/70 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Version Comparator</span>
                        </span>
                        <span className="text-[10px] text-cyan-400 font-normal">
                          v{diffBaseVersion} ➔ v{diffTargetVersion}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-400 font-mono uppercase block mb-1">
                            Base Version (Left)
                          </label>
                          <select
                            value={diffBaseVersion}
                            onChange={(e) => setDiffBaseVersion(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-white/[0.1] rounded-lg px-2 py-1.5 text-[10px] text-white font-mono focus:outline-none focus:border-cyan-500"
                          >
                            {history.map((h) => (
                              <option key={h.metadata.version} value={h.metadata.version}>
                                v{h.metadata.version} ({h.nodes.length} nodes)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-400 font-mono uppercase block mb-1">
                            Target Version (Right)
                          </label>
                          <select
                            value={diffTargetVersion}
                            onChange={(e) => setDiffTargetVersion(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-white/[0.1] rounded-lg px-2 py-1.5 text-[10px] text-white font-mono focus:outline-none focus:border-cyan-500"
                          >
                            {history.map((h) => (
                              <option key={h.metadata.version} value={h.metadata.version}>
                                v{h.metadata.version} ({h.nodes.length} nodes)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Diff Result Summary */}
                      {versionDiffResult && (
                        <div className="pt-2 border-t border-white/[0.06] space-y-2">
                          <div className="p-2 rounded-lg bg-slate-900/80 border border-white/[0.05] text-[10px] text-cyan-300 font-mono">
                            {versionDiffResult.summary}
                          </div>

                          {/* Node Diffs */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                              Component Changes ({versionDiffResult.nodes.length})
                            </span>
                            {versionDiffResult.nodes.length === 0 ? (
                              <div className="text-[10px] text-slate-500 italic py-1">
                                No component changes between these versions.
                              </div>
                            ) : (
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {versionDiffResult.nodes.map((nd) => (
                                  <div
                                    key={nd.id}
                                    className={`p-2 rounded-lg border flex items-center justify-between text-[10px] ${
                                      nd.changeType === "ADDED"
                                        ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                                        : nd.changeType === "REMOVED"
                                        ? "border-rose-500/30 bg-rose-950/20 text-rose-300"
                                        : "border-amber-500/30 bg-amber-950/20 text-amber-300"
                                    }`}
                                  >
                                    <div className="min-w-0 pr-2">
                                      <div className="font-bold truncate">{nd.name}</div>
                                      <div className="text-[9px] opacity-75">Type: {nd.type}</div>
                                    </div>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase ${
                                        nd.changeType === "ADDED"
                                          ? "bg-emerald-950 text-emerald-400"
                                          : nd.changeType === "REMOVED"
                                          ? "bg-rose-950 text-rose-400"
                                          : "bg-amber-950 text-amber-400"
                                      }`}
                                    >
                                      {nd.changeType}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Edge Diffs */}
                          <div className="space-y-1 pt-1">
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                              Connection Changes ({versionDiffResult.edges.length})
                            </span>
                            {versionDiffResult.edges.length === 0 ? (
                              <div className="text-[10px] text-slate-500 italic py-1">
                                No connection changes between these versions.
                              </div>
                            ) : (
                              <div className="space-y-1 max-h-36 overflow-y-auto">
                                {versionDiffResult.edges.map((ed) => (
                                  <div
                                    key={ed.id}
                                    className={`p-1.5 rounded-lg border flex items-center justify-between text-[9px] ${
                                      ed.changeType === "ADDED"
                                        ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                                        : "border-rose-500/30 bg-rose-950/20 text-rose-300"
                                    }`}
                                  >
                                    <span className="truncate">
                                      {ed.source} ➔ {ed.target}
                                    </span>
                                    <span className="font-mono font-bold uppercase">{ed.changeType}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Version History Timeline */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-amber-400" />
                          <span>Version Snapshots ({history.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-500">Auto-Snapshotted</span>
                      </div>

                      <div className="space-y-2">
                        {history.map((snapshot) => {
                          const isCurrent = snapshot.metadata.version === graphState.metadata.version;
                          return (
                            <div
                              key={snapshot.metadata.version}
                              className={`p-3 rounded-xl border transition ${
                                isCurrent
                                  ? "border-cyan-500/50 bg-cyan-950/20 ring-1 ring-cyan-500/30"
                                  : "border-white/[0.08] bg-slate-950/60 hover:border-white/[0.15]"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] font-mono ${
                                      isCurrent
                                        ? "bg-cyan-500 text-slate-950"
                                        : "bg-slate-900 text-slate-300 border border-white/[0.1]"
                                    }`}
                                  >
                                    v{snapshot.metadata.version}
                                  </span>
                                  <div>
                                    <div className="font-bold text-[11px] text-slate-200">
                                      {snapshot.metadata.change_summary || "Architecture Snapshot"}
                                    </div>
                                    <div className="text-[9px] text-slate-400">
                                      {snapshot.metadata.last_event_type} • {snapshot.nodes.length} nodes, {snapshot.edges.length} edges
                                    </div>
                                  </div>
                                </div>

                                {!isCurrent && (
                                  <button
                                    onClick={() => handleRestoreVersion(snapshot.metadata.version)}
                                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-cyan-500/20 border border-white/[0.1] hover:border-cyan-500/40 text-[10px] text-slate-300 hover:text-cyan-300 font-mono transition flex items-center gap-1 shadow-sm"
                                    title={`Restore canvas to version ${snapshot.metadata.version}`}
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Restore</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeNode ? (
            /* ============================================================== */
            /* ARCHITECTURE TAB: NODE CONFIGURATION                           */
            /* ============================================================== */
            <div className="flex-1 flex flex-col overflow-y-auto">
              <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white font-mono uppercase">
                      Node Configuration
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      ID: {activeNode.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 text-xs font-mono">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    COMPONENT NAME
                  </label>
                  <input
                    type="text"
                    value={activeNode.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      commitGraphChange(
                        (prev) => ({
                          ...prev,
                          nodes: prev.nodes.map((n) =>
                            n.id === activeNode.id ? { ...n, name: newName } : n
                          ),
                        }),
                        "UPDATE_COMPONENT",
                        `Renamed component to '${newName}'`,
                        { nodeId: activeNode.id }
                      );
                    }}
                    className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                  />
                </div>

                {/* Node Active Invariant Violations */}
                {nodeViolationMap.has(activeNode.id) && (
                  <div className="p-3 rounded-xl border border-red-500/40 bg-red-500/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-red-300">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
                        <span>Active Invariant Issues</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-950 text-red-300 border border-red-800/60">
                        {nodeViolationMap.get(activeNode.id)?.violations.length} Active
                      </span>
                    </div>
                    {nodeViolationMap.get(activeNode.id)?.violations.map((v) => (
                      <div key={v.rule_id} className="text-[10px] space-y-1 pt-1.5 border-t border-red-500/20">
                        <div className="font-bold text-red-200">{v.rule_name}</div>
                        <div className="text-slate-300 font-light leading-relaxed">{v.message}</div>
                        <div className="text-cyan-400 font-medium">
                          Fix: <span className="text-slate-200">{v.remediation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Replicas */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] text-slate-400 font-semibold">
                      REPLICAS (INSTANCES)
                    </label>
                    <span className="text-cyan-400 font-bold">
                      {activeNode.config?.replicas || 1}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={activeNode.config?.replicas || 1}
                    onChange={(e) => {
                      const reps = parseInt(e.target.value, 10);
                      handleUpdateNodeConfig(activeNode.id, { replicas: reps });
                    }}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
                  />
                </div>

                {/* QPS Capacity */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    QPS CAPACITY PER REPLICA
                  </label>
                  <input
                    type="number"
                    value={activeNode.config?.qps_capacity || 5000}
                    onChange={(e) => {
                      const qps = parseInt(e.target.value, 10);
                      handleUpdateNodeConfig(activeNode.id, { qps_capacity: qps });
                    }}
                    className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                  />
                </div>

                {/* Latency ms */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    BASE PROCESSING LATENCY (MS)
                  </label>
                  <input
                    type="number"
                    value={activeNode.config?.latency_ms || 5}
                    onChange={(e) => {
                      const lat = parseInt(e.target.value, 10);
                      handleUpdateNodeConfig(activeNode.id, { latency_ms: lat });
                    }}
                    className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                  />
                </div>

                {/* Storage GB if applicable */}
                {activeNode.category === "database" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-semibold">
                      STORAGE CAPACITY (GB)
                    </label>
                    <input
                      type="number"
                      value={activeNode.config?.storage_gb || 500}
                      onChange={(e) => {
                        const st = parseInt(e.target.value, 10);
                        handleUpdateNodeConfig(activeNode.id, { storage_gb: st });
                      }}
                      className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                )}

                {/* Cache TTL & Policy */}
                {activeNode.category === "cache" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-semibold">
                        CACHE EVICTION POLICY
                      </label>
                      <select
                        value={activeNode.config?.cache_policy || "LRU"}
                        onChange={(e) => {
                          handleUpdateNodeConfig(activeNode.id, {
                            cache_policy: e.target.value as any,
                          });
                        }}
                        className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                      >
                        <option value="LRU">LRU (Least Recently Used)</option>
                        <option value="LFU">LFU (Least Frequently Used)</option>
                        <option value="FIFO">FIFO (First In First Out)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-semibold">
                        CACHE TTL (SECONDS)
                      </label>
                      <input
                        type="number"
                        value={activeNode.config?.cache_ttl_sec || 3600}
                        onChange={(e) => {
                          const ttl = parseInt(e.target.value, 10);
                          handleUpdateNodeConfig(activeNode.id, { cache_ttl_sec: ttl });
                        }}
                        className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Replication Mode for DB */}
                {activeNode.category === "database" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-semibold">
                      REPLICATION STRATEGY
                    </label>
                    <select
                      value={activeNode.config?.replication_mode || "sync"}
                      onChange={(e) => {
                        handleUpdateNodeConfig(activeNode.id, {
                          replication_mode: e.target.value as any,
                        });
                      }}
                      className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    >
                      <option value="sync">Synchronous (Strong Consistency)</option>
                      <option value="async">Asynchronous (Eventual Consistency)</option>
                    </select>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-white/[0.06] flex gap-2">
                  <button
                    onClick={handleDuplicateNode}
                    className="flex-1 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    onClick={handleDeleteSelectedNode}
                    className="flex-1 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeEdge ? (
            /* ============================================================== */
            /* ARCHITECTURE TAB: EDGE CONFIGURATION                           */
            /* ============================================================== */
            <div className="flex-1 flex flex-col overflow-y-auto">
              <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white font-mono uppercase">
                      Edge Connection
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {activeEdge.source} → {activeEdge.target}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEdgeId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 text-xs font-mono">
                {/* Connection Type Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    CONNECTION / FLOW TYPE
                  </label>
                  <div className="space-y-1.5">
                    {[
                      { key: "sync", label: "Synchronous Request (HTTP/gRPC)", color: "text-sky-400" },
                      { key: "async", label: "Asynchronous Event (Queue/Stream)", color: "text-amber-400" },
                      { key: "replication", label: "Data Replication Flow", color: "text-sky-300" },
                      { key: "read_path", label: "Dedicated Read Query Path", color: "text-emerald-400" },
                      { key: "write_path", label: "Dedicated Write Persist Path", color: "text-rose-400" },
                    ].map((ct) => (
                      <button
                        key={ct.key}
                        onClick={() => handleUpdateConnectionType(ct.key as ConnectionType)}
                        className={`w-full text-left p-2.5 rounded-lg border transition flex items-center justify-between ${
                          activeEdge.connectionType === ct.key
                            ? "border-cyan-500/50 bg-cyan-500/10 text-white font-bold"
                            : "border-white/[0.06] bg-slate-950/60 text-slate-400 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className={ct.color}>{ct.label}</span>
                        {activeEdge.connectionType === ct.key && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delete Edge Action */}
                <div className="pt-3 border-t border-white/[0.06]">
                  <button
                    onClick={handleDeleteSelectedEdge}
                    className="w-full py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Connection</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* ARCHITECTURE TAB: BLANK STATE                                  */
            /* ============================================================== */
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center text-slate-500 font-mono space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-slate-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-300">
                  Select Component or Edge
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[210px]">
                  Click any node to tune replicas/QPS, or click an edge to configure sync vs async messaging flow.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ==================================================================== */}
      {/* 3. ARCHITECTURE EVENT STREAM & STATE INSPECTOR MODAL/DRAWER           */}
      {/* ==================================================================== */}
      {showEventLog && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-[#070d1a]/98 backdrop-blur-2xl border-l border-white/[0.1] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Architecture State &amp; Events
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  Single Source of Truth • Version {graphState.metadata.version}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowEventLog(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {/* Event Timeline */}
            <div>
              <div className="text-[11px] font-bold text-cyan-400 mb-2.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>CHRONOLOGICAL EVENT STREAM</span>
              </div>
              <div className="space-y-2">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-xl border border-white/[0.06] bg-slate-950/70 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800/40">
                        {evt.type}
                      </span>
                      <span className="text-slate-500">v{evt.architectureVersion}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] font-light mt-0.5">
                      {evt.description}
                    </p>
                    <span className="text-[9px] text-slate-500">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON Graph Representation */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>ACTIVE GRAPH JSON REPRESENTATION</span>
              </div>
              <pre className="p-3 rounded-xl bg-slate-950 border border-white/[0.06] text-[10px] text-slate-400 overflow-x-auto max-h-60 no-scrollbar">
                {JSON.stringify(graphState, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. DETERMINISTIC RULE ENGINE & INVARIANTS DRAWER                     */}
      {/* ==================================================================== */}
      {showValidationDrawer && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-[#070d1a]/98 backdrop-blur-2xl border-l border-white/[0.1] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-slate-900/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Deterministic Rule Engine
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  Zero Latency • First-Principles Invariant Analysis
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowValidationDrawer(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {/* Health Score & Cost Hero Card */}
            <div className="p-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-slate-900/80 to-[#091224]/80 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    SYSTEM HEALTH SCORE
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-black font-mono text-white">
                      {validationResponse.health_score}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                      validationResponse.status === "PASS"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : validationResponse.status === "NEEDS_IMPROVEMENT"
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse"
                    }`}
                  >
                    {validationResponse.status.replace(/_/g, " ")}
                  </span>
                  <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>${validationResponse.estimated_monthly_cost.toLocaleString()}/mo</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    validationResponse.health_score >= 85
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                      : validationResponse.health_score >= 60
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                      : "bg-gradient-to-r from-red-600 to-rose-400"
                  }`}
                  style={{ width: `${validationResponse.health_score}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-300 font-light leading-relaxed">
                {validationResponse.summary}
              </p>
            </div>

            {/* Severity Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/[0.08] text-[11px]">
              <button
                onClick={() => setValSeverityFilter("all")}
                className={`flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1 font-semibold ${
                  valSeverityFilter === "all"
                    ? "bg-white/[0.1] text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>All</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-300">
                  {validationResponse.violations.length}
                </span>
              </button>
              <button
                onClick={() => setValSeverityFilter("critical")}
                className={`flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1 font-semibold ${
                  valSeverityFilter === "critical"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40 font-bold"
                    : "text-slate-400 hover:text-red-300"
                }`}
              >
                <span>Critical</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-400 font-bold">
                  {criticalCount}
                </span>
              </button>
              <button
                onClick={() => setValSeverityFilter("warning")}
                className={`flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1 font-semibold ${
                  valSeverityFilter === "warning"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                    : "text-slate-400 hover:text-amber-300"
                }`}
              >
                <span>Warning</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 font-bold">
                  {warningCount}
                </span>
              </button>
              <button
                onClick={() => setValSeverityFilter("info")}
                className={`flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1 font-semibold ${
                  valSeverityFilter === "info"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold"
                    : "text-slate-400 hover:text-sky-300"
                }`}
              >
                <span>Info</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 font-bold">
                  {infoCount}
                </span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px]">
              {(["all", "topology", "capacity", "resilience", "consistency", "cost"] as const).map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setValCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg border whitespace-nowrap uppercase tracking-wider transition ${
                      valCategoryFilter === cat
                        ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-200 font-bold"
                        : "border-white/[0.06] bg-slate-950/60 text-slate-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            {/* Search filter input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search rule violations or affected components..."
                value={valSearchQuery}
                onChange={(e) => setValSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Violations List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>ACTIVE RULE VIOLATIONS ({filteredViolations.length})</span>
              </div>

              {filteredViolations.length === 0 ? (
                <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-emerald-300">
                    No Violations in This Category
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-[280px] mx-auto font-light">
                    All distributed system first-principles invariants are verified and healthy.
                  </p>
                </div>
              ) : (
                filteredViolations.map((violation) => {
                  const isCritical = violation.severity === "critical";
                  const isWarning = violation.severity === "warning";

                  return (
                    <div
                      key={violation.rule_id}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col gap-2.5 ${
                        isCritical
                          ? "border-red-500/40 bg-red-500/[0.07] shadow-lg shadow-red-950/20"
                          : isWarning
                          ? "border-amber-500/40 bg-amber-500/[0.07] shadow-lg shadow-amber-950/20"
                          : "border-sky-500/40 bg-sky-500/[0.07]"
                      }`}
                    >
                      {/* Violation Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${
                              isCritical
                                ? "bg-red-950 text-red-300 border-red-700"
                                : isWarning
                                ? "bg-amber-950 text-amber-300 border-amber-700"
                                : "bg-sky-950 text-sky-300 border-sky-700"
                            }`}
                          >
                            {violation.severity}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.06]">
                            {violation.category}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">
                          {violation.rule_id}
                        </span>
                      </div>

                      {/* Rule Name & Message */}
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-wide">
                          {violation.rule_name.replace(/_/g, " ")}
                        </h4>
                        <p className="text-[11px] text-slate-300 font-light mt-1 leading-relaxed">
                          {violation.message}
                        </p>
                      </div>

                      {/* Suggested Remediation Box */}
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/[0.06] text-[10px] space-y-1">
                        <div className="text-cyan-400 font-bold flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          <span>SUGGESTED REMEDIATION</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed font-light">
                          {violation.remediation}
                        </p>
                      </div>

                      {/* Affected Components & Quick Action */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                        {/* Affected Components */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500">Target:</span>
                          {violation.node_ids.map((nodeId) => (
                            <button
                              key={nodeId}
                              onClick={() => handleFocusNode(nodeId)}
                              className="px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-white/[0.08] hover:border-cyan-500/40 text-[10px] font-mono transition flex items-center gap-1"
                              title="Click to zoom & select node"
                            >
                              <Target className="w-2.5 h-2.5" />
                              <span>{nodeId}</span>
                            </button>
                          ))}
                        </div>

                        {/* Quick Fix Button */}
                        {(violation.rule_id === "RULE-001" ||
                          violation.rule_id === "RULE-017" ||
                          violation.rule_id === "RULE-002" ||
                          violation.rule_id === "RULE-003" ||
                          violation.rule_id === "RULE-006" ||
                          violation.rule_id === "RULE-012") && (
                          <button
                            onClick={() => handleApplyQuickFix(violation)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                          >
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            <span>Quick Fix</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Invariants Verified Section */}
            {validationResponse.passed_rules.length > 0 && (
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-slate-950/60 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>VERIFIED INVARIANTS ({validationResponse.passed_rules.length})</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {validationResponse.passed_rules.map((rule) => (
                    <div
                      key={rule}
                      className="p-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15 text-[10px] text-emerald-300 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="font-semibold">{rule.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estimated Cloud Monthly Cost Breakdown */}
            <div className="p-4 rounded-2xl border border-white/[0.06] bg-slate-950/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>MONTHLY CLOUD COST BREAKDOWN</span>
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  ${validationResponse.estimated_monthly_cost.toLocaleString()}/mo
                </span>
              </div>

              <div className="space-y-2 text-[10px]">
                {Object.entries(validationResponse.cost_breakdown).map(([category, amount]) => (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="capitalize">{category} Tier</span>
                      <span className="font-mono text-slate-200">${amount.toLocaleString()}/mo</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/[0.04]">
                      <div
                        className="bg-cyan-500/60 h-full rounded-full"
                        style={{
                          width: `${
                            validationResponse.estimated_monthly_cost > 0
                              ? (amount / validationResponse.estimated_monthly_cost) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. AI SYSTEM ARCHITECT DRAWER (PHASE 4)                              */}
      {/* ==================================================================== */}
      {showAiDrawer && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-[#070d1a]/98 backdrop-blur-2xl border-l border-cyan-500/20 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    AI System Architect
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
                    {aiCritique?.provider ? aiCritique.provider.toUpperCase() : "LIVE ADVISOR"}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-400">
                  Principal Architecture Feedback & Socratic Evaluation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleFetchCritique}
                disabled={isAiLoading}
                className="p-1.5 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-500/20 border border-cyan-500/30 transition disabled:opacity-50"
                title="Re-Analyze Live Architecture"
              >
                <RefreshCw className={`w-4 h-4 ${isAiLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setShowAiDrawer(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {/* Loading State */}
            {isAiLoading && (
              <div className="p-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 space-y-4 text-center">
                <div className="relative w-12 h-12 mx-auto">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping" />
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin flex items-center justify-center">
                    <Brain className="w-6 h-6 text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-cyan-200">
                    Architect Observing Graph Topology...
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[340px] mx-auto leading-relaxed font-light">
                    Evaluating tier decoupling, single points of failure, cache hit ratios, and CAP invariants for {graphState.metadata.targetRps}.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {aiError && (
              <div className="p-3.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span>Critique Engine Notice</span>
                </div>
                <p className="text-[11px] text-slate-300 font-light">{aiError}</p>
                <button
                  onClick={handleFetchCritique}
                  className="mt-2 px-2.5 py-1 rounded bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold hover:bg-red-900 transition"
                >
                  Retry Analysis
                </button>
              </div>
            )}

            {/* Critique & Suggestions Content */}
            {!isAiLoading && aiCritique && (
              <>
                {/* 1. Critique Assessment Hero Card */}
                <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#081226] via-slate-900/90 to-[#120f28] shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        <Brain className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                        Topology Assessment
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      {aiCritique.estimated_monthly_cost || `$${validationResponse.estimated_monthly_cost.toLocaleString()}/mo`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-light pl-0.5">
                    {aiCritique.critique}
                  </p>
                </div>

                {/* 2. Socratic Interview Challenge Card */}
                {aiCritique.interview_question && (
                  <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 space-y-3 shadow-lg">
                    <div className="flex items-center gap-2 text-purple-300">
                      <HelpCircle className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Socratic Architect Challenge
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-light italic bg-slate-950/60 p-3 rounded-xl border border-purple-500/20">
                      "{aiCritique.interview_question}"
                    </p>

                    <div className="space-y-2 pt-1">
                      <textarea
                        value={userInterviewAnswer}
                        onChange={(e) => {
                          setUserInterviewAnswer(e.target.value);
                          if (interviewSubmitted) setInterviewSubmitted(false);
                        }}
                        placeholder="Draft your architectural defense or reasoning here (e.g. partition keys, leader election, DLQ backoff)..."
                        rows={3}
                        className="w-full bg-slate-950/90 border border-white/[0.08] focus:border-purple-500/50 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none"
                      />

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">
                          Interactive Interview Practice
                        </span>
                        <button
                          onClick={() => {
                            if (userInterviewAnswer.trim().length > 0) {
                              setInterviewSubmitted(true);
                            }
                          }}
                          disabled={userInterviewAnswer.trim().length === 0}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <Send className="w-3 h-3" />
                          <span>Submit Reasoning</span>
                        </button>
                      </div>

                      {interviewSubmitted && (
                        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-start gap-2 animate-in fade-in">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Reasoning Acknowledged: </span>
                            <span className="text-slate-300 font-light">
                              Solid systems articulation. Demonstrates awareness of distributed consensus, split-brain mitigation, and failure domains.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Actionable Suggestions with Apply Button */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Actionable Architectural Recommendations ({aiCritique.suggestions.length})</span>
                    </span>
                  </div>

                  {aiCritique.suggestions.map((suggestion, idx) => {
                    const isApplied = appliedSuggestions.has(suggestion.title);
                    const categoryColors = {
                      architecture: "border-purple-500/40 bg-purple-500/10 text-purple-300",
                      scalability: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
                      reliability: "border-amber-500/40 bg-amber-500/10 text-amber-300",
                      cost: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                    }[suggestion.category] || "border-cyan-500/40 bg-cyan-500/10 text-cyan-300";

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col gap-2.5 ${
                          isApplied
                            ? "border-emerald-500/30 bg-emerald-950/10"
                            : "border-white/[0.08] bg-slate-950/70 hover:border-cyan-500/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${categoryColors}`}
                            >
                              {suggestion.category}
                            </span>
                            <span className="text-xs font-bold text-white tracking-wide">
                              {suggestion.title}
                            </span>
                          </div>

                          {isApplied && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Applied</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-300 font-light leading-relaxed">
                          {suggestion.description}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[240px]">
                            Action: {suggestion.action}
                          </span>

                          <button
                            onClick={() => handleApplySuggestion(suggestion)}
                            disabled={isApplied}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shadow-sm ${
                              isApplied
                                ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 cursor-default"
                                : "bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 hover:text-white"
                            }`}
                          >
                            {isApplied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Applied to Canvas</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-cyan-400" />
                                <span>Apply to Canvas</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Empty State when drawer opened but not loaded */}
            {!isAiLoading && !aiCritique && !aiError && (
              <div className="p-8 rounded-2xl border border-white/[0.06] bg-slate-950/60 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-200">
                  Ready to Analyze Architecture
                </h4>
                <p className="text-[11px] text-slate-400 max-w-[300px] mx-auto font-light leading-relaxed">
                  Request feedback from the AI System Architect on component scaling, fault tolerance, and trade-offs.
                </p>
                <button
                  onClick={handleFetchCritique}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20"
                >
                  Analyze Current Architecture
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* PHASE 7: SOCRATIC SYSTEM DESIGN INTERVIEW MODAL / DRAWER          */}
      {/* ================================================================== */}
      {showInterviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-fadeIn">
          <div className="w-full max-w-6xl h-[92vh] bg-[#070c18] border border-white/[0.12] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/[0.08] bg-slate-900/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                      Socratic System Design Interviewer
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Staff / Principal Architect Round
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Stage {interviewStage} of 9: {INTERVIEW_STAGES[interviewStage - 1]?.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRestartInterview}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/[0.1] text-slate-300 hover:text-white text-xs font-mono transition flex items-center gap-1.5"
                  title="Reset Interview Session"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset Session</span>
                </button>
                <button
                  onClick={() => setShowInterviewModal(false)}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.1] transition"
                  title="Close Interview Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 9-Stage Progress Stepper */}
            <div className="px-6 py-3 border-b border-white/[0.06] bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
                {INTERVIEW_STAGES.map((stg) => {
                  const isCurrent = stg.stage === interviewStage;
                  const isPast = stg.stage < interviewStage;
                  return (
                    <button
                      key={stg.stage}
                      onClick={() => setInterviewStage(stg.stage)}
                      className={`px-3 py-1 rounded-xl shrink-0 transition flex items-center gap-1.5 text-[11px] ${
                        isCurrent
                          ? "bg-violet-500/25 border border-violet-500/50 text-violet-200 font-bold shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                          : isPast
                          ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
                          : "bg-slate-900/60 border border-white/[0.06] text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      {isPast ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full bg-slate-800 text-[9px] flex items-center justify-center font-bold">
                          {stg.stage}
                        </span>
                      )}
                      <span>{stg.title.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Stage Goal description banner */}
              <div className="mt-2 text-[11px] font-mono text-slate-300 bg-slate-900/50 px-3 py-1.5 rounded-xl border border-white/[0.05] flex items-center justify-between">
                <span className="truncate pr-2">
                  <strong className="text-violet-300">Target Deliverable:</strong> {INTERVIEW_STAGES[interviewStage - 1]?.description}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {interviewMessages.length} turns exchanged
                </span>
              </div>
            </div>

            {/* Main Content: Two Columns */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: Chat Dialogue (65% width) */}
              <div className="flex-1 flex flex-col border-r border-white/[0.06] overflow-hidden">
                {/* Chat Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-mono text-xs">
                  {interviewMessages.map((msg) => {
                    const isInterviewer = msg.sender === "interviewer";
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${isInterviewer ? "justify-start" : "justify-end"}`}
                      >
                        {isInterviewer && (
                          <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 flex items-center justify-center shrink-0 mt-0.5">
                            {msg.is_hint ? (
                              <Lightbulb className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Bot className="w-4 h-4" />
                            )}
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 space-y-2 ${
                            msg.is_hint
                              ? "bg-amber-950/30 border border-amber-500/30 text-amber-100"
                              : isInterviewer
                              ? "bg-slate-900/90 border border-white/[0.08] text-slate-200 shadow-md"
                              : "bg-cyan-950/40 border border-cyan-500/30 text-cyan-100 shadow-md"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1 text-[10px]">
                            <span className="font-bold text-slate-400 uppercase tracking-wider">
                              {msg.is_hint
                                ? "Staff Architect Hint"
                                : isInterviewer
                                ? "Interviewer (Staff L6+)"
                                : "Candidate (You)"}
                            </span>
                            <span className="text-slate-500">{msg.timestamp}</span>
                          </div>

                          <div className="text-xs font-light leading-relaxed whitespace-pre-wrap">
                            {msg.text}
                          </div>

                          {msg.feedback && (
                            <div className="mt-2 pt-2 border-t border-violet-500/20 text-[10px] text-violet-300/90 font-mono bg-violet-950/20 p-2 rounded-lg">
                              <strong className="text-violet-400">Feedback:</strong> {msg.feedback}
                            </div>
                          )}
                        </div>

                        {!isInterviewer && (
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                            You
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Thinking / Evaluating Indicator */}
                  {isInterviewCritiqueLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="bg-slate-900/90 border border-white/[0.08] rounded-2xl p-3 flex items-center gap-2 text-xs text-violet-300">
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                        <span>Staff Architect is analyzing your response and canvas components...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Footer */}
                <div className="p-4 border-t border-white/[0.08] bg-slate-900/40 space-y-2 shrink-0">
                  <div className="flex gap-2">
                    <textarea
                      value={interviewInput}
                      onChange={(e) => setInterviewInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendInterviewTurn();
                        }
                      }}
                      placeholder={`Explain your ${INTERVIEW_STAGES[interviewStage - 1]?.title.toLowerCase()} (e.g. math, APIs, data schemas, partitions, caches)... [Enter to send]`}
                      rows={2}
                      className="flex-1 bg-slate-950 border border-white/[0.1] focus:border-violet-500/50 rounded-xl p-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <button
                      onClick={handleRequestInterviewHint}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold transition flex items-center gap-1.5 shadow-sm text-[11px]"
                      title="Request a hint from the Staff Architect"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ask Staff Hint</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 hidden sm:inline">
                        Shift+Enter for newline
                      </span>
                      <button
                        onClick={handleSendInterviewTurn}
                        disabled={!interviewInput.trim() || isInterviewCritiqueLoading}
                        className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white font-bold transition flex items-center gap-1.5 shadow-lg shadow-violet-600/25 text-[11px]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Response</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Rubric Scorecard & Architecture Coupling (35% width) */}
              <div className="w-full md:w-80 lg:w-96 bg-slate-950/50 p-4 space-y-4 font-mono text-xs overflow-y-auto">
                {/* Rubric Score Card */}
                <div className="p-4 rounded-2xl border border-white/[0.08] bg-slate-900/80 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Overall Interview Score
                      </div>
                      <div className="text-2xl font-black text-white mt-0.5">
                        {computeOverallRubricPercentage(interviewScores)}%
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        computeOverallRubricPercentage(interviewScores) >= 80
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : computeOverallRubricPercentage(interviewScores) >= 60
                          ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                          : computeOverallRubricPercentage(interviewScores) >= 40
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-red-500/15 text-red-300 border-red-500/30"
                      }`}
                    >
                      {computeOverallRubricPercentage(interviewScores) >= 80
                        ? "Strong Hire"
                        : computeOverallRubricPercentage(interviewScores) >= 60
                        ? "Hire"
                        : computeOverallRubricPercentage(interviewScores) >= 40
                        ? "Leaning Hire"
                        : "Needs Work"}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/[0.06]">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${computeOverallRubricPercentage(interviewScores)}%` }}
                    />
                  </div>
                </div>

                {/* 7 Rubric Category Bars */}
                <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-900/60 space-y-2.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    7-Category Staff Rubric
                  </div>

                  {/* 1. Requirements */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Requirements & Scope</span>
                      <span className="font-bold text-slate-200">
                        {interviewScores.requirements_understanding} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-violet-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(interviewScores.requirements_understanding / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 2. Scale Estimation */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Scale Math & Capacity</span>
                      <span className="font-bold text-slate-200">
                        {interviewScores.scale_estimation} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(interviewScores.scale_estimation / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 3. High-Level Architecture */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">High-Level Architecture</span>
                      <span className="font-bold text-slate-200">
                        {interviewScores.architecture} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(interviewScores.architecture / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 4. Technical Trade-offs */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Technical Trade-offs</span>
                      <span className="font-bold text-slate-200">
                        {interviewScores.trade_offs} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(interviewScores.trade_offs / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 5. Scalability */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Scalability & Sharding</span>
                      <span className="font-bold text-slate-200">
                        {interviewScores.scalability} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(interviewScores.scalability / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 6. Reliability */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Fault Tolerance & SRE</span>
                      <span className="font-bold text-slate-200">
                        {interviewScores.reliability} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(interviewScores.reliability / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 7. Communication */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Communication & Structure</span>
                      <span className="font-bold text-slate-200">
                        {interviewScores.communication} / 10
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(interviewScores.communication / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Architecture Canvas Coupling Banner */}
                <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-900/60 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <Workflow className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-[11px] uppercase">Live Canvas Coupling</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                    The Socratic interviewer inspects your canvas topology in real time. Drag, connect, and configure components to support your explanations.
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-slate-300 border-t border-white/[0.06]">
                    <span>Components on Canvas:</span>
                    <span className="font-bold text-cyan-300 font-mono">
                      {graphState.nodes.length} Nodes • {graphState.edges.length} Edges
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <ReactFlowProvider>
      <SimulatorContent />
    </ReactFlowProvider>
  );
}
