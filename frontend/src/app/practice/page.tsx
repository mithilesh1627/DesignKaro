"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Code2,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Database,
  Radio,
  Cpu,
  Loader2,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuthStore } from "@/lib/authStore";

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
        const res = await fetch("http://127.0.0.1:8000/api/v1/problems", { headers });
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
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-sky-400 mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400 mb-1">
              <Zap className="h-4 w-4" />
              <span>PHASE 4: PRACTICE ENGINE</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">System Design Challenges</h1>
            <p className="text-sm text-slate-400 mt-1">
              LeetCode-style real-world architecture problems with progressive constraints, automated graph evaluation &amp; Socratic hints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-lg bg-surface-900 border border-slate-800 text-xs font-mono flex items-center gap-2">
              <span className="text-slate-400">Total Challenges:</span>
              <span className="text-sky-400 font-bold">{questions.length}</span>
            </div>
            <Link
              href="/design"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-colors shadow-lg shadow-sky-500/20"
            >
              <span>Blank Canvas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 rounded-xl bg-surface-900/70 border border-slate-800/80 mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search challenges by title, category, or concepts (e.g. Redis, Hashing, CDN)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Difficulty Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto">
              {["all", "beginner", "intermediate", "advanced", "hard"].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3 py-1 rounded text-xs font-mono capitalize transition-colors shrink-0 ${
                    selectedDifficulty === diff
                      ? "bg-sky-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Category Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
              <span className="text-[11px] font-mono text-slate-500 shrink-0 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Category:
              </span>
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono transition-colors shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-slate-200 text-slate-950 font-bold"
                    : "bg-slate-800/60 text-slate-400 hover:text-white"
                }`}
              >
                All Domains
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? "bg-sky-500 text-slate-950 font-bold"
                      : "bg-slate-800/60 text-slate-400 hover:text-white"
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
            <Loader2 className="h-8 w-8 text-sky-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-mono text-slate-400">Loading system design challenges...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-20 text-center rounded-xl border border-dashed border-slate-800 bg-surface-900/30">
            <Code2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-300 font-semibold">No challenges match your filters</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting the category, difficulty, or search term.</p>
          </div>
        ) : (
          /* Problems List */
          <div className="space-y-3">
            {filteredQuestions.map((q, idx) => {
              const diffStyle = DIFFICULTY_STYLES[q.difficulty.toLowerCase()] || DIFFICULTY_STYLES.beginner;
              return (
                <Link
                  key={q.id}
                  href={`/practice/${q.slug}`}
                  className="group block p-5 rounded-xl border border-slate-800/80 bg-surface-900/60 hover:bg-surface-900 hover:border-sky-500/40 transition-all shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${diffStyle.bg} ${diffStyle.text} ${diffStyle.border}`}
                        >
                          {q.difficulty}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-800/40">
                          {q.category}
                        </span>
                        {q.is_completed && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Solved</span>
                          </span>
                        )}
                      </div>

                      <h2 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors">
                        {q.title}
                      </h2>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {q.description}
                      </p>

                      {/* Scale tags */}
                      {q.expected_scale && Object.keys(q.expected_scale).length > 0 && (
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-slate-500">
                          {Object.entries(q.expected_scale).slice(0, 3).map(([key, val]) => (
                            <span key={key} className="flex items-center gap-1">
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400 capitalize">{key.replace(/_/g, " ")}:</span>
                              <span className="text-sky-300 font-semibold">{String(val)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 lg:self-center shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-mono text-slate-400">
                          {q.attempts_count > 0 ? `${q.attempts_count} attempts` : "Not attempted"}
                        </div>
                        {q.best_score !== null && (
                          <div className="text-[11px] font-mono text-emerald-400">
                            Best Score: {q.best_score}%
                          </div>
                        )}
                      </div>

                      <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 group-hover:bg-sky-500 group-hover:text-slate-950 font-mono text-xs font-bold flex items-center gap-1 transition-all">
                        <span>Solve</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
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
