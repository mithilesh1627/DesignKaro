import React, { useState } from "react";
import {
  Brain,
  RefreshCw,
  X,
  AlertCircle,
  HelpCircle,
  Send,
  CheckCircle2,
  Wrench,
  Check,
  Sparkles,
} from "lucide-react";
import {
  AIArchitectCritiqueResponse,
  AIArchitectSuggestion,
  ArchitectureGraph,
  ValidationResponse,
} from "@/types/simulator";
import { useFocusTrap } from "@/lib/useFocusTrap";

export interface SimulatorAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  aiCritique: AIArchitectCritiqueResponse | null;
  isAiLoading: boolean;
  aiError: string | null;
  handleFetchCritique: () => void;
  graphState: ArchitectureGraph;
  validationResponse: ValidationResponse;
  appliedSuggestions: Set<string>;
  handleApplySuggestion: (suggestion: AIArchitectSuggestion) => void;
}

export function SimulatorAdvisorDrawer({
  isOpen,
  onClose,
  aiCritique,
  isAiLoading,
  aiError,
  handleFetchCritique,
  graphState,
  validationResponse,
  appliedSuggestions,
  handleApplySuggestion,
}: SimulatorAdvisorDrawerProps) {
  const drawerRef = useFocusTrap(isOpen, onClose);

  const [userInterviewAnswer, setUserInterviewAnswer] = useState<string>("");
  const [interviewSubmitted, setInterviewSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="architecture-advisor-drawer-title"
      className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Brain className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="architecture-advisor-drawer-title"
                className="text-xs font-semibold text-zinc-100 uppercase tracking-wider"
              >
                Architecture Advisor
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                {aiCritique?.provider ? aiCritique.provider.toUpperCase() : "ADVISOR"}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              Trade-Off Critique &amp; Structural Recommendations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleFetchCritique}
            disabled={isAiLoading}
            aria-label="Re-analyze architecture"
            className="w-11 h-11 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-750 transition disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            title="Re-Analyze Architecture"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? "animate-spin text-blue-400" : ""}`} />
          </button>
          <button
            onClick={onClose}
            aria-label="Close architecture advisor drawer"
            className="w-11 h-11 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition focus:outline-none focus:ring-1 focus:ring-zinc-600"
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
                Evaluating tier decoupling, single points of failure, cache hit ratios, and CAP
                invariants for {graphState.metadata.targetRps}.
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
            <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-surface-elevated via-surface-base to-surface-ground shadow-xl space-y-3">
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
                  {aiCritique.estimated_monthly_cost ||
                    `$${validationResponse.estimated_monthly_cost.toLocaleString()}/mo`}
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
                  &ldquo;{aiCritique.interview_question}&rdquo;
                </p>

                <div className="space-y-2 pt-1">
                  <label htmlFor="advisor-interview-answer" className="sr-only">
                    Draft your architectural defense or reasoning
                  </label>
                  <textarea
                    id="advisor-interview-answer"
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
                    <span className="text-[10px] text-slate-500">Interactive Interview Practice</span>
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
                          Solid systems articulation. Demonstrates awareness of distributed
                          consensus, split-brain mitigation, and failure domains.
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
                  <span>
                    Actionable Architectural Recommendations ({aiCritique.suggestions.length})
                  </span>
                </span>
              </div>

              {aiCritique.suggestions.map((suggestion, idx) => {
                const isApplied = appliedSuggestions.has(suggestion.title);
                const categoryColors =
                  {
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
            <h4 className="text-xs font-bold text-slate-200">Ready to Analyze Architecture</h4>
            <p className="text-[11px] text-slate-400 max-w-[300px] mx-auto font-light leading-relaxed">
              Request feedback from the AI System Architect on component scaling, fault tolerance,
              and trade-offs.
            </p>
            <button
              onClick={handleFetchCritique}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-cyan-950 font-bold text-xs transition shadow-sm"
            >
              Analyze Current Architecture
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
