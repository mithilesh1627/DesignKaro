"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  HelpCircle,
  Calculator,
  Terminal,
  AlertTriangle,
  Award,
  Loader2,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuthStore } from "@/lib/authStore";

interface LessonData {
  id: string;
  slug: string;
  title: string;
  topic_id: string;
  topic_slug: string;
  topic_title: string;
  content_markdown: string;
  estimated_minutes: number;
  order_index: number;
  is_completed: boolean;
  next_lesson_slug?: string | null;
  prev_lesson_slug?: string | null;
}

export default function LessonReaderPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completionToast, setCompletionToast] = useState<string | null>(null);

  // Mini Exercise interactive state
  const [exerciseInput, setExerciseInput] = useState("");
  const [exerciseFeedback, setExerciseFeedback] = useState<string | null>(null);

  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!slug) return;

    const fetchLesson = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/v1/lessons/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setLesson(data);
          setCompleted(data.is_completed || false);
        }
      } catch {
        // Fallback content if API is temporarily unavailable
        setLesson({
          id: "demo-lesson-id",
          slug: slug,
          title: slug.replace(/-/g, " ").toUpperCase(),
          topic_id: "demo-topic-id",
          topic_slug: "fundamentals",
          topic_title: "System Design Fundamentals",
          content_markdown: `# ${slug.replace(/-/g, " ").toUpperCase()}\n\n## 1. Explanation\nDetailed lesson material covering architectural trade-offs and first-principles calculations.`,
          estimated_minutes: 20,
          order_index: 1,
          is_completed: false,
          next_lesson_slug: null,
          prev_lesson_slug: null,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLesson();
  }, [slug]);

  const handleMarkComplete = async () => {
    if (!lesson) return;
    setIsCompleting(true);

    try {
      if (isAuthenticated && accessToken) {
        const res = await fetch(
          `http://127.0.0.1:8000/api/v1/lessons/${lesson.id}/complete`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ notes: "Completed lesson" }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setCompleted(true);
          setCompletionToast(
            `Lesson Mastered! +${data.xp_earned} XP earned. Skill Mastery: ${data.updated_mastery_score}/100`
          );
        }
      } else {
        // Local completion for public/demo users
        setCompleted(true);
        setCompletionToast("Lesson marked as completed! (Sign in to save permanent progress)");
      }
    } catch {
      setCompleted(true);
      setCompletionToast("Lesson completed locally!");
    } finally {
      setIsCompleting(false);
      setTimeout(() => setCompletionToast(null), 6000);
    }
  };

  const handleCheckExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const val = exerciseInput.trim();
    if (val === "200" || val === "200 connections") {
      setExerciseFeedback("Correct! 5,000 QPS × 0.040s = 200 concurrent active connections.");
    } else {
      setExerciseFeedback("Try again! Remember Little's Law: L = Throughput (QPS) × Average Latency (seconds). 5000 × 0.040 = ?");
    }
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="flex-1 flex items-center justify-center py-32 text-slate-400 font-mono text-xs">
          <Loader2 className="h-6 w-6 animate-spin text-sky-400 mr-2" />
          <span>Loading Architectural Lesson...</span>
        </div>
        <Footer />
      </>
    );
  }

  if (!lesson) {
    return (
      <>
        <Navigation />
        <div className="flex-1 max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Lesson Not Found</h2>
          <Link href="/learn" className="text-xs font-mono text-sky-400 hover:underline">
            ← Return to Curriculum Catalog
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-sky-400 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Curriculum: {lesson.topic_title}</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>{lesson.estimated_minutes} min read</span>
          </div>
        </div>

        {/* Completion Toast Notification */}
        {completionToast && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="flex-1 font-semibold">{completionToast}</span>
          </div>
        )}

        {/* Lesson Header */}
        <div className="rounded-xl border border-slate-800 bg-surface-900/80 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider mb-2 inline-block">
                Dimension 1 of 10 • Production Standard
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {lesson.title}
              </h1>
            </div>

            <button
              onClick={handleMarkComplete}
              disabled={isCompleting || completed}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all shrink-0 ${
                completed
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                  : "bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md"
              }`}
            >
              {isCompleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>{completed ? "Completed" : "Mark as Completed (+50 XP)"}</span>
            </button>
          </div>
        </div>

        {/* Rich Lesson Body */}
        <article className="prose prose-invert max-w-none space-y-6 text-sm text-slate-300 leading-relaxed font-sans">
          {lesson.content_markdown.split("---").map((section, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800/80 bg-surface-900/40 p-6 shadow-sm"
            >
              <div className="space-y-4 whitespace-pre-wrap font-sans text-slate-200">
                {section.trim()}
              </div>
            </div>
          ))}
        </article>

        {/* Interactive Mini Exercise Widget */}
        <div className="mt-8 rounded-xl border border-sky-500/30 bg-sky-950/20 p-6">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-mono font-bold uppercase mb-2">
            <Calculator className="h-4 w-4" />
            <span>Interactive Mini-Exercise: Little&apos;s Law Capacity Check</span>
          </div>
          <p className="text-xs text-slate-300 mb-4 leading-relaxed font-mono">
            An API receives <strong>5,000 QPS</strong> with average latency of <strong>40ms (0.040s)</strong>. How many concurrent connections must your pool sustain?
          </p>

          <form onSubmit={handleCheckExercise} className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="text"
              value={exerciseInput}
              onChange={(e) => setExerciseInput(e.target.value)}
              placeholder="e.g. 200"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-bold text-slate-950 transition-colors shrink-0"
            >
              Verify Calculation
            </button>
          </form>

          {exerciseFeedback && (
            <div
              className={`mt-3 p-3 rounded-lg text-xs font-mono ${
                exerciseFeedback.startsWith("Correct")
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
              }`}
            >
              {exerciseFeedback}
            </div>
          )}
        </div>

        {/* Next / Previous Navigation Footer */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex items-center justify-between gap-4">
          {lesson.prev_lesson_slug ? (
            <Link
              href={`/learn/${lesson.prev_lesson_slug}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Previous Lesson</span>
            </Link>
          ) : (
            <div />
          )}

          {lesson.next_lesson_slug ? (
            <Link
              href={`/learn/${lesson.next_lesson_slug}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-bold text-slate-950 transition-colors shadow-md"
            >
              <span>Next Lesson</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link
              href="/practice"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 transition-colors shadow-md"
            >
              <span>Practice in Labs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
