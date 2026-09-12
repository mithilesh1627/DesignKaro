"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  HelpCircle,
  Lightbulb,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  ExternalLink,
  Award,
  Zap,
  Calculator,
  Loader2,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuthStore } from "@/lib/authStore";

interface QuestionDetailData {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  requirements: string[];
  constraints: Record<string, any>;
  expected_scale: Record<string, any>;
  hints: Array<{
    level: number;
    title: string;
    content: string;
  }>;
  evaluation_criteria: {
    required_components?: string[];
    anti_patterns?: string[];
    scalability_checklist?: string[];
  };
  is_completed: boolean;
  best_score: number | null;
  attempts_count: number;
}

const DIFFICULTY_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  intermediate: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
  advanced: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  hard: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
};

export default function ProblemWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [problem, setProblem] = useState<QuestionDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"requirements" | "capacity" | "hints" | "evaluation">("requirements");
  const [unlockedHintLevels, setUnlockedHintLevels] = useState<number[]>([1]);
  const [checkedRequirements, setCheckedRequirements] = useState<Record<number, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!slug) return;

    const fetchProblem = async () => {
      try {
        setIsLoading(true);
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }
        const res = await fetch(`http://127.0.0.1:8000/api/v1/problems/${slug}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setProblem(data);
        } else {
          setProblem(null);
        }
      } catch (err) {
        console.error("Failed to load problem detail:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblem();
  }, [slug, accessToken]);

  const toggleHint = (level: number) => {
    if (unlockedHintLevels.includes(level)) {
      setUnlockedHintLevels(unlockedHintLevels.filter((l) => l !== level));
    } else {
      setUnlockedHintLevels([...unlockedHintLevels, level]);
    }
  };

  const handleRequirementToggle = (idx: number) => {
    setCheckedRequirements((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleMarkCompleted = async () => {
    if (!problem || !isAuthenticated) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/problems/${problem.slug}/attempt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: "passed",
          score: 95,
          feedback: {
            checklist_completed: Object.values(checkedRequirements).filter(Boolean).length,
            note: "Completed architecture challenge requirements",
          },
        }),
      });

      if (res.ok) {
        setSubmissionFeedback("Challenge marked as Completed! Score recorded.");
        setProblem((prev) => (prev ? { ...prev, is_completed: true, best_score: 95 } : null));
      }
    } catch (err) {
      console.error("Error submitting attempt:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <main className="flex-1 max-w-5xl mx-auto px-4 py-20 text-center">
          <Loader2 className="h-8 w-8 text-sky-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-mono text-slate-400">Loading architecture challenge...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!problem) {
    return (
      <>
        <Navigation />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">Challenge Not Found</h1>
          <p className="text-sm text-slate-400 mt-1 mb-6">
            The requested practice problem does not exist or has been archived.
          </p>
          <Link
            href="/practice"
            className="px-4 py-2 rounded-lg bg-sky-500 text-slate-950 font-bold text-xs font-mono inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Challenges</span>
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const diffStyle = DIFFICULTY_BADGES[problem.difficulty.toLowerCase()] || DIFFICULTY_BADGES.beginner;

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-sky-400 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Challenges</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={`/design?problem=${problem.slug}&title=${encodeURIComponent(problem.title)}`}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-colors shadow-lg shadow-sky-500/20"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Design on Canvas</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Problem Title Header */}
        <div className="p-6 rounded-2xl bg-surface-900/80 border border-slate-800 mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${diffStyle.bg} ${diffStyle.text} ${diffStyle.border}`}
            >
              {problem.difficulty}
            </span>
            <span className="text-xs font-mono text-slate-400 px-2.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50">
              {problem.category}
            </span>
            {problem.is_completed && (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Solved ({problem.best_score}%)</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {problem.title}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
            {problem.description}
          </p>

          {/* Scale Highlights */}
          {problem.expected_scale && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
              {Object.entries(problem.expected_scale).map(([key, val]) => (
                <div key={key} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    {key.replace(/_/g, " ")}
                  </div>
                  <div className="text-sm font-bold font-mono text-sky-400 mt-0.5">
                    {String(val)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
          {[
            { id: "requirements", label: "Requirements & Scope", icon: ShieldCheck },
            { id: "capacity", label: "Capacity & Constraints", icon: Calculator },
            { id: "hints", label: "Socratic Hint Ladder (4 Tiers)", icon: Lightbulb },
            { id: "evaluation", label: "Rubric & Anti-Patterns", icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-xs font-mono flex items-center gap-2 transition-colors shrink-0 ${
                  isActive
                    ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "requirements" && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-surface-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
                <ShieldCheck className="h-4 w-4" />
                <span>FUNCTIONAL REQUIREMENTS (CHECKLIST)</span>
              </div>
              <p className="text-xs text-slate-400">
                Ensure your architecture canvas addresses every core functional guarantee:
              </p>
              <div className="space-y-2.5">
                {problem.requirements.map((req, idx) => (
                  <label
                    key={idx}
                    onClick={() => handleRequirementToggle(idx)}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedRequirements[idx]}
                      onChange={() => {}}
                      className="mt-0.5 rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                    <span
                      className={`text-xs leading-relaxed ${
                        checkedRequirements[idx] ? "text-slate-400 line-through" : "text-slate-200"
                      }`}
                    >
                      {req}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quick action bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Ready to draw your design?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Launch the interactive React Flow canvas with custom nodes (DB, Cache, Gateway, Queue).
                </p>
              </div>
              <Link
                href={`/design?problem=${problem.slug}&title=${encodeURIComponent(problem.title)}`}
                className="px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 transition-colors shrink-0 shadow-lg shadow-sky-500/20"
              >
                <Layers className="h-4 w-4" />
                <span>Open Canvas Workspace</span>
              </Link>
            </div>
          </div>
        )}

        {activeTab === "capacity" && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-surface-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
                <Calculator className="h-4 w-4" />
                <span>NON-FUNCTIONAL &amp; SCALE CONSTRAINTS</span>
              </div>
              <p className="text-xs text-slate-400">
                Quantified production metrics required to size database IOPS, server clusters, and cache capacity:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(problem.constraints).map(([key, val]) => (
                  <div key={key} className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono text-slate-400 capitalize">
                        {key.replace(/_/g, " ")}
                      </div>
                      <div className="text-sm font-bold text-white font-mono mt-1">
                        {String(val)}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Zap className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* First Principles Derivation Box */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 space-y-2">
              <div className="text-sky-400 font-bold flex items-center gap-1.5">
                <Calculator className="h-4 w-4" />
                <span>First-Principles Estimation Formula</span>
              </div>
              <div className="text-slate-400">
                Throughput ($QPS$) $\times$ Average Latency ($W$) = In-flight Concurrent Requests ($L$).
              </div>
              <div className="text-slate-400">
                Cache Sizing: 20% of hot data volume serves 80% of total read requests (Pareto Rule).
              </div>
            </div>
          </div>
        )}

        {activeTab === "hints" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-900/60 border border-slate-800 text-xs text-slate-400 font-mono">
              Progressive Socratic Hint Ladder: Don't look at higher hints immediately. Challenge your first-principles thinking step-by-step.
            </div>

            {problem.hints.map((hint) => {
              const isUnlocked = unlockedHintLevels.includes(hint.level);
              return (
                <div
                  key={hint.level}
                  className="rounded-xl border border-slate-800 bg-surface-900/60 overflow-hidden"
                >
                  <button
                    onClick={() => toggleHint(hint.level)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                        Level {hint.level}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {hint.title}
                      </span>
                    </div>
                    {isUnlocked ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {isUnlocked && (
                    <div className="px-5 pb-5 pt-1 border-t border-slate-800/60 text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40">
                      {hint.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "evaluation" && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-surface-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>ARCHITECTURAL ANTI-PATTERNS (FAIL CONDITIONS)</span>
              </div>
              <div className="space-y-2">
                {problem.evaluation_criteria.anti_patterns?.map((anti, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>{anti}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="text-xs font-mono text-emerald-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>SCALABILITY CHECKLIST</span>
                </div>
                <div className="space-y-2">
                  {problem.evaluation_criteria.scalability_checklist?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Self assessment & submit attempt */}
            <div className="p-6 rounded-xl bg-surface-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">Finished your design review?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record your practice attempt to update your skill mastery score and learning streak.
                </p>
                {submissionFeedback && (
                  <div className="text-xs font-mono text-emerald-400 mt-2 font-semibold">
                    ✓ {submissionFeedback}
                  </div>
                )}
              </div>
              <button
                onClick={handleMarkCompleted}
                disabled={isSubmitting || !isAuthenticated}
                className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 transition-colors shrink-0 disabled:text-slate-500"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>
                  {!isAuthenticated
                    ? "Login to Record Score"
                    : problem.is_completed
                    ? "Update Completion"
                    : "Mark Solved (95%)"}
                </span>
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
