import React from "react";
import Link from "next/link";
import { FileCheck2, ArrowLeft, ShieldCheck, AlertTriangle } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function ReviewPage() {
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
            <FileCheck2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Architecture Review &amp; Rule Engine</h1>
            <p className="text-xs text-slate-400 font-mono">
              Deterministic Static Graph Analysis + Socratic Staff Engineer Review
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-surface-900/60 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
              <ShieldCheck className="h-4 w-4" />
              <span>MODULE SPECIFICATION: PHASE 6 &amp; 9 (VALIDATION &amp; REVIEW ENGINE)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Deterministic Rules
            </span>
          </div>

          <h3 className="text-sm font-bold text-white mb-3 font-mono">
            Deterministic Rule Catalog (Non-LLM Static Verification)
          </h3>

          <div className="space-y-3">
            {[
              {
                id: "RULE-SPOF-01",
                rule: "SINGLE_POINT_OF_FAILURE",
                severity: "CRITICAL",
                desc: "Database or service node has no replicas or failover targets while receiving production traffic.",
              },
              {
                id: "RULE-CACHE-02",
                rule: "MISSING_CACHE_LAYER",
                severity: "WARNING",
                desc: "Read-heavy workload (>85% reads) queries persistent database directly without in-memory cache.",
              },
              {
                id: "RULE-QUEUE-03",
                rule: "UNBOUNDED_ASYNC_QUEUE",
                severity: "WARNING",
                desc: "Asynchronous producer/consumer queue has no TTL or max depth policy, risking memory overflow.",
              },
              {
                id: "RULE-TIME-04",
                rule: "MISSING_TIMEOUT_AND_RETRY",
                severity: "INFO",
                desc: "Inter-service RPC connection lacks explicit client timeout and exponential backoff configuration.",
              },
            ].map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-sky-400">{r.rule}</span>
                    <span className="text-[10px] font-mono text-slate-500">({r.id})</span>
                  </div>
                  <p className="text-xs text-slate-400">{r.desc}</p>
                </div>
                <span
                  className={`self-start sm:self-center text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    r.severity === "CRITICAL"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : r.severity === "WARNING"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-sky-500/10 text-sky-400 border-sky-500/30"
                  }`}
                >
                  {r.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
