"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Cpu,
  Zap,
  PlayCircle,
  Users2,
  TrendingUp,
  Compass,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  BarChart3,
  CheckCircle2,
  Terminal,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArchitecturePreview } from "@/components/ArchitecturePreview";
import { QuickDiagnosticModal } from "@/components/QuickDiagnosticModal";

export default function HomePage() {
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);

  return (
    <>
      <Navigation onOpenDiagnostic={() => setDiagnosticOpen(true)} />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
          <div className="absolute inset-0 bg-circuit-glow pointer-events-none" />
          <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Top Tagline Pill */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-xs font-mono text-sky-400 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                <span>The Interactive System Design &amp; Architecture Platform</span>
              </div>
            </div>

            {/* Main Headline */}
            <div className="text-center max-w-4xl mx-auto space-y-4">
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Socho. Design Karo.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400">
                  Scale Karo.
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
                Don&apos;t memorize architectures.{" "}
                <span className="text-white font-semibold underline decoration-sky-500/50 underline-offset-4">
                  Learn how to think about architectures.
                </span>
              </p>
              <p className="text-sm text-slate-400 max-w-xl mx-auto font-mono">
                LeetCode + Interactive Architecture Playground + AI Senior Engineer + System Simulator.
              </p>
            </div>

            {/* Quick Diagnostic Callout Banner */}
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="rounded-xl border border-sky-500/30 bg-slate-900/80 p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
                <div className="flex items-center gap-3.5 text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono text-sky-400 font-semibold uppercase tracking-wider">
                      Personalized Onboarding
                    </div>
                    <div className="text-sm font-bold text-white">
                      How good are you at System Design?
                    </div>
                    <div className="text-xs text-slate-400">
                      Take a 2-minute diagnostic to generate your tailored learning path.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDiagnosticOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition-all shadow-md shrink-0"
                >
                  <span>Start Diagnostic</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Socratic Questions Strip */}
            <div className="mt-12 max-w-4xl mx-auto">
              <div className="text-center text-xs font-mono text-slate-400 uppercase tracking-widest mb-4">
                The 6 Architectural Questions DesignKaro Forces You To Answer
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { q: "WHAT?", desc: "Functional bounds" },
                  { q: "WHY?", desc: "Quantitative rationale" },
                  { q: "WHAT IF?", desc: "Traffic 10x spikes" },
                  { q: "WHAT BREAKS?", desc: "Single point of failure" },
                  { q: "HOW SCALE?", desc: "Sharding & caching" },
                  { q: "TRADE-OFFS?", desc: "Latency vs consistency" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 text-center hover:border-sky-500/40 transition-colors"
                  >
                    <div className="font-mono font-bold text-xs text-sky-400 mb-0.5">
                      {item.q}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* INTERACTIVE ARCHITECTURE CANVAS PREVIEW */}
            <div className="mt-14">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Interactive Architecture Canvas &amp; Simulation Preview
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Experience the three-panel developer layout: Palette, Live Graph, and Socratic Properties.
                </p>
              </div>
              <ArchitecturePreview />
            </div>

            {/* 6 CORE PILLARS GRID */}
            <div className="mt-24">
              <div className="text-center max-w-3xl mx-auto mb-12">
                <span className="text-xs font-mono font-semibold text-sky-400 uppercase tracking-widest">
                  Comprehensive Platform Architecture
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  Built to Make You an Elite Systems Architect
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: Cpu,
                    title: "Interactive Architecture Canvas",
                    badge: "React Flow",
                    desc: "Drag-and-drop 30+ production components (Redis, Kafka, Postgres, Envoy). Configure partition keys, eviction policies, and connection pools.",
                    features: ["Structured JSON graph data", "Configurable node properties", "Export PNG/SVG & Versioning"],
                  },
                  {
                    icon: Zap,
                    title: "AI Senior Engineer Mentor",
                    badge: "Socratic AI",
                    desc: "Acts like a Staff Engineer. It never spoils solutions; it asks sharp probing questions: 'What happens when Redis fails?' and 'How do you prevent cache stampedes?'",
                    features: ["4-level progressive hint ladder", "Contextual architectural guidance", "No hallucinated designs"],
                  },
                  {
                    icon: PlayCircle,
                    title: "System Simulator & Chaos",
                    badge: "Deterministic",
                    desc: "Ramp traffic from 100 QPS to 1,000,000 QPS. Inject chaos: kill primary databases, drop packets, or spike latency to test your resilience.",
                    features: ["Real-time resource saturation alerts", "Queue overflow detection", "Failure post-mortem analysis"],
                  },
                  {
                    icon: Users2,
                    title: "System Design Interview Mode",
                    badge: "9-Metric Rubric",
                    desc: "Simulate FAANG/high-scale interviews. The AI interviewer inspects your whiteboard canvas live and challenges your architectural choices.",
                    features: ["Capacity estimation evaluation", "Adaptive follow-up questions", "Detailed readiness scorecard"],
                  },
                  {
                    icon: ShieldAlert,
                    title: "Deterministic Rule Engine",
                    badge: "Zero Fluff",
                    desc: "Static graph validation detects Single Points of Failure (SPOF), missing timeouts, unbounded queues, and un-indexed read bottlenecks automatically.",
                    features: ["Deterministic static graph checks", "Clear severity tiers (Info/Warn/Crit)", "Production rule explanations"],
                  },
                  {
                    icon: TrendingUp,
                    title: "0-100 Adaptive Skill Graph",
                    badge: "Mastery Engine",
                    desc: "Quantify your understanding of Caching, Databases, Messaging, Distributed Consensus, and ML Serving with tailored remediation paths.",
                    features: ["Granular topic mastery scoring", "Personalized practice recommendations", "Milestone streaks & badges"],
                  },
                ].map((pillar, i) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={i}
                      className="p-6 rounded-xl border border-slate-800 bg-surface-900/60 hover:border-slate-700 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {pillar.badge}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">
                          {pillar.title}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                          {pillar.desc}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
                        {pillar.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                            <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CALL TO ACTION BOTTOM BANNER */}
            <div className="mt-20 rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-950/40 to-slate-950 p-8 text-center relative overflow-hidden">
              <div className="relative z-10 max-w-2xl mx-auto space-y-4">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Ready to Stop Memorizing and Start Designing?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-mono">
                  Explore the canvas freely or take the diagnostic assessment to personalize your path.
                </p>
                <div className="flex flex-wrap justify-center gap-4 pt-2">
                  <button
                    onClick={() => setDiagnosticOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 px-6 py-3 text-xs font-bold text-slate-950 transition-all shadow-lg"
                  >
                    <Compass className="h-4 w-4" />
                    <span>Take Quick Diagnostic</span>
                  </button>
                  <Link
                    href="/practice"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 px-6 py-3 text-xs font-mono text-slate-200 transition-all"
                  >
                    <span>Browse 50+ Labs</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Quick Diagnostic Modal */}
      <QuickDiagnosticModal
        isOpen={diagnosticOpen}
        onClose={() => setDiagnosticOpen(false)}
      />
    </>
  );
}
