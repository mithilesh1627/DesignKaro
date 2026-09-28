import React from "react";
import {
  ShieldCheck,
  X,
  History,
  CheckSquare,
  ShieldAlert,
  Target,
  DollarSign,
  GitCompare,
  RotateCcw,
} from "lucide-react";
import {
  ArchitectureEvaluationReport,
  ArchitectureGraph,
  ArchitectureVersionDiff,
  ValidationResponse,
} from "@/types/simulator";
import { SimulatorTab } from "./simulatorConstants";

export interface SimulatorEvaluationPanelProps {
  graphState: ArchitectureGraph;
  setActiveTab: (tab: SimulatorTab) => void;
  evaluationSubTab: "verdict" | "history";
  setEvaluationSubTab: (tab: "verdict" | "history") => void;
  history: ArchitectureGraph[];
  comprehensiveEvaluation: ArchitectureEvaluationReport;
  validationResponse: ValidationResponse;
  setShowValidationDrawer: (show: boolean) => void;
  diffBaseVersion: number;
  setDiffBaseVersion: (v: number) => void;
  diffTargetVersion: number;
  setDiffTargetVersion: (v: number) => void;
  versionDiffResult: ArchitectureVersionDiff | null;
  handleRestoreVersion: (versionNum: number) => void;
}

export function SimulatorEvaluationPanel({
  graphState,
  setActiveTab,
  evaluationSubTab,
  setEvaluationSubTab,
  history,
  comprehensiveEvaluation,
  validationResponse,
  setShowValidationDrawer,
  diffBaseVersion,
  setDiffBaseVersion,
  diffTargetVersion,
  setDiffTargetVersion,
  versionDiffResult,
  handleRestoreVersion,
}: SimulatorEvaluationPanelProps) {
  return (
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
              Invariant Scoring &amp; Version Diff
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            v{graphState.metadata.version} Active
          </span>
          <button
            onClick={() => setActiveTab("architecture")}
            className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition shrink-0"
            title="Close and return to canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
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
          <span>Scorecard &amp; AI Verdict</span>
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
          <span>History &amp; Diff ({history.length})</span>
        </button>
      </div>

      {/* Scrollable Evaluation Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {evaluationSubTab === "verdict" ? (
          <>
            {/* Overall Score Card */}
            <div className="p-4 rounded-2xl border border-surface-border bg-gradient-to-br from-surface-elevated to-surface-ground shadow-lg space-y-3">
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
                <span>Weak Decisions &amp; Risks ({comprehensiveEvaluation.weak_decisions.length})</span>
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
                  <label htmlFor="sim-diff-base-version" className="text-[9px] text-slate-400 font-mono uppercase block mb-1">
                    Base Version (Left)
                  </label>
                  <select
                    id="sim-diff-base-version"
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
                  <label htmlFor="sim-diff-target-version" className="text-[9px] text-slate-400 font-mono uppercase block mb-1">
                    Target Version (Right)
                  </label>
                  <select
                    id="sim-diff-target-version"
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
                            className={`p-2.5 rounded-lg border text-[10px] ${
                              nd.changeType === "ADDED"
                                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                                : nd.changeType === "REMOVED"
                                ? "border-rose-500/30 bg-rose-950/20 text-rose-300"
                                : "border-amber-500/30 bg-amber-950/20 text-amber-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 pr-2">
                                <div className="font-bold truncate">{nd.name}</div>
                                <div className="text-[9px] opacity-75">Type: {nd.type}</div>
                              </div>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase ${
                                  nd.changeType === "ADDED"
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                    : nd.changeType === "REMOVED"
                                    ? "bg-rose-950 text-rose-400 border border-rose-500/40"
                                    : "bg-amber-950 text-amber-400 border border-amber-500/40"
                                }`}
                              >
                                {nd.changeType}
                              </span>
                            </div>

                            {/* Human-readable nested configuration differences */}
                            {nd.changeType === "MODIFIED" && nd.deltas && Object.keys(nd.deltas).length > 0 && (
                              <div className="mt-2 pt-1.5 border-t border-amber-500/20 space-y-1">
                                {Object.entries(nd.deltas).map(([key, delta]) => {
                                  const formatValue = (val: unknown, prop: string) => {
                                    if (val === null || val === undefined) return "Default";
                                    if (typeof val === "object") {
                                      return Object.entries(val as Record<string, unknown>)
                                        .map(([k, v]) => `${k}: ${v}`)
                                        .join(", ");
                                    }
                                    if (prop.includes("qps") || prop.includes("capacity")) {
                                      return `${Number(val).toLocaleString()} QPS`;
                                    }
                                    if (prop.includes("latency") || prop.includes("ms")) {
                                      return `${val} ms`;
                                    }
                                    if (prop.includes("gb") || prop.includes("storage") || prop.includes("memory")) {
                                      return `${val} GB`;
                                    }
                                    if (prop.includes("replicas")) {
                                      return `${val} instance${val === 1 ? "" : "s"}`;
                                    }
                                    return String(val);
                                  };
                                  const label = key
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (c) => c.toUpperCase());
                                  return (
                                    <div key={key} className="flex items-center justify-between text-[9px] font-mono">
                                      <span className="text-slate-400">{label}:</span>
                                      <span className="text-amber-200">
                                        <span className="line-through text-slate-500 mr-1.5">
                                          {formatValue(delta.old, key)}
                                        </span>
                                        ➔{" "}
                                        <span className="font-bold text-amber-300 ml-1.5">
                                          {formatValue(delta.new, key)}
                                        </span>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
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
                                ? "bg-cyan-500 text-cyan-950"
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
  );
}
