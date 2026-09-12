import React from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft, Layers, ShieldCheck } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function LearnPage() {
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

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">System Design Learning Engine</h1>
            <p className="text-xs text-slate-400 font-mono">
              Beginner → Intermediate → Advanced Curated Curriculum
            </p>
          </div>
        </div>

        {/* Phase Interface Card */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-surface-900/60 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
              <ShieldCheck className="h-4 w-4" />
              <span>MODULE SPECIFICATION: PHASE 3 (LEARNING ENGINE)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Under Active Construction
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60">
              <h3 className="text-sm font-bold text-sky-400 mb-2 font-mono">
                1. BEGINNER TRACK (15 Lessons)
              </h3>
              <ul className="text-xs text-slate-400 space-y-1.5 font-mono">
                <li>• Latency vs Throughput</li>
                <li>• CAP Theorem in Real Systems</li>
                <li>• Load Balancing Algorithms</li>
                <li>• SQL vs NoSQL Trade-offs</li>
                <li>• Database Indexing &amp; Replication</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60">
              <h3 className="text-sm font-bold text-indigo-400 mb-2 font-mono">
                2. INTERMEDIATE TRACK (15 Lessons)
              </h3>
              <ul className="text-xs text-slate-400 space-y-1.5 font-mono">
                <li>• Consistent Hashing Mechanics</li>
                <li>• Distributed Caching (LRU/LFU)</li>
                <li>• Event-Driven Kafka &amp; Queues</li>
                <li>• Idempotency &amp; Distributed Locks</li>
                <li>• Circuit Breakers &amp; Backpressure</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60">
              <h3 className="text-sm font-bold text-emerald-400 mb-2 font-mono">
                3. ADVANCED &amp; ML TRACK (15 Lessons)
              </h3>
              <ul className="text-xs text-slate-400 space-y-1.5 font-mono">
                <li>• Multi-Region Active-Active</li>
                <li>• Raft/Paxos Distributed Consensus</li>
                <li>• Vector DBs &amp; Embedding Retrieval</li>
                <li>• Low-Latency Online ML Serving</li>
                <li>• Real-Time Feature Stores</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs font-mono text-slate-400">
            <div className="text-slate-300 font-semibold mb-1">Contract / API:</div>
            <div>Endpoints: <code className="text-sky-400">GET /api/v1/topics</code>, <code className="text-sky-400">GET /api/v1/topics/&#123;id&#125;/lessons</code></div>
            <div>Implementation Target: Phase 3 (Learning Engine)</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
