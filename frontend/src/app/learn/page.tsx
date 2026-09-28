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
  Lock,
  Unlock,
  Radio,
  Globe,
  Brain,
  Search,
  Award,
  TrendingUp,
  PlayCircle,
  RotateCcw,
  Check,
  Target,
  BarChart2,
  LogIn,
  SlidersHorizontal,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";
import { API_BASE } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import {
  LearningOverviewResponse,
  TopicSummary,
} from "@/types/learning";

const TRACK_FILTERS = [
  { id: "all", label: "All Curricula" },
  { id: "beginner", label: "Foundations" },
  { id: "networking", label: "Networking" },
  { id: "scalability", label: "Scalability" },
  { id: "distributed-caching", label: "Distributed Caching" },
  { id: "database-sharding", label: "Databases & Sharding" },
  { id: "event-streaming", label: "Messaging & Streaming" },
  { id: "distributed-consensus", label: "Consensus" },
  { id: "reliability-fault-tolerance", label: "Reliability & Resiliency" },
  { id: "observability-telemetry", label: "Observability" },
  { id: "security-zero-trust", label: "Security & Zero Trust" },
  { id: "ml-serving", label: "ML Systems" },
];

const DIFFICULTY_FILTERS = ["All", "Beginner", "Intermediate", "Advanced"];

const SORT_OPTIONS = [
  { id: "recommended", label: "Recommended Order" },
  { id: "difficulty_asc", label: "Difficulty (Low to High)" },
  { id: "difficulty_desc", label: "Difficulty (High to Low)" },
  { id: "mastery", label: "Mastery Progress" },
];

