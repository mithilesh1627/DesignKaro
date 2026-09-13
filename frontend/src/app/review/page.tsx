"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileCheck2,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Award,
  Zap,
  TrendingUp,
  RotateCcw,
  Download,
  Loader2,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { API_BASE } from "@/lib/api";
import { useSearchParams } from "next/navigation";

interface DimensionScore {
  name: string;
  score: number;
  verdict: string;
  analysis: string;
}

interface ReviewResult {
  overall_score: number;
  grade: string;
  radar_scores: DimensionScore[];
  strengths: string[];
  critical_vulnerabilities: string[];
  rule_violations: Array<{
    rule_id: string;
    rule_name: string;
    severity: string;
    message: string;
    remediation: string;
  }>;
  actionable_remediation_plan: string[];
  executive_summary: string;
}

function ReviewContent() {
  const searchParams = useSearchParams();
  const designId = searchParams ? searchParams.get("designId") : null;

  const [review, setReview] = useState<ReviewResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPreset, setSelectedPreset] = useState<string>(designId ? "custom" : "tinyurl");
  const [customDesignData, setCustomDesignData] = useState<any | null>(null);

  useEffect(() => {
    if (!designId) return;
    const fetchCustomDesign = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/designs/${designId}`);
        if (res.ok) {
          const data = await res.json();
          setCustomDesignData({
            title: data.title || "Custom Architecture",
            scale_metadata: data.scale_metadata || { read_qps: 15000 },
            graph_data: data.graph_data || { nodes: [], edges: [] },
          });
          setSelectedPreset("custom");
        }
      } catch (err) {
        console.error("Failed to load custom design for review:", err);
      }
    };
    fetchCustomDesign();
  }, [designId]);

  const runEvaluation = async (presetKey: string) => {
    try {
      setIsLoading(true);

      const sampleGraphs: Record<string, any> = {
        tinyurl: {
          title: "TinyURL Distributed Service",
          scale_metadata: { read_qps: 25000, write_qps: 500 },
          graph_data: {
            nodes: [
              { id: "c1", type: "client", label: "Clients", properties: { replicas: 1 } },
              { id: "gw1", type: "gateway", label: "Envoy Gateway", properties: { replicas: 2 } },
              { id: "s1", type: "service", label: "Redirect Service", properties: { replicas: 4 } },
              { id: "cache1", type: "cache", label: "Redis LRU", properties: { replicas: 2 } },
              { id: "db1", type: "relational_db", label: "Postgres Primary", properties: { replicas: 2 } },
              { id: "q1", type: "queue", label: "Kafka Telemetry", properties: { replicas: 3 } },
              { id: "w1", type: "service", label: "Analytics Worker", properties: { replicas: 2 } },
            ],
            edges: [
              { id: "e1", source: "c1", target: "gw1" },
              { id: "e2", source: "gw1", target: "s1" },
              { id: "e3", source: "s1", target: "cache1" },
              { id: "e4", source: "s1", target: "db1" },
              { id: "e5", source: "s1", target: "q1" },
              { id: "e6", source: "q1", target: "w1" },
              { id: "e7", source: "w1", target: "db1" },
            ],
          },
        },
        monolith: {
          title: "Single Instance Monolith (High SPOF)",
          scale_metadata: { read_qps: 10000 },
          graph_data: {
            nodes: [
              { id: "c1", type: "client", label: "Direct Clients", properties: { replicas: 1 } },
              { id: "s1", type: "service", label: "Monolith Server", properties: { replicas: 1 } },
              { id: "db1", type: "relational_db", label: "Single MySQL", properties: { replicas: 1 } },
            ],
            edges: [
              { id: "e1", source: "c1", target: "s1" },
              { id: "e2", source: "s1", target: "db1" },
            ],
          },
        },
      };

      let payload = sampleGraphs[presetKey];
      if (presetKey === "custom" && customDesignData) {
        payload = customDesignData;
      }
      if (!payload) {
        payload = sampleGraphs.tinyurl;
      }

      const res = await fetch(`${API_BASE}/api/v1/review/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setReview(data);
      }
    } catch (err) {
      console.error("Failed to fetch architecture review:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runEvaluation(selectedPreset);
  }, [selectedPreset, customDesignData]);

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
              <Award className="h-4 w-4" />
              <span>ARCHITECTURAL HEALTH &amp; COMPLIANCE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              9-Dimension Architecture Review
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Automated Staff-level architectural evaluation across scalability, fault tolerance, latency, data integrity, and cost efficiency.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Preset Toggle */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-white/[0.08] text-xs font-mono">
              <span className="text-slate-500 px-2 text-[10px] uppercase font-bold tracking-wider">Preset:</span>
              <button
                onClick={() => setSelectedPreset("tinyurl")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  selectedPreset === "tinyurl"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Distributed HA
              </button>
              <button
                onClick={() => setSelectedPreset("monolith")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  selectedPreset === "monolith"
                    ? "bg-rose-500 text-white font-bold shadow-sm shadow-rose-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                SPOF Anti-Pattern
              </button>
            </div>

            <Link
              href="/design"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors border border-white/[0.08]"
            >
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span>Open in Canvas</span>
            </Link>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-24 text-center">
            <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-mono text-slate-400">Compiling 9-dimension review scorecard...</p>
          </div>
        ) : review ? (
          <div className="space-y-8">
            {/* Executive Summary Card */}
            <div className="p-8 rounded-3xl bg-slate-900/80 border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl backdrop-blur-2xl">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-xs font-mono font-extrabold uppercase px-3 py-1 rounded-full border ${
                      review.overall_score >= 85
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : review.overall_score >= 65
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    Grade: {review.grade}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Deterministic Architectural Audit
                  </span>
                </div>
                <h2 className="text-2xl font-bold font-display text-white tracking-tight">
                  Executive Assessment &amp; Reliability Rating
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed max-w-3xl font-light">
                  {review.executive_summary}
                </p>
              </div>

              {/* Score Gauge */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950 border border-white/[0.06] min-w-[200px] text-center shrink-0">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">
                  Overall Health
                </div>
                <div
                  className={`text-5xl font-black font-mono ${
                    review.overall_score >= 85
                      ? "text-emerald-400"
                      : review.overall_score >= 65
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {review.overall_score}
                  <span className="text-2xl text-slate-600 font-normal">/100</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  Across 9 Dimensions
                </div>
              </div>
            </div>

            {/* 9 Dimensions Breakdown Grid */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                <span>The 9 Architectural Dimensions</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {review.radar_scores.map((dim) => (
                  <div
                    key={dim.name}
                    className="p-5 rounded-2xl bg-slate-900/60 border border-white/[0.08] hover:border-cyan-500/30 flex flex-col justify-between space-y-3.5 transition-all shadow-lg backdrop-blur-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white tracking-wide">{dim.name}</span>
                        <span
                          className={`text-xs font-mono font-bold ${
                            dim.score >= 80
                              ? "text-emerald-400"
                              : dim.score >= 65
                              ? "text-amber-400"
                              : "text-rose-400"
                          }`}
                        >
                          {dim.score}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden mb-2.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            dim.score >= 80
                              ? "bg-emerald-500"
                              : dim.score >= 65
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed font-light">
                        {dim.analysis}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Verdict:</span>
                      <span className="text-slate-200 font-semibold">{dim.verdict}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Critical Vulnerabilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] space-y-3.5 backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>CORE ARCHITECTURAL STRENGTHS</span>
                </div>
                <div className="space-y-2">
                  {review.strengths.map((str, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-white/[0.06] text-xs text-slate-300 flex items-center gap-2.5 font-light"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vulnerabilities */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] space-y-3.5 backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>CRITICAL VULNERABILITIES</span>
                </div>
                <div className="space-y-2">
                  {review.critical_vulnerabilities.map((vuln, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2.5 font-light"
                    >
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>{vuln}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actionable Remediation Plan */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/[0.08] space-y-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
                <ShieldCheck className="h-4 w-4" />
                <span>ACTIONABLE REMEDIATION ROADMAP (STAFF RECOMMENDATIONS)</span>
              </div>
              <div className="space-y-2.5">
                {review.actionable_remediation_plan.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-950 border border-white/[0.06] text-xs text-slate-300 flex items-start gap-3.5 font-light leading-relaxed"
                  >
                    <span className="font-mono text-cyan-400 font-bold shrink-0 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[10px]">
                      STEP {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

export default function ReviewPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-surface-950 flex items-center justify-center text-xs font-mono text-slate-400">
          Loading Architecture Review...
        </div>
      }
    >
      <ReviewContent />
    </React.Suspense>
  );
}
