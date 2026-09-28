import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  X,
  DollarSign,
  Search,
  CheckCircle2,
  Wrench,
  Target,
  Sparkles,
} from "lucide-react";
import { RuleCategory, RuleViolation, ValidationResponse } from "@/types/simulator";
import { useFocusTrap } from "@/lib/useFocusTrap";

export interface SimulatorRuleEngineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  validationResponse: ValidationResponse;
  handleFocusNode: (nodeId: string) => void;
  handleApplyQuickFix: (violation: RuleViolation) => void;
}

export function SimulatorRuleEngineDrawer({
  isOpen,
  onClose,
  validationResponse,
  handleFocusNode,
  handleApplyQuickFix,
}: SimulatorRuleEngineDrawerProps) {
  const drawerRef = useFocusTrap(isOpen, onClose);

  const [valSeverityFilter, setValSeverityFilter] = useState<
    "all" | "critical" | "warning" | "info"
  >("all");
  const [valCategoryFilter, setValCategoryFilter] = useState<"all" | RuleCategory>("all");
  const [valSearchQuery, setValSearchQuery] = useState<string>("");

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

  if (!isOpen) return null;

  return (
    <div
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rule-engine-drawer-title"
      className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2
              id="rule-engine-drawer-title"
              className="text-xs font-semibold text-zinc-100 uppercase tracking-wider"
            >
              Architecture Rule Engine
            </h2>
            <p className="text-[10px] text-zinc-500 font-mono">
              Invariant Analysis • Deterministic Guardrails
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close architecture rule engine drawer"
          className="w-11 h-11 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition focus:outline-none focus:ring-1 focus:ring-zinc-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Health Score & Cost Hero Card */}
        <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-950 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">
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
          <label htmlFor="sim-rule-violations-search" className="sr-only">
            Search rule violations or affected components
          </label>
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="sim-rule-violations-search"
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
              <h4 className="text-xs font-bold text-emerald-300">No Violations in This Category</h4>
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
  );
}
