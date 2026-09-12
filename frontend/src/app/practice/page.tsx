
import React from "react";
import Link from "next/link";
import { Code2, ArrowLeft, ShieldCheck, Tag } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function PracticePage() {
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
            <Code2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">System Design Practice Engine</h1>
            <p className="text-xs text-slate-400 font-mono">
              50+ Real-World Architecture Challenges with Progressive Constraints
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-surface-900/60 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
              <ShieldCheck className="h-4 w-4" />
              <span>MODULE SPECIFICATION: PHASE 4 (PRACTICE ENGINE)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              50 Target Problems
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                id: "P-101",
                title: "Design a High-Throughput URL Shortener (TinyURL)",
                tier: "Beginner",
                qps: "10,000 QPS",
                focus: "Hashing, Base62, Collision Resolution, Cache-Aside",
              },
              {
                id: "P-204",
                title: "Design a Distributed Rate Limiter",
                tier: "Intermediate",
                qps: "100,000 QPS",
                focus: "Token Bucket vs Sliding Window, Redis Lua Scripts",
              },
              {
                id: "P-305",
                title: "Design Netflix Video Streaming & CDN Ingestion",
                tier: "Advanced",
                qps: "500,000 QPS",
                focus: "Adaptive Bitrate Streaming, Chunking, Multi-Tier Edge CDN",
              },
              {
                id: "P-401",
                title: "Design an ML Real-Time Recommendation Platform",
                tier: "ML Track",
                qps: "25,000 QPS",
                focus: "Two-Tower Model Serving, Feature Stores, Low-Latency Redis",
              },
            ].map((prob) => (
              <div
                key={prob.id}
                className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-400">
                      {prob.id}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {prob.title}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Target Scale: {prob.qps} • Focus: {prob.focus}
                  </div>
                </div>
                <span className="self-start sm:self-center text-xs font-mono px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                  {prob.tier}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs font-mono text-slate-400">
            <div className="text-slate-300 font-semibold mb-1">Contract / API:</div>
            <div>Endpoints: <code className="text-sky-400">GET /api/v1/problems</code>, <code className="text-sky-400">POST /api/v1/problems/&#123;id&#125;/attempt</code></div>
            <div>Implementation Target: Phase 4 (Practice Engine)</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
