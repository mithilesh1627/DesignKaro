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
    if (score >= 80) return "bg-emerald-500";
    if (score >= 65) return "bg-blue-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="min-h-screen bg-surface-ground text-zinc-100 flex flex-col">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 focus:outline-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 mb-3 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
                  Readiness &amp; Skill Telemetry
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Distributed systems mastery graph, rubric scores, and industry case studies
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-400" : "text-zinc-400"}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Guest Engineer Mode Active Banner */}
        {(!accessToken || !user) && (
          <div className="mb-8 p-5 rounded-lg border border-zinc-800 bg-zinc-900/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/60 shrink-0 mt-0.5 sm:mt-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-200">
                    Guest Exploration Mode
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                    Session Only
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                  You are viewing baseline telemetry. Sign in or create a free account to track your practice streak, persist canvas diagrams across devices, and record interview rubric scores.
                </p>
              </div>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium whitespace-nowrap transition-colors shrink-0"
            >
              Sign In / Register
            </button>
          </div>
        )}

        {/* Top Telemetry KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
              <span>DESIGN READINESS</span>
              <ShieldCheck className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-zinc-100">
              {dashboard?.readiness_score ?? 0}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 truncate">
              Target: {dashboard?.target_role || "Distributed Systems Engineer"}
            </div>
          </div>

          <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
              <span>PRACTICE STREAK</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-zinc-100">
              {dashboard?.streak_days ?? 0} <span className="text-base font-normal text-zinc-500">Days</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Total XP: {dashboard?.total_xp ?? 0}
            </div>
          </div>

          <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
              <span>COMPLETED UNITS</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-zinc-100">
              {(dashboard?.completed_lessons_count || 0) + (dashboard?.solved_problems_count || 0)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {dashboard?.completed_lessons_count || 0} Lessons • {dashboard?.solved_problems_count || 0} Problems
            </div>
          </div>

          <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
              <span>CURRENT RANK</span>
              <Award className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="text-xl font-bold text-zinc-200 truncate mt-1">
              {dashboard?.current_rank || "Guest Engineer"}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {dashboard?.interviews_completed_count || 0} Mock Interviews Completed
            </div>
          </div>
        </div>

        {/* 2-Column: Skill Mastery Graph & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Skill Mastery Graph */}
          <div className="lg:col-span-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5 mb-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                <span>SYSTEM DESIGN SKILL MASTERY</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                Continuous Evaluation
              </span>
            </div>

            <div className="space-y-4">
              {dashboard?.skills && dashboard.skills.length > 0 ? (
                dashboard.skills.map((skill) => (
                  <div key={skill.id} className="space-y-1.5 group">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-200 group-hover:text-blue-400 transition-colors">
                          {skill.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {skill.category}
                        </span>
                      </div>
                      <span className="text-zinc-300 font-mono font-medium">{skill.mastery_score} / 100</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className={`${getBarColor(skill.mastery_score)} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${skill.mastery_score}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-zinc-500 py-6 text-center">
                  Loading skill telemetry...
                </div>
              )}
            </div>
          </div>

          {/* Recommendations & Achievements */}
          <div className="space-y-6">
            {/* Recommendations */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 border-b border-zinc-800 pb-3 mb-4">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>RECOMMENDED NEXT STEPS</span>
              </div>
              <div className="space-y-2.5">
                {dashboard?.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-md border border-zinc-800 bg-zinc-950/50 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5"
                  >
                    <span className="text-zinc-500 font-mono font-bold shrink-0">{i + 1}.</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3.5 border-t border-zinc-800 flex gap-2">
                <Link
                  href="/learn"
                  className="flex-1 text-center px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
                >
                  Explore Lessons
                </Link>
                <Link
                  href="/simulator"
                  className="flex-1 text-center px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-xs font-medium text-zinc-200 transition-colors"
                >
                  Open Simulator
                </Link>
              </div>
            </div>

            {/* Achievements */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                  <Award className="h-4 w-4 text-zinc-400" />
                  <span>ACHIEVEMENTS</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                  {dashboard?.achievements.filter((a) => a.is_unlocked).length || 0} /{" "}
                  {dashboard?.achievements.length || 0}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {dashboard?.achievements.map((a) => (
                  <div
                    key={a.id}
                    className={`p-3 rounded-md border text-center transition-colors ${
                      a.is_unlocked
                        ? "border-zinc-700 bg-zinc-800/80 text-zinc-100"
                        : "border-zinc-800/60 bg-zinc-950/40 text-zinc-500 opacity-50"
                    }`}
                  >
                    <div className="text-xl mb-1 flex justify-center">
                      {a.is_unlocked ? a.badge_icon : <Lock className="h-4 w-4 text-zinc-600" />}
                    </div>
                    <div className="text-[11px] font-medium truncate">{a.name}</div>
                    <div className="text-[10px] font-mono text-blue-400 mt-0.5">+{a.xp_reward} XP</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Architecture Blueprints */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 mb-8">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5 mb-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Cpu className="h-4 w-4 text-zinc-400" />
              <span>SAVED ARCHITECTURAL BLUEPRINTS</span>
            </div>
            <Link
              href="/simulator"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors font-medium"
            >
              <span>Launch Simulator</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          {dashboard?.recent_designs && dashboard.recent_designs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dashboard.recent_designs.map((design) => (
                <div
                  key={design.id}
                  className="p-4 rounded-md border border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-zinc-200 truncate">{design.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        v{design.latest_version}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                      {design.description || "Interactive architecture canvas layout."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2.5 border-t border-zinc-800/80">
                    <span>{new Date(design.updated_at).toLocaleDateString()}</span>
                    <Link
                      href={`/simulator?id=${design.public_id || design.id}`}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium font-sans"
                    >
                      <span>Open Simulator</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-md border border-zinc-800/60 bg-zinc-950/40 text-center space-y-3">
              <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-zinc-300">No Saved Architecture Blueprints Yet</h3>
              <p className="text-[11px] text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Design custom distributed systems or practice system design interview problems in the Simulator.
              </p>
              <Link
                href="/simulator"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                <span>Create Your First Blueprint</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Industry Architecture Case Studies & Knowledge Base */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <BookOpen className="h-4 w-4 text-zinc-400" />
                <span>PRODUCTION CASE STUDIES &amp; ARCHITECTURAL PATTERNS</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Post-mortems and architectures from Netflix, Discord, Uber, Stripe &amp; TikTok
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
                    className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                      knowledgeCategory === cat
                        ? "bg-zinc-800 border-zinc-700 text-zinc-100 font-medium"
                        : "border-zinc-850 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
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
              <label htmlFor="knowledge-search-input" className="sr-only">
                Search architecture case studies
              </label>
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" aria-hidden="true" />
              <input
                id="knowledge-search-input"
                type="text"
                placeholder="Search architecture case studies (e.g. ScyllaDB, H3, Idempotency, Vector Search, HLS)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-md border border-zinc-800 bg-zinc-950 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={searchingKnowledge}
              className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-zinc-700 transition-colors shrink-0"
            >
              {searchingKnowledge ? "Searching..." : "Search"}
            </button>
          </form>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeResults.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-md border border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {item.company} • {item.category}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100 mb-1.5 leading-snug">{item.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-3.5">{item.summary}</p>

                  <div className="space-y-1.5 mb-3.5">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                      Key Takeaways:
                    </div>
                    {item.key_takeaways.map((takeaway, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-zinc-300 flex items-start gap-1.5 leading-tight"
                      >
                        <span className="text-blue-400 font-bold">•</span>
                        <span>{takeaway}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-zinc-800/80">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-500 border border-zinc-800"
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
    </div>
  );
}

