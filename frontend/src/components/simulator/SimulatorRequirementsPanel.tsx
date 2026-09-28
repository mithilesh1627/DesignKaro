import React from "react";
import { Target, X, CheckCircle2, ShieldCheck } from "lucide-react";
import { SimulatorTab } from "./simulatorConstants";

export interface SimulatorRequirementsPanelProps {
  setActiveTab: (tab: SimulatorTab) => void;
}

export function SimulatorRequirementsPanel({ setActiveTab }: SimulatorRequirementsPanelProps) {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-white/[0.06] bg-slate-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white font-mono uppercase">
              Problem Requirements
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Design YouTube • Global Video Streaming
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab("architecture")}
          className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition shrink-0"
          title="Close and return to canvas"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 font-mono text-xs">
        {/* Problem Summary Hero */}
        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-950/70 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
            <span>Design YouTube</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px]">
              Target: 50K+ RPS
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-light leading-relaxed">
            Design a global, hyper-scale video sharing and streaming service capable of
            handling millions of concurrent viewers, petabyte-scale video encoding, and
            resilient sub-200ms playback startup.
          </p>
        </div>

        {/* Functional Requirements */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Functional Requirements</span>
          </div>
          <div className="space-y-1.5">
            {[
              "1. Asynchronous Video Upload: Chunked, resumable multi-part upload pipeline with distributed transcoding into multiple resolutions (1080p, 720p, 480p).",
              "2. Global Low-Latency Streaming: Adaptive bitrate streaming (HLS/DASH) served from distributed CDN edge caches.",
              "3. Metadata & Search: Fast search across video titles, tags, and creator channels with dedicated read replicas and cache.",
              "4. Social Engagements: Record view counts, likes, and comments with eventual consistency.",
            ].map((req, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl border border-white/[0.06] bg-slate-950/50 text-[11px] text-slate-300 font-light leading-relaxed"
              >
                {req}
              </div>
            ))}
          </div>
        </div>

        {/* Non-Functional Requirements */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Non-Functional SLAs</span>
          </div>
          <div className="space-y-1.5">
            {[
              "High Availability: 99.99% uptime. Streaming must never experience global downtime.",
              "Low Latency Playback: Video buffering initiation p95 < 200ms globally.",
              "Throughput: Support 50,000+ peak ingress requests/sec and millions of concurrent viewers.",
              "Read-Heavy: Extreme 99:1 read-to-write traffic distribution.",
            ].map((nfr, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl border border-white/[0.06] bg-slate-950/50 text-[11px] text-slate-300 font-light leading-relaxed"
              >
                {nfr}
              </div>
            ))}
          </div>
        </div>

        {/* Capacity Estimation */}
        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-950/70 space-y-2">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Capacity Estimations
          </div>
          <div className="space-y-1 text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>Daily Active Users:</span>
              <span className="text-white font-bold">100M DAU</span>
            </div>
            <div className="flex justify-between">
              <span>Ingress Metadata QPS:</span>
              <span className="text-white font-bold">50,000 RPS</span>
            </div>
            <div className="flex justify-between">
              <span>New Video Uploads:</span>
              <span className="text-white font-bold">500 hrs / minute</span>
            </div>
            <div className="flex justify-between">
              <span>Daily Storage Added:</span>
              <span className="text-white font-bold">~25 TB / day</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
