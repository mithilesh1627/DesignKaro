"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlayCircle,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Server,
  Database,
  Radio,
  Clock,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { API_BASE } from "@/lib/api";
import { useSearchParams } from "next/navigation";

interface NodeMetric {
  node_id: string;
  node_type: string;
  cpu_percent: number;
  memory_percent: number;
  queue_depth: number;
  error_rate: number;
  latency_p99_ms: number;
  status: "HEALTHY" | "DEGRADED" | "CRASHED";
}

interface SimulationTick {
  second: number;
  qps: number;
  total_errors: number;
  p99_latency_ms: number;
  system_status: string;
  node_metrics: NodeMetric[];
}

interface SimulationResult {
  simulation_id: string;
  total_requests_simulated: number;
  dropped_requests: number;
  peak_observed_qps: number;
  overall_p99_latency_ms: number;
  blast_radius_summary: string;
  incident_rca: string | null;
  ticks: SimulationTick[];
  recommendations: string[];
}

const DEFAULT_GRAPH = {
  nodes: [
    { id: "c1", type: "client", label: "Mobile Clients", properties: { replicas: 1 } },
    { id: "gw1", type: "gateway", label: "Envoy Gateway", properties: { replicas: 2, qps_capacity: 30000 } },
    { id: "s1", type: "service", label: "App Pods", properties: { replicas: 3, qps_capacity: 10000 } },
    { id: "cache1", type: "cache", label: "Redis Cluster", properties: { replicas: 2, qps_capacity: 50000, latency_ms: 1.0 } },
    { id: "db1", type: "relational_db", label: "PostgreSQL Primary", properties: { replicas: 1, qps_capacity: 8000, latency_ms: 15.0 } },
    { id: "q1", type: "queue", label: "Kafka Events", properties: { replicas: 3, qps_capacity: 40000, latency_ms: 2.0 } },
  ],
  edges: [
    { id: "e1", source: "c1", target: "gw1" },
    { id: "e2", source: "gw1", target: "s1" },
    { id: "e3", source: "s1", target: "cache1" },
    { id: "e4", source: "s1", target: "db1" },
    { id: "e5", source: "s1", target: "q1" },
  ],
};

