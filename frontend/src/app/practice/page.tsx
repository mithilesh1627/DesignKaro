"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Layers,
  Database,
  Shield,
  Activity,
  Server,
  Zap,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { API_BASE } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

interface QuestionSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  expected_scale: Record<string, any>;
  is_completed: boolean;
  best_score: number | null;
  attempts_count: number;
}

interface ProblemsResponse {
  questions: QuestionSummary[];
  total: number;
  categories: string[];
  difficulties: string[];
}

const DIFFICULTY_MAP: Record<string, { label: string; text: string; bg: string; border: string }> = {
  beginner: {
    label: "Beginner",
    text: "text-emerald-400",
    bg: "bg-emerald-950/40",
    border: "border-emerald-800/60",
  },
  intermediate: {
    label: "Intermediate",
    text: "text-sky-400",
    bg: "bg-sky-950/40",
    border: "border-sky-800/60",
  },
  hard: {
    label: "Hard",
    text: "text-amber-400",
    bg: "bg-amber-950/40",
    border: "border-amber-800/60",
  },
  advanced: {
    label: "Advanced",
    text: "text-purple-400",
    bg: "bg-purple-950/40",
    border: "border-purple-800/60",
  },
};

export default function PracticePage() {
  const [problems, setProblems] = useState<QuestionSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const headers: Record<string, string> = {};
        if (isAuthenticated && accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }
        const res = await fetch(`${API_BASE}/api/v1/problems`, { headers });
        if (res.ok) {
          const data: ProblemsResponse = await res.json();
          setProblems(data.questions || []);
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error("Failed to load practice problems:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblems();
  }, [isAuthenticated, accessToken]);

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      if (selectedDifficulty !== "all" && p.difficulty.toLowerCase() !== selectedDifficulty.toLowerCase()) {
        return false;
      }
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [problems, selectedDifficulty, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Navigation />

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 focus:outline-none">
        {/* Header section: Direct, calm, engineering voice */}
        <div className="border-b border-zinc-800/80 pb-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50 font-sans">
                Practice
              </h1>
              <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl">
                Strengthen your system design skills with focused architecture problems. Design schemas, compute capacity bounds, and verify failure resilience.
              </p>
            </div>
            <div className="text-xs text-zinc-500 font-mono">
              {problems.length} problems available
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <label htmlFor="practice-search-input" className="sr-only">
              Search problems by name, keywords, or system type
            </label>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" aria-hidden="true" />
            <input
              id="practice-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search problems by name, keywords, or system type..."
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/90 pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition"
            />
          </div>

          {/* Difficulty and Category Selectors */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Difficulty Tabs */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-xs">
              {["all", "beginner", "intermediate", "hard", "advanced"].map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`min-h-[38px] px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors inline-flex items-center justify-center ${
                    selectedDifficulty === d
                      ? "bg-zinc-800 text-zinc-100 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Category Dropdown */}
            {categories.length > 0 && (
              <div>
                <label htmlFor="practice-category-select" className="sr-only">
                  Filter by category
                </label>
                <select
                  id="practice-category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="min-h-[38px] rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Problems List */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-zinc-500">Loading practice problems...</p>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <p className="text-sm font-medium text-zinc-300 mb-1">No problems match your criteria</p>
            <p className="text-xs text-zinc-500 mb-4">Try clearing filters or search terms.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedDifficulty("all");
                setSelectedCategory("all");
              }}
              className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProblems.map((problem) => {
              const diffConfig = DIFFICULTY_MAP[problem.difficulty.toLowerCase()] || DIFFICULTY_MAP.intermediate;
              const scaleEntries = Object.entries(problem.expected_scale || {}).slice(0, 3);

              return (
                <div
                  key={problem.id}
                  className="rounded-lg border border-zinc-800/90 bg-zinc-900/70 hover:bg-zinc-900 hover:border-zinc-700 p-5 flex flex-col justify-between transition-all duration-150 group"
                >
                  <div>
                    {/* Top Row: Category and Difficulty */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {problem.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {problem.is_completed && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Solved</span>
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded border ${diffConfig.text} ${diffConfig.bg} ${diffConfig.border}`}
                        >
                          {diffConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">
                      {problem.title}
                    </h2>

                    {/* Description */}
                    <p className="mt-2 text-xs text-zinc-400 leading-relaxed line-clamp-3">
                      {problem.description}
                    </p>

                    {/* Scale Invariants / Key Bounds */}
                    {scaleEntries.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-zinc-800/60 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-zinc-400">
                        {scaleEntries.map(([k, v]) => (
                          <div key={k} className="flex items-center gap-1">
                            <span className="text-zinc-500 capitalize">{k.replace(/_/g, " ")}:</span>
                            <span className="text-zinc-300 font-medium">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Attempts & CTA */}
                  <div className="mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <div className="text-[11px] text-zinc-500">
                      {problem.attempts_count > 0 ? (
                        <span>
                          {problem.attempts_count} attempt{problem.attempts_count === 1 ? "" : "s"}
                          {problem.best_score != null ? ` • Best: ${problem.best_score}%` : ""}
                        </span>
                      ) : (
                        <span>Not attempted</span>
                      )}
                    </div>

                    <Link
                      href={`/simulator?problem=${encodeURIComponent(problem.slug)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium border border-zinc-700 transition group-hover:border-zinc-600"
                    >
                      <span>Open in Simulator</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
