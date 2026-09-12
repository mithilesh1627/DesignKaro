import React from "react";
import Link from "next/link";
import { TrendingUp, ArrowLeft, ShieldCheck, Award, Zap, BookOpen } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function ProgressPage() {
  const skills = [
    { name: "Fundamentals (Latency, Throughput, CAP)", score: 91, color: "bg-emerald-500" },
    { name: "Distributed Caching (LRU, Cache-Aside)", score: 88, color: "bg-sky-500" },
    { name: "ML System Design (Feature Stores, RAG)", score: 81, color: "bg-sky-500" },
    { name: "Databases (Indexing, Partitioning, SQL/NoSQL)", score: 74, color: "bg-indigo-500" },
    { name: "Reliability & SPOF Mitigation", score: 69, color: "bg-amber-500" },
    { name: "Messaging & Event Streaming (Kafka)", score: 62, color: "bg-amber-500" },
    { name: "Distributed Systems & Consensus (Raft/Paxos)", score: 57, color: "bg-rose-500" },
  ];

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-sky-400 mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Adaptive Learning Dashboard</h1>
            <p className="text-xs text-slate-400 font-mono">
              0-100 Skill Mastery Graph, Diagnostic Scores &amp; Targeted Practice
            </p>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-xl border border-sky-500/30 bg-sky-500/5">
            <div className="text-xs font-mono text-sky-400 mb-1">SYSTEM DESIGN READINESS</div>
            <div className="text-3xl font-extrabold text-white">72%</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">Interview Ready: Strong Intermediate</div>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-surface-900/60">
            <div className="text-xs font-mono text-slate-400 mb-1">PRACTICE STREAK</div>
            <div className="text-3xl font-extrabold text-white flex items-center gap-2">
              <span>7 Days</span>
              <Zap className="h-5 w-5 text-amber-400 fill-amber-400" />
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">Top 15% Consistency</div>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-surface-900/60">
            <div className="text-xs font-mono text-slate-400 mb-1">LABS COMPLETED</div>
            <div className="text-3xl font-extrabold text-white">12 / 50</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">4 Advanced Solved</div>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-surface-900/60">
            <div className="text-xs font-mono text-slate-400 mb-1">CURRENT RANK</div>
            <div className="text-2xl font-bold text-sky-300">Staff Architect</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">Tier 3 Certification</div>
          </div>
        </div>

        {/* Skill Graph Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-surface-900/60 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
              <ShieldCheck className="h-4 w-4" />
              <span>GRANULAR CONCEPT MASTERY BREAKDOWN (0-100)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Adaptive Engine (Phase 16)
            </span>
          </div>

          <div className="space-y-4">
            {skills.map((skill, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">{skill.name}</span>
                  <span className="text-sky-400 font-bold">{skill.score} / 100</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className={`${skill.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${skill.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Recommended Practice Callout */}
          <div className="mt-8 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono font-bold text-amber-400 mb-1">
                RECOMMENDED REMEDIATION: DISTRIBUTED SYSTEMS (57/100)
              </div>
              <p className="text-xs text-slate-300">
                Your lowest confidence area is Distributed Consensus &amp; Partitioning. Complete the Sharding &amp; Replication Lab to boost your score.
              </p>
            </div>
            <Link
              href="/practice"
              className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 shrink-0 transition-colors"
            >
              Start Recommended Lab
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
