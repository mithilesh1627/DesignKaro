"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowRight,
  Zap,
  Database,
  Layers,
  Cpu,
  Clock,
  CheckCircle2,
  Filter,
  Sparkles,
  Compass,
  Lock,
  Unlock,
  ShieldAlert,
  Activity,
  Radio,
  Globe,
  Brain,
  Search,
  Award,
  TrendingUp,
  AlertCircle,
  PlayCircle,
  RotateCcw,
  Check,
  ChevronRight,
  Target,
  BarChart2,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { API_BASE } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import {
  LearningOverviewResponse,
  LearningPath,
  LearningRecommendation,
  SkillDomain,
  TopicSummary,
} from "@/types/learning";

const TRACK_FILTERS = [
  { id: "all", label: "All Curricula" },
  { id: "foundations", label: "Foundations" },
  { id: "networking", label: "Networking" },
  { id: "scalability", label: "Scalability" },
  { id: "caching", label: "Distributed Caching" },
  { id: "databases", label: "Databases & Storage" },
  { id: "messaging", label: "Messaging & Streaming" },
  { id: "distributed", label: "Consensus" },
  { id: "reliability", label: "Reliability & Resiliency" },
  { id: "observability", label: "Observability" },
  { id: "security", label: "Security & Zero Trust" },
  { id: "ml", label: "ML Systems" },
];

const DIFFICULTY_FILTERS = ["All", "Beginner", "Intermediate", "Advanced"];

const SORT_OPTIONS = [
  { id: "recommended", label: "Recommended Order" },
  { id: "difficulty_asc", label: "Difficulty (Low to High)" },
  { id: "difficulty_desc", label: "Difficulty (High to Low)" },
  { id: "mastery", label: "Mastery Progress" },
];

const TEN_DIMENSIONS = [
  { num: "01", title: "Problem & Context", desc: "Sizing workloads, traffic patterns, and SLA constraints." },
  { num: "02", title: "Mental Model & Topology", desc: "Visual ASCII architecture flows and component placement." },
  { num: "03", title: "FAANG Production Cases", desc: "Empirical battle-tested architectures from Netflix, Uber, Google." },
  { num: "04", title: "When to Use", desc: "Workload sweet spots and qualifying business requirements." },
  { num: "05", title: "When NOT to Use", desc: "Counter-indications where alternative patterns are superior." },
  { num: "06", title: "Trade-off Matrix", desc: "Rigorous latency, consistency, operational cost comparisons." },
  { num: "07", title: "Failure Modes & Edge Cases", desc: "Stampedes, thundering herds, split-brain, and cascading outages." },
  { num: "08", title: "Scale & Evolution", desc: "Partitioning, sharding, replication rings, and autoscaling thresholds." },
  { num: "09", title: "Interactive Application", desc: "Immediate hands-on topology synthesis in the DesignKaro Canvas." },
  { num: "10", title: "Senior Interview Defense", desc: "Socratic counter-arguments to defend choices against Staff interviewers." },
];

