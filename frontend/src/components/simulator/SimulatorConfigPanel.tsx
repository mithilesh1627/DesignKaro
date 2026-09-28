import React from "react";
import {
  Sliders,
  X,
  AlertTriangle,
  Database,
  Copy,
  Trash2,
  Workflow,
  CheckCircle2,
} from "lucide-react";
import {
  ArchitectureEdge,
  ArchitectureEventType,
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureNodeConfig,
  ConnectionType,
  RuleSeverity,
  RuleViolation,
} from "@/types/simulator";

export interface SimulatorConfigPanelProps {
  activeNode: ArchitectureNode | undefined;
  activeEdge: ArchitectureEdge | undefined;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  commitGraphChange: (
    fn: (prev: ArchitectureGraph) => ArchitectureGraph,
    actionType: ArchitectureEventType,
    description: string,
    metadata?: { componentType?: string; nodeId?: string; edgeId?: string; payload?: Record<string, any> }
  ) => void;
  nodeViolationMap: Map<string, { severity: RuleSeverity; violations: RuleViolation[] }>;
  handleUpdateNodeConfig: (nodeId: string, updates: Partial<ArchitectureNodeConfig>) => void;
  handleDuplicateNode: () => void;
  handleDeleteSelectedNode: () => void;
  handleUpdateConnectionType: (type: ConnectionType) => void;
  handleDeleteSelectedEdge: () => void;
}

