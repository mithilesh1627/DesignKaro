import React from "react";
import Link from "next/link";
import { PlayCircle, ArrowLeft, ShieldCheck, Zap, Activity } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function SimulatePage() {
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
            <PlayCircle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">System Simulator &amp; Chaos Engine</h1>
            <p className="text-xs text-slate-400 font-mono">
              Simulate Traffic Load (100 QPS → 1,000,000 QPS) &amp; Inject Faults
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-surface-900/60 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
              <ShieldCheck className="h-4 w-4" />
              <span>MODULE SPECIFICATION: PHASE 11 &amp; 12 (SIMULATION &amp; CHAOS)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Deterministic Engine
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-lg border border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2 text-sky-400 text-sm font-bold font-mono mb-2">
                <Activity className="h-4 w-4" />
                <span>Discrete-Event Traffic Simulation</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Models client requests through gateways, thread pool concurrency, cache hit/miss penalties, and database disk IOPS saturation.
              </p>
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex justify-between"><span>Throughput Tiers:</span><span className="text-sky-400">100 to 1,000,000 QPS</span></div>
                <div className="flex justify-between"><span>Saturation Trigger:</span><span className="text-amber-400">&gt;85% Resource Limit</span></div>
                <div className="flex justify-between"><span>Metrics Tracked:</span><span className="text-slate-400">p50, p95, p99 Latency, Errors</span></div>
              </div>
            </div>

            <div className="p-5 rounded-lg border border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2 text-rose-400 text-sm font-bold font-mono mb-2">
                <Zap className="h-4 w-4" />
                <span>Chaos &amp; Failure Injection</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Enables testing resilience when critical nodes crash or networks partition.
              </p>
              <div className="space-y-1.5 text-xs font-mono text-slate-400">
                <div>• Kill Primary Database (Test auto-failover to replica)</div>
                <div>• Kill Redis Cluster (Observe thundering herd cache stampede)</div>
                <div>• Cross-region Latency Spike (Test circuit breaker trip)</div>
                <div>• Sudden 10x Traffic Surge (Verify rate limiter throttling)</div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
