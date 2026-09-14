"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
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
  Clock,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Maximize2,
  Minimize2,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";

// ============================================================================
// COMPONENT LIBRARY DEFINITIONS FOR PHASE 1
// ============================================================================

interface ComponentDefinition {
  type: string;
  name: string;
  category: "networking" | "compute" | "database" | "cache" | "messaging" | "storage";
  description: string;
  icon: React.ElementType;
  badge: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
  defaultProps: {
    replicas: number;
    qps_capacity: number;
    latency_ms: number;
    memory_gb?: number;
    storage_gb?: number;
    [key: string]: any;
  };
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
    defaultProps: { replicas: 1, qps_capacity: 50000, latency_ms: 1 },
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
    defaultProps: { replicas: 2, qps_capacity: 100000, latency_ms: 2 },
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
    defaultProps: { replicas: 5, qps_capacity: 50000, latency_ms: 5 },
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
    defaultProps: { replicas: 2, qps_capacity: 35000, latency_ms: 2 },
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
    defaultProps: { replicas: 3, qps_capacity: 25000, latency_ms: 3 },
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
    defaultProps: { replicas: 4, qps_capacity: 8000, latency_ms: 12, memory_gb: 16 },
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
    defaultProps: { replicas: 3, qps_capacity: 10000, latency_ms: 8, memory_gb: 8 },
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
    defaultProps: { replicas: 2, qps_capacity: 4000, latency_ms: 25, memory_gb: 8 },
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
    defaultProps: { replicas: 2, qps_capacity: 5000, latency_ms: 14, storage_gb: 500 },
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
    defaultProps: { replicas: 2, qps_capacity: 5500, latency_ms: 12, storage_gb: 500 },
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
    defaultProps: { replicas: 3, qps_capacity: 12000, latency_ms: 6, storage_gb: 1000 },
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
    defaultProps: { replicas: 3, qps_capacity: 25000, latency_ms: 5, storage_gb: 2000 },
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
    defaultProps: { replicas: 2, qps_capacity: 40000, latency_ms: 1, memory_gb: 32 },
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
    defaultProps: { replicas: 2, qps_capacity: 50000, latency_ms: 1, memory_gb: 64 },
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
    defaultProps: { replicas: 3, qps_capacity: 30000, latency_ms: 3, storage_gb: 500 },
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
    defaultProps: { replicas: 2, qps_capacity: 12000, latency_ms: 4 },
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
    defaultProps: { replicas: 3, qps_capacity: 15000, latency_ms: 30, storage_gb: 50000 },
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
    defaultProps: { replicas: 2, qps_capacity: 20000, latency_ms: 3, storage_gb: 1000 },
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

interface SimulatorNodeData extends Record<string, unknown> {
  compType: string;
  name: string;
  isSelected?: boolean;
  properties: {
    replicas: number;
    qps_capacity: number;
    latency_ms: number;
    memory_gb?: number;
    storage_gb?: number;
    [key: string]: any;
  };
}

const SimulatorNode = ({ data }: { data: SimulatorNodeData }) => {
  const comp =
    COMPONENT_CATALOG.find((c) => c.type === data.compType) || COMPONENT_CATALOG[0];
  const Icon = comp.icon;
  const replicas = data.properties?.replicas || 1;

  return (
    <div
      className={`relative px-4 py-3 rounded-xl border bg-[#091122]/95 backdrop-blur-xl shadow-2xl min-w-[170px] transition-all duration-200 cursor-pointer ${
        data.isSelected
          ? "border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          : `${comp.borderClass} hover:border-cyan-500/60`
      }`}
    >
      {/* Directional Connection Handles */}
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
              {data.name}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 border border-white/[0.04]">
              {comp.badge}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
            <span className="text-cyan-400 font-semibold">
              {replicas > 1 ? `${replicas}x Instances` : "1 Instance"}
            </span>
            <span>•</span>
            <span>{data.properties?.latency_ms || 1}ms</span>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-cyan-400 border-2 border-[#050914] shadow-sm hover:scale-125 transition-transform"
      />
    </div>
  );
};

// ============================================================================
// SYSTEM DESIGN PROBLEM SCENARIOS
// ============================================================================

interface SystemProblem {
  id: string;
  title: string;
  category: string;
  targetRPS: string;
  description: string;
  initialNodes: Node<SimulatorNodeData>[];
  initialEdges: Edge[];
}

const PROBLEMS: SystemProblem[] = [
  {
    id: "youtube",
    title: "Design YouTube",
    category: "Advanced Media Streaming",
    targetRPS: "50K RPS",
    description:
      "Design a global video sharing and streaming platform handling billions of daily video views with low latency and durable storage.",
    initialNodes: [
      {
        id: "client-1",
        type: "simulatorNode",
        position: { x: 50, y: 180 },
        data: {
          compType: "client",
          name: "Video Viewers",
          properties: { replicas: 1, qps_capacity: 50000, latency_ms: 1 },
        },
      },
      {
        id: "api_gateway-1",
        type: "simulatorNode",
        position: { x: 280, y: 180 },
        data: {
          compType: "api_gateway",
          name: "API Gateway",
          properties: { replicas: 3, qps_capacity: 30000, latency_ms: 2 },
        },
      },
      {
        id: "load_balancer-1",
        type: "simulatorNode",
        position: { x: 510, y: 180 },
        data: {
          compType: "load_balancer",
          name: "Video Load Balancer",
          properties: { replicas: 2, qps_capacity: 35000, latency_ms: 2 },
        },
      },
      {
        id: "server-1",
        type: "simulatorNode",
        position: { x: 740, y: 180 },
        data: {
          compType: "server",
          name: "Video Streaming Cluster",
          properties: { replicas: 6, qps_capacity: 15000, latency_ms: 6, memory_gb: 32 },
        },
      },
      {
        id: "redis-1",
        type: "simulatorNode",
        position: { x: 990, y: 90 },
        data: {
          compType: "redis",
          name: "Video Metadata Cache",
          properties: { replicas: 3, qps_capacity: 50000, latency_ms: 1, memory_gb: 64 },
        },
      },
      {
        id: "postgresql-1",
        type: "simulatorNode",
        position: { x: 990, y: 280 },
        data: {
          compType: "postgresql",
          name: "Metadata Store",
          properties: { replicas: 2, qps_capacity: 8000, latency_ms: 12, storage_gb: 1000 },
        },
      },
    ],
    initialEdges: [
      {
        id: "e-c-gw",
        source: "client-1",
        target: "api_gateway-1",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" },
        style: { stroke: "#0ea5e9", strokeWidth: 1.5 },
      },
      {
        id: "e-gw-lb",
        source: "api_gateway-1",
        target: "load_balancer-1",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" },
        style: { stroke: "#0ea5e9", strokeWidth: 1.5 },
      },
      {
        id: "e-lb-srv",
        source: "load_balancer-1",
        target: "server-1",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" },
        style: { stroke: "#0ea5e9", strokeWidth: 1.5 },
      },
      {
        id: "e-srv-redis",
        source: "server-1",
        target: "redis-1",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" },
        style: { stroke: "#0ea5e9", strokeWidth: 1.5 },
      },
      {
        id: "e-srv-db",
        source: "server-1",
        target: "postgresql-1",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" },
        style: { stroke: "#0ea5e9", strokeWidth: 1.5 },
      },
    ],
  },
  {
    id: "tinyurl",
    title: "Design TinyURL",
    category: "URL Shortener",
    targetRPS: "100K RPS",
    description:
      "Design a scalable URL shortening service like TinyURL or Bitly with ultra-low redirect latency.",
    initialNodes: [
      {
        id: "tu-c1",
        type: "simulatorNode",
        position: { x: 60, y: 180 },
        data: { compType: "client", name: "Web Clients", properties: { replicas: 1, qps_capacity: 50000, latency_ms: 1 } },
      },
      {
        id: "tu-gw",
        type: "simulatorNode",
        position: { x: 300, y: 180 },
        data: { compType: "api_gateway", name: "Envoy Gateway", properties: { replicas: 2, qps_capacity: 30000, latency_ms: 2 } },
      },
      {
        id: "tu-srv",
        type: "simulatorNode",
        position: { x: 550, y: 180 },
        data: { compType: "server", name: "Redirect Service", properties: { replicas: 4, qps_capacity: 20000, latency_ms: 5, memory_gb: 16 } },
      },
      {
        id: "tu-redis",
        type: "simulatorNode",
        position: { x: 800, y: 80 },
        data: { compType: "redis", name: "Redis LRU Cache", properties: { replicas: 2, qps_capacity: 60000, latency_ms: 1, memory_gb: 32 } },
      },
      {
        id: "tu-db",
        type: "simulatorNode",
        position: { x: 800, y: 280 },
        data: { compType: "postgresql", name: "Postgres Cluster", properties: { replicas: 2, qps_capacity: 7000, latency_ms: 15, storage_gb: 500 } },
      },
    ],
    initialEdges: [
      { id: "e-tu-1", source: "tu-c1", target: "tu-gw", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" } },
      { id: "e-tu-2", source: "tu-gw", target: "tu-srv", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" } },
      { id: "e-tu-3", source: "tu-srv", target: "tu-redis", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" } },
      { id: "e-tu-4", source: "tu-srv", target: "tu-db", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" } },
    ],
  },
  {
    id: "whatsapp",
    title: "Design WhatsApp",
    category: "Real-Time Messaging",
    targetRPS: "500K Msg/s",
    description:
      "Design a real-time global chat messaging service with end-to-end encryption and offline message delivery.",
    initialNodes: [],
    initialEdges: [],
  },
];

// ============================================================================
// MAIN SIMULATOR CANVAS COMPONENT
// ============================================================================

function SimulatorContent() {
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Active Problem & Stage
  const [currentProblem, setCurrentProblem] = useState<SystemProblem>(PROBLEMS[0]);
  const [activeTab, setActiveTab] = useState<"requirements" | "architecture" | "simulation" | "evaluation">("architecture");
  const [problemDropdownOpen, setProblemDropdownOpen] = useState(false);

  // Search & Categories in Component Sidebar
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Canvas Graph State
  const [nodes, setNodes] = useState<Node<SimulatorNodeData>[]>(PROBLEMS[0].initialNodes);
  const [edges, setEdges] = useState<Edge[]>(PROBLEMS[0].initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<SimulatorNodeData> | null>(null);

  // Timer: 18:42 countdown representation
  const [secondsRemaining, setSecondsRemaining] = useState<number>(18 * 60 + 42);

  // Format timer MM:SS
  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [secondsRemaining]);

  const nodeTypes = useMemo(() => ({ simulatorNode: SimulatorNode }), []);

  // Filtered components list
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

  // Handle Drag from Component Sidebar
  const onDragStart = (event: React.DragEvent, compType: string) => {
    event.dataTransfer.setData("application/reactflow/type", compType);
    event.dataTransfer.effectAllowed = "move";
  };

  // Handle Drag Over Canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle Drop onto Canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const compType = event.dataTransfer.getData("application/reactflow/type");
      if (!compType) return;

      const comp = COMPONENT_CATALOG.find((c) => c.type === compType);
      if (!comp) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newId = `${compType}-${Date.now().toString().slice(-4)}`;
      const newNode: Node<SimulatorNodeData> = {
        id: newId,
        type: "simulatorNode",
        position,
        data: {
          compType: comp.type,
          name: comp.name,
          properties: { ...comp.defaultProps },
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance]
  );

  // Quick Add Button
  const handleQuickAdd = (compType: string) => {
    const comp = COMPONENT_CATALOG.find((c) => c.type === compType);
    if (!comp) return;

    const newId = `${compType}-${Date.now().toString().slice(-4)}`;
    const newNode: Node<SimulatorNodeData> = {
      id: newId,
      type: "simulatorNode",
      position: { x: 320 + Math.random() * 60, y: 180 + Math.random() * 60 },
      data: {
        compType: comp.type,
        name: comp.name,
        properties: { ...comp.defaultProps },
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  // Node & Edge Change Handlers
  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" },
            style: { stroke: "#0ea5e9", strokeWidth: 1.5 },
          },
          eds
        )
      );
    },
    []
  );

  // Select Node
  const onNodeClick = (_: any, node: Node) => {
    const simNode = node as Node<SimulatorNodeData>;
    setSelectedNode(simNode);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isSelected: n.id === simNode.id,
        },
      }))
    );
  };

  const onPaneClick = () => {
    setSelectedNode(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, isSelected: false },
      }))
    );
  };

  // Delete Selected Node
  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
    );
    setSelectedNode(null);
  };

  // Duplicate Selected Node
  const handleDuplicateNode = () => {
    if (!selectedNode) return;
    const newId = `${selectedNode.data.compType}-${Date.now().toString().slice(-4)}`;
    const duplicatedNode: Node<SimulatorNodeData> = {
      id: newId,
      type: "simulatorNode",
      position: {
        x: selectedNode.position.x + 40,
        y: selectedNode.position.y + 40,
      },
      data: {
        ...selectedNode.data,
        name: `${selectedNode.data.name} (Copy)`,
        isSelected: false,
        properties: { ...selectedNode.data.properties },
      },
    };
    setNodes((nds) => [...nds, duplicatedNode]);
  };

  // Update Config Properties
  const handleUpdateProperty = (key: string, value: any) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updatedNode = {
            ...n,
            data: {
              ...n.data,
              properties: {
                ...n.data.properties,
                [key]: value,
              },
            },
          };
          setSelectedNode(updatedNode);
          return updatedNode;
        }
        return n;
      })
    );
  };

  const handleUpdateName = (name: string) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updatedNode = {
            ...n,
            data: {
              ...n.data,
              name,
            },
          };
          setSelectedNode(updatedNode);
          return updatedNode;
        }
        return n;
      })
    );
  };

  // Switch Problem
  const handleSelectProblem = (problem: SystemProblem) => {
    setCurrentProblem(problem);
    setNodes(problem.initialNodes);
    setEdges(problem.initialEdges);
    setSelectedNode(null);
    setProblemDropdownOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#050914] text-slate-200">
      {/* ==================================================================== */}
      {/* 1. TOP BAR — DEVELOPER TOOL HEADER                                   */}
      {/* ==================================================================== */}
      <header className="h-14 border-b border-white/[0.08] bg-[#070d1a]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-40">
        {/* Left: Brand & Problem Selector */}
        <div className="flex items-center gap-4 min-w-0">
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
                Simulator
              </span>
            </div>
          </Link>

          <div className="h-5 w-[1px] bg-white/[0.08] hidden sm:block" />

          {/* Problem Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProblemDropdownOpen(!problemDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-xs font-mono text-white transition group"
            >
              <span className="text-slate-400 font-normal">Problem:</span>
              <span className="font-bold text-cyan-300">{currentProblem.title}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-transform ${
                  problemDropdownOpen ? "rotate-180 text-cyan-400" : ""
                }`}
              />
            </button>

            {problemDropdownOpen && (
              <div className="absolute top-10 left-0 w-72 rounded-xl border border-white/[0.1] bg-[#070d1a]/98 backdrop-blur-2xl shadow-2xl p-2 z-50 space-y-1">
                {PROBLEMS.map((prob) => (
                  <button
                    key={prob.id}
                    onClick={() => handleSelectProblem(prob)}
                    className={`w-full text-left p-2.5 rounded-lg transition text-xs font-mono flex flex-col gap-0.5 ${
                      currentProblem.id === prob.id
                        ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300"
                        : "hover:bg-white/[0.04] text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{prob.title}</span>
                      <span className="text-[10px] text-slate-500">{prob.targetRPS}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">
                      {prob.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Stage Navigation Pills */}
        <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-white/[0.08] text-xs font-mono">
          <button
            onClick={() => setActiveTab("requirements")}
            className={`px-3 py-1 rounded-lg transition ${
              activeTab === "requirements"
                ? "bg-white/[0.1] text-cyan-300 font-semibold shadow-sm"
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
                ? "bg-white/[0.1] text-cyan-300 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Simulation
          </button>
          <button
            onClick={() => setActiveTab("evaluation")}
            className={`px-3 py-1 rounded-lg transition ${
              activeTab === "evaluation"
                ? "bg-white/[0.1] text-cyan-300 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Evaluation
          </button>
        </div>

        {/* Right: Actions, Traffic, Timer */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Traffic Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-slate-900/60 text-xs font-mono">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Traffic:</span>
            <span className="font-bold text-cyan-300">{currentProblem.targetRPS}</span>
          </div>

          {/* Run Simulation Trigger */}
          <button
            onClick={() => setActiveTab("simulation")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono font-bold transition shadow-sm shadow-amber-500/10 active:scale-95"
            title="Launch Discrete-Event Simulation"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Run Simulation</span>
          </button>

          {/* Evaluate Architecture Trigger */}
          <button
            onClick={() => setActiveTab("evaluation")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 text-xs font-mono font-bold transition shadow-sm shadow-cyan-500/20 active:scale-95"
            title="Evaluate Architecture Graph"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Evaluate</span>
          </button>

          {/* Interview Timer */}
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
          {/* Library Header & Search */}
          <div className="p-3.5 border-b border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
              <span>COMPONENT LIBRARY</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                {filteredComponents.length} Blocks
              </span>
            </div>

            {/* Component Search Input */}
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

          {/* Draggable Components List */}
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

                  {/* One-click Add Button */}
                  <button
                    onClick={() => handleQuickAdd(comp.type)}
                    title="Click to add component to canvas"
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-cyan-500/20 text-cyan-400 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer Hint */}
          <div className="p-3 border-t border-white/[0.06] bg-slate-950/60 text-[10px] font-mono text-slate-500 text-center">
            Drag onto canvas or click (+) to place
          </div>
        </aside>

        {/* ================================================================== */}
        {/* CENTER PANE: INTERACTIVE ARCHITECTURE CANVAS                       */}
        {/* ================================================================== */}
        <main
          ref={reactFlowWrapper}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className="flex-1 h-full relative bg-[#040814]"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
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

          {/* Quick Floating Action Bar on Canvas */}
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
                setNodes([]);
                setEdges([]);
                setSelectedNode(null);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Clear Canvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {selectedNode && (
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
                  onClick={handleDeleteNode}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Delete Selected Node"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Canvas Bottom Topology Legend */}
          <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/[0.06] backdrop-blur-md text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Directional Edge
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Compute Node
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Cache Tier
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Database
            </span>
          </div>
        </main>

        {/* ================================================================== */}
        {/* RIGHT PANE: NODE CONFIGURATION & INSPECTION DRAWER                 */}
        {/* ================================================================== */}
        <aside className="w-72 sm:w-80 border-l border-white/[0.08] bg-[#070c18] flex flex-col shrink-0 z-20">
          {selectedNode ? (
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* Drawer Header */}
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
                      ID: {selectedNode.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Node Properties Form */}
              <div className="p-4 space-y-4 text-xs font-mono">
                {/* Node Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    COMPONENT NAME
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.name}
                    onChange={(e) => handleUpdateName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                  />
                </div>

                {/* Instance Replicas Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-400 font-semibold">
                      REPLICAS (INSTANCES)
                    </label>
                    <span className="text-cyan-400 font-bold">
                      {selectedNode.data.properties.replicas}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={16}
                    value={selectedNode.data.properties.replicas}
                    onChange={(e) =>
                      handleUpdateProperty("replicas", parseInt(e.target.value))
                    }
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
                    value={selectedNode.data.properties.qps_capacity || 10000}
                    onChange={(e) =>
                      handleUpdateProperty("qps_capacity", parseInt(e.target.value) || 0)
                    }
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
                    value={selectedNode.data.properties.latency_ms || 1}
                    onChange={(e) =>
                      handleUpdateProperty("latency_ms", parseFloat(e.target.value) || 1)
                    }
                    className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                  />
                </div>

                {/* Memory Allocation */}
                {selectedNode.data.properties.memory_gb !== undefined && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-semibold">
                      MEMORY ALLOCATION (GB)
                    </label>
                    <input
                      type="number"
                      value={selectedNode.data.properties.memory_gb}
                      onChange={(e) =>
                        handleUpdateProperty("memory_gb", parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                )}

                {/* Storage Allocation */}
                {selectedNode.data.properties.storage_gb !== undefined && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-semibold">
                      STORAGE CAPACITY (GB)
                    </label>
                    <input
                      type="number"
                      value={selectedNode.data.properties.storage_gb}
                      onChange={(e) =>
                        handleUpdateProperty("storage_gb", parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-slate-950 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    />
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
                    onClick={handleDeleteNode}
                    className="flex-1 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center text-slate-500 font-mono space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-slate-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-300">
                  Select Component to Configure
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                  Click any node on the canvas to inspect its capacity, replicas, and latency.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
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
