"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

interface TopicItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  track: string;
  order_index: number;
  icon?: string;
  lesson_count: number;
  completed_count: number;
}

const TRACKS = [
  { id: "all", label: "All Curricula" },
  { id: "beginner", label: "Beginner (Fundamentals)" },
  { id: "intermediate", label: "Intermediate (Distributed)" },
  { id: "ml", label: "Advanced & ML Systems" },
];

export default function LearnIndexPage() {
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const url =
          selectedTrack === "all"
            ? "http://127.0.0.1:8000/api/v1/topics"
            : `http://127.0.0.1:8000/api/v1/topics?track=${selectedTrack}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setTopics(data);
        }
      } catch {
        // Fallback default topics if server not reachable
        setTopics([
          {
            id: "1",
            slug: "fundamentals",
            title: "System Design Fundamentals",
            description: "Core concepts of latency, throughput, Little's Law, and CAP theorem.",
            track: "beginner",
            order_index: 1,
            icon: "BookOpen",
            lesson_count: 2,
            completed_count: 0,
          },
          {
            id: "2",
            slug: "distributed-caching",
            title: "Distributed Caching & Redis",
            description: "In-memory caching architectures, cache-aside pattern, and stampede mitigation.",
            track: "intermediate",
            order_index: 2,
            icon: "Zap",
            lesson_count: 1,
            completed_count: 0,
          },
          {
            id: "3",
            slug: "database-sharding",
            title: "Database Sharding & Replication",
            description: "Horizontal partitioning schemes, consistent hashing rings, and read replicas.",
            track: "intermediate",
            order_index: 3,
            icon: "Database",
            lesson_count: 1,
            completed_count: 0,
          },
          {
            id: "4",
            slug: "event-streaming",
            title: "Event Streaming with Kafka",
            description: "Asynchronous commit logs, partition ordering, and consumer lag handling.",
            track: "intermediate",
            order_index: 4,
            icon: "Layers",
            lesson_count: 1,
            completed_count: 0,
          },
          {
            id: "5",
            slug: "ml-serving",
            title: "ML Inference & Feature Stores",
            description: "Low-latency two-tower candidate generation, embeddings, and vector search.",
            track: "ml",
            order_index: 5,
            icon: "Cpu",
            lesson_count: 1,
            completed_count: 0,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopics();
  }, [selectedTrack]);

  const getTopicIcon = (iconName?: string) => {
    switch (iconName) {
      case "Zap":
        return <Zap className="h-5 w-5" />;
      case "Database":
        return <Database className="h-5 w-5" />;
      case "Layers":
        return <Layers className="h-5 w-5" />;
      case "Cpu":
        return <Cpu className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  return (
    <>
      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-xs font-mono text-sky-400 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Socratic Learning Paths</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              System Design Learning Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1.5 max-w-2xl">
              Don&apos;t memorize architectures. Master the 10 core dimensions: explanations, diagrams, trade-offs, common mistakes, interview defenses, and failure recovery.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/learn/latency-vs-throughput"
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition-all shadow-md shrink-0"
            >
              <span>Start First Lesson</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Track Filter Tabs */}
        <div className="flex items-center gap-2 mt-8 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-slate-500 shrink-0 mr-1" />
          {TRACKS.map((track) => (
            <button
              key={track.id}
              onClick={() => setSelectedTrack(track.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all shrink-0 ${
                selectedTrack === track.id
                  ? "bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-[0_0_10px_rgba(14,165,233,0.2)]"
                  : "border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
            >
              {track.label}
            </button>
          ))}
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="p-6 rounded-xl border border-slate-800 bg-surface-900/60 hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
                    {getTopicIcon(topic.icon)}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                    {topic.track}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-2 group-hover:text-sky-300 transition-colors">
                  {topic.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {topic.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>{topic.lesson_count * 20} mins</span>
                  <span>•</span>
                  <span>{topic.lesson_count} Lessons</span>
                </div>

                <Link
                  href={
                    topic.slug === "fundamentals"
                      ? "/learn/latency-vs-throughput"
                      : topic.slug === "distributed-caching"
                      ? "/learn/distributed-cache-redis"
                      : topic.slug === "database-sharding"
                      ? "/learn/consistent-hashing-sharding"
                      : topic.slug === "event-streaming"
                      ? "/learn/kafka-event-streaming"
                      : "/learn/low-latency-ml-inference"
                  }
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-bold transition-colors"
                >
                  <span>Explore</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Learning Methodology Callout */}
        <div className="mt-16 p-6 rounded-xl border border-sky-500/30 bg-sky-950/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-mono font-bold uppercase mb-2">
            <Compass className="h-4 w-4" />
            <span>The 10-Dimension Architectural Lesson Standard</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl mb-4">
            Every lesson on DesignKaro adheres to a rigorous engineering standard: Explanation, Visual ASCII/Topology Diagram, Real-World Production Case, When to Use, When NOT to Use, Trade-offs Matrix, Common Pitfalls, Socratic Interview Defenses, Interactive Calculations, and Outage Post-mortems.
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">1. Mathematical Foundation</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">2. Topology Diagram</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">3. FAANG Case Studies</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">4. Decision Matrices</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">5. Tail Latency Analysis</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">6. Production Post-Mortems</span>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
