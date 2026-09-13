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
  Brain,
  HardDrive,
  Server,
  Radio,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuthStore } from "@/lib/authStore";
import { API_BASE } from "@/lib/api";
import { AiMentorDrawer } from "@/components/AiMentorDrawer";

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

interface CapacityCalculation {
  avg_total_qps: number;
  peak_total_qps: number;
  avg_write_qps: number;
  peak_write_qps: number;
  avg_read_qps: number;
  peak_read_qps: number;
  ingress_bandwidth_mb_per_sec: number;
  ingress_bandwidth_gbps: number;
  egress_bandwidth_mb_per_sec: number;
  egress_bandwidth_gbps: number;
  daily_storage_raw_gb: number;
  daily_storage_replicated_gb: number;
  storage_1_year_tb: number;
  storage_5_years_tb: number;
  recommended_cache_ram_gb: number;
  recommended_cache_nodes: number;
  min_app_servers_peak: number;
  min_app_servers_ha: number;
  derivation_steps: Array<{
    step_number: number;
    metric_name: string;
    formula: string;
    calculation: string;
    result_str: string;
    notes: string;
  }>;
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
  const [isMentorOpen, setIsMentorOpen] = useState(false);

  // Capacity Calculator State
  const [calcDau, setCalcDau] = useState<number>(20000000);
  const [calcActions, setCalcActions] = useState<number>(25);
  const [calcRatio, setCalcRatio] = useState<number>(10.0);
  const [calcWriteKb, setCalcWriteKb] = useState<number>(2.0);
  const [calcReadKb, setCalcReadKb] = useState<number>(15.0);
  const [calcStorageYears, setCalcStorageYears] = useState<number>(5);
  const [isCalculating, setIsCalculating] = useState(false);
  const [capacityResult, setCapacityResult] = useState<CapacityCalculation | null>(null);

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
        const res = await fetch(`${API_BASE}/api/v1/problems/${slug}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setProblem(data);
          // Pre-populate capacity defaults if available in expected_scale
          if (data.expected_scale?.dau) {
            const rawDau = parseInt(String(data.expected_scale.dau).replace(/[^0-9]/g, "")) || 20000000;
            setCalcDau(rawDau);
          }
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

  const handleRunCapacityCalculation = async () => {
    try {
      setIsCalculating(true);
      const res = await fetch(`${API_BASE}/api/v1/capacity/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dau: Math.max(100, calcDau),
          actions_per_user_day: Math.max(1, calcActions),
          read_write_ratio: Math.max(0.1, calcRatio),
          peak_multiplier: 2.5,
          avg_write_payload_kb: Math.max(0.01, calcWriteKb),
          avg_read_payload_kb: Math.max(0.01, calcReadKb),
          storage_duration_years: Math.max(1, calcStorageYears),
          replication_factor: 3,
          cache_hot_ratio: 0.2,
          server_qps_capacity: 2500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCapacityResult(data);
      }
    } catch (err) {
      console.error("Failed to calculate capacity:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!problem || !isAuthenticated) return;
    try {
      setIsSubmitting(true);
      const totalReqs = problem.requirements?.length || 1;
      const checkedCount = Object.values(checkedRequirements).filter(Boolean).length;
      const calculatedScore = Math.round((checkedCount / totalReqs) * 100);
      const status = calculatedScore >= 70 ? "passed" : "in_progress";

      const res = await fetch(`${API_BASE}/api/v1/problems/${problem.slug}/attempt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: status,
          score: calculatedScore,
          feedback: {
            checklist_completed: checkedCount,
            total_requirements: totalReqs,
            note: `Addressed ${checkedCount} of ${totalReqs} architectural requirements`,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const passed = data.status === "passed";
        setSubmissionFeedback(
          passed
            ? `Challenge Passed! Score: ${data.score}% recorded to your skill profile.`
            : `Attempt saved! Score: ${data.score}%. Check off at least 70% of requirements to pass.`
        );
        setProblem((prev) =>
          prev ? { ...prev, is_completed: passed, best_score: data.score } : null
        );
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
        <main className="flex-1 max-w-5xl mx-auto px-4 py-20 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Challenge Not Found</h2>
          <p className="text-xs font-mono text-slate-400 mb-6">
            The problem &ldquo;{slug}&rdquo; could not be retrieved.
          </p>
          <Link
            href="/practice"
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono"
          >
            ← Back to Practice Catalog
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const badge = DIFFICULTY_BADGES[problem.difficulty.toLowerCase()] || DIFFICULTY_BADGES.intermediate;
  const totalReqs = problem.requirements?.length || 0;
  const completedReqs = Object.values(checkedRequirements).filter(Boolean).length;
  const currentCompletionScore = totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0;

  return (
    <>
      <Navigation />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-sky-400 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Challenges Catalog</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMentorOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-mono font-bold transition-colors"
            >
              <Brain className="h-3.5 w-3.5" />
              <span>Ask AI Mentor</span>
            </button>
            <span className="text-xs font-mono text-slate-500">|</span>
            <span className="text-xs font-mono text-slate-400 uppercase">{problem.category}</span>
          </div>
        </div>

        {/* Challenge Header Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#080d1a]/80 p-6 sm:p-8 mb-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <span
                  className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}
                >
                  {problem.difficulty}
                </span>
                {problem.is_completed && (
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Mastered ({problem.best_score}%)</span>
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
                {problem.title}
              </h1>
            </div>

            <Link
              href={`/design?problem=${problem.slug}&title=${encodeURIComponent(problem.title)}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs font-mono transition-all shrink-0 shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <Layers className="h-4 w-4" />
              <span>Open Architecture Canvas</span>
            </Link>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-4 font-light">
            {problem.description}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/[0.08] pb-1 mb-8 overflow-x-auto">
          {[
            { id: "requirements", label: `Requirements (${completedReqs}/${totalReqs})` },
            { id: "capacity", label: "Capacity & Scale Estimator" },
            { id: "hints", label: `Socratic Hints (${problem.hints.length})` },
            { id: "evaluation", label: "Evaluation Criteria" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all shrink-0 ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Functional Requirements Checklist */}
        {activeTab === "requirements" && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-surface-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-sky-400 font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>FUNCTIONAL REQUIREMENTS CHECKLIST</span>
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Current Score:{" "}
                  <strong
                    className={
                      currentCompletionScore >= 70 ? "text-emerald-400" : "text-amber-400"
                    }
                  >
                    {currentCompletionScore}%
                  </strong>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Check off each functional invariant as your architecture canvas fulfills it:
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

            {/* Canvas Launch Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Ready to draw your architecture?</h3>
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

        {/* Tab 2: Interactive Capacity Calculator */}
        {activeTab === "capacity" && (
          <div className="space-y-6">
            {/* Non-functional specifications banner */}
            <div className="p-6 rounded-xl bg-surface-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-sky-400 font-bold">
                <Calculator className="h-4 w-4" />
                <span>SPECIFIED PRODUCTION SCALE TARGETS</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(problem.constraints).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-mono text-slate-400 capitalize">
                        {key.replace(/_/g, " ")}
                      </div>
                      <div className="text-sm font-bold text-white font-mono mt-1">{String(val)}</div>
                    </div>
                    <div className="p-2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Zap className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Capacity Estimator Form */}
            <div className="p-6 rounded-xl bg-surface-900/80 border border-sky-500/30 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                    <Calculator className="h-4 w-4 text-sky-400" />
                    <span>Interactive Distributed Capacity Engine</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Adjust variables below to calculate live QPS, bandwidth, storage horizons, and cache sizing.
                  </p>
                </div>
                <button
                  onClick={handleRunCapacityCalculation}
                  disabled={isCalculating}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 transition-colors shrink-0 shadow-md"
                >
                  {isCalculating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span>Run First-Principles Sizing</span>
                </button>
              </div>

              {/* Input Sliders & Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">Daily Active Users (DAU)</label>
                  <input
                    type="number"
                    value={calcDau}
                    onChange={(e) => setCalcDau(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {(calcDau / 1000000).toFixed(1)} Million users
                  </span>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Actions / User / Day</label>
                  <input
                    type="number"
                    value={calcActions}
                    onChange={(e) => setCalcActions(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Total: {((calcDau * calcActions) / 1000000).toFixed(1)}M daily actions
                  </span>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Read / Write Ratio</label>
                  <input
                    type="number"
                    step={0.5}
                    value={calcRatio}
                    onChange={(e) => setCalcRatio(parseFloat(e.target.value) || 1.0)}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {calcRatio}:1 ({Math.round((calcRatio / (calcRatio + 1)) * 100)}% Reads)
                  </span>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Avg Write Payload (KB)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={calcWriteKb}
                    onChange={(e) => setCalcWriteKb(parseFloat(e.target.value) || 1.0)}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Avg Read Payload (KB)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={calcReadKb}
                    onChange={(e) => setCalcReadKb(parseFloat(e.target.value) || 1.0)}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Storage Retention (Years)</label>
                  <input
                    type="number"
                    value={calcStorageYears}
                    onChange={(e) => setCalcStorageYears(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Calculated Outputs Display */}
              {capacityResult && (
                <div className="space-y-6 pt-4 border-t border-slate-800 animate-in fade-in">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">PEAK TOTAL QPS</div>
                      <div className="text-lg font-bold text-sky-400 mt-1">
                        {Math.round(capacityResult.peak_total_qps).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Avg: {Math.round(capacityResult.avg_total_qps).toLocaleString()} QPS
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">EGRESS BANDWIDTH</div>
                      <div className="text-lg font-bold text-emerald-400 mt-1">
                        {capacityResult.egress_bandwidth_gbps.toFixed(2)} Gbps
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {capacityResult.egress_bandwidth_mb_per_sec.toFixed(1)} MB/s
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">5-YEAR STORAGE</div>
                      <div className="text-lg font-bold text-purple-400 mt-1">
                        {capacityResult.storage_5_years_tb.toFixed(1)} TB
                      </div>
                      <div className="text-[10px] text-slate-500">
                        1-Year: {capacityResult.storage_1_year_tb.toFixed(1)} TB
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">RECOMMENDED CACHE</div>
                      <div className="text-lg font-bold text-amber-400 mt-1">
                        {capacityResult.recommended_cache_ram_gb.toFixed(0)} GB RAM
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {capacityResult.recommended_cache_nodes} Redis Shards (64GB)
                      </div>
                    </div>
                  </div>

                  {/* Mathematical Derivations Table */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 text-xs font-mono font-bold text-sky-400 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      <span>Step-by-Step Mathematical Derivations</span>
                    </div>
                    <div className="divide-y divide-slate-800/80 text-xs font-mono">
                      {capacityResult.derivation_steps.map((step) => (
                        <div key={step.step_number} className="p-3.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-200 font-bold">
                              {step.step_number}. {step.metric_name}
                            </span>
                            <span className="text-emerald-400 font-bold">{step.result_str}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Formula: <span className="text-sky-300">{step.formula}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Math: {step.calculation} • {step.notes}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Socratic Hint Ladder */}
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
                      <span className="text-sm font-bold text-white">{hint.title}</span>
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

        {/* Tab 4: Evaluation Criteria */}
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
                <h3 className="text-sm font-bold text-white">Finished your architecture design?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record your verified practice attempt to update your skill mastery score and learning streak.
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
                    ? `Update Completion (${currentCompletionScore}%)`
                    : `Submit Challenge Attempt (${currentCompletionScore}%)`}
                </span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* AI Mentor Drawer */}
      <AiMentorDrawer
        isOpen={isMentorOpen}
        onClose={() => setIsMentorOpen(false)}
        problemSlug={problem.slug}
      />

      <Footer />
    </>
  );
}
