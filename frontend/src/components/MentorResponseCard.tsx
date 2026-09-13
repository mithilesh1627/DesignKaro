"use client";

import React from "react";
import {
  Brain,
  Lightbulb,
  Calculator,
  AlertTriangle,
  Layers,
  Scale,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  GitBranch,
} from "lucide-react";
import { MentorResponse } from "@/types/mentor";

interface MentorResponseCardProps {
  response: MentorResponse;
  onFollowupClick?: (text: string) => void;
}

export const MentorResponseCard: React.FC<MentorResponseCardProps> = ({
  response,
  onFollowupClick,
}) => {
  const getIntentBadge = () => {
    const intent = response.intent || response.response_type;
    switch (intent) {
      case "concept_explanation":
      case "explanation":
        return {
          label: "Concept",
          icon: <Lightbulb className="w-3 h-3 text-sky-400" />,
          classes: "bg-sky-500/10 text-sky-300 border-sky-500/30",
        };
      case "architecture_change":
        return {
          label: "Architecture Change",
          icon: <GitBranch className="w-3 h-3 text-amber-400" />,
          classes: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        };
      case "tradeoff":
        return {
          label: "Trade-off",
          icon: <Scale className="w-3 h-3 text-cyan-400" />,
          classes: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
        };
      case "calculation":
        return {
          label: "Math & Sizing",
          icon: <Calculator className="w-3 h-3 text-emerald-400" />,
          classes: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        };
      case "failure_analysis":
        return {
          label: "Failure Mode",
          icon: <ShieldAlert className="w-3 h-3 text-rose-400" />,
          classes: "bg-rose-500/10 text-rose-300 border-rose-500/30",
        };
      case "debugging":
        return {
          label: "Troubleshooting",
          icon: <AlertTriangle className="w-3 h-3 text-orange-400" />,
          classes: "bg-orange-500/10 text-orange-300 border-orange-500/30",
        };
      case "interview_question":
        return {
          label: "Interview Probe",
          icon: <HelpCircle className="w-3 h-3 text-indigo-400" />,
          classes: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
        };
      case "challenge":
        return {
          label: "Discussion",
          icon: <Brain className="w-3 h-3 text-purple-400" />,
          classes: "bg-purple-500/10 text-purple-300 border-purple-500/30",
        };
      case "follow_up":
        return {
          label: "Continuity",
          icon: <Brain className="w-3 h-3 text-teal-400" />,
          classes: "bg-teal-500/10 text-teal-300 border-teal-500/30",
        };
      default:
        return {
          label: "Architecture",
          icon: <Brain className="w-3 h-3 text-cyan-400" />,
          classes: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
        };
    }
  };

  const badge = getIntentBadge();

  // Hide generic title repetition if it matches generic role headers
  const isGenericTitle =
    !response.title ||
    ["senior staff systems architect", "socratic dialogue", "senior staff mentor"].includes(
      response.title.toLowerCase().trim()
    );

  return (
    <div className="space-y-3 text-xs text-slate-200">
      {/* Header: Intent Badge & Difficulty Pill */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border ${badge.classes}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </span>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 capitalize">
          {response.difficulty}
        </span>
      </div>

      {/* Specific Topic Title */}
      {!isGenericTitle && (
        <h3 className="text-sm font-bold text-white font-display tracking-tight leading-snug">
          {response.title}
        </h3>
      )}

      {/* Core Explanation */}
      <div className="leading-relaxed text-slate-200 space-y-2">
        <div className="whitespace-pre-wrap leading-relaxed">{response.explanation}</div>
      </div>

      {/* Architecture Observations (Grounded Facts) */}
      {response.architecture_observations && response.architecture_observations.length > 0 && (
        <div className="rounded-lg p-2.5 bg-cyan-950/20 border border-cyan-800/40 text-cyan-200 space-y-1">
          <div className="text-[11px] font-mono font-semibold flex items-center gap-1.5 text-cyan-400">
            <Layers className="w-3.5 h-3.5" />
            <span>Observed in your canvas:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-cyan-100/90 pl-1">
            {response.architecture_observations.map((obs, idx) => (
              <li key={idx}>{obs}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Hypothetical Assumptions (Clearly Partitioned) */}
      {response.assumptions && response.assumptions.length > 0 && (
        <div className="rounded-lg p-2.5 bg-amber-950/20 border border-amber-800/30 text-amber-200 space-y-1">
          <div className="text-[11px] font-mono font-semibold flex items-center gap-1.5 text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Hypothetical Assumptions (Not on Canvas):</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-100/80 pl-1">
            {response.assumptions.map((assump, idx) => (
              <li key={idx}>{assump}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Calculation Box */}
      {response.calculation && (
        <div className="rounded-lg p-3 bg-emerald-950/25 border border-emerald-800/40 text-emerald-200 space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-emerald-800/30 pb-1">
            <span className="flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              <span>Quantitative Formula</span>
            </span>
            <span className="text-emerald-300 font-bold">{response.calculation.formula}</span>
          </div>

          {response.calculation.variables && Object.keys(response.calculation.variables).length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 text-slate-300">
              {Object.entries(response.calculation.variables).map(([k, v]) => (
                <div key={k} className="bg-slate-950/60 p-1.5 rounded border border-emerald-900/30">
                  <span className="text-emerald-400">{k}:</span> {v}
                </div>
              ))}
            </div>
          )}

          <div className="pt-1 flex items-center justify-between">
            <span className="text-slate-400">Result:</span>
            <span className="text-emerald-300 font-bold text-xs bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50">
              {response.calculation.result}
            </span>
          </div>

          {response.calculation.explanation && (
            <p className="text-[10px] text-slate-400 pt-0.5">{response.calculation.explanation}</p>
          )}
        </div>
      )}

      {/* Example Flow */}
      {response.example && (
        <div className="rounded-lg p-2.5 bg-slate-950/80 border border-slate-800 space-y-1.5">
          <div className="text-[11px] font-mono font-semibold flex items-center gap-1.5 text-sky-400">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Example: {response.example.scenario}</span>
          </div>
          {response.example.walkthrough && response.example.walkthrough.length > 0 && (
            <div className="space-y-1 pl-1 text-[11px] text-slate-300 font-mono">
              {response.example.walkthrough.map((step, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trade-offs & Recommendations */}
      {response.tradeoffs && response.tradeoffs.length > 0 && (
        <div className="rounded-lg p-2.5 bg-slate-900/60 border border-slate-800/80 space-y-1">
          <div className="text-[11px] font-mono font-semibold flex items-center gap-1.5 text-slate-300">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span>Architectural Trade-offs:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400 pl-1">
            {response.tradeoffs.map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Socratic Next Question (Think About This) */}
      {response.next_question && (
        <div className="rounded-lg p-3 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 text-cyan-100 shadow-sm space-y-2 mt-2">
          <div className="flex items-center gap-1.5 text-cyan-400 text-[11px] font-mono font-bold uppercase tracking-wider">
            <Brain className="w-3.5 h-3.5" />
            <span>Think About This:</span>
          </div>
          <p className="text-xs text-white font-medium leading-relaxed">
            {response.next_question}
          </p>
          {onFollowupClick && (
            <button
              onClick={() => onFollowupClick(response.next_question!)}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 px-2.5 py-1 rounded transition-colors"
            >
              <span>Explore this question</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