export default function LearnIndexPage() {
  const [overview, setOverview] = useState<LearningOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [selectedSort, setSelectedSort] = useState<string>("recommended");
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isUserLoggedIn = mounted && isAuthenticated && !!user && !!accessToken;

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
  const renderIcon = (iconName?: string | null, className = "h-4 w-4") => {
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
  }, [overview, selectedTrack, selectedDifficulty, searchQuery, selectedSort]);

  const currentLearning = overview?.current_learning;
  const recommendation = overview?.recommendation;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Navigation />

      {/* Guest Mode Banner: Non-intrusive alert informing visitor of guest status */}
      {!isUserLoggedIn && mounted && (
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 text-xs text-zinc-300">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>
                Exploring curriculum as guest. All lesson guides and calculators are accessible.
              </span>
            </p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in to save permanent progress &amp; telemetry</span>
            </button>
          </div>
        </div>
      )}

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10 focus:outline-none">
        {/* ==================================================================== */}
        {/* 1. HEADER & OVERVIEW PANEL */}
        {/* ==================================================================== */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Column: Heading & Description */}
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">
                <span>System Design Curriculum</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50 font-sans">
                Curriculum &amp; Architectural Patterns
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                Master distributed systems from first principles. Study real-world trade-offs, sizing formulas, failure scenarios, and production topologies from Tier-1 engineering systems.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={`/learn/${currentLearning?.lesson_slug || "latency-vs-throughput"}`}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-medium text-white transition shadow-sm"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  <span>
                    {currentLearning?.has_progress
                      ? `Resume: ${currentLearning.lesson_title}`
                      : "Start First Lesson: Latency vs. Throughput"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <Link
                  href="/practice"
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-850 hover:bg-zinc-800 px-3.5 py-2 text-xs text-zinc-300 hover:text-white transition"
                >
                  <span>View Practice Problems</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Status Card */}
            <div className="lg:col-span-4 bg-zinc-950 border border-zinc-800 rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-blue-400" />
                  <span>Seniority Track</span>
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                  {overview?.current_level || (isUserLoggedIn ? "Systems Engineer" : "Guest Explorer")}
                </span>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1 text-zinc-400">
                  <span>Curriculum Progress</span>
                  <span className="font-semibold font-mono text-zinc-200">{overview?.overall_mastery || 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(overview?.overall_mastery || 0, isUserLoggedIn ? 4 : 0)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px] uppercase">Mastered</span>
                  <span className="text-sm font-semibold font-mono text-zinc-200">
                    {overview?.concepts_mastered || 0}
                    <span className="text-zinc-500 text-xs font-normal"> / {overview?.total_concepts || 12}</span>
                  </span>
                </div>
                <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px] uppercase">Domain Focus</span>
                  <span className="text-xs font-medium text-zinc-300 truncate block mt-0.5">
                    {overview?.weakest_domain?.name || "Foundations"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. RECOMMENDED NEXT TOPIC & ACTIVE CARD */}
        {/* ==================================================================== */}
        {recommendation && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-blue-400 uppercase tracking-wide">
                  Recommended Next
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {recommendation.estimated_minutes} mins
                </span>
              </div>
              <h2 className="text-base font-semibold text-zinc-100">
                {recommendation.lesson_title}
              </h2>
              <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                {recommendation.reason ||
                  "Master foundational capacity estimation to understand downstream caching and partitioning patterns."}
              </p>
            </div>

            <Link
              href={`/learn/${recommendation.lesson_slug}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium border border-zinc-700 transition shrink-0 self-start sm:self-auto"
            >
              <span>Start Lesson</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </Link>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 3. CURRICULUM EXPLORER & TOPIC CARDS */}
        {/* ==================================================================== */}
        <div className="space-y-5">
          <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
                Curriculum Topics
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Browse detailed architectural curricula, inspect prerequisite chains, and deep-dive into each domain.
              </p>
            </div>

            {/* Live Search Input */}
            <div className="relative w-full md:w-72">
              <label htmlFor="learn-search-input" className="sr-only">
                Search topics or patterns
              </label>
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <input
                id="learn-search-input"
                type="text"
                placeholder="Search topics or patterns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
              />
            </div>
          </div>

          {/* Filter Bar: Track Tabs, Difficulty, Sort */}
          <div className="space-y-2.5">
            {/* Track filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {TRACK_FILTERS.map((track) => (
                <button
                  key={track.id}
                  onClick={() => setSelectedTrack(track.id)}
                  className={`min-h-[40px] px-3.5 py-2 rounded-md text-xs font-medium transition shrink-0 inline-flex items-center justify-center ${
                    selectedTrack === track.id
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                      : "border border-zinc-850 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
                  }`}
                >
                  {track.label}
                </button>
              ))}
            </div>

            {/* Secondary Controls: Difficulty & Sorting */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Difficulty:</span>
                {DIFFICULTY_FILTERS.map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-md text-xs transition inline-flex items-center justify-center ${
                      selectedDifficulty === diff
                        ? "bg-zinc-800 text-zinc-100 font-medium"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="learn-sort-select" className="text-zinc-500">
                  Sort:
                </label>
                <select
                  id="learn-sort-select"
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  aria-label="Sort topics by"
                  className="min-h-[38px] bg-zinc-900 border border-zinc-800 text-zinc-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-600"
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
            <div className="py-20 text-center text-zinc-500 text-xs">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
              Loading curriculum tracks...
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="py-14 text-center rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-2">
              <p className="text-sm font-medium text-zinc-300">No curricula match your current filters.</p>
              <p className="text-xs text-zinc-500">
                Try clearing search terms or selecting &quot;All Curricula&quot;.
              </p>
              <button
                onClick={() => {
                  setSelectedTrack("all");
                  setSelectedDifficulty("All");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTopics.map((topic) => {
                const isComplete = topic.lesson_count > 0 && topic.completed_count === topic.lesson_count;
                const hasStarted = topic.completed_count > 0 && !isComplete;

                return (
                  <div
                    key={topic.id}
                    className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-md bg-zinc-800 text-zinc-300 group-hover:text-blue-400 transition-colors">
                          {renderIcon(topic.icon)}
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">
                          {topic.difficulty}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-zinc-100 mb-1.5 group-hover:text-blue-400 transition-colors">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-4 line-clamp-2">
                        {topic.description}
                      </p>

                      {/* Prerequisite indicators */}
                      {topic.prerequisites && topic.prerequisites.length > 0 && (
                        <div className="mb-4">
                          <span className="text-[10px] text-zinc-500 uppercase block mb-1">
                            Requires:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {topic.prerequisites.map((p) => (
                              <span
                                key={p.slug}
                                className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                  p.status === "completed"
                                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                                    : "bg-zinc-950 text-zinc-400 border border-zinc-800"
                                }`}
                              >
                                {p.status === "completed" ? (
                                  <Check className="h-2.5 w-2.5" />
                                ) : (
                                  <Lock className="h-2.5 w-2.5 text-zinc-500" />
                                )}
                                <span>{p.title}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-zinc-800/70 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-zinc-500" />
                          <span>{topic.estimated_minutes} mins</span>
                        </span>
                        <span>{topic.lesson_count} Lessons</span>
                      </div>

                      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isComplete ? "bg-emerald-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${topic.mastery_percentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {topic.completed_count}/{topic.lesson_count} done
                        </span>
                        <Link
                          href={`/learn/${topic.first_lesson_slug || "latency-vs-throughput"}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <span>{isComplete ? "Review" : hasStarted ? "Continue" : "Start Track"}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
