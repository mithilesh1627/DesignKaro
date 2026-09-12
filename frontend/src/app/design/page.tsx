import React from "react";
import Link from "next/link";
import { Cpu, ArrowLeft, Download, Share2, Save, Layers } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArchitecturePreview } from "@/components/ArchitecturePreview";

export default function DesignPage() {
  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-sky-400 mb-2 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Architecture Canvas (React Flow / XYFlow)
                </h1>
                <p className="text-xs text-slate-400 font-mono">
                  Drag, drop, connect, inspect node properties, and validate deterministic rules.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-800 bg-slate-900/60 text-xs font-mono text-slate-500 cursor-not-allowed"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Design (Phase 5)</span>
            </button>
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-800 bg-slate-900/60 text-xs font-mono text-slate-500 cursor-not-allowed"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share (Phase 18)</span>
            </button>
          </div>
        </div>

        {/* 3-Panel Interactive Architecture Playground */}
        <ArchitecturePreview />

        {/* Architecture As Structured Data Spec */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-surface-900/60 p-6">
          <h3 className="text-sm font-bold text-white mb-2 font-mono flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-400" />
            <span>ARCHITECTURE AS DATA SPECIFICATION</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            In DesignKaro, architectures are never treated merely as visual drawings. Every diagram is compiled to a structured JSON graph representing typed nodes, traffic distributions, and SLAs.
          </p>
          <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-sky-300 overflow-x-auto">
{`{
  "design_id": "demo-rec-netflix-01",
  "version": "1.0",
  "scale": { "dau": 20000000, "peak_qps": 50000 },
  "nodes": [
    { "id": "client", "type": "client_tier", "properties": { "qps": 45000 } },
    { "id": "gateway", "type": "api_gateway", "properties": { "timeout_ms": 350, "rate_limit": 100 } },
    { "id": "rec_service", "type": "compute", "properties": { "instances": 24, "p99_ms": 38 } },
    { "id": "redis", "type": "distributed_cache", "properties": { "hit_rate": 0.94, "ttl_sec": 900 } },
    { "id": "postgres", "type": "relational_db", "properties": { "read_replicas": 0 } }
  ],
  "validation_flags": ["SINGLE_POINT_OF_FAILURE: postgres"]
}`}
          </pre>
        </div>
      </main>
      <Footer />
    </>
  );
}
