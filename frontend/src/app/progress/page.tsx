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
import { AuthModal } from "@/components/AuthModal";
import { useAuthStore } from "@/lib/authStore";
import { API_BASE } from "@/lib/api";

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
  const { accessToken, user } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Knowledge search state
  const [searchQuery, setSearchQuery] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState<string>("All");
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeItem[]>([]);
  const [searchingKnowledge, setSearchingKnowledge] = useState(false);

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
              className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 mb-3 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 text-[10px] font-mono mb-1 uppercase tracking-wider font-semibold">
                  Progress Dashboard
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                  Readiness &amp; Skill Telemetry
                </h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Adaptive Mastery Graph • Real-Time Diagnostics • Case Study Knowledge
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 transition-all self-start sm:self-auto shadow-sm active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Guest Engineer Mode Active Banner */}
        {(!accessToken || !user) && (
          <div className="mb-8 p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-cyan-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5 sm:mt-0 shadow-lg shadow-amber-500/10">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <span>Guest Engineer Exploration Mode</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Unauthenticated
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed font-light">
                  You are viewing baseline telemetry. Sign in or create a free account to track your real-time practice streak, save architecture canvas diagrams across devices, and unlock verified mastery badges.
                </p>
              </div>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-mono text-xs font-bold shadow-xl shadow-cyan-500/20 whitespace-nowrap transition-all shrink-0 active:scale-95"
            >
              Sign In / Register Free
            </button>
          </div>
        )}

        {/* Top Telemetry KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-6 rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-slate-900/80 to-transparent shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-2 font-semibold">
              <span>DESIGN READINESS</span>
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-4xl font-black font-mono text-white">
              {dashboard?.readiness_score ?? 0}%
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1.5 truncate">
              Target: {dashboard?.target_role || "Distributed Systems Engineer"}
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-white/[0.08] bg-slate-900/60 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2 font-semibold">
              <span>PRACTICE STREAK</span>
              <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
            </div>
            <div className="text-4xl font-black font-mono text-white">
              {dashboard?.streak_days ?? 0} <span className="text-lg font-normal text-slate-500">Days</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1.5">
              Total Architectural XP: {dashboard?.total_xp ?? 0}
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-white/[0.08] bg-slate-900/60 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2 font-semibold">
              <span>METRICS COMPLETED</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-4xl font-black font-mono text-white">
              {(dashboard?.completed_lessons_count || 0) + (dashboard?.solved_problems_count || 0)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1.5">
              {dashboard?.completed_lessons_count || 0} Lessons • {dashboard?.solved_problems_count || 0} Labs
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-white/[0.08] bg-slate-900/60 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2 font-semibold">
              <span>CURRENT CERTIFICATION</span>
              <Award className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-300 truncate mt-1">
              {dashboard?.current_rank || "Guest Engineer"}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1.5">
              {dashboard?.interviews_completed_count || 0} FAANG Mock Interviews
            </div>
          </div>
        </div>

        {/* 2-Column: Skill Mastery Graph & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Skill Mastery Graph */}
          <div className="lg:col-span-2 rounded-3xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>GRANULAR SYSTEM DESIGN SKILL MASTERY</span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Continuous Evaluation
              </span>
            </div>

            <div className="space-y-4">
              {dashboard?.skills && dashboard.skills.length > 0 ? (
                dashboard.skills.map((skill) => (
                  <div key={skill.id} className="space-y-1.5 group">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 group-hover:text-cyan-300 transition-colors">
                          {skill.name}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/[0.06]">
                          {skill.category}
                        </span>
                      </div>
                      <span className="text-cyan-400 font-bold">{skill.mastery_score} / 100</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/[0.06]">
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
            <div className="rounded-3xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-7 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-semibold border-b border-white/[0.06] pb-3 mb-4">
                <Sparkles className="h-4 w-4" />
                <span>AI MENTOR RECOMMENDATIONS</span>
              </div>
              <div className="space-y-3">
                {dashboard?.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5 font-light"
                  >
                    <span className="text-amber-400 font-mono font-bold shrink-0">{i + 1}.</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex gap-2.5">
                <Link
                  href="/learn"
                  className="flex-1 text-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-xs font-bold font-mono text-slate-950 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
                >
                  Explore Curriculum
                </Link>
                <Link
                  href="/simulator"
                  className="flex-1 text-center px-4 py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 bg-slate-800/80 text-xs font-mono text-slate-200 transition-colors"
                >
                  Open Simulator
                </Link>
              </div>
            </div>

            {/* Achievements */}
            <div className="rounded-3xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-7 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold">
                  <Award className="h-4 w-4" />
                  <span>BADGES &amp; ACHIEVEMENTS</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 border border-white/[0.06]">
                  {dashboard?.achievements.filter((a) => a.is_unlocked).length || 0} /{" "}
                  {dashboard?.achievements.length || 0}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {dashboard?.achievements.map((a) => (
                  <div
                    key={a.id}
                    className={`p-3.5 rounded-2xl border text-center transition-all ${
                      a.is_unlocked
                        ? "border-cyan-500/30 bg-cyan-500/10 text-white shadow-sm shadow-cyan-500/10"
                        : "border-white/[0.04] bg-slate-950/40 text-slate-500 opacity-60"
                    }`}
                  >
                    <div className="text-2xl mb-1 flex justify-center">
                      {a.is_unlocked ? a.badge_icon : <Lock className="h-5 w-5 text-slate-600" />}
                    </div>
                    <div className="text-[11px] font-semibold truncate">{a.name}</div>
                    <div className="text-[9px] font-mono text-cyan-400 mt-0.5">+{a.xp_reward} XP</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Architecture Blueprints */}
        {dashboard?.recent_designs && dashboard.recent_designs.length > 0 && (
          <div className="rounded-3xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 mb-8 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-5">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold">
                <Cpu className="h-4 w-4" />
                <span>SAVED ARCHITECTURAL BLUEPRINTS</span>
              </div>
              <Link
                href="/simulator"
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
              >
                <span>Launch Simulator</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dashboard.recent_designs.map((design) => (
                <div
                  key={design.id}
                  className="p-5 rounded-2xl border border-white/[0.06] bg-slate-950/60 hover:border-cyan-500/40 transition-all shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white truncate">{design.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/[0.06]">
                        v{design.latest_version}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-4 font-light">
                      {design.description || "Interactive architecture canvas layout."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-3 border-t border-white/[0.04]">
                    <span>{new Date(design.updated_at).toLocaleDateString()}</span>
                    <Link
                      href={`/simulator?id=${design.public_id || design.id}`}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                    >
                      <span>Open Simulator</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Industry Architecture Case Studies & RAG Knowledge */}
        <div className="rounded-3xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold">
                <BookOpen className="h-4 w-4" />
                <span>PRODUCTION CASE STUDIES &amp; RAG ARCHITECTURE</span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1 font-light">
                Verified post-mortems and architectures from Netflix, Discord, Uber, Stripe &amp; TikTok
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
                    className={`text-[10px] font-mono px-3 py-1.5 rounded-xl border transition-all ${
                      knowledgeCategory === cat
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold shadow-sm shadow-cyan-500/10"
                        : "border-white/[0.06] bg-slate-900/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2.5 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search architecture case studies (e.g. ScyllaDB, H3, Idempotency, Vector Search, HLS)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-white/[0.08] bg-slate-950 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={searchingKnowledge}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-xs font-bold font-mono text-slate-950 transition-all shadow-md shadow-cyan-500/20 shrink-0 active:scale-95"
            >
              {searchingKnowledge ? "Searching..." : "Search"}
            </button>
          </form>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeResults.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-2xl border border-white/[0.06] bg-slate-950/60 hover:border-cyan-500/30 transition-all flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                      {item.company} • {item.category}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2 leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 font-light">{item.summary}</p>

                  <div className="space-y-1.5 mb-4">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      Key Architectural Principles:
                    </div>
                    {item.key_takeaways.map((takeaway, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-tight font-light"
                      >
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{takeaway}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-3.5 border-t border-white/[0.04]">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-white/[0.06]"
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
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}