function SimulatePageContent() {
  const searchParams = useSearchParams();
  const designId = searchParams ? searchParams.get("designId") : null;

  const [baseQps, setBaseQps] = useState<number>(5000);
  const [peakQps, setPeakQps] = useState<number>(35000);
  const [failureType, setFailureType] = useState<string>("KILL_NODE");
  const [targetNode, setTargetNode] = useState<string>("db1");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [currentTickIndex, setCurrentTickIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeGraph, setActiveGraph] = useState<any>(DEFAULT_GRAPH);
  const [designTitle, setDesignTitle] = useState<string>("Default High-Throughput Topology");

  useEffect(() => {
    if (!designId) return;
    const fetchDesign = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/designs/${designId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.graph_data?.nodes && data.graph_data.nodes.length > 0) {
            setActiveGraph(data.graph_data);
            setDesignTitle(data.title || "Custom Architecture");
            const firstTarget = data.graph_data.nodes.find((n: any) => n.type === "relational_db" || n.type === "service") || data.graph_data.nodes[0];
            if (firstTarget) setTargetNode(firstTarget.id);
          }
        }
      } catch (err) {
        console.error("Failed to load design for simulation:", err);
      }
    };
    fetchDesign();
  }, [designId]);

  const runSimulation = async () => {
    try {
      setIsRunning(true);
      setSimResult(null);
      setCurrentTickIndex(0);

      const payload = {
        graph_data: activeGraph,
        traffic: {
          base_qps: baseQps,
          peak_qps: peakQps,
          duration_sec: 24,
          step_sec: 2,
        },
        failure: {
          failure_type: failureType,
          target_node_id: targetNode,
          start_second: 8,
          duration_second: 8,
        },
      };

      const res = await fetch(`${API_BASE}/api/v1/simulations/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying || !simResult) return;
    const interval = setInterval(() => {
      setCurrentTickIndex((prev) => {
        if (prev + 1 >= simResult.ticks.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isPlaying, simResult]);

  const activeTick = simResult?.ticks[currentTickIndex] || null;

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-sky-400 mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1.5">
              <Zap className="h-4 w-4" />
              <span>CHAOS &amp; TRAFFIC OBSERVABILITY</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Dynamic Traffic &amp; Failure Simulator
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Synthesize production traffic spikes up to 100k+ QPS, inject real-time infrastructure faults, and observe cascade failures.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-mono text-slate-400 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/[0.08]">
              Active: <span className="text-white font-semibold">{designTitle}</span>
            </span>
          </div>
        </div>

        {/* Control Console (De-clustered Bento Cards) */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/[0.08] mb-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
              <Sliders className="h-4 w-4" />
              <span>SIMULATION PARAMETERS &amp; FAULT INJECTION</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">24-second execution window</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Base QPS Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/[0.06] flex flex-col justify-between space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Baseline Ingress:</span>
                <span className="text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                  {baseQps.toLocaleString()} QPS
                </span>
              </div>
              <input
                type="range"
                min={1000}
                max={20000}
                step={1000}
                value={baseQps}
                onChange={(e) => setBaseQps(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>1k QPS</span>
                <span>20k QPS</span>
              </div>
            </div>

            {/* Peak QPS Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/[0.06] flex flex-col justify-between space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Surge Spike:</span>
                <span className="text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  {peakQps.toLocaleString()} QPS
                </span>
              </div>
              <input
                type="range"
                min={10000}
                max={100000}
                step={5000}
                value={peakQps}
                onChange={(e) => setPeakQps(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>10k QPS</span>
                <span>100k QPS</span>
              </div>
            </div>

            {/* Failure Mode Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/[0.06] space-y-2">
              <label className="text-xs font-mono text-slate-400 block">
                Chaos Failure Type:
              </label>
              <select
                value={failureType}
                onChange={(e) => setFailureType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-cyan-400 font-mono transition-colors"
              >
                <option value="NONE">None (Nominal Load Test)</option>
                <option value="KILL_NODE">Kill Primary Node (Hard Crash)</option>
                <option value="LATENCY_SPIKE">Network Latency (+500ms Spike)</option>
                <option value="PACKET_LOSS">50% Packet Drop Rate</option>
              </select>
              <p className="text-[10px] font-mono text-slate-500">Fault triggered at T+8s for 8s duration</p>
            </div>

            {/* Target Node Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/[0.06] space-y-2">
              <label className="text-xs font-mono text-slate-400 block">
                Target Node for Fault:
              </label>
              <select
                value={targetNode}
                onChange={(e) => setTargetNode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-cyan-400 font-mono transition-colors"
              >
                {activeGraph.nodes.map((n: any) => (
                  <option key={n.id} value={n.id}>
                    {n.label || n.id} ({n.type})
                  </option>
                ))}
              </select>
              <p className="text-[10px] font-mono text-slate-500">Target for failure injection</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/[0.06]">
            <span className="text-xs font-mono text-slate-400">
              Topology: <span className="text-slate-200">{activeGraph.nodes.length} Nodes</span> • <span className="text-slate-200">{activeGraph.edges.length} Edges</span>
            </span>
            <button
              onClick={runSimulation}
              disabled={isRunning}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              <span>{isRunning ? "Simulating Traffic Cascade..." : "Start Simulation & Inject Chaos"}</span>
            </button>
          </div>
        </div>

        {/* Live Simulation Visualizer */}
        {simResult && activeTick && (
          <div className="space-y-6 animate-fade-in">
            {/* Live Playback Bar & Telemetry Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/[0.08] backdrop-blur-md">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Elapsed Time</div>
                <div className="text-xl font-mono font-bold text-white mt-1">
                  T+{activeTick.second}s <span className="text-xs text-slate-500">/ 24s</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/[0.08] backdrop-blur-md">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Live Ingress QPS</div>
                <div className="text-xl font-mono font-bold text-cyan-400 mt-1">
                  {activeTick.qps.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/[0.08] backdrop-blur-md">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">p99 Tail Latency</div>
                <div
                  className={`text-xl font-mono font-bold mt-1 ${
                    activeTick.p99_latency_ms > 200 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {activeTick.p99_latency_ms.toFixed(1)}ms
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/[0.08] backdrop-blur-md">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Dropped Requests</div>
                <div
                  className={`text-xl font-mono font-bold mt-1 ${
                    activeTick.total_errors > 0 ? "text-rose-400" : "text-slate-400"
                  }`}
                >
                  {activeTick.total_errors.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/[0.08] backdrop-blur-md col-span-2 sm:col-span-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">System State</div>
                <div
                  className={`text-xs font-mono font-bold mt-2 uppercase px-2 py-1 rounded-lg border text-center ${
                    activeTick.system_status === "CRITICAL_FAILURE"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : activeTick.system_status === "DEGRADED"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {activeTick.system_status}
                </div>
              </div>
            </div>

            {/* Stepper Scrubber */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/[0.08] flex items-center gap-4 shadow-lg">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-white transition-colors"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <input
                type="range"
                min={0}
                max={simResult.ticks.length - 1}
                value={currentTickIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentTickIndex(Number(e.target.value));
                }}
                className="flex-1 accent-cyan-400 cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-400 shrink-0">
                Tick {currentTickIndex + 1} / {simResult.ticks.length}
              </span>
            </div>

            {/* Node Heatmap Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>Node Resource Saturation &amp; Health Matrix</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTick.node_metrics.map((n) => (
                  <div
                    key={n.node_id}
                    className={`p-4 rounded-2xl border transition-all ${
                      n.status === "CRASHED"
                        ? "border-rose-500/80 bg-rose-500/10"
                        : n.status === "DEGRADED"
                        ? "border-amber-500/60 bg-amber-500/10"
                        : "border-white/[0.08] bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{n.node_id}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          ({n.node_type})
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                          n.status === "CRASHED"
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            : n.status === "DEGRADED"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        }`}
                      >
                        {n.status}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs font-mono">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">CPU Saturation:</span>
                          <span className="text-slate-200 font-bold">{n.cpu_percent}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              n.cpu_percent > 80
                                ? "bg-rose-500"
                                : n.cpu_percent > 60
                                ? "bg-amber-500"
                                : "bg-cyan-500"
                            }`}
                            style={{ width: `${n.cpu_percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between text-[11px] pt-1">
                        <span className="text-slate-400">Queue Depth:</span>
                        <span className="text-slate-200">{n.queue_depth.toLocaleString()} reqs</span>
                      </div>

                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Tail Latency:</span>
                        <span className="text-cyan-300 font-bold">{n.latency_p99_ms.toFixed(1)}ms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Blast Radius & Root Cause Post-Mortem */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/[0.08] space-y-4 shadow-xl backdrop-blur-xl">
              <div className="text-xs font-mono font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>INCIDENT ANALYSIS &amp; BLAST RADIUS</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/[0.06] text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                {simResult.blast_radius_summary}
              </div>

              {simResult.incident_rca && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 leading-relaxed font-mono">
                  {simResult.incident_rca}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <div className="text-xs font-mono text-emerald-400 font-bold">
                  Resilience Engineering Recommendations:
                </div>
                {simResult.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-white/[0.06] text-xs text-slate-300 flex items-center gap-2.5"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function SimulatePage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-surface-950 flex items-center justify-center text-xs font-mono text-slate-400">
          Loading Simulation Studio...
        </div>
      }
    >
      <SimulatePageContent />
    </React.Suspense>
  );
}