export default function LearnIndexPage() {
  const [overview, setOverview] = useState<LearningOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [selectedSort, setSelectedSort] = useState<string>("recommended");
  const { accessToken } = useAuthStore();

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }
        const res = await fetch(`${API_BASE}/api/v1/learning/overview`, { headers });
        if (res.ok) {
          const data: LearningOverviewResponse = await res.json();
          setOverview(data);
        }
      } catch (err) {
        console.error("Failed to load learning overview:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, [accessToken]);

  // Icon mapping
  const renderIcon = (iconName?: string | null, className = "h-5 w-5") => {
    switch (iconName) {
      case "Zap":
        return <Zap className={className} />;
      case "Database":
        return <Database className={className} />;
      case "Layers":
        return <Layers className={className} />;
      case "Cpu":
        return <Cpu className={className} />;
      case "Globe":
        return <Globe className={className} />;
      case "Radio":
        return <Radio className={className} />;
      case "ShieldAlert":
        return <ShieldAlert className={className} />;
      case "Activity":
        return <Activity className={className} />;
      case "Lock":
        return <Lock className={className} />;
      case "Brain":
        return <Brain className={className} />;
      default:
        return <BookOpen className={className} />;
    }
  };

  // Filter and sort topics
  const filteredTopics = useMemo(() => {
    if (!overview?.topics) return [];

    return overview.topics
      .filter((t) => {
        // Track filter
        if (selectedTrack !== "all") {
          const trackMatch =
            t.slug === selectedTrack ||
            t.slug.includes(selectedTrack) ||
            t.track === selectedTrack;
          if (!trackMatch) return false;
        }

        // Difficulty filter
        if (selectedDifficulty !== "All") {
          if (t.difficulty.toLowerCase() !== selectedDifficulty.toLowerCase()) {
            return false;
          }
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = t.title.toLowerCase().includes(q);
          const matchesDesc = t.description.toLowerCase().includes(q);
          const matchesSlug = t.slug.toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc && !matchesSlug) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === "difficulty_asc") {
          const diffMap: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 };
          return (diffMap[a.difficulty] || 2) - (diffMap[b.difficulty] || 2);
        }
        if (selectedSort === "difficulty_desc") {
          const diffMap: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 };
          return (diffMap[b.difficulty] || 2) - (diffMap[a.difficulty] || 2);
        }
        if (selectedSort === "mastery") {
          return b.mastery_percentage - a.mastery_percentage;
        }
        return a.order_index - b.order_index;
      });
  }, [overview?.topics, selectedTrack, selectedDifficulty, searchQuery, selectedSort]);

  const currentLearning = overview?.current_learning;
  const recommendation = overview?.recommendation;

  return (
    <>
      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* ==================================================================== */}
        {/* 1. HERO SECTION & LIVE STATUS PANEL */}
        {/* ==================================================================== */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-950 to-surface-950 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          {/* Subtle architectural cyan glow accent */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Title & Mission */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-xs font-mono text-sky-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Socratic System Design Learning Engine</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Intelligent System Design <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-200">Learning Dashboard</span>
              </h1>
              <p className="text-sm text-slate-300 font-sans leading-relaxed max-w-2xl">
                Transform from architectural memorization into first-principles mastery. Learn how Senior Staff Engineers reason through trade-offs, catastrophic failure modes, and scale.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {currentLearning?.has_progress ? (
                  <Link
                    href={`/learn/${currentLearning.lesson_slug || "latency-vs-throughput"}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 px-5 py-2.5 text-xs font-bold text-slate-950 transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)]"
                  >
                    <PlayCircle className="h-4 w-4" />
                    <span>Resume Learning: {currentLearning.lesson_title}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <Link
                    href="/learn/latency-vs-throughput"
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 px-5 py-2.5 text-xs font-bold text-slate-950 transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)]"
                  >
                    <span>Start System Foundations</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}

                <Link
                  href="/design"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600 px-4 py-2.5 text-xs font-mono text-slate-300 transition-all"
                >
                  <Layers className="h-3.5 w-3.5 text-sky-400" />
                  <span>Open Architecture Canvas</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Live Status Panel */}
            <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-sky-400" />
                  <span>Architect Standing</span>
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {overview?.current_level || "Systems Apprentice"}
                </span>
              </div>

              {/* Overall Mastery Meter */}
              <div>
                <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                  <span className="text-slate-400">System Design Mastery</span>
                  <span className="font-bold text-sky-400">{overview?.overall_mastery || 0}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(overview?.overall_mastery || 0, 4)}%` }}
                  />
                </div>
              </div>

              {/* Fast Stats Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Mastered</span>
                  <span className="text-base font-bold text-white">
                    {overview?.concepts_mastered || 0}
                    <span className="text-slate-500 text-xs font-normal"> / {overview?.total_concepts || 11}</span>
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Domain Focus</span>
                  <span className="text-xs font-bold text-amber-300 truncate block mt-0.5">
                    {overview?.weakest_domain?.name || "Foundations"}
                  </span>
                </div>
              </div>

              {/* Status footer chips */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Domain: {overview?.strongest_domain ? overview.strongest_domain.name : "System Primitives"}</span>
                <span className="text-sky-400 hover:text-sky-300 transition-colors">
                  11 Domains Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. CONTINUE LEARNING & RECOMMENDED NEXT CARDS */}
        {/* ==================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card A: Continue Learning */}
          <div className="p-6 rounded-xl border border-sky-500/30 bg-slate-900/60 hover:border-sky-500/50 transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-400 uppercase">
                  <PlayCircle className="h-4 w-4" />
                  <span>Continue Learning</span>
                </div>
                {currentLearning?.has_progress && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Lesson {currentLearning.lesson_index} of {currentLearning.total_lessons}
                  </span>
                )}
              </div>

              {currentLearning?.has_progress ? (
                <>
                  <h2 className="text-lg font-bold text-white mb-1">
                    {currentLearning.topic_title}
                  </h2>
                  <p className="text-xs font-mono text-sky-300 mb-3">
                    Active: {currentLearning.lesson_title}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {currentLearning.topic_description || "Continue your active deep dive into system design principles."}
                  </p>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Curriculum Progress</span>
                      <span className="text-sky-400 font-bold">{currentLearning.progress_percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded-full transition-all"
                        style={{ width: `${Math.max(currentLearning.progress_percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-white mb-1">
                    System Design Foundations
                  </h2>
                  <p className="text-xs font-mono text-sky-300 mb-2">
                    Lesson 1: Latency vs. Throughput & Little&apos;s Law
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Every Senior Staff interview begins with capacity sizing. Learn how to calculate concurrency ($L = \lambda \times W$), prevent tail latency amplification, and size server pools from first principles.
                  </p>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>20 mins</span>
              </span>
              <Link
                href={`/learn/${currentLearning?.lesson_slug || "latency-vs-throughput"}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-sky-400 hover:text-sky-300 transition-colors"
              >
                <span>{currentLearning?.has_progress ? "Resume Lesson" : "Start Foundations"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Card B: Recommended Next */}
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase">
                  <Target className="h-4 w-4" />
                  <span>Recommended Next Step</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                  {recommendation?.priority.replace("_", " ") || "Next Up"}
                </span>
              </div>

              <h2 className="text-lg font-bold text-white mb-1">
                {recommendation?.topic_title || "System Design Foundations"}
              </h2>
              <p className="text-xs font-mono text-cyan-300 mb-3">
                {recommendation?.lesson_title || "Latency vs. Throughput: Sizing Systems"}
              </p>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 mb-4 text-xs">
                <span className="text-slate-400 font-bold block mb-1">Why learn this next?</span>
                <p className="text-slate-300 leading-relaxed">
                  {recommendation?.reason ||
                    "Mastering foundational capacity estimation unlocks downstream caching and partitioning patterns."}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>{recommendation?.estimated_minutes || 20} mins</span>
              </span>
              <Link
                href={`/learn/${recommendation?.lesson_slug || "latency-vs-throughput"}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>Jump In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 3. SYSTEM DESIGN SKILL DOMAINS (11 DOMAINS OVERVIEW) */}
        {/* ==================================================================== */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-sky-400" />
                <span>System Design Skill Domains</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Evaluated across 11 core competencies tested in L6/L7 architectural interviews.
              </p>
            </div>

            {/* Highlights callout */}
            <div className="flex items-center gap-3 text-xs font-mono">
              {overview?.strongest_domain && overview.strongest_domain.mastery_score > 0 && (
                <span className="px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  <span>Strongest: {overview.strongest_domain.name}</span>
                </span>
              )}
              {overview?.weakest_domain && (
                <span className="px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>Priority Focus: {overview.weakest_domain.name}</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {overview?.domains.map((dom) => (
              <div
                key={dom.slug}
                className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{dom.category}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                        dom.status === "mastered"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : dom.status === "learning"
                          ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                          : dom.status === "needs_focus"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {dom.status.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white truncate" title={dom.name}>
                    {dom.name}
                  </h3>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
                    <span>Mastery</span>
                    <span className="font-bold text-white">{dom.mastery_score}%</span>
                  </div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        dom.mastery_score >= 80
                          ? "bg-emerald-400"
                          : dom.mastery_score > 0
                          ? "bg-sky-400"
                          : "bg-slate-700"
                      }`}
                      style={{ width: `${Math.max(dom.mastery_score, 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 4. STRUCTURED LEARNING PATHS (DAG DEPENDENCY VISUALIZATION) */}
        {/* ==================================================================== */}
        <div className="space-y-4">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Compass className="h-5 w-5 text-sky-400" />
              <span>System Design Learning Paths &amp; Prerequisite DAG</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Curricula unlock sequentially based on prerequisite mastery. Follow the recommended progression to avoid knowledge gaps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {overview?.learning_paths.map((path) => (
              <div
                key={path.id}
                className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                  path.is_locked
                    ? "border-slate-800/60 bg-slate-950/40 opacity-75"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700 shadow-md"
                }`}
              >
                <div>
                  {/* Card Header: Difficulty & Lock Status */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase border ${
                        path.difficulty === "Beginner"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : path.difficulty === "Intermediate"
                          ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                          : path.difficulty === "Advanced"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {path.difficulty}
                    </span>

                    {path.is_locked ? (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400/90">
                        <Lock className="h-3 w-3" />
                        <span>Prerequisites Required</span>
                      </span>
                    ) : path.completion_percentage === 100 ? (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-sky-400">
                        <Unlock className="h-3 w-3" />
                        <span>Unlocked</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5">{path.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">
                    {path.description}
                  </p>

                  {/* Prerequisites indicator */}
                  {path.prerequisites.length > 0 && (
                    <div className="mb-4">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1.5">
                        Prerequisites:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {path.prerequisites.map((pSlug) => (
                          <span
                            key={pSlug}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400"
                          >
                            {pSlug}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Metrics & Action */}
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>{path.estimated_minutes} mins</span>
                    </span>
                    <span>{path.concept_count} Lessons</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 rounded-full transition-all"
                      style={{ width: `${path.completion_percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono text-slate-400">
                      {path.completion_percentage}% Done
                    </span>
                    {path.is_locked ? (
                      <span className="text-xs font-mono text-slate-600 cursor-not-allowed">
                        Locked
                      </span>
                    ) : (
                      <Link
                        href={`/learn/${path.first_lesson_slug}`}
                        className="inline-flex items-center gap-1 text-xs font-bold font-mono text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        <span>{path.completion_percentage === 100 ? "Review Path" : path.completion_percentage > 0 ? "Continue" : "Start Path"}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 5. CURRICULUM EXPLORER & TOPIC CARDS */}
        {/* ==================================================================== */}
        <div className="space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-sky-400" />
                <span>Curriculum Explorer</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Browse detailed curricula, inspect prerequisite chains, and deep-dive into each architecture topic.
              </p>
            </div>

            {/* Live Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search topics, patterns, or tech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          {/* Filter Bar: Track Tabs, Difficulty, Sort */}
          <div className="space-y-3">
            {/* Track filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="h-4 w-4 text-slate-500 shrink-0 mr-1" />
              {TRACK_FILTERS.map((track) => (
                <button
                  key={track.id}
                  onClick={() => setSelectedTrack(track.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all shrink-0 ${
                    selectedTrack === track.id
                      ? "bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                      : "border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  {track.label}
                </button>
              ))}
            </div>

            {/* Secondary Controls: Difficulty & Sorting */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Difficulty:</span>
                {DIFFICULTY_FILTERS.map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      selectedDifficulty === diff
                        ? "bg-slate-800 text-sky-300 border border-slate-700 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500">Sort:</span>
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  aria-label="Sort topics by"
                  className="bg-slate-900 border border-slate-800 text-slate-300 rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-sky-500"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Topics Grid */}
          {isLoading ? (
            <div className="py-20 text-center font-mono text-slate-500 text-xs">
              Loading system design curricula...
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-slate-800 bg-slate-900/30 space-y-2">
              <p className="text-sm font-bold text-slate-300">No curricula match your current filters.</p>
              <p className="text-xs text-slate-500 font-mono">
                Try resetting your search query or choosing &quot;All Curricula&quot;.
              </p>
              <button
                onClick={() => {
                  setSelectedTrack("all");
                  setSelectedDifficulty("All");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs font-mono text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTopics.map((topic) => {
                const isComplete = topic.lesson_count > 0 && topic.completed_count === topic.lesson_count;
                const hasStarted = topic.completed_count > 0 && !isComplete;

                return (
                  <div
                    key={topic.id}
                    className="p-6 rounded-xl border border-slate-800 bg-surface-900/60 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
                          {renderIcon(topic.icon)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                            {topic.difficulty}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-white mb-2 group-hover:text-sky-300 transition-colors">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        {topic.description}
                      </p>

                      {/* Prerequisite status pills */}
                      {topic.prerequisites && topic.prerequisites.length > 0 && (
                        <div className="mb-4">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                            Requires:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {topic.prerequisites.map((p) => (
                              <span
                                key={p.slug}
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                  p.status === "completed"
                                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                                    : "bg-slate-900 text-slate-400 border border-slate-800"
                                }`}
                              >
                                {p.status === "completed" ? (
                                  <Check className="h-2.5 w-2.5" />
                                ) : (
                                  <Lock className="h-2.5 w-2.5 text-slate-500" />
                                )}
                                <span>{p.title}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>{topic.estimated_minutes} mins</span>
                          <span>•</span>
                          <span>{topic.lesson_count} Lessons</span>
                        </div>
                        <span className="text-slate-400 font-bold">{topic.mastery_percentage}%</span>
                      </div>

                      {/* Mini progress bar */}
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-400 rounded-full transition-all"
                          style={{ width: `${topic.mastery_percentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-mono text-slate-500">
                          {topic.completed_count} / {topic.lesson_count} Done
                        </span>
                        <Link
                          href={`/learn/${topic.first_lesson_slug || topic.slug}`}
                          className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-mono text-xs font-bold transition-colors"
                        >
                          <span>
                            {isComplete ? "Review →" : hasStarted ? "Continue →" : "Start →"}
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* 6. THE 10-DIMENSION ARCHITECTURAL STANDARD (FIXED & COMPREHENSIVE) */}
        {/* ==================================================================== */}
        <div className="p-6 sm:p-8 rounded-2xl border border-sky-500/30 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900 backdrop-blur-md space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 text-sky-400 text-xs font-mono font-bold uppercase mb-1.5">
                <Compass className="h-4 w-4" />
                <span>Engineering Curriculum Standard</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                The 10-Dimension Architectural Lesson Standard
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono max-w-md">
              Every lesson on DesignKaro moves beyond textbook summaries into actionable production mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {TEN_DIMENSIONS.map((dim) => (
              <div
                key={dim.num}
                className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 flex flex-col justify-between space-y-2 hover:border-sky-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-sky-400">{dim.num}</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white mb-1">{dim.title}</h3>
                  <p className="text-[11px] text-slate-400 leading-snug">{dim.desc}</p>
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
