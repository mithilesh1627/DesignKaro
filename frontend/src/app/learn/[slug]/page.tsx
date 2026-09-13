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
  Calculator,
  Terminal,
  AlertTriangle,
  Loader2,
  Check,
  X,
  HelpCircle,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuthStore } from "@/lib/authStore";
import { API_BASE } from "@/lib/api";

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

interface MiniExercise {
  question: string;
  placeholder: string;
  validate: (input: string) => { isCorrect: boolean; message: string };
  hint: string;
}

const LESSON_EXERCISES: Record<string, MiniExercise> = {
  "latency-vs-throughput": {
    question:
      "An API receives 5,000 QPS with an average latency of 40ms (0.040s). Using Little's Law (L = λ × W), how many concurrent active connections must your server pool sustain?",
    placeholder: "e.g. 200",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "200") {
        return {
          isCorrect: true,
          message: "Correct! L = 5,000 QPS × 0.040s = 200 concurrent active in-flight requests.",
        };
      }
      return {
        isCorrect: false,
        message: "Try again! Little's Law: Concurrency (L) = 5,000 QPS × 0.040s = ?",
      };
    },
    hint: "Little's Law: L = λ × W. Convert 40ms to 0.040 seconds, then multiply by 5,000.",
  },
  "cap-theorem-in-practice": {
    question:
      "During a transatlantic fiber cut partition, two users simultaneously attempt to reserve seat #14B in a concert. To prevent double-booking, should the system enforce CP or AP?",
    placeholder: "e.g. CP",
    validate: (val: string) => {
      const v = val.toLowerCase().trim();
      if (v === "cp" || v.includes("consistency") || v === "cp system" || v === "cp architecture") {
        return {
          isCorrect: true,
          message: "Correct! Preventing duplicate seat bookings requires linearizable consistency (CP), rejecting conflicting writes during a network split.",
        };
      }
      return {
        isCorrect: false,
        message: "Incorrect. An AP system would allow diverged writes, selling the same seat to two different users. Consistency (CP) is strictly required.",
      };
    },
    hint: "If financial correctness and non-duplication are non-negotiable, choose Consistency over Availability during a network partition.",
  },
  "distributed-cache-redis": {
    question:
      "Your platform stores 10,000,000 user profiles in Redis. Each profile payload averages 2 Kilobytes. What is the total raw memory footprint required in Gigabytes?",
    placeholder: "e.g. 20",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "20") {
        return {
          isCorrect: true,
          message: "Correct! 10,000,000 × 2 KB = 20,000,000 KB = 20 Gigabytes of RAM.",
        };
      }
      return {
        isCorrect: false,
        message: "Incorrect. 10,000,000 × 2 KB = 20,000,000 KB. Convert Kilobytes to Gigabytes (divide by 1,000,000).",
      };
    },
    hint: "10,000,000 profiles × 2 KB = 20,000,000 KB = 20 GB.",
  },
  "consistent-hashing-sharding": {
    question:
      "You currently have 4 database shards using consistent hashing. A new 5th shard is added. What percentage of total keys will be migrated to the new shard?",
    placeholder: "e.g. 20%",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "20" || v === "0.2") {
        return {
          isCorrect: true,
          message: "Correct! With consistent hashing, only 1/(N+1) = 1/5 = 20% of keys are migrated. With simple modulo hashing, ~80% would move!",
        };
      }
      return {
        isCorrect: false,
        message: "Incorrect. Consistent hashing migrates 1/(N+1) fraction of keys when adding the (N+1)-th shard. 1 / 5 = ?",
      };
    },
    hint: "Formula: 1 / (N + 1) where N is current shards (4) and cluster becomes 5 shards.",
  },
  "kafka-event-streaming": {
    question:
      "A Kafka topic is configured with 8 partitions. A consumer group has 12 consumer instances running. How many consumers will be actively processing messages concurrently?",
    placeholder: "e.g. 8",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "8") {
        return {
          isCorrect: true,
          message: "Correct! Kafka assigns at most one consumer per partition within a single consumer group. 8 will be active and 4 will stay idle on hot standby.",
        };
      }
      return {
        isCorrect: false,
        message: "Incorrect. In Kafka, maximum concurrency in a consumer group is strictly bounded by the partition count.",
      };
    },
    hint: "One partition can be assigned to only one consumer per consumer group at a time.",
  },
  "low-latency-ml-inference": {
    question:
      "To reduce feature store lookup latency from 45ms to <2ms for real-time model inference, what tier of datastore must front the feature store?",
    placeholder: "e.g. Redis",
    validate: (val: string) => {
      const v = val.toLowerCase().trim();
      if (v.includes("redis") || v.includes("in-memory") || v.includes("cache") || v.includes("dragonfly")) {
        return {
          isCorrect: true,
          message: "Correct! An in-memory key-value cache (such as Redis or Dragonfly) delivers sub-2ms point lookups required for real-time inference.",
        };
      }
      return {
        isCorrect: false,
        message: "Incorrect. Disk-based databases incur multi-millisecond random I/O. Which in-memory caching datastore achieves <2ms lookups?",
      };
    },
    hint: "Consider in-memory key-value data stores like Redis.",
  },
};

