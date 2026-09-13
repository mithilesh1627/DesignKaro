"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Cpu,
  ArrowLeft,
  Save,
  Share2,
  Play,
  RotateCcw,
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Download,
  Layers,
  Sparkles,
  Zap,
  Server,
  Database,
  Radio,
  HardDrive,
  Globe,
  Brain,
  Sliders,
  X,
  FileCode,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";
import { useAuthStore } from "@/lib/authStore";
import { API_BASE } from "@/lib/api";
import { AiMentorDrawer } from "@/components/AiMentorDrawer";

// Component Category Definitions
const COMPONENT_CATEGORIES = [
  {
    category: "Ingress & Compute",
    items: [
      { type: "client", label: "Client Tier", icon: Globe, color: "border-sky-500/40 text-sky-400 bg-sky-500/10" },
      { type: "gateway", label: "API Gateway", icon: ShieldCheck, color: "border-purple-500/40 text-purple-400 bg-purple-500/10" },
      { type: "load_balancer", label: "Load Balancer", icon: Layers, color: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10" },
      { type: "service", label: "Microservice", icon: Server, color: "border-blue-500/40 text-blue-400 bg-blue-500/10" },
    ],
  },
  {
    category: "Databases & Storage",
    items: [
      { type: "cache", label: "Redis Cache", icon: Zap, color: "border-rose-500/40 text-rose-400 bg-rose-500/10" },
      { type: "relational_db", label: "Relational DB", icon: Database, color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" },
      { type: "nosql_db", label: "NoSQL DB", icon: Database, color: "border-teal-500/40 text-teal-400 bg-teal-500/10" },
      { type: "storage", label: "Object Store", icon: HardDrive, color: "border-indigo-500/40 text-indigo-400 bg-indigo-500/10" },
    ],
  },
  {
    category: "Async & AI Tier",
    items: [
      { type: "queue", label: "Message Queue", icon: Radio, color: "border-amber-500/40 text-amber-400 bg-amber-500/10" },
      { type: "cdn", label: "Edge CDN", icon: Globe, color: "border-orange-500/40 text-orange-400 bg-orange-500/10" },
      { type: "ml", label: "ML / Vector DB", icon: Brain, color: "border-fuchsia-500/40 text-fuchsia-400 bg-fuchsia-500/10" },
    ],
  },
];

const COMPONENT_PALETTE = COMPONENT_CATEGORIES.flatMap((c) => c.items);

export interface ArchitectureNodeData extends Record<string, unknown> {
  type: string;
  label: string;
  isSelected?: boolean;
  properties?: {
    replicas?: number;
    latency_ms?: number;
    qps_capacity?: number;
    memory_gb?: number;
    storage_gb?: number;
    [key: string]: any;
  };
}

export type ArchitectureNodeType = Node<ArchitectureNodeData>;

// Custom Flow Node
const ArchitectureNode = ({ data }: { data: ArchitectureNodeData; id: string }) => {
  const comp = COMPONENT_PALETTE.find((c) => c.type === data.type) || COMPONENT_PALETTE[3];
  const Icon = comp.icon;
  const replicas = data.properties?.replicas || 1;

  return (
    <div
      className={`relative px-4 py-3 rounded-xl border bg-surface-900/90 shadow-xl min-w-[150px] transition-all cursor-pointer ${
        data.isSelected ? "border-sky-400 ring-2 ring-sky-500/30" : comp.color
      }`}
    >
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-sky-400 border-2 border-slate-900" />
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg border ${comp.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-bold text-white tracking-wide">{data.label}</div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
            <span>{replicas > 1 ? `${replicas} Replicas` : "1 Instance"}</span>
            {data.properties?.latency_ms && (
              <>
                <span>•</span>
                <span>{data.properties.latency_ms}ms</span>
              </>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-sky-400 border-2 border-slate-900" />
    </div>
  );
};

// Preset Architecture Templates
const TEMPLATES: Record<string, { title: string; nodes: Node[]; edges: Edge[] }> = {
  tinyurl: {
    title: "TinyURL Distributed Architecture",
    nodes: [
      { id: "c1", type: "custom", position: { x: 50, y: 150 }, data: { type: "client", label: "Web Clients", properties: { replicas: 1, latency_ms: 5 } } },
      { id: "gw1", type: "custom", position: { x: 260, y: 150 }, data: { type: "gateway", label: "Envoy Gateway", properties: { replicas: 2, latency_ms: 2 } } },
      { id: "s1", type: "custom", position: { x: 480, y: 150 }, data: { type: "service", label: "Redirect Pods", properties: { replicas: 4, latency_ms: 5 } } },
      { id: "cache1", type: "custom", position: { x: 700, y: 60 }, data: { type: "cache", label: "Redis LRU (80/20)", properties: { replicas: 2, latency_ms: 1 } } },
      { id: "db1", type: "custom", position: { x: 700, y: 240 }, data: { type: "relational_db", label: "Postgres HA Cluster", properties: { replicas: 2, latency_ms: 15 } } },
      { id: "q1", type: "custom", position: { x: 480, y: 320 }, data: { type: "queue", label: "Click Telemetry (Kafka)", properties: { replicas: 3, latency_ms: 2 } } },
      { id: "worker1", type: "custom", position: { x: 700, y: 360 }, data: { type: "service", label: "Analytics Worker", properties: { replicas: 2, latency_ms: 10 } } },
    ],
    edges: [
      { id: "e1", source: "c1", target: "gw1", animated: true },
      { id: "e2", source: "gw1", target: "s1", animated: true },
      { id: "e3", source: "s1", target: "cache1", animated: true },
      { id: "e4", source: "s1", target: "db1", animated: true },
      { id: "e5", source: "s1", target: "q1", animated: true },
      { id: "e6", source: "q1", target: "worker1", animated: true },
      { id: "e7", source: "worker1", target: "db1", animated: true },
    ],
  },
  rate_limiter: {
    title: "Distributed Rate Limiter (Token Bucket)",
    nodes: [
      { id: "c1", type: "custom", position: { x: 50, y: 150 }, data: { type: "client", label: "Client Ingress", properties: { replicas: 1, latency_ms: 2 } } },
      { id: "gw1", type: "custom", position: { x: 260, y: 150 }, data: { type: "gateway", label: "Rate Limiter Proxy", properties: { replicas: 3, latency_ms: 1 } } },
      { id: "cache1", type: "custom", position: { x: 480, y: 60 }, data: { type: "cache", label: "Redis Cluster (Lua)", properties: { replicas: 3, latency_ms: 1 } } },
      { id: "s1", type: "custom", position: { x: 480, y: 240 }, data: { type: "service", label: "Upstream Microservice", properties: { replicas: 4, latency_ms: 10 } } },
      { id: "db1", type: "custom", position: { x: 700, y: 240 }, data: { type: "relational_db", label: "Rules PostgreSQL", properties: { replicas: 2, latency_ms: 8 } } },
    ],
    edges: [
      { id: "e1", source: "c1", target: "gw1", animated: true },
      { id: "e2", source: "gw1", target: "cache1", animated: true },
      { id: "e3", source: "gw1", target: "s1", animated: true },
      { id: "e4", source: "s1", target: "db1", animated: true },
    ],
  },
};

function DesignCanvasContent() {
  const searchParams = useSearchParams();
  const problemSlug = searchParams.get("problem");
  const problemTitle = searchParams.get("title");
  const queryDesignId = searchParams.get("id") || searchParams.get("designId");

  const [currentDesignId, setCurrentDesignId] = useState<string | null>(queryDesignId || null);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [isMentorOpen, setIsMentorOpen] = useState<boolean>(false);

  const [nodes, setNodes] = useState<Node[]>(TEMPLATES.tinyurl.nodes);
  const [edges, setEdges] = useState<Edge[]>(TEMPLATES.tinyurl.edges);
  const [designTitle, setDesignTitle] = useState<string>(
    problemTitle ? `${problemTitle} Architecture` : "High-Throughput Distributed Architecture"
  );
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const { accessToken, isAuthenticated, user } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Load existing saved architecture if design ID passed in URL
  useEffect(() => {
    if (!queryDesignId) return;

    const loadSavedDesign = async () => {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

        const res = await fetch(`${API_BASE}/api/v1/designs/${queryDesignId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setCurrentDesignId(data.public_id || data.id);
          setCurrentVersion(data.version_number || 1);
          setDesignTitle(data.title);
          if (data.graph_data?.nodes && data.graph_data.nodes.length > 0) {
            setNodes(
              data.graph_data.nodes.map((n: any) => ({
                id: n.id,
                type: "custom",
                position: n.position || { x: 200, y: 150 },
                data: {
                  type: n.type,
                  label: n.label,
                  properties: n.properties,
                },
              }))
            );
          }
          if (data.graph_data?.edges) {
            setEdges(
              data.graph_data.edges.map((e: any) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                animated: e.animated !== false,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Failed to load design:", err);
      }
    };

    loadSavedDesign();
  }, [queryDesignId, accessToken]);

  const nodeTypes = useMemo(() => ({ custom: ArchitectureNode }), []);

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    []
  );

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNode(node);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isSelected: n.id === node.id,
        },
      }))
    );
  };

  const handleAddNode = (compType: string) => {
    const comp = COMPONENT_PALETTE.find((c) => c.type === compType);
    const newId = `${compType}-${Date.now().toString().slice(-4)}`;
    const newNode: Node = {
      id: newId,
      type: "custom",
      position: { x: 300 + Math.random() * 80, y: 150 + Math.random() * 80 },
      data: {
        type: compType,
        label: comp?.label || "Service",
        properties: {
          replicas: compType === "relational_db" || compType === "nosql_db" ? 2 : 1,
          qps_capacity: 10000,
          latency_ms: compType === "cache" ? 1.0 : compType.includes("db") ? 12.0 : 5.0,
          memory_gb: 8.0,
          storage_gb: 100.0,
        },
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleDeleteSelected = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const handleUpdateSelectedProperty = (key: string, value: any) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const curProps = (n.data.properties as Record<string, any>) || {};
          const updated = {
            ...n,
            data: {
              ...n.data,
              properties: {
                ...curProps,
                [key]: value,
              },
            },
          };
          setSelectedNode(updated);
          return updated;
        }
        return n;
      })
    );
  };

  const handleUpdateSelectedLabel = (label: string) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updated = {
            ...n,
            data: {
              ...n.data,
              label,
            },
          };
          setSelectedNode(updated);
          return updated;
        }
        return n;
      })
    );
  };

  // Trigger Deterministic Rule Engine
  const handleValidateGraph = async () => {
    try {
      setIsValidating(true);
      const graphData = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.type || "service",
          label: n.data.label || n.id,
          position: n.position,
          properties: n.data.properties || { replicas: 1 },
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: !!e.animated,
          properties: {},
        })),
      };

      const res = await fetch(`${API_BASE}/api/v1/designs/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(graphData),
      });

      if (res.ok) {
        const data = await res.json();
        setValidationResult(data);
      }
    } catch (err) {
      console.error("Failed to run validation engine:", err);
    } finally {
      setIsValidating(false);
    }
  };

  // Save to cloud (Revisioning support: PUT if updating, POST if new)
  const handleSaveToCloud = async () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    try {
      setIsSaving(true);
      const graphData = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.type,
          label: n.data.label,
          position: n.position,
          properties: n.data.properties,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: e.animated,
          properties: {},
        })),
      };

      if (currentDesignId) {
        // Revision update: calls PUT to append a new version rather than creating duplicate design
        const updatePayload = {
          title: designTitle,
          scale_metadata: { nodes_count: nodes.length, edges_count: edges.length },
          graph_data: graphData,
          notes: `Revision updated from canvas editor`,
        };

        const res = await fetch(`${API_BASE}/api/v1/designs/${currentDesignId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(updatePayload),
        });

        if (res.ok) {
          const saved = await res.json();
          setCurrentVersion(saved.version_number);
          setSaveStatus(`Saved Revision v${saved.version_number}!`);
          setTimeout(() => setSaveStatus(null), 4000);
        }
      } else {
        // Initial create: calls POST
        const createPayload = {
          title: designTitle,
          description: problemSlug ? `Solution for challenge: ${problemSlug}` : "Interactive canvas architecture",
          is_public: true,
          scale_metadata: { nodes_count: nodes.length, edges_count: edges.length },
          graph_data: graphData,
        };

        const res = await fetch(`${API_BASE}/api/v1/designs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(createPayload),
        });

        if (res.ok) {
          const saved = await res.json();
          setCurrentDesignId(saved.public_id || saved.id);
          setCurrentVersion(saved.version_number || 1);
          setSaveStatus(`Saved as ${saved.public_id} (v1)!`);
          setTimeout(() => setSaveStatus(null), 4000);
        }
      }
    } catch (err) {
      console.error("Failed to save design:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Load Preset
  const handleLoadTemplate = (key: string) => {
    const tpl = TEMPLATES[key];
    if (tpl) {
      setNodes(tpl.nodes);
      setEdges(tpl.edges);
      setDesignTitle(tpl.title);
      setValidationResult(null);
      setSelectedNode(null);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#050914] text-slate-200 flex flex-col justify-between">
        <Navigation />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-white/[0.1] text-center shadow-2xl backdrop-blur-2xl">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyan-500/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold font-display text-white mb-2 tracking-tight">
              Sign-In Required
            </h2>
            <p className="text-xs text-slate-400 mb-8 leading-relaxed font-light">
              You must be logged in to access the Interactive System Design Canvas, build architecture topologies, and run live traffic simulations.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setAuthModalOpen(true)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs font-mono transition shadow-xl shadow-cyan-500/25 active:scale-95"
              >
                Sign In / Sign Up to Continue
              </button>
              <Link
                href="/"
                className="py-2 text-xs text-slate-500 hover:text-slate-300 font-mono transition"
              >
                ← Return to Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-surface-950">
        {/* Canvas Studio Toolbar */}
        <div className="px-4 lg:px-6 py-2.5 border-b border-white/[0.08] bg-[#070c18]/95 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left Zone: Title & Versioning */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={problemSlug ? `/practice/${problemSlug}` : "/practice"}
              className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-slate-400 hover:text-white transition-all shrink-0"
              title="Return to practice catalog"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-2.5 min-w-0">
              <input
                type="text"
                value={designTitle}
                onChange={(e) => setDesignTitle(e.target.value)}
                className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-white/20 focus:border-cyan-400 focus:outline-none px-1 py-0.5 rounded transition-colors max-w-[220px] sm:max-w-xs md:max-w-md truncate"
                title="Click to rename design"
              />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
                v{currentVersion}
              </span>
              {problemSlug && (
                <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 shrink-0">
                  Challenge Linked
                </span>
              )}
            </div>
          </div>

          {/* Center Zone: Presets Segmented Selector */}
          <div className="hidden xl:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-white/[0.08] text-xs font-mono">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider px-2">Templates:</span>
            <button
              onClick={() => handleLoadTemplate("tinyurl")}
              className="px-2.5 py-1 rounded-lg text-xs transition-colors hover:text-white text-slate-300 hover:bg-white/[0.05]"
            >
              TinyURL HA
            </button>
            <button
              onClick={() => handleLoadTemplate("rate_limiter")}
              className="px-2.5 py-1 rounded-lg text-xs transition-colors hover:text-white text-slate-300 hover:bg-white/[0.05]"
            >
              Rate Limiter
            </button>
          </div>

          {/* Right Zone: Actions & Tooling */}
          <div className="flex items-center gap-2 shrink-0">
            {/* AI Mentor */}
            <button
              onClick={() => setIsMentorOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-cyan-500/10"
              title="Open Socratic AI Mentor Drawer"
            >
              <Brain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Mentor</span>
            </button>

            {/* Quick Links to Simulate & Review */}
            <Link
              href={`/simulate${currentDesignId ? `?designId=${currentDesignId}` : ""}`}
              className="px-2.5 py-1.5 rounded-xl border border-white/[0.08] bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
              title="Inject Traffic & Chaos"
            >
              <Play className="h-3 w-3 text-amber-400" />
              <span className="hidden md:inline">Simulate</span>
            </Link>
            <Link
              href={`/review${currentDesignId ? `?designId=${currentDesignId}` : ""}`}
              className="px-2.5 py-1.5 rounded-xl border border-white/[0.08] bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
              title="9-Dimension Architecture Review"
            >
              <FileCode className="h-3 w-3 text-sky-400" />
              <span className="hidden md:inline">Review</span>
            </Link>

            {/* Health Check Button */}
            <button
              onClick={handleValidateGraph}
              disabled={isValidating}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
              title="Run Deterministic Architectural Rule Checks"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{isValidating ? "Checking..." : "Health Check"}</span>
            </button>

            {/* Save Canvas / Revision */}
            <button
              onClick={handleSaveToCloud}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? "Saving..." : currentDesignId ? "Save Revision" : "Save Canvas"}</span>
            </button>

            {saveStatus && (
              <span className="text-xs font-mono text-emerald-400 animate-fade-in font-bold hidden xl:inline">
                {saveStatus}
              </span>
            )}
          </div>
        </div>

        {/* Studio Workspace: Left Palette + Center Canvas + Right Inspector */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Categorized Component Palette */}
          <div className="w-56 border-r border-white/[0.08] bg-[#070c18]/90 backdrop-blur-md p-3.5 overflow-y-auto space-y-4 shrink-0 hidden md:block">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider flex items-center justify-between pb-1 border-b border-white/[0.06]">
              <span>COMPONENTS</span>
              <span className="text-[9px] text-cyan-400/80 font-normal">Click to Add</span>
            </div>

            {COMPONENT_CATEGORIES.map((catGroup) => (
              <div key={catGroup.category} className="space-y-1.5">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold px-1">
                  {catGroup.category}
                </div>
                {catGroup.items.map((comp) => {
                  const Icon = comp.icon;
                  return (
                    <button
                      key={comp.type}
                      onClick={() => handleAddNode(comp.type)}
                      className="w-full px-2.5 py-2 rounded-xl border border-white/[0.06] bg-slate-900/60 hover:bg-slate-800/80 hover:border-cyan-500/40 text-left flex items-center gap-2.5 transition-all text-xs text-slate-300 group"
                    >
                      <div className={`p-1.5 rounded-lg border ${comp.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate text-xs group-hover:text-white transition-colors">
                        {comp.label}
                      </span>
                      <Plus className="h-3.5 w-3.5 ml-auto text-slate-600 group-hover:text-cyan-400 transition-colors" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Center React Flow Canvas */}
          <div className="flex-1 h-full relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-[#050914]"
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
              <Controls className="!bg-slate-900/90 !border-white/[0.1] !rounded-xl !fill-slate-300 !backdrop-blur-md" />
            </ReactFlow>

            {/* Floating Palette Trigger for Mobile */}
            <div className="md:hidden absolute bottom-4 left-4 z-10">
              <button
                onClick={() => handleAddNode("service")}
                className="p-3.5 rounded-full bg-cyan-500 text-slate-950 shadow-xl shadow-cyan-500/30 flex items-center justify-center"
                title="Add Microservice"
              >
                <Plus className="h-5 w-5 font-bold" />
              </button>
            </div>
          </div>

          {/* Right Inspector & Health Check Panel */}
          <div className="w-80 border-l border-white/[0.08] bg-[#070c18]/90 backdrop-blur-md p-4 overflow-y-auto shrink-0 flex flex-col gap-4">
            {/* Validation Health Result Drawer */}
            {validationResult ? (
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/[0.08] space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    <span>RULE ENGINE VERDICT</span>
                  </div>
                  <button
                    onClick={() => setValidationResult(null)}
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/80 border border-white/[0.06]">
                  <span className="text-xs font-mono text-slate-400">Health Score</span>
                  <span
                    className={`text-lg font-black font-mono ${
                      validationResult.health_score >= 85
                        ? "text-emerald-400"
                        : validationResult.health_score >= 60
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {validationResult.health_score}/100
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-light">
                  {validationResult.summary}
                </p>

                {/* Violations */}
                {validationResult.violations.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                      Violations ({validationResult.violations.length})
                    </div>
                    {validationResult.violations.map((v: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1"
                      >
                        <div className="font-bold flex items-center gap-1 text-rose-400">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{v.rule_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 leading-normal">{v.message}</div>
                        <div className="text-[10px] text-cyan-300 font-mono pt-1">
                          Fix: {v.remediation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Passed Rules */}
                {validationResult.passed_rules.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 font-bold">
                      Verified Invariants ({validationResult.passed_rules.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {validationResult.passed_rules.map((rule: string) => (
                        <span
                          key={rule}
                          className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        >
                          ✓ {rule}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.06] text-center space-y-2">
                <ShieldCheck className="h-6 w-6 text-slate-500 mx-auto" />
                <div className="text-xs font-bold text-slate-300">Deterministic Rule Engine</div>
                <p className="text-[11px] text-slate-400 leading-normal font-light">
                  Click "Health Check" to evaluate SPOFs, unbuffered async queues, and database bottlenecks.
                </p>
              </div>
            )}

            {/* Selected Node Properties Inspector */}
            {selectedNode ? (
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/[0.08] space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
                    <Sliders className="h-3.5 w-3.5" />
                    <span>NODE INSPECTOR</span>
                  </div>
                  <button
                    onClick={handleDeleteSelected}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                    title="Delete Node"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Component Label</label>
                    <input
                      type="text"
                      value={String(selectedNode.data.label || "")}
                      onChange={(e) => handleUpdateSelectedLabel(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Instance Replicas</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={Number((selectedNode.data.properties as any)?.replicas ?? 1)}
                      onChange={(e) =>
                        handleUpdateSelectedProperty(
                          "replicas",
                          Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-cyan-400 font-mono transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Estimated Latency (ms)</label>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      value={Number((selectedNode.data.properties as any)?.latency_ms ?? 1.0)}
                      onChange={(e) =>
                        handleUpdateSelectedProperty(
                          "latency_ms",
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-cyan-400 font-mono transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Node Type</label>
                    <span className="text-xs font-mono text-cyan-300 uppercase px-2.5 py-1.5 rounded-xl bg-slate-950 border border-white/[0.06] block">
                      {String(selectedNode.data.type || "")}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900/30 border border-dashed border-white/[0.08] text-center text-xs text-slate-500">
                Click any component node on the canvas to inspect replicas, latency overhead, and capacity.
              </div>
            )}
          </div>
        </div>
      </div>

      <AiMentorDrawer
        isOpen={isMentorOpen}
        onClose={() => setIsMentorOpen(false)}
        problemSlug={problemSlug || undefined}
        graphData={{
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.data.type,
            label: n.data.label,
            properties: n.data.properties,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
          })),
        }}
      />

      <Footer />
    </>
  );
}

export default function DesignCanvasPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-surface-950 flex items-center justify-center text-xs font-mono text-slate-400">
          Loading Design Canvas...
        </div>
      }
    >
      <DesignCanvasContent />
    </React.Suspense>
  );
}
