"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ArrowLeft,
  ShieldCheck,
  Award,
  Zap,
  BookOpen,
  Cpu,
  Search,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  FileCode2,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuthStore } from "@/lib/authStore";

interface SkillMastery {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  mastery_score: number;
}

interface AchievementItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  badge_icon: string;
  xp_reward: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
}

interface RecentDesign {
  id: string;
  public_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  latest_version: number;
  updated_at: string;
}

interface DashboardData {
  readiness_score: number;
  current_rank: string;
  target_role: string;
  total_xp: number;
  streak_days: number;
  completed_lessons_count: number;
  solved_problems_count: number;
  designs_created_count: number;
  interviews_completed_count: number;
  skills: SkillMastery[];
  achievements: AchievementItem[];
  recent_designs: RecentDesign[];
  recommendations: string[];
}

interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  document_type: string;
  company: string;
  summary: string;
  key_takeaways: string[];
  tags: string[];
  url: string;
}

export default function ProgressPage() {
  const { accessToken } = useAuthStore();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Knowledge search state
  const [searchQuery, setSearchQuery] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState<string>("All");
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeItem[]>([]);
  const [searchingKnowledge, setSearchingKnowledge] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }
      const res = await fetch(`${API_BASE}/api/v1/dashboard`, { headers });
      if (!res.ok) {
        throw new Error(`Failed to load dashboard: ${res.statusText}`);
      }
      const data = await res.json();
      setDashboard(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error fetching dashboard";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const searchKnowledge = async (query: string, category: string) => {
    setSearchingKnowledge(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append("q", query.trim());
      if (category !== "All") params.append("category", category);

      const res = await fetch(`${API_BASE}/api/v1/knowledge/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setKnowledgeResults(data.results || []);
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setSearchingKnowledge(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    searchKnowledge("", "All");
  }, [accessToken]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchKnowledge(searchQuery, knowledgeCategory);
  };

  const getBarColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
    if (score >= 65) return "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.3)]";
    if (score >= 50) return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]";
    return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]";
  };

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-sky-400 mb-2 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Developer Readiness &amp; Skill Graph
                </h1>
                <p className="text-xs text-slate-400 font-mono">
                  Adaptive Mastery Graph • Real-Time Diagnostics • Architectural Knowledge
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-300 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-sky-400" : ""}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Top Telemetry KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-xl border border-sky-500/40 bg-gradient-to-br from-sky-500/10 to-transparent">
            <div className="flex items-center justify-between text-xs font-mono text-sky-400 mb-1">
              <span>SYSTEM DESIGN READINESS</span>
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="text-4xl font-extrabold text-white">
              {dashboard?.readiness_score ?? 78}%
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Target: {dashboard?.target_role || "Staff Systems Architect"}
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-surface-900/60">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>PRACTICE STREAK</span>
              <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">
              {dashboard?.streak_days ?? 7} <span className="text-lg font-normal text-slate-400">Days</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Total Architectural XP: {dashboard?.total_xp ?? 1250}
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-surface-900/60">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>METRICS COMPLETED</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">
              {(dashboard?.completed_lessons_count || 0) + (dashboard?.solved_problems_count || 0)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              {dashboard?.completed_lessons_count || 0} Lessons • {dashboard?.solved_problems_count || 0} Labs
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-surface-900/60">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>CURRENT CERTIFICATION</span>
              <Award className="h-4 w-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-sky-300 truncate">
              {dashboard?.current_rank || "Principal Architect"}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              {dashboard?.interviews_completed_count || 0} FAANG Mock Interviews Passed
            </div>
          </div>
        </div>

        {/* 2-Column: Skill Mastery Graph & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Skill Mastery Graph */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-surface-900/60 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2 text-xs font-mono text-sky-400 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>0-100 GRANULAR SYSTEM DESIGN SKILL MASTERY</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                Phase 16 Adaptive
              </span>
            </div>

            <div className="space-y-4">
              {dashboard?.skills && dashboard.skills.length > 0 ? (
                dashboard.skills.map((skill) => (
                  <div key={skill.id} className="space-y-1.5 group">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 group-hover:text-sky-300 transition-colors">
                          {skill.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                          {skill.category}
                        </span>
                      </div>
                      <span className="text-sky-400 font-bold">{skill.mastery_score} / 100</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className={`${getBarColor(skill.mastery_score)} h-full rounded-full transition-all duration-700`}
                        style={{ width: `${skill.mastery_score}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs font-mono text-slate-500 py-6 text-center">
                  Loading skill telemetry...
                </div>
              )}
            </div>
          </div>

          {/* Recommendations & Achievements */}
          <div className="space-y-6">
            {/* Recommendations */}
            <div className="rounded-xl border border-slate-800 bg-surface-900/60 p-6">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-semibold border-b border-slate-800 pb-3 mb-4">
                <Sparkles className="h-4 w-4" />
                <span>AI MENTOR RECOMMENDATIONS</span>
              </div>
              <div className="space-y-3">
                {dashboard?.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5"
                  >
                    <span className="text-amber-400 font-mono font-bold shrink-0">{i + 1}.</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                <Link
                  href="/practice"
                  className="flex-1 text-center px-3 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors"
                >
                  Start Practice
                </Link>
                <Link
                  href="/design"
                  className="flex-1 text-center px-3 py-2 rounded-md border border-slate-700 hover:border-slate-600 bg-slate-800 text-xs font-mono text-slate-200 transition-colors"
                >
                  Open Canvas
                </Link>
              </div>
            </div>

            {/* Achievements */}
            <div className="rounded-xl border border-slate-800 bg-surface-900/60 p-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2 text-xs font-mono text-sky-400 font-semibold">
                  <Award className="h-4 w-4" />
                  <span>BADGES &amp; ACHIEVEMENTS</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {dashboard?.achievements.filter((a) => a.is_unlocked).length || 0} /{" "}
                  {dashboard?.achievements.length || 0}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {dashboard?.achievements.map((a) => (
                  <div
                    key={a.id}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      a.is_unlocked
                        ? "border-sky-500/30 bg-sky-500/10 text-white"
                        : "border-slate-800/80 bg-slate-950/40 text-slate-500 opacity-60"
                    }`}
                  >
                    <div className="text-2xl mb-1 flex justify-center">
                      {a.is_unlocked ? a.badge_icon : <Lock className="h-5 w-5 text-slate-600" />}
                    </div>
                    <div className="text-[11px] font-semibold truncate">{a.name}</div>
                    <div className="text-[9px] font-mono text-sky-400 mt-0.5">+{a.xp_reward} XP</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Architecture Blueprints */}
        {dashboard?.recent_designs && dashboard.recent_designs.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-surface-900/60 p-6 mb-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2 text-xs font-mono text-sky-400 font-semibold">
                <Cpu className="h-4 w-4" />
                <span>SAVED ARCHITECTURAL BLUEPRINTS</span>
              </div>
              <Link
                href="/design"
                className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
              >
                <span>Launch Canvas</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dashboard.recent_designs.map((design) => (
                <div
                  key={design.id}
                  className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-sky-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white truncate">{design.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      v{design.latest_version}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                    {design.description || "Interactive architecture canvas layout."}
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-900">
                    <span>{new Date(design.updated_at).toLocaleDateString()}</span>
                    <Link
                      href="/design"
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      <span>Open</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 14 & 15: Architecture Knowledge Base & Case Studies Explorer */}
        <div className="rounded-xl border border-slate-800 bg-surface-900/60 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-sky-400 font-semibold">
                <BookOpen className="h-4 w-4" />
                <span>INDUSTRY ARCHITECTURE CASE STUDIES &amp; RAG KNOWLEDGE</span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Real post-mortems and distributed architectures from Netflix, Discord, Uber, Stripe &amp; TikTok
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {["All", "Streaming & Storage", "Real-Time & Storage", "Geospatial & Ingestion", "FinTech & Reliability", "ML System Design"].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setKnowledgeCategory(cat);
                      searchKnowledge(searchQuery, cat);
                    }}
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-md border transition-colors ${
                      knowledgeCategory === cat
                        ? "bg-sky-500/20 border-sky-500/40 text-sky-300 font-bold"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search architecture case studies (e.g. ScyllaDB, H3, Idempotency, Vector Search, HLS)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={searchingKnowledge}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-bold text-slate-950 transition-colors shrink-0"
            >
              {searchingKnowledge ? "Searching..." : "Search"}
            </button>
          </form>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeResults.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-sky-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                      {item.company} • {item.category}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-sky-400 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2 leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{item.summary}</p>

                  <div className="space-y-1.5 mb-4">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      Key Architectural Principles:
                    </div>
                    {item.key_takeaways.map((takeaway, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-tight"
                      >
                        <span className="text-sky-400 font-bold">•</span>
                        <span>{takeaway}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-900">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
