import React from "react";
import {
  Gauge,
  AlertTriangle,
  X,
  Zap,
  Flame,
  SlidersHorizontal,
  Info,
  Sliders,
  CheckCircle2,
  Database,
  Radio,
  Server,
  Clock,
  Cpu,
  ShieldCheck,
  Check,
  BarChart3,
  Brain,
  Wrench,
  Pause,
  Play,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import {
  ArchitectureEventType,
  ArchitectureGraph,
  ArchitectureNode,
  ChaosFailureType,
  SimulationResult,
  SimulationTick,
  SimulationTrafficProfile,
} from "@/types/simulator";
import { TRAFFIC_PRESETS, TrafficPreset } from "@/lib/simulationEngine";
import { SimulatorTab } from "./simulatorConstants";

export interface SimulatorCockpitPanelProps {
  simulationSubTab: "traffic" | "chaos";
  setSimulationSubTab: (tab: "traffic" | "chaos") => void;
  setActiveTab: (tab: SimulatorTab) => void;
  activeChaosFailure: ChaosFailureType;
  activeNode: ArchitectureNode | undefined;
  commitGraphChange: (
    fn: (prev: ArchitectureGraph) => ArchitectureGraph,
    actionType: ArchitectureEventType,
    description: string,
    metadata?: { componentType?: string; nodeId?: string; edgeId?: string; payload?: Record<string, any> }
  ) => void;
  setSelectedNodeId: (id: string | null) => void;
  activePresetId: string;
  handleSelectPreset: (preset: TrafficPreset) => void;
  trafficProfile: SimulationTrafficProfile;
  setTrafficProfile: React.Dispatch<React.SetStateAction<SimulationTrafficProfile>>;
  setBackendSimResult: (res: SimulationResult | null) => void;
  chaosTargetNodeId: string | null;
  setChaosTargetNodeId: (id: string | null) => void;
  handleTriggerChaos: (failureType: ChaosFailureType, targetNodeId?: string) => void;
  graphState: ArchitectureGraph;
  activeSimulationResult: SimulationResult;
  handleApplySimulationFix: (action: string) => void;
  isSimulationRunning: boolean;
  setIsSimulationRunning: (running: boolean) => void;
  simTickIndex: number;
  setSimTickIndex: (idx: number) => void;
  currentTick: SimulationTick | undefined;
  handleRunBackendTrace: () => void;
  isBackendSimulating: boolean;
}

export function SimulatorCockpitPanel({
  simulationSubTab,
  setSimulationSubTab,
  setActiveTab,
  activeChaosFailure,
  activeNode,
  commitGraphChange,
  setSelectedNodeId,
  activePresetId,
  handleSelectPreset,
  trafficProfile,
  setTrafficProfile,
  setBackendSimResult,
  chaosTargetNodeId,
  setChaosTargetNodeId,
  handleTriggerChaos,
  graphState,
  activeSimulationResult,
  handleApplySimulationFix,
  isSimulationRunning,
  setIsSimulationRunning,
  simTickIndex,
  setSimTickIndex,
  currentTick,
  handleRunBackendTrace,
  isBackendSimulating,
}: SimulatorCockpitPanelProps) {
  return (
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

        <div className="flex items-center gap-2">
          {/* Disclaimer badge */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-[9px] font-mono font-bold text-amber-300 shadow-sm"
            title="Estimated mathematical approximation based on queueing theory, not real production metrics"
          >
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Estimated Simulation</span>
          </div>
          <button
            onClick={() => setActiveTab("architecture")}
            className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition shrink-0"
            title="Close and return to canvas"
          >
            <X className="w-4 h-4" />
          </button>
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
              {activeNode.config?.replicas || 1}x Replicas •{" "}
              {(
                (activeNode.config?.replicas || 1) *
                (activeNode.config?.qps_capacity || 5000)
              ).toLocaleString()}{" "}
              Max QPS
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
                <span className="text-[10px] text-cyan-400">
                  {TRAFFIC_PRESETS.length} Scenarios
                </span>
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
                            isSelected
                              ? "bg-cyan-950 text-cyan-300"
                              : "bg-white/[0.06] text-slate-400"
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

            {/* Workload Breakdown: Rate vs Volume vs Concurrency */}
            <div className="p-3 rounded-2xl border border-cyan-500/25 bg-cyan-950/30 space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Workload Model</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {trafficProfile.duration_sec}s Duration
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-1.5 rounded-lg bg-slate-900/70 border border-white/[0.05]">
                  <div className="text-[9px] text-slate-400">Peak Rate</div>
                  <div className="text-[11px] font-bold text-cyan-300">
                    {trafficProfile.peak_qps.toLocaleString()} RPS
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-900/70 border border-white/[0.05]">
                  <div className="text-[9px] text-slate-400">Est. Volume</div>
                  <div className="text-[11px] font-bold text-amber-300">
                    ~
                    {Math.round(
                      (trafficProfile.base_qps +
                        (trafficProfile.peak_qps - trafficProfile.base_qps) * 0.63) *
                        trafficProfile.duration_sec
                    ).toLocaleString()}{" "}
                    reqs
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-900/70 border border-white/[0.05]">
                  <div className="text-[9px] text-slate-400">Clients</div>
                  <div className="text-[11px] font-bold text-emerald-300">
                    {trafficProfile.concurrent_users.toLocaleString()} users
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 pt-0.5 leading-tight font-light font-sans">
                RPS measures instantaneous arrival rate. Total Volume represents cumulative requests.
                Little&apos;s Law connects concurrency and throughput.
              </p>
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
                  <label htmlFor="sim-peak-ingress-rps" className="text-slate-400">
                    Peak Ingress RPS
                  </label>
                  <span className="font-bold text-cyan-300 font-mono">
                    {trafficProfile.peak_qps.toLocaleString()} RPS
                  </span>
                </div>
                <input
                  id="sim-peak-ingress-rps"
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
                  <label htmlFor="sim-concurrent-users" className="text-slate-400">
                    Concurrent Users
                  </label>
                  <span className="font-bold text-cyan-300 font-mono">
                    {trafficProfile.concurrent_users.toLocaleString()}
                  </span>
                </div>
                <input
                  id="sim-concurrent-users"
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
                  <label htmlFor="sim-read-write-ratio" className="text-slate-400">
                    Read / Write Ratio
                  </label>
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
                  id="sim-read-write-ratio"
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
                  <label htmlFor="sim-cache-hit-ratio" className="text-slate-400">
                    Cache Hit Ratio
                  </label>
                  <span className="font-bold text-rose-300 font-mono">
                    {Math.round(trafficProfile.cache_hit_ratio * 100)}% Hit
                  </span>
                </div>
                <input
                  id="sim-cache-hit-ratio"
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
                    <label htmlFor="sim-payload-size" className="text-slate-400">
                      Payload
                    </label>
                    <span className="font-bold text-slate-200">{trafficProfile.payload_kb} KB</span>
                  </div>
                  <input
                    id="sim-payload-size"
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
                    <label htmlFor="sim-network-latency" className="text-slate-400">
                      Net Latency
                    </label>
                    <span className="font-bold text-slate-200">
                      {trafficProfile.network_latency_ms} ms
                    </span>
                  </div>
                  <input
                    id="sim-network-latency"
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
                <label htmlFor="sim-chaos-target-select" className="text-[10px] text-slate-400 font-mono">
                  Target:
                </label>
                <select
                  id="sim-chaos-target-select"
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
                    className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs font-mono transition flex items-center justify-center gap-1.5 shadow-sm"
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
          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-2.5">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Throughput Delivered
                </div>
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
            <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Total Cumulative Traffic:</span>
              <span className="text-slate-200 font-bold">
                {activeSimulationResult.total_requests_simulated.toLocaleString()} reqs (
                {trafficProfile.duration_sec}s)
              </span>
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
            <div className="p-3.5 rounded-2xl border border-red-500/50 bg-gradient-to-br from-red-950/40 via-surface-base to-surface-ground shadow-xl shadow-red-950/20 space-y-3">
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
              aria-label={
                isSimulationRunning
                  ? "Pause timeline playback"
                  : "Play synthetic traffic timeline"
              }
              className={`p-2 rounded-lg font-bold transition flex items-center justify-center ${
                isSimulationRunning
                  ? "bg-amber-500 text-amber-950 hover:bg-amber-400"
                  : "bg-cyan-500 text-cyan-950 hover:bg-cyan-400"
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
              aria-label="Simulation timeline scrubber"
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
  );
}