export function SimulatorConfigPanel({
  activeNode,
  activeEdge,
  setSelectedNodeId,
  setSelectedEdgeId,
  commitGraphChange,
  nodeViolationMap,
  handleUpdateNodeConfig,
  handleDuplicateNode,
  handleDeleteSelectedNode,
  handleUpdateConnectionType,
  handleDeleteSelectedEdge,
}: SimulatorConfigPanelProps) {
  if (activeNode) {
    return (
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
              <p className="text-[10px] text-slate-400 font-mono">ID: {activeNode.id}</p>
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
            <label htmlFor="node-cfg-name" className="text-[11px] text-slate-400 font-semibold">
              COMPONENT NAME
            </label>
            <input
              id="node-cfg-name"
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
              <label htmlFor="node-cfg-replicas" className="text-[11px] text-slate-400 font-semibold">
                REPLICAS (INSTANCES)
              </label>
              <span className="text-cyan-400 font-bold">{activeNode.config?.replicas || 1}</span>
            </div>
            <input
              id="node-cfg-replicas"
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
            <label htmlFor="node-cfg-qps" className="text-[11px] text-slate-400 font-semibold">
              QPS CAPACITY PER REPLICA
            </label>
            <input
              id="node-cfg-qps"
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
            <label htmlFor="node-cfg-latency" className="text-[11px] text-slate-400 font-semibold">
              BASE PROCESSING LATENCY (MS)
            </label>
            <input
              id="node-cfg-latency"
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
              <label htmlFor="node-cfg-storage" className="text-[11px] text-slate-400 font-semibold">
                STORAGE CAPACITY (GB)
              </label>
              <input
                id="node-cfg-storage"
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

          {/* Database Read/Write Capacity Split */}
          {activeNode.category === "database" && (
            <div className="space-y-2 p-3 rounded-xl bg-slate-950/80 border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Read / Write Capacity</span>
                </label>
                <span className="text-[10px] text-cyan-400 font-mono font-bold">
                  {(
                    (activeNode.config?.read_capacity ??
                      Math.round((activeNode.config?.qps_capacity || 10000) * 0.8)) +
                    (activeNode.config?.write_capacity ??
                      Math.round((activeNode.config?.qps_capacity || 10000) * 0.2))
                  ).toLocaleString()}{" "}
                  Total QPS
                </span>
              </div>

              {/* Visual Allocation Split Bar */}
              {(() => {
                const readCap =
                  activeNode.config?.read_capacity ??
                  Math.round((activeNode.config?.qps_capacity || 10000) * 0.8);
                const writeCap =
                  activeNode.config?.write_capacity ??
                  Math.round((activeNode.config?.qps_capacity || 10000) * 0.2);
                const total = Math.max(1, readCap + writeCap);
                const readPct = Math.round((readCap / total) * 100);
                const writePct = 100 - readPct;
                return (
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden flex">
                      <div
                        style={{ width: `${readPct}%` }}
                        className="bg-emerald-500 transition-all duration-200"
                        title={`Read Capacity: ${readPct}% (${readCap.toLocaleString()} QPS)`}
                      />
                      <div
                        style={{ width: `${writePct}%` }}
                        className="bg-rose-500 transition-all duration-200"
                        title={`Write Capacity: ${writePct}% (${writeCap.toLocaleString()} QPS)`}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-emerald-400 font-semibold">
                        Reads: {readPct}% ({readCap.toLocaleString()} QPS)
                      </span>
                      <span className="text-rose-400 font-semibold">
                        Writes: {writePct}% ({writeCap.toLocaleString()} QPS)
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label
                    htmlFor="node-cfg-read-cap"
                    className="text-[10px] text-emerald-300 font-semibold block mb-1"
                  >
                    READ QPS / REPLICA
                  </label>
                  <input
                    id="node-cfg-read-cap"
                    type="number"
                    value={
                      activeNode.config?.read_capacity ??
                      Math.round((activeNode.config?.qps_capacity || 10000) * 0.8)
                    }
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      const currentWrite =
                        activeNode.config?.write_capacity ??
                        Math.round((activeNode.config?.qps_capacity || 10000) * 0.2);
                      handleUpdateNodeConfig(activeNode.id, {
                        read_capacity: val,
                        qps_capacity: val + currentWrite,
                      });
                    }}
                    className="w-full bg-slate-900 border border-emerald-500/30 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-emerald-200 text-xs font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="node-cfg-write-cap"
                    className="text-[10px] text-rose-300 font-semibold block mb-1"
                  >
                    WRITE QPS / REPLICA
                  </label>
                  <input
                    id="node-cfg-write-cap"
                    type="number"
                    value={
                      activeNode.config?.write_capacity ??
                      Math.round((activeNode.config?.qps_capacity || 10000) * 0.2)
                    }
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      const currentRead =
                        activeNode.config?.read_capacity ??
                        Math.round((activeNode.config?.qps_capacity || 10000) * 0.8);
                      handleUpdateNodeConfig(activeNode.id, {
                        write_capacity: val,
                        qps_capacity: currentRead + val,
                      });
                    }}
                    className="w-full bg-slate-900 border border-rose-500/30 focus:border-rose-400 rounded-lg px-2.5 py-1.5 text-rose-200 text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cache TTL & Policy */}
          {activeNode.category === "cache" && (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="node-cfg-cache-policy"
                  className="text-[11px] text-slate-400 font-semibold"
                >
                  CACHE EVICTION POLICY
                </label>
                <select
                  id="node-cfg-cache-policy"
                  value={activeNode.config?.cache_policy || "LRU"}
                  onChange={(e) => {
                    handleUpdateNodeConfig(activeNode.id, {
                      cache_policy: e.target.value as "LRU" | "LFU" | "FIFO",
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
                <label
                  htmlFor="node-cfg-cache-ttl"
                  className="text-[11px] text-slate-400 font-semibold"
                >
                  CACHE TTL (SECONDS)
                </label>
                <input
                  id="node-cfg-cache-ttl"
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
              <label
                htmlFor="node-cfg-replication"
                className="text-[11px] text-slate-400 font-semibold"
              >
                REPLICATION STRATEGY
              </label>
              <select
                id="node-cfg-replication"
                value={activeNode.config?.replication_mode || "sync"}
                onChange={(e) => {
                  handleUpdateNodeConfig(activeNode.id, {
                    replication_mode: e.target.value as "sync" | "async" | "semi_sync",
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
    );
  }

  if (activeEdge) {
    return (
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
            <div className="space-y-2">
              {[
                {
                  key: "sync",
                  label: "Synchronous Request (HTTP/gRPC)",
                  desc: "Blocks caller thread until response; downstream latency and crashes stall worker pools and cascade upstream.",
                  color: "text-sky-400",
                  badge: "Blocking",
                },
                {
                  key: "async",
                  label: "Asynchronous Event (Queue/Stream)",
                  desc: "Decouples producer via queue buffer; downstream outages build up backlog without crashing producers.",
                  color: "text-amber-400",
                  badge: "Buffered",
                },
                {
                  key: "replication",
                  label: "Data Replication Flow",
                  desc: "Primary-to-replica sync; offloads read queries to replicas and tracks replication lag under load.",
                  color: "text-sky-300",
                  badge: "Sync/Async Replica",
                },
                {
                  key: "read_path",
                  label: "Dedicated Read Query Path",
                  desc: "Carries read traffic subject to cache hit ratio; absorbed by caches and database read replicas.",
                  color: "text-emerald-400",
                  badge: "Cacheable",
                },
                {
                  key: "write_path",
                  label: "Dedicated Write Persist Path",
                  desc: "Carries write mutations directly to database storage; drives disk I/O and WAL lock contention.",
                  color: "text-rose-400",
                  badge: "Direct Persist",
                },
              ].map((ct) => (
                <button
                  key={ct.key}
                  onClick={() => handleUpdateConnectionType(ct.key as ConnectionType)}
                  className={`w-full text-left p-2.5 rounded-xl border transition ${
                    activeEdge.connectionType === ct.key
                      ? "border-cyan-500/50 bg-cyan-500/10 text-white shadow-sm"
                      : "border-white/[0.06] bg-slate-950/60 text-slate-400 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${ct.color}`}>{ct.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-mono uppercase bg-white/[0.06] text-slate-300">
                        {ct.badge}
                      </span>
                      {activeEdge.connectionType === ct.key && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-light leading-relaxed">
                    {ct.desc}
                  </p>
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
    );
  }

  // Blank State Placeholder
  return (
    <div className="flex-1 p-6 flex flex-col items-center justify-center text-center text-slate-500 font-mono space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-slate-400">
        <Sliders className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-300">Select Component or Edge</h4>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[210px]">
          Click any node to tune replicas/QPS, or click an edge to configure sync vs async
          messaging flow.
        </p>
      </div>
    </div>
  );
}