// Formats inline text with bold, inline code, and math symbols
function renderInline(text: string): React.ReactNode {
  // Clean math markers: replace $$...$$ or $...$ with clean math formatting
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-slate-800/80 font-mono text-xs text-sky-300 border border-slate-700/50"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("$") && token.endsWith("$")) {
      const formula = token.slice(1, -1).replace(/\\times/g, "×").replace(/\\approx/g, "≈").replace(/\\lambda/g, "λ").replace(/\\text\{([^}]+)\}/g, "$1");
      parts.push(
        <span
          key={match.index}
          className="font-mono text-amber-300 font-semibold px-1 py-0.5 bg-amber-500/10 rounded border border-amber-500/20 text-xs inline-block mx-0.5"
        >
          {formula}
        </span>
      );
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }
  return parts.length > 0 ? parts : text;
}

// Renders markdown tables cleanly
function MarkdownTable({ lines }: { lines: string[] }) {
  const headerLine = lines[0];
  const dataLines = lines.slice(2); // skip header separator

  const parseCells = (row: string) =>
    row
      .split("|")
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  const headers = parseCells(headerLine);

  return (
    <div className="overflow-x-auto my-4 rounded-lg border border-slate-800 bg-slate-950/60 shadow-md">
      <table className="min-w-full text-xs text-left divide-y divide-slate-800">
        <thead className="bg-slate-900/90 text-sky-400 font-mono font-semibold">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3.5 py-2.5">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {dataLines.map((row, rowIdx) => {
            const cells = parseCells(row);
            return (
              <tr key={rowIdx} className="hover:bg-slate-900/40 transition-colors">
                {cells.map((c, cellIdx) => (
                  <td key={cellIdx} className="px-3.5 py-2 text-slate-300 leading-relaxed">
                    {renderInline(c)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Structured section component
function LessonSectionRenderer({ sectionText }: { sectionText: string }) {
  const lines = sectionText.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let inTable = false;
  let tableLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${i}`} className="my-4 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 shadow-inner overflow-x-auto">
            <pre className="leading-relaxed whitespace-pre font-mono">{codeBlockLines.join("\n")}</pre>
          </div>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Handle Markdown tables
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      if (!inTable) {
        inTable = true;
        tableLines = [line];
      } else {
        tableLines.push(line);
      }
      continue;
    } else if (inTable) {
      elements.push(<MarkdownTable key={`tbl-${i}`} lines={tableLines} />);
      inTable = false;
      tableLines = [];
    }

    // Math block lines ($$...$$)
    if (line.trim().startsWith("$$") && line.trim().endsWith("$$")) {
      const rawFormula = line.trim().slice(2, -2).trim();
      const formula = rawFormula
        .replace(/\\times/g, " × ")
        .replace(/\\approx/g, " ≈ ")
        .replace(/\\lambda/g, "λ")
        .replace(/\\text\{([^}]+)\}/g, " $1 ");
      elements.push(
        <div
          key={`math-${i}`}
          className="my-3 py-3 px-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center font-mono text-amber-300 text-sm font-bold tracking-wide"
        >
          {formula}
        </div>
      );
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-2 mb-4">
          {renderInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-base sm:text-lg font-bold text-sky-400 tracking-tight mt-6 mb-3 border-b border-slate-800 pb-2 flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />
          <span>{renderInline(line.slice(3))}</span>
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold text-slate-100 tracking-tight mt-4 mb-2">
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2.5 my-1 text-xs text-slate-300 leading-relaxed pl-2">
          <span className="text-sky-400 font-bold shrink-0 mt-0.5">•</span>
          <span>{renderInline(line.trim().slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-2.5 my-1.5 text-xs text-slate-300 leading-relaxed pl-2">
            <span className="text-sky-400 font-mono font-bold shrink-0 mt-0.5">{match[1]}.</span>
            <span>{renderInline(match[2])}</span>
          </div>
        );
      }
    } else if (line.trim().length > 0) {
      elements.push(
        <p key={`p-${i}`} className="text-xs text-slate-300 leading-relaxed my-2">
          {renderInline(line)}
        </p>
      );
    }
  }

  if (inTable && tableLines.length > 0) {
    elements.push(<MarkdownTable key="tbl-end" lines={tableLines} />);
  }

  return <div className="space-y-1">{elements}</div>;
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
  const [exerciseFeedback, setExerciseFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [showHint, setShowHint] = useState(false);

  const { accessToken, isAuthenticated } = useAuthStore();

  const currentExercise: MiniExercise = LESSON_EXERCISES[slug] || {
    question:
      "A service processes 5,000 QPS with an average response time of 40ms. How many concurrent connections must be supported in-flight?",
    placeholder: "e.g. 200",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "200") {
        return { isCorrect: true, message: "Correct! 5,000 QPS × 0.040s = 200 concurrent active connections." };
      }
      return { isCorrect: false, message: "Try again! Throughput (5,000) × Latency (0.040) = ?" };
    },
    hint: "Multiply throughput (in QPS) by response time (in seconds).",
  };

  useEffect(() => {
    if (!slug) return;

    const fetchLesson = async () => {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }
        const res = await fetch(`${API_BASE}/api/v1/lessons/${slug}`, { headers });
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
  }, [slug, accessToken]);

  const handleMarkComplete = async () => {
    if (!lesson) return;
    setIsCompleting(true);

    try {
      if (isAuthenticated && accessToken) {
        const res = await fetch(`${API_BASE}/api/v1/lessons/${lesson.id}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ notes: "Completed lesson" }),
        });
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
        setCompletionToast("Lesson marked as completed! (Sign in to save permanent progress across devices)");
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
    if (!exerciseInput.trim()) return;
    const result = currentExercise.validate(exerciseInput);
    setExerciseFeedback(result);
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
                Dimension {lesson.order_index} of 10 • Production Standard
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
        <article className="space-y-6">
          {lesson.content_markdown.split("---").map((section, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800/80 bg-surface-900/40 p-6 shadow-sm"
            >
              <LessonSectionRenderer sectionText={section.trim()} />
            </div>
          ))}
        </article>

        {/* Interactive Mini Exercise Widget */}
        <div className="mt-8 rounded-xl border border-sky-500/30 bg-sky-950/20 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-mono font-bold uppercase">
              <Calculator className="h-4 w-4" />
              <span>Interactive Mini-Exercise: First-Principles Verification</span>
            </div>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="text-[11px] font-mono text-slate-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>{showHint ? "Hide Hint" : "Need a Hint?"}</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 mb-4 leading-relaxed font-mono">
            {currentExercise.question}
          </p>

          {showHint && (
            <div className="mb-4 p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-sky-300">
              💡 {currentExercise.hint}
            </div>
          )}

          <form onSubmit={handleCheckExercise} className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="text"
              value={exerciseInput}
              onChange={(e) => setExerciseInput(e.target.value)}
              placeholder={currentExercise.placeholder}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none flex-1"
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
              className={`mt-3 p-3 rounded-lg text-xs font-mono flex items-start gap-2 ${
                exerciseFeedback.isCorrect
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
              }`}
            >
              {exerciseFeedback.isCorrect ? (
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <X className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <span>{exerciseFeedback.message}</span>
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
