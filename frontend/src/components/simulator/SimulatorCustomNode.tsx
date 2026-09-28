import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Flame, AlertTriangle, AlertCircle, Activity } from "lucide-react";
import { ArchitectureNode, RuleSeverity, RuleViolation } from "@/types/simulator";
import { COMPONENT_CATALOG } from "./simulatorConstants";

// ============================================================================
// CUSTOM FLOW NODE COMPONENT
// ============================================================================

export interface CustomFlowData extends Record<string, unknown> {
  archNode: ArchitectureNode;
  isSelected?: boolean;
  violationSeverity?: RuleSeverity | null;
  violations?: RuleViolation[];
  // Simulation Mode Telemetry
  isSimulationMode?: boolean;
  isBottleneck?: boolean;
  utilizationPercent?: number;
  throughputQps?: number;
  nodeLatencyMs?: number;
  nodeStatus?: string;
}

export const SimulatorCustomNode = ({ data }: { data: CustomFlowData }) => {
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

  let borderStyle = "border-zinc-700/80 hover:border-zinc-500";
  const isCrashed = data.nodeStatus === "CRASHED";
  const isDegraded = data.nodeStatus === "DEGRADED";

  if (isCrashed) {
    borderStyle = "border-red-500 bg-red-950/30";
  } else if (isDegraded) {
    borderStyle = "border-amber-500 bg-amber-950/20";
  } else if (data.isSelected) {
    borderStyle = "border-blue-500 ring-1 ring-blue-500/50";
  } else if (isBottleneck) {
    borderStyle = "border-red-500 ring-1 ring-red-500/50";
  } else if (isSimulation && utilPercent >= 85) {
    borderStyle = "border-amber-500";
  } else if (severity === "critical") {
    borderStyle = "border-red-500";
  } else if (severity === "warning") {
    borderStyle = "border-amber-500/80";
  }

  return (
    <div
      className={`relative px-3.5 py-2.5 rounded-lg border bg-zinc-900 shadow-lg min-w-[195px] transition-colors cursor-pointer ${borderStyle}`}
    >
      {/* Crashed Node Badge */}
      {isCrashed && (
        <div className="absolute -top-3 left-2 px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[9px] font-mono font-medium flex items-center gap-1 z-30">
          <Flame className="w-3 h-3 text-red-400" />
          <span>FAULT: CRASHED (0 QPS)</span>
        </div>
      )}

      {/* Degraded Node Badge */}
      {!isCrashed && isDegraded && !isBottleneck && (
        <div className="absolute -top-3 left-2 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[9px] font-mono font-medium flex items-center gap-1 z-30">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>DEGRADED</span>
        </div>
      )}

      {/* Primary Bottleneck Badge */}
      {!isCrashed && isBottleneck && (
        <div className="absolute -top-3 left-2 px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[9px] font-mono font-medium flex items-center gap-1 z-30">
          <Flame className="w-3 h-3 text-red-400" />
          <span>BOTTLENECK ({utilPercent}%)</span>
        </div>
      )}

      {/* Violation Severity Badge (when not bottleneck) */}
      {!isBottleneck && severity === "critical" && (
        <div
          className="absolute -top-3 -right-2 px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[9px] font-mono font-medium flex items-center gap-1 z-20"
          title={data.violations?.map((v) => `[${v.rule_name}] ${v.message}`).join("\n")}
        >
          <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
          <span>Critical ({data.violations?.length || 1})</span>
        </div>
      )}
      {!isBottleneck && severity === "warning" && (
        <div
          className="absolute -top-3 -right-2 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[9px] font-mono font-medium flex items-center gap-1 z-20"
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
        className="w-2.5 h-2.5 !bg-zinc-400 hover:!bg-blue-500 border-2 border-zinc-900 transition-colors"
      />

      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-md border ${comp.borderClass} ${comp.bgClass} ${comp.textClass} shrink-0`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-100 tracking-wide truncate">
              {node.name}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              {comp.badge}
            </span>
          </div>
          <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5 mt-0.5">
            <span className={replicas > 1 ? "text-blue-400 font-medium" : "text-zinc-500"}>
              {replicas > 1 ? `${replicas}x Replicas` : "1 Instance"}
            </span>
            <span>•</span>
            <span>{node.config?.latency_ms || 1}ms</span>
          </div>
        </div>
      </div>

      {/* Simulation Load Meter */}
      {isSimulation && (
        <div className="mt-2.5 pt-2 border-t border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <Activity className="w-2.5 h-2.5 text-zinc-500" />
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
          <div className="w-full h-1.5 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                utilPercent >= 90
                  ? "bg-red-500"
                  : utilPercent >= 70
                  ? "bg-amber-400"
                  : "bg-emerald-500"
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
        className="w-2.5 h-2.5 !bg-zinc-400 hover:!bg-blue-500 border-2 border-zinc-900 transition-colors"
      />
    </div>
  );
};

export const SIMULATOR_NODE_TYPES = {
  simulatorCustomNode: SimulatorCustomNode,
};
