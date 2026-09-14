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
} from "@/types/simulator";
import {
  createArchitectureEvent,
  getEdgeVisualProps,
  validateArchitectureGraph,
  evaluateArchitectureRules,
  validateGraphOnBackend,
  fetchAIArchitectCritique,
} from "@/lib/architectureGraph";

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
}

const SimulatorCustomNode = ({ data }: { data: CustomFlowData }) => {
  const node = data?.archNode;
  if (!node) return null;
  const comp =
    COMPONENT_CATALOG.find((c) => c.type === node.type) || COMPONENT_CATALOG[0];
  const Icon = comp.icon;
  const replicas = node.config?.replicas || 1;
  const severity = data?.violationSeverity;

  let borderStyle = `${comp.borderClass} hover:border-cyan-500/60`;
  if (data.isSelected) {
    borderStyle = "border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]";
  } else if (severity === "critical") {
    borderStyle = "border-red-500 ring-2 ring-red-500/70 shadow-[0_0_22px_rgba(239,68,68,0.55)] animate-pulse";
  } else if (severity === "warning") {
    borderStyle = "border-amber-400 ring-1 ring-amber-400/50 shadow-[0_0_16px_rgba(251,191,36,0.35)]";
  }

  return (
    <div
      className={`relative px-4 py-3 rounded-xl border bg-[#091122]/95 backdrop-blur-xl shadow-2xl min-w-[185px] transition-all duration-200 cursor-pointer ${borderStyle}`}
    >
      {/* Violation Severity Badge */}
      {severity === "critical" && (
        <div
          className="absolute -top-3 -right-2 px-2 py-0.5 rounded-full bg-red-950/95 border border-red-500 text-[9px] font-bold text-red-300 flex items-center gap-1 shadow-lg shadow-red-950/60 z-20"
          title={data.violations?.map((v) => `[${v.rule_name}] ${v.message}`).join("\n")}
        >
          <AlertTriangle className="w-2.5 h-2.5 text-red-400 animate-pulse" />
          <span>Critical ({data.violations?.length || 1})</span>
        </div>
      )}
      {severity === "warning" && (
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
            <span>{node.config.latency_ms || 1}ms</span>
          </div>
        </div>
      </div>

      {/* Egress Source Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-cyan-400 border-2 border-[#050914] shadow-sm hover:scale-125 transition-transform"
      />
    </div>
  );
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
      return {
        id: n.id,
        type: "simulatorCustomNode",
        position: n.position,
        data: {
          archNode: n,
          isSelected: n.id === selectedNodeId,
          violationSeverity: vInfo?.severity || null,
          violations: vInfo?.violations || [],
        },
      };
    });
  }, [graphState.nodes, selectedNodeId, nodeViolationMap]);

  const flowEdges: Edge[] = useMemo(() => {
    return graphState.edges.map((e) => {
      const visualProps = getEdgeVisualProps(e.connectionType);
      const isSelected = e.id === selectedEdgeId;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: visualProps.animated,
        label: visualProps.label,
        labelStyle: visualProps.labelStyle,
        labelBgStyle: visualProps.labelBgStyle,
        markerEnd: { type: MarkerType.ArrowClosed, color: visualProps.stroke },
        style: {
          stroke: isSelected ? "#38bdf8" : visualProps.stroke,
          strokeWidth: isSelected ? 3 : visualProps.strokeWidth,
          strokeDasharray: visualProps.strokeDasharray,
        },
      };
    });
  }, [graphState.edges, selectedEdgeId]);

  const nodeTypes = useMemo(() => ({ simulatorCustomNode: SimulatorCustomNode }), []);

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
    },
    [commitGraphChange, reactFlowInstance]
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

  // Drag & Drop Handlers
  const onDragStart = (event: React.DragEvent, compType: string) => {
    event.dataTransfer.setData("application/reactflow", compType);
    event.dataTransfer.setData("text/plain", compType);
    event.dataTransfer.setData("application/reactflow/type", compType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const compType =
        event.dataTransfer.getData("application/reactflow") ||
        event.dataTransfer.getData("text/plain") ||
        event.dataTransfer.getData("application/reactflow/type");
      if (!compType) return;

      let position = { x: 350, y: 200 };
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
          console.warn("Could not calculate flow position:", err);
        }
      } else if (reactFlowWrapper.current) {
        const bounds = reactFlowWrapper.current.getBoundingClientRect();
        position = {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        };
      }

      handleAddComponent(compType, position);
    },
    [reactFlowInstance, handleAddComponent]
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

  // Node Drag on Canvas
  const onNodesChange = useCallback((changes: any) => {
    setGraphState((prev) => {
      const updatedFlowNodes = applyNodeChanges(
        changes,
        prev.nodes.map((n) => ({
          id: n.id,
          type: "simulatorCustomNode",
          position: n.position,
          data: { archNode: n },
        }))
      );
      return {
        ...prev,
        nodes: prev.nodes.map((n) => {
          const match = updatedFlowNodes.find((fn) => fn.id === n.id);
          return match ? { ...n, position: match.position } : n;
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
                ? "bg-white/[0.1] text-cyan-300 font-semibold"
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
            className={`px-3 py-1 rounded-lg transition ${
              activeTab === "simulation"
                ? "bg-white/[0.1] text-cyan-300 font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Simulation
          </button>
          <button
            onClick={() => setActiveTab("evaluation")}
            className={`px-3 py-1 rounded-lg transition ${
              activeTab === "evaluation"
                ? "bg-white/[0.1] text-cyan-300 font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Evaluation
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
                  onClick={() => handleAddComponent(comp.type)}
                  className={`group p-2.5 rounded-xl border ${comp.borderClass} bg-slate-950/60 hover:bg-slate-900/90 transition-all cursor-grab active:cursor-grabbing shadow-sm flex items-center justify-between select-none`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
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
          onDrop={onDrop}
          className="flex-1 h-full relative bg-[#040814]"
        >
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
            minZoom={0.2}
            maxZoom={2}
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
        <aside className="w-72 sm:w-80 border-l border-white/[0.08] bg-[#070c18] flex flex-col shrink-0 z-20">
          {/* Node Selected */}
          {activeNode ? (
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

                {/* Replicas Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-400 font-semibold">
                      REPLICAS (INSTANCES)
                    </label>
                    <span className="text-cyan-400 font-bold">
                      {activeNode.config.replicas}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={16}
                    value={activeNode.config.replicas}
                    onChange={(e) => {
                      const replicas = parseInt(e.target.value);
                      commitGraphChange(
                        (prev) => ({
                          ...prev,
                          nodes: prev.nodes.map((n) =>
                            n.id === activeNode.id
                              ? { ...n, config: { ...n.config, replicas } }
                              : n
                          ),
                        }),
                        "UPDATE_CONFIGURATION",
                        `Updated '${activeNode.name}' replicas to ${replicas}`,
                        { nodeId: activeNode.id }
                      );
                    }}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* QPS Capacity */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    QPS CAPACITY PER NODE
                  </label>
                  <input
                    type="number"
                    value={activeNode.config.qps_capacity}
                    onChange={(e) => {
                      const qps = parseInt(e.target.value) || 0;
                      commitGraphChange(
                        (prev) => ({
                          ...prev,
                          nodes: prev.nodes.map((n) =>
                            n.id === activeNode.id
                              ? { ...n, config: { ...n.config, qps_capacity: qps } }
                              : n
                          ),
                        }),
                        "UPDATE_CONFIGURATION",
                        `Updated '${activeNode.name}' QPS capacity to ${qps}`,
                        { nodeId: activeNode.id }
                      );
                    }}
                    className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                  />
                </div>

                {/* Latency (ms) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    PROCESSING LATENCY (MS)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    value={activeNode.config.latency_ms}
                    onChange={(e) => {
                      const lat = parseFloat(e.target.value) || 1;
                      commitGraphChange(
                        (prev) => ({
                          ...prev,
                          nodes: prev.nodes.map((n) =>
                            n.id === activeNode.id
                              ? { ...n, config: { ...n.config, latency_ms: lat } }
                              : n
                          ),
                        }),
                        "UPDATE_CONFIGURATION",
                        `Updated '${activeNode.name}' latency to ${lat}ms`,
                        { nodeId: activeNode.id }
                      );
                    }}
                    className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                  />
                </div>

                {/* Cache Eviction Policy (if cache) */}
                {activeNode.category === "cache" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-semibold">
                      CACHE EVICTION POLICY
                    </label>
                    <select
                      value={activeNode.config.cache_policy || "LRU"}
                      onChange={(e) => {
                        const policy = e.target.value as any;
                        commitGraphChange(
                          (prev) => ({
                            ...prev,
                            nodes: prev.nodes.map((n) =>
                              n.id === activeNode.id
                                ? { ...n, config: { ...n.config, cache_policy: policy } }
                                : n
                            ),
                          }),
                          "UPDATE_CONFIGURATION",
                          `Changed cache eviction policy to ${policy}`,
                          { nodeId: activeNode.id }
                        );
                      }}
                      className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    >
                      <option value="LRU">LRU (Least Recently Used)</option>
                      <option value="LFU">LFU (Least Frequently Used)</option>
                      <option value="FIFO">FIFO (First-In First-Out)</option>
                      <option value="ARC">ARC (Adaptive Replacement)</option>
                    </select>
                  </div>
                )}

                {/* Replication Mode (if database) */}
                {activeNode.category === "database" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-semibold">
                      REPLICATION STRATEGY
                    </label>
                    <select
                      value={activeNode.config.replication_mode || "sync"}
                      onChange={(e) => {
                        const repMode = e.target.value as any;
                        commitGraphChange(
                          (prev) => ({
                            ...prev,
                            nodes: prev.nodes.map((n) =>
                              n.id === activeNode.id
                                ? { ...n, config: { ...n.config, replication_mode: repMode } }
                                : n
                            ),
                          }),
                          "UPDATE_CONFIGURATION",
                          `Set replication mode to ${repMode}`,
                          { nodeId: activeNode.id }
                        );
                      }}
                      className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    >
                      <option value="sync">Synchronous (Strong Consistency)</option>
                      <option value="async">Asynchronous (Eventual Consistency)</option>
                      <option value="semi_sync">Semi-Synchronous</option>
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
            /* Edge Selected */
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
            /* Blank State */
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
