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
} from "@/types/simulator";
import {
  createArchitectureEvent,
  getEdgeVisualProps,
  validateArchitectureGraph,
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
}

const SimulatorCustomNode = ({ data }: { data: CustomFlowData }) => {
  const node = data.archNode;
  const comp =
    COMPONENT_CATALOG.find((c) => c.type === node.type) || COMPONENT_CATALOG[0];
  const Icon = comp.icon;
  const replicas = node.config.replicas || 1;

  return (
    <div
      className={`relative px-4 py-3 rounded-xl border bg-[#091122]/95 backdrop-blur-xl shadow-2xl min-w-[180px] transition-all duration-200 cursor-pointer ${
        data.isSelected
          ? "border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          : `${comp.borderClass} hover:border-cyan-500/60`
      }`}
    >
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
            <span className="text-cyan-400 font-semibold">
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

  // Deterministic Graph Validation
  const validationReport: GraphValidationReport = useMemo(() => {
    return validateArchitectureGraph(graphState);
  }, [graphState]);

  // Convert Architecture Graph to ReactFlow Nodes & Edges
  const flowNodes: Node<CustomFlowData>[] = useMemo(() => {
    return graphState.nodes.map((n) => ({
      id: n.id,
      type: "simulatorCustomNode",
      position: n.position,
      data: {
        archNode: n,
        isSelected: n.id === selectedNodeId,
      },
    }));
  }, [graphState.nodes, selectedNodeId]);

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

      const pos = position || {
        x: 320 + Math.random() * 80,
        y: 180 + Math.random() * 80,
      };

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
      const compType = event.dataTransfer.getData("application/reactflow/type");
      if (!compType) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      handleAddComponent(compType, position);
    },
    [reactFlowInstance, handleAddComponent]
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

          {/* Graph Status Pill with Live Validation Health */}
          <button
            onClick={() => setShowValidationDrawer(true)}
            className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition ${
              validationReport.isValid
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            }`}
            title="Inspect Real-time Topology Validation"
          >
            {validationReport.isValid ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Score: {validationReport.score}%</span>
            <span className="text-[10px] text-slate-400">
              (v{graphState.metadata.version})
            </span>
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
                    onClick={() => handleAddComponent(comp.type)}
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
      {/* 4. REAL-TIME GRAPH VALIDATION DRAWER                                 */}
      {/* ==================================================================== */}
      {showValidationDrawer && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-[#070d1a]/98 backdrop-blur-2xl border-l border-white/[0.1] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Topology Validation Report
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  Deterministic Graph Invariants • First Principles
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
            {/* Health Score Summary Card */}
            <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  TOPOLOGY HEALTH SCORE
                </span>
                <span className="text-2xl font-black font-mono text-cyan-300">
                  {validationReport.score}%
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/[0.06]">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-sky-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${validationReport.score}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-300 font-light mt-3 leading-relaxed">
                {validationReport.summary}
              </p>
            </div>

            {/* Validation Issues List */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                DETECTED STRUCTURAL CHECKS ({validationReport.issues.length})
              </div>
              {validationReport.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                    issue.severity === "error"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                      : issue.severity === "warning"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{issue.title}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold border border-current">
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-light leading-relaxed">
                    {issue.message}
                  </p>
                  <div className="text-[10px] font-mono text-slate-400 pt-1.5 border-t border-white/[0.06]">
                    <span className="text-cyan-400 font-semibold">Fix: </span>
                    <span>{issue.remediation}</span>
                  </div>
                </div>
              ))}
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
