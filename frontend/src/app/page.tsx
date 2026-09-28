"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";

const ROTATING_ACTIONS = [
  "Scale Karo.",
  "Simulate Karo.",
  "Stress-Test.",
  "Benchmark.",
  "Defend Karo.",
];

export default function LandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [actionIdx, setActionIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Rotating action pill timer
  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActionIdx((prev) => (prev + 1) % ROTATING_ACTIONS.length);
        setIsTransitioning(false);
      }, 350);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Pause SVG particle animations when off-screen or when reduced-motion is active
  useEffect(() => {
    const mq =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    if (
      mq?.matches &&
      svgRef.current &&
      typeof svgRef.current.pauseAnimations === "function"
    ) {
      svgRef.current.pauseAnimations();
    }

    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!svgRef.current || typeof svgRef.current.pauseAnimations !== "function") return;
        const isMotionReduced = mq ? mq.matches : false;
        if (entry.isIntersecting && !isMotionReduced) {
          svgRef.current.unpauseAnimations();
        } else {
          svgRef.current.pauseAnimations();
        }
      },
      { threshold: 0, rootMargin: "120px" }
    );

    const target = svgContainerRef.current;
    if (target) {
      observer.observe(target);
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (!svgRef.current || typeof svgRef.current.pauseAnimations !== "function") return;
      if (e.matches) {
        svgRef.current.pauseAnimations();
      } else {
        svgRef.current.unpauseAnimations();
      }
    };

    mq?.addEventListener("change", handleMotionChange);

    return () => {
      if (target) observer.unobserve(target);
      observer.disconnect();
      mq?.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return (
    <div className="bg-zinc-950 text-zinc-200 min-h-screen w-full font-sans antialiased relative overflow-x-hidden">
      {/* Blueprint Dot Matrix Grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 85%)",
        }}
      />

      <Navigation />

      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {/* ==================================================================== */}
        {/* 1. HERO SECTION (Vertically Centered in Initial Viewport)            */}
        {/* ==================================================================== */}
        <section className="relative z-10 min-h-[calc(100vh-4rem)] min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-12 max-w-5xl mx-auto">
          {/* Brand Headline: "Socho. Design Karo. [ Scale Karo. ]" */}
          <h1 className="flex flex-col items-center justify-center font-bold tracking-tight text-white mb-3">
            <div className="text-4xl sm:text-6xl md:text-7xl font-serif font-['Fraunces',Georgia,serif] text-zinc-100 leading-tight">
              Socho. Design Karo.
            </div>
            <div className="flex items-center justify-center gap-3 text-4xl sm:text-6xl md:text-7xl font-serif font-['Fraunces',Georgia,serif] mt-1">
              <div className="relative inline-flex items-center justify-center px-4 sm:px-6 py-1 rounded-xl border border-zinc-700 bg-zinc-900/90 shadow-sm overflow-hidden transition-all duration-300">
                <span
                  className={`italic text-sky-400 tracking-normal transition-all duration-300 ${
                    isTransitioning
                      ? "opacity-0 -translate-y-4"
                      : "opacity-100 translate-y-0"
                  }`}
                >
                  {ROTATING_ACTIONS[actionIdx]}
                </span>
              </div>
            </div>
          </h1>

          {/* Subtitle */}
          <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-xl font-normal leading-relaxed">
            Design, simulate, and stress-test distributed systems on an interactive canvas.
          </p>

          {/* Action Button (Sole Primary CTA) */}
          <div className="flex items-center justify-center mt-8">
            <Link
              href="/simulator"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-sans text-sm font-medium transition shadow-sm active:scale-95"
            >
              <Layers className="w-4 h-4" />
              <span>Launch Simulator →</span>
            </Link>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 2. THE SIGNATURE CANVAS MOCKUP WINDOW                                */}
        {/* ==================================================================== */}
        <section className="relative z-10 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden relative">
              {/* Window Bar */}
              <div className="h-9 px-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  designkaro.com/simulator?problem=rate-limiter
                </span>
                <div className="w-10" />
              </div>

              {/* Live Interactive Architecture SVG */}
              <div
                ref={svgContainerRef}
                className="relative w-full aspect-[16/7] min-h-[360px] bg-zinc-950 flex items-center justify-center p-4 sm:p-6 overflow-hidden"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                  contentVisibility: "auto",
                  containIntrinsicSize: "800px 360px",
                }}
              >
              {/* Radial Center Light */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(99, 102, 241, 0.06) 0%, transparent 70%)",
                }}
              />

              {/* Topology SVG */}
              <svg
                ref={svgRef}
                viewBox="0 0 720 300"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
                aria-label="DesignKaro Architecture Canvas Preview"
              >
                <defs>
                  <linearGradient id="dk-trail-cyan" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(6,182,212,0)" />
                    <stop offset="100%" stopColor="rgba(6,182,212,0.9)" />
                  </linearGradient>
                  <linearGradient id="dk-trail-violet" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(139,92,246,0)" />
                    <stop offset="100%" stopColor="rgba(139,92,246,0.9)" />
                  </linearGradient>
                  <linearGradient id="dk-trail-amber" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(245,158,11,0)" />
                    <stop offset="100%" stopColor="rgba(245,158,11,0.85)" />
                  </linearGradient>
                  <linearGradient id="dk-trail-emerald" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(16,185,129,0)" />
                    <stop offset="100%" stopColor="rgba(16,185,129,0.85)" />
                  </linearGradient>

                  <path id="dk-p1" d="M110,148 L170,148" />
                  <path id="dk-p2" d="M290,148 C310,130 320,105 340,90" />
                  <path id="dk-p3" d="M290,148 L340,148" />
                  <path id="dk-p4" d="M290,148 C310,170 320,195 340,210" />
                  <path id="dk-p5" d="M460,148 L510,148" />
                  <path id="dk-p6" d="M460,160 C480,175 490,195 510,210" />
                </defs>

                {/* Architecture Subsystem Zones */}
                <rect x="6" y="120" width="116" height="60" rx="3" fill="none" stroke="rgba(236,72,153,.12)" strokeDasharray="4 4" />
                <text x="12" y="116" fontFamily="Space Mono,monospace" fontSize="5" fill="rgba(236,72,153,.45)" letterSpacing="1.5">CLIENT TRAFFIC</text>

                <rect x="158" y="56" width="146" height="140" rx="3" fill="none" stroke="rgba(6,182,212,.12)" strokeDasharray="4 4" />
                <text x="164" y="52" fontFamily="Space Mono,monospace" fontSize="5" fill="rgba(6,182,212,.45)" letterSpacing="1.5">EDGE &amp; GATEWAY</text>

                <rect x="328" y="56" width="146" height="192" rx="3" fill="none" stroke="rgba(139,92,246,.12)" strokeDasharray="4 4" />
                <text x="334" y="52" fontFamily="Space Mono,monospace" fontSize="5" fill="rgba(139,92,246,.45)" letterSpacing="1.5">COMPUTE TIER</text>

                <rect x="498" y="118" width="146" height="130" rx="3" fill="none" stroke="rgba(245,158,11,.1)" strokeDasharray="4 4" />
                <text x="504" y="114" fontFamily="Space Mono,monospace" fontSize="5" fill="rgba(245,158,11,.35)" letterSpacing="1.5">STATE &amp; MESSAGING</text>

                {/* Connection Lines */}
                <line x1="110" y1="148" x2="170" y2="148" stroke="rgba(6,182,212,.22)" strokeWidth="1" strokeDasharray="4 3" />
                <path d="M290,148 C310,130 320,105 340,90" stroke="rgba(6,182,212,.22)" strokeWidth="1" fill="none" />
                <line x1="290" y1="148" x2="340" y2="148" stroke="rgba(139,92,246,.25)" strokeWidth="1" />
                <path d="M290,148 C310,170 320,195 340,210" stroke="rgba(245,158,11,.22)" strokeWidth="1" fill="none" />
                <line x1="460" y1="148" x2="510" y2="148" stroke="rgba(245,158,11,.25)" strokeWidth="1" />
                <path d="M460,160 C480,175 490,195 510,210" stroke="rgba(16,185,129,.22)" strokeWidth="1" fill="none" />

                {/* Nodes */}
                {/* 1. Ingress */}
                <g>
                  <rect x="18" y="126" width="92" height="44" rx="3" fill="rgba(236,72,153,.05)" stroke="rgba(236,72,153,.4)" strokeWidth="1" />
                  <circle cx="26" cy="134" r="2.5" fill="rgba(16,185,129,.8)" />
                  <text x="64" y="146" fontFamily="Space Mono,monospace" fontSize="7" fill="rgba(226,232,240,.8)" textAnchor="middle" letterSpacing=".8">CLIENTS</text>
                  <text x="64" y="160" fontFamily="Space Mono,monospace" fontSize="5.5" fill="rgba(236,72,153,.75)" textAnchor="middle">50K RPS LOAD</text>
                </g>

                {/* 2. Load Balancer */}
                <g>
                  <rect x="170" y="126" width="120" height="44" rx="3" fill="rgba(6,182,212,.06)" stroke="rgba(6,182,212,.45)" strokeWidth="1" />
                  <rect x="170" y="126" width="120" height="2" rx="1" fill="rgba(6,182,212,.4)" />
                  <circle cx="178" cy="134" r="2.5" fill="rgba(16,185,129,.8)" />
                  <text x="230" y="146" fontFamily="Space Mono,monospace" fontSize="7" fill="rgba(226,232,240,.8)" textAnchor="middle" letterSpacing=".8">LOAD BALANCER</text>
                  <text x="230" y="160" fontFamily="Space Mono,monospace" fontSize="5.5" fill="rgba(6,182,212,.7)" textAnchor="middle">ENVOY · L7 PROXY</text>
                </g>

                {/* 3. API Gateway / Rate Limiter */}
                <g>
                  <rect x="340" y="66" width="120" height="44" rx="3" fill="rgba(6,182,212,.05)" stroke="rgba(6,182,212,.4)" strokeWidth="1" />
                  <rect x="340" y="66" width="120" height="2" rx="1" fill="rgba(6,182,212,.3)" />
                  <circle cx="348" cy="74" r="2.5" fill="rgba(16,185,129,.8)" />
                  <text x="400" y="86" fontFamily="Space Mono,monospace" fontSize="7" fill="rgba(226,232,240,.8)" textAnchor="middle" letterSpacing=".8">RATE LIMITER</text>
                  <text x="400" y="100" fontFamily="Space Mono,monospace" fontSize="5.5" fill="rgba(6,182,212,.65)" textAnchor="middle">TOKEN BUCKET</text>
                </g>

                {/* 4. App Service */}
                <g>
                  <rect x="340" y="126" width="120" height="44" rx="3" fill="rgba(139,92,246,.08)" stroke="rgba(139,92,246,.45)" strokeWidth="1" />
                  <rect x="340" y="126" width="120" height="2" rx="1" fill="rgba(139,92,246,.4)" />
                  <circle cx="348" cy="134" r="2.5" fill="rgba(16,185,129,.8)" />
                  <text x="400" y="146" fontFamily="Space Mono,monospace" fontSize="7" fill="rgba(226,232,240,.8)" textAnchor="middle" letterSpacing=".8">APP SERVICE</text>
                  <text x="400" y="160" fontFamily="Space Mono,monospace" fontSize="5.5" fill="rgba(139,92,246,.75)" textAnchor="middle">8 REPLICAS · 54% CPU</text>
                </g>

                {/* 5. Redis Cache */}
                <g>
                  <rect x="340" y="190" width="120" height="44" rx="3" fill="rgba(245,158,11,.05)" stroke="rgba(245,158,11,.4)" strokeWidth="1" />
                  <rect x="340" y="190" width="120" height="2" rx="1" fill="rgba(245,158,11,.3)" />
                  <circle cx="348" cy="198" r="2.5" fill="rgba(16,185,129,.8)" />
                  <text x="400" y="210" fontFamily="Space Mono,monospace" fontSize="7" fill="rgba(226,232,240,.8)" textAnchor="middle" letterSpacing=".8">REDIS CLUSTER</text>
                  <text x="400" y="224" fontFamily="Space Mono,monospace" fontSize="5.5" fill="rgba(245,158,11,.7)" textAnchor="middle">CACHE · 99.1% HIT</text>
                </g>

                {/* 6. Database */}
                <g>
                  <rect x="510" y="126" width="120" height="44" rx="3" fill="rgba(245,158,11,.06)" stroke="rgba(245,158,11,.4)" strokeWidth="1" />
                  <rect x="510" y="126" width="120" height="2" rx="1" fill="rgba(245,158,11,.35)" />
                  <circle cx="518" cy="134" r="2.5" fill="rgba(16,185,129,.8)" />
                  <text x="570" y="146" fontFamily="Space Mono,monospace" fontSize="7" fill="rgba(226,232,240,.8)" textAnchor="middle" letterSpacing=".8">POSTGRES MASTER</text>
                  <text x="570" y="160" fontFamily="Space Mono,monospace" fontSize="5.5" fill="rgba(245,158,11,.65)" textAnchor="middle">PRIMARY-REPLICA</text>
                </g>

                {/* 7. Kafka Message Queue */}
                <g>
                  <rect x="510" y="190" width="120" height="44" rx="3" fill="rgba(16,185,129,.05)" stroke="rgba(16,185,129,.35)" strokeWidth="1" />
                  <rect x="510" y="190" width="120" height="2" rx="1" fill="rgba(16,185,129,.3)" />
                  <circle cx="518" cy="198" r="2.5" fill="rgba(16,185,129,.8)" />
                  <text x="570" y="210" fontFamily="Space Mono,monospace" fontSize="7" fill="rgba(226,232,240,.8)" textAnchor="middle" letterSpacing=".8">APACHE KAFKA</text>
                  <text x="570" y="224" fontFamily="Space Mono,monospace" fontSize="5.5" fill="rgba(16,185,129,.65)" textAnchor="middle">EVENT BUS · 32 PART</text>
                </g>

                {/* Animated Traffic Particles */}
                <path d="M -14,0 L 0,0" stroke="url(#dk-trail-cyan)" strokeWidth="2" strokeLinecap="round">
                  <animateMotion dur="1.8s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#dk-p1" />
                  </animateMotion>
                </path>
                <path d="M -12,0 L 0,0" stroke="url(#dk-trail-cyan)" strokeWidth="1.5" strokeLinecap="round">
                  <animateMotion dur="2.0s" repeatCount="indefinite" begin="0.4s" rotate="auto">
                    <mpath href="#dk-p2" />
                  </animateMotion>
                </path>
                <path d="M -14,0 L 0,0" stroke="url(#dk-trail-violet)" strokeWidth="2" strokeLinecap="round">
                  <animateMotion dur="1.6s" repeatCount="indefinite" begin="0.2s" rotate="auto">
                    <mpath href="#dk-p3" />
                  </animateMotion>
                </path>
                <path d="M -10,0 L 0,0" stroke="url(#dk-trail-amber)" strokeWidth="1.5" strokeLinecap="round">
                  <animateMotion dur="2.2s" repeatCount="indefinite" begin="0.8s" rotate="auto">
                    <mpath href="#dk-p4" />
                  </animateMotion>
                </path>
                <path d="M -12,0 L 0,0" stroke="url(#dk-trail-amber)" strokeWidth="2" strokeLinecap="round">
                  <animateMotion dur="1.4s" repeatCount="indefinite" begin="0.5s" rotate="auto">
                    <mpath href="#dk-p5" />
                  </animateMotion>
                </path>
                <path d="M -10,0 L 0,0" stroke="url(#dk-trail-emerald)" strokeWidth="1.5" strokeLinecap="round">
                  <animateMotion dur="2.0s" repeatCount="indefinite" begin="1.2s" rotate="auto">
                    <mpath href="#dk-p6" />
                  </animateMotion>
                </path>

                {/* Live Real-time Telemetry HUD (Bottom Right) */}
                <g transform="translate(636,54)">
                  <rect x="0" y="0" width="76" height="52" rx="3" fill="rgba(26,26,46,.95)" stroke="rgba(99,102,241,.3)" strokeWidth=".8" />
                  <text x="6" y="12" fontFamily="Space Mono,monospace" fontSize="5" fill="rgba(99,102,241,.8)" letterSpacing=".8">LATENCY SLA</text>
                  <text x="6" y="24" fontFamily="Space Mono,monospace" fontSize="6" fill="rgba(16,185,129,.9)">P50  4.2ms</text>
                  <text x="6" y="34" fontFamily="Space Mono,monospace" fontSize="6" fill="rgba(245,158,11,.9)">P95  18.4ms</text>
                  <text x="6" y="44" fontFamily="Space Mono,monospace" fontSize="6" fill="rgba(244,63,94,.9)">P99  36.8ms</text>
                </g>

                <g transform="translate(636,112)">
                  <rect x="0" y="0" width="76" height="26" rx="3" fill="rgba(26,26,46,.95)" stroke="rgba(99,102,241,.3)" strokeWidth=".8" />
                  <text x="6" y="11" fontFamily="Space Mono,monospace" fontSize="5" fill="rgba(99,102,241,.8)" letterSpacing=".8">LOAD TEST</text>
                  <text x="6" y="21" fontFamily="Space Mono,monospace" fontSize="6.5" fill="rgba(16,185,129,.95)">49,820 RPS</text>
                </g>

                <g transform="translate(636,144)">
                  <rect x="0" y="0" width="76" height="24" rx="3" fill="rgba(26,26,46,.95)" stroke="rgba(99,102,241,.2)" strokeWidth=".8" />
                  <polyline points="4,16 10,12 18,14 24,8 32,12 40,9 48,13 56,6 64,11 72,8" stroke="rgba(99,102,241,.7)" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
                </g>
              </svg>
            </div>
          </div>
        </section>

      {/* ==================================================================== */}
      {/* 3. THREE CORE PILLARS (Visual Demonstrations)                         */}
      {/* ==================================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-zinc-800">
        <div className="text-center mb-12">
          <p className="font-mono text-xs tracking-[0.2em] text-zinc-400 uppercase mb-2">
            HOW IT WORKS
          </p>
          <h2 className="font-['Fraunces',Georgia,serif] text-3xl sm:text-4xl font-bold text-zinc-100">
            From mental model to{" "}
            <span className="italic text-sky-400 font-serif">
              verified system
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pillar 1: DESIGN */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-zinc-700 transition group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-semibold text-sky-400 tracking-widest uppercase">
                  01 · DESIGN
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
                  Interactive Canvas
                </span>
              </div>
              <h3 className="text-lg font-bold text-zinc-100 tracking-tight mb-1 group-hover:text-white transition">
                Build distributed architectures visually.
              </h3>
            </div>

            {/* Mini UI Demonstration: [Edge] → [Gateway] → [Compute] → [Cache] → [DB] */}
            <div className="my-6 p-4 rounded-lg bg-zinc-950/80 border border-zinc-800/90 space-y-3 font-mono">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Multi-Tier Topology</span>
                <span className="text-sky-400">Composable</span>
              </div>

              <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
                <div className="px-2 py-1 rounded bg-pink-950/40 border border-pink-500/30 text-[11px] text-pink-300 font-medium shrink-0">
                  Edge
                </div>
                <span className="text-zinc-600 text-xs shrink-0">→</span>
                <div className="px-2 py-1 rounded bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300 font-medium shrink-0">
                  Gateway
                </div>
                <span className="text-zinc-600 text-xs shrink-0">→</span>
                <div className="px-2 py-1 rounded bg-violet-950/40 border border-violet-500/30 text-[11px] text-violet-300 font-medium shrink-0">
                  Compute
                </div>
                <span className="text-zinc-600 text-xs shrink-0">→</span>
                <div className="px-2 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300 font-medium shrink-0">
                  Cache
                </div>
                <span className="text-zinc-600 text-xs shrink-0">→</span>
                <div className="px-2 py-1 rounded bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 font-medium shrink-0">
                  DB
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
                <span>Routing</span>
                <span className="text-zinc-300 font-medium">Bezier Connections</span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Canvas controls</span>
              <span className="text-sky-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                Compose nodes →
              </span>
            </div>
          </div>

          {/* Pillar 2: SIMULATE */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-zinc-700 transition group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-semibold text-emerald-400 tracking-widest uppercase">
                  02 · SIMULATE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
                  M/M/c Engine
                </span>
              </div>
              <h3 className="text-lg font-bold text-zinc-100 tracking-tight mb-1 group-hover:text-white transition">
                Push traffic and watch latency react.
              </h3>
            </div>

            {/* Mini UI Demonstration: 50K RPS, ████████░░, P95 18ms, P99 36ms */}
            <div className="my-6 p-4 rounded-lg bg-zinc-950/80 border border-zinc-800/90 space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Traffic Load</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  50K RPS
                </span>
              </div>

              <div className="space-y-1">
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div className="w-[82%] h-full bg-emerald-500 rounded-full" />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Queue saturation</span>
                  <span className="text-zinc-300 font-semibold">82%</span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-1.5 rounded bg-zinc-900/90 border border-zinc-800 text-center">
                  <div className="text-[9px] text-zinc-400 uppercase tracking-wider">P95</div>
                  <div className="text-sky-400 font-bold font-mono mt-0.5">18ms</div>
                </div>
                <div className="p-1.5 rounded bg-zinc-900/90 border border-zinc-800 text-center">
                  <div className="text-[9px] text-zinc-400 uppercase tracking-wider">P99</div>
                  <div className="text-amber-400 font-bold font-mono mt-0.5">36ms</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Queuing dynamics</span>
              <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                Measure latency →
              </span>
            </div>
          </div>

          {/* Pillar 3: STRESS-TEST */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-zinc-700 transition group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-semibold text-rose-400 tracking-widest uppercase">
                  03 · STRESS-TEST
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
                  Chaos &amp; SPOF
                </span>
              </div>
              <h3 className="text-lg font-bold text-zinc-100 tracking-tight mb-1 group-hover:text-white transition">
                Inject failures and find bottlenecks.
              </h3>
            </div>

            {/* Mini UI Demonstration: Database ✕ ↓ Replica ✓ */}
            <div className="my-6 p-4 rounded-lg bg-zinc-950/80 border border-zinc-800/90 space-y-2 font-mono">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Chaos Injection</span>
                <span className="text-rose-400">Crash Injected</span>
              </div>

              <div className="flex items-center justify-between px-3 py-1.5 rounded bg-rose-950/20 border border-rose-500/30 text-xs">
                <span className="text-zinc-300">Database</span>
                <span className="text-rose-400 font-bold">✕ DOWN</span>
              </div>

              <div className="flex items-center justify-center text-zinc-400 text-xs py-0.5 gap-1.5">
                <span>↓</span>
                <span className="text-[10px] text-zinc-400">failover to replica</span>
              </div>

              <div className="flex items-center justify-between px-3 py-1.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-xs">
                <span className="text-zinc-200">Replica</span>
                <span className="text-emerald-400 font-bold">✓ PROMOTED</span>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
                <span>SLA Status</span>
                <span className="text-emerald-400 font-semibold">Recovered (0 Drops)</span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Failure modes</span>
              <span className="text-rose-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                Defend trade-offs →
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. CURRICULUM HIGHLIGHTS                                             */}
      {/* ==================================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-zinc-800 bg-zinc-950">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-zinc-400 uppercase mb-2">
            LEARNING TRACKS &amp; PRACTICE
          </p>
          <h2 className="font-['Fraunces',Georgia,serif] text-3xl sm:text-4xl font-bold text-zinc-100 mb-3">
            Master the invariants of <br className="hidden sm:block" />
            <span className="italic text-sky-400 font-serif">
              distributed computing
            </span>
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Interactive guides and real-world system design scenarios.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
            <Link
              href="/learn/consistent-hashing"
              className="p-5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition group flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  Data Distribution
                </span>
                <h3 className="font-['Fraunces',Georgia,serif] text-lg font-bold text-white mt-1 group-hover:text-sky-300 transition">
                  Consistent Hashing
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                  Partition data without unnecessary reshuffling.
                </p>
              </div>
              <span className="font-mono text-xs text-sky-400 mt-4 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Explore guide →
              </span>
            </Link>

            <Link
              href="/practice"
              className="p-5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition group flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  Interview Challenge
                </span>
                <h3 className="font-['Fraunces',Georgia,serif] text-lg font-bold text-white mt-1 group-hover:text-sky-300 transition">
                  Distributed Rate Limiter
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                  Design rate limiting under high traffic.
                </p>
              </div>
              <span className="font-mono text-xs text-sky-400 mt-4 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Solve in Simulator →
              </span>
            </Link>

            <Link
              href="/learn/cap-theorem"
              className="p-5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition group flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  Distributed Theory
                </span>
                <h3 className="font-['Fraunces',Georgia,serif] text-lg font-bold text-white mt-1 group-hover:text-sky-300 transition">
                  CAP Theorem
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                  Explore consistency, availability, and partitions.
                </p>
              </div>
              <span className="font-mono text-xs text-sky-400 mt-4 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Explore guide →
              </span>
            </Link>
          </div>

          <Link
            href="/learn"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md border border-zinc-800 hover:border-zinc-700 bg-zinc-900/80 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:text-white transition"
          >
            <span>Browse all curriculum tracks →</span>
          </Link>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. FINAL BOTTOM CTA                                                  */}
      {/* ==================================================================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-zinc-800 bg-zinc-950 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-['Fraunces',Georgia,serif] text-3xl sm:text-5xl font-bold text-zinc-100 mb-3">
            Ready to design?
          </h2>

          <p className="text-sm sm:text-base text-zinc-400 mb-8 leading-relaxed">
            Build your first distributed system.
          </p>

          <div className="flex items-center justify-center">
            <Link
              href="/simulator"
              className="px-6 py-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-sans text-sm font-medium transition shadow-sm active:scale-95"
            >
              Launch Simulator →
            </Link>
          </div>
        </div>
      </section>
      </main>

      <Footer />

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
