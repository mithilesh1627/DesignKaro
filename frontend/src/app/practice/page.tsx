"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Code2,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  Zap,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuthStore } from "@/lib/authStore";
import { API_BASE } from "@/lib/api";

interface QuestionSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "hard";
  category: string;
  description: string;
  expected_scale: Record<string, any>;
  is_completed: boolean;
  best_score: number | null;
  attempts_count: number;
}

const DIFFICULTY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  intermediate: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
  advanced: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  hard: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
};

export default function PracticeCatalogPage() {
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { accessToken } = useAuthStore();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }
        const res = await fetch(`${API_BASE}/api/v1/problems`, { headers });
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions || []);
          setCategories(data.categories || []);
          setDifficulties(data.difficulties || []);
        }
      } catch (err) {
        console.error("Failed to load practice problems:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [accessToken]);

  const filteredQuestions = questions.filter((q) => {
    const matchDiff = selectedDifficulty === "all" || q.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();
    const matchCat = selectedCategory === "all" || q.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDiff && matchCat && matchSearch;
  });

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>

        {/* Page Hero Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs font-mono text-cyan-400">
              <Zap className="h-3.5 w-3.5" />
              <span>Practice Arena</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
              System Design Challenges
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Real-world distributed systems challenges. Estimate capacity, build architectures on canvas, test resiliency, and receive instant rubric evaluation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono flex items-center gap-2.5">
              <span className="text-slate-400">Total Challenges:</span>
              <span className="text-cyan-400 font-bold text-sm">{questions.length}</span>
            </div>
            <Link
              href="/design"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <span>Blank Canvas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="p-5 rounded-2xl bg-[#080d1a]/80 border border-white/[0.08] mb-8 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search challenges by title, category, or concepts (e.g. TinyURL, Redis, Kafka)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/[0.08] text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Difficulty Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-white/[0.08] overflow-x-auto shrink-0">
              {["all", "beginner", "intermediate", "advanced", "hard"].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all shrink-0 ${
                    selectedDifficulty === diff
                      ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
              <span className="text-[11px] font-mono text-slate-500 shrink-0 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Category:
              </span>
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-white/[0.12] text-cyan-300 font-bold border border-cyan-500/30"
                    : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.04]"
                }`}
              >
                All Domains
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all shrink-0 ${
                    selectedCategory === cat
                      ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                      : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.04]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-24 text-center">
            <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-mono text-slate-400">Loading system design challenges...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
            <Code2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-300 font-semibold">No challenges match your filters</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting the category, difficulty, or search term.</p>
          </div>
        ) : (
          /* Problems Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuestions.map((q, idx) => {
              const diffStyle = DIFFICULTY_STYLES[q.difficulty.toLowerCase()] || DIFFICULTY_STYLES.beginner;
              return (
                <Link
                  key={q.id}
                  href={`/practice/${q.slug}`}
                  className="group relative p-6 rounded-2xl border border-white/[0.07] bg-[#080d1a]/70 hover:bg-[#0c1426] hover:border-cyan-500/40 transition-all shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-white/[0.08]">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${diffStyle.bg} ${diffStyle.text} ${diffStyle.border}`}
                        >
                          {q.difficulty}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-white/[0.04]">
                          {q.category}
                        </span>
                      </div>
                      {q.is_completed && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Solved</span>
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors font-display">
                      {q.title}
                    </h2>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-light">
                      {q.description}
                    </p>

                    {/* Scale metadata tags */}
                    {q.expected_scale && Object.keys(q.expected_scale).length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {Object.entries(q.expected_scale).slice(0, 3).map(([key, val]) => (
                          <span
                            key={key}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-slate-400"
                          >
                            <span className="text-slate-500 capitalize">{key.replace(/_/g, " ")}: </span>
                            <span className="text-cyan-300 font-semibold">{String(val)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                    <div className="text-xs font-mono text-slate-500">
                      {q.best_score !== null ? (
                        <span className="text-emerald-400">Score: {q.best_score}%</span>
                      ) : (
                        <span>Not attempted yet</span>
                      )}
                    </div>

                    <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                      <span>Start Challenge</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
