import React from "react";
import Link from "next/link";
import { Users2, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function InterviewPage() {
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
            <Users2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">System Design Interview Simulator</h1>
            <p className="text-xs text-slate-400 font-mono">
              Real-Time AI Senior Staff Interviewer with Whiteboard Canvas Inspection
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-surface-900/60 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
              <ShieldCheck className="h-4 w-4" />
              <span>MODULE SPECIFICATION: PHASE 10 (INTERVIEW MODE)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              9-Dimension Scoring
            </span>
          </div>

          <h3 className="text-sm font-bold text-white mb-3 font-mono">
            9-Dimension Evaluation Rubric
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { dim: "Requirement Clarification", weight: "10%" },
              { dim: "Capacity Estimation (QPS/Storage)", weight: "10%" },
              { dim: "High-Level Architecture", weight: "20%" },
              { dim: "Data Modeling & Storage", weight: "15%" },
              { dim: "Scalability (Partitioning/Replication)", weight: "15%" },
              { dim: "Reliability & SPOF Mitigation", weight: "10%" },
              { dim: "Trade-offs & Rationale", weight: "10%" },
              { dim: "Failure Handling & Resiliency", weight: "5%" },
              { dim: "Communication & Structure", weight: "5%" },
            ].map((rubric, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs font-mono"
              >
                <span className="text-slate-300">{rubric.dim}</span>
                <span className="text-sky-400 font-bold">{rubric.weight}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs font-mono text-slate-400">
            <div className="text-slate-300 font-semibold mb-1">Interactive Interview Flow:</div>
            <div>Problem Statement → Candidate Clarification → Scale Estimation → Whiteboard Canvas → Socratic Follow-ups → Comprehensive Scorecard</div>
            <div className="mt-2 text-slate-500">Scheduled for implementation in Phase 10</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
