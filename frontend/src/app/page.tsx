"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Layers,
  Globe,
  Database,
  Radio,
  Server,
  Zap,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  Pause,
  Compass,
  Cpu,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { useAuthStore } from "@/lib/authStore";

export default function LandingPage() {
  const [currentFoldIndex, setCurrentFoldIndex] = useState(0);
  const [previousFoldIndex, setPreviousFoldIndex] = useState(0);
  const [directionForward, setDirectionForward] = useState(true);

  // Diagnostic 3D Card flip state
  const [isFlipped, setIsFlipped] = useState(false);

  // Traffic simulation inside Fold 2
  const [isSimulating, setIsSimulating] = useState(true);
  const [qps, setQps] = useState(24453);

  // AI Socratic drawer state in Fold 2
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auth Modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalFolds = 3;

  // Closed loop navigation
  const switchFold = (targetIndex: number, forceForward?: boolean) => {
    if (targetIndex === currentFoldIndex) return;

    const prev = currentFoldIndex;
    let forward = true;
    if (forceForward !== undefined) {
      forward = forceForward;
    } else {
      if (prev === 2 && targetIndex === 0) {
        forward = true;
      } else if (prev === 0 && targetIndex === 2) {
        forward = false;
      } else {
        forward = targetIndex > prev;
      }
    }

    setPreviousFoldIndex(prev);
    setDirectionForward(forward);
    setCurrentFoldIndex(targetIndex);
  };

  const navigateLoop = (step: number) => {
    const nextIndex = (currentFoldIndex + step + totalFolds) % totalFolds;
    switchFold(nextIndex, step > 0);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        navigateLoop(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        navigateLoop(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentFoldIndex]);

  // Traffic Simulation jitter
  useEffect(() => {
    if (!isSimulating) return;
    const timer = setInterval(() => {
      const base = 25000;
      const variation = Math.floor(Math.random() * 2400) - 1200;
      setQps(base + variation);
    }, 1200);
    return () => clearInterval(timer);
  }, [isSimulating]);

  // Kinetic Starfield Particle Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.7 + 0.2,
    }));

    function render() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      for (const star of stars) {
        star.x += star.vx;
        star.y += star.vy;
        if (star.x < 0) star.x = w;
        if (star.x > w) star.x = 0;
        if (star.y < 0) star.y = h;
        if (star.y > h) star.y = 0;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${star.alpha})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = "#06b6d4";
        ctx.fill();
      }
      animFrameId = requestAnimationFrame(render);
    }
    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  const getFoldClass = (index: number) => {
    if (index === currentFoldIndex) return "fold-active";
    if (directionForward) {
      return index === previousFoldIndex ? "fold-past" : "fold-future";
    } else {
      return index === previousFoldIndex ? "fold-future" : "fold-past";
    }
  };

  return (
    <div className="bg-tech-pattern text-slate-200 h-screen w-screen overflow-hidden select-none font-sans antialiased relative">
      {/* Subtle Canvas Kinetic Starfield Particle Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
      />

      {/* Ambient Energy Spheres */}
      <div className="fixed top-[-15%] left-1/2 -translate-x-1/2 w-[1100px] h-[750px] bg-cyan-600/10 blur-[180px] rounded-full pointer-events-none -z-10" />
      <div className="fixed top-[45%] right-[-12%] w-[700px] h-[700px] bg-indigo-600/10 blur-[190px] rounded-full pointer-events-none -z-10" />

      {/* FIXED TOP HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/[0.06] bg-brand-bg/90 backdrop-blur-2xl px-6 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => switchFold(0)}
            className="flex items-center gap-3 group text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/15">
              <div className="w-full h-full bg-[#050914] rounded-[10px] flex items-center justify-center">
                <Layers className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white font-display">
                  Design<span className="text-cyan-400">Karo</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-light hidden sm:block tracking-wide">
                Socho. Design Karo. Scale Karo.
              </span>
            </div>
          </button>

          {/* Quick Route Nav in Header */}
          <nav className="hidden xl:flex items-center gap-1 font-mono text-xs text-slate-400">
            <Link
              href="/learn"
              className="px-2.5 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              LEARN
            </Link>
            <Link
              href="/practice"
              className="px-2.5 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              PRACTICE
            </Link>
            <Link
              href="/design"
              className="px-2.5 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              CANVAS
            </Link>
            <Link
              href="/simulate"
              className="px-2.5 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              SIMULATE
            </Link>
            <Link
              href="/interview"
              className="px-2.5 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              INTERVIEW
            </Link>
            <Link
              href="/progress"
              className="px-2.5 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              PROGRESS
            </Link>
          </nav>
        </div>

        {/* Active Stage Controls & Auth */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Quick Loop Prev / Next mini buttons in header */}
          <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-lg p-0.5">
            <button
              className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-white/[0.05] rounded transition"
              onClick={() => navigateLoop(-1)}
              title="Previous Fold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-white/[0.05] rounded transition"
              onClick={() => navigateLoop(1)}
              title="Next Fold"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400 hidden sm:inline">
                {user.email.split("@")[0]}
              </span>
              <button
                onClick={logout}
                className="text-xs font-mono text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="text-xs font-mono font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition hidden sm:block"
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 transition duration-200 shadow-md shadow-cyan-500/20 active:scale-95"
              >
                <span>Sign Up</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* 3D PERSPECTIVE VIEWPORT STAGE (Holds 3 Full-Screen 100vh Folds) */}
      <div className="stage-perspective-viewport relative w-screen h-screen pt-16 pb-20 overflow-hidden">
        {/* ==================== FOLD 1: HERO & PERSONALIZED DIAGNOSTIC ==================== */}
        <section
          className={`binder-fold-card absolute inset-0 pt-16 pb-24 px-6 sm:px-10 flex flex-col justify-between items-center overflow-y-auto lg:overflow-hidden custom-scrollbar ${getFoldClass(
            0
          )}`}
          id="fold-0"
        >
          {/* Subtle Orbit Background Rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10 opacity-30">
            <div className="w-[620px] h-[620px] rounded-full border border-white/[0.04] animate-pulse-slow" />
            <div className="w-[940px] h-[940px] rounded-full border border-dashed border-cyan-500/15 animate-spin-slow" />
          </div>

          {/* Hero Typography Header */}
          <div className="text-center max-w-5xl mx-auto pt-4 sm:pt-8 flex flex-col items-center">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.2rem] font-black font-display text-white leading-[1.05] tracking-[-0.04em] mb-3">
              Socho. Design Karo.
              <br />
              <span className="text-gradient-scale text-glow">Scale Karo.</span>
            </h1>
          </div>

          {/* HERO DIAGNOSTIC 3D FLIP CARD */}
          <div className="w-full max-w-4xl mx-auto flipper-container my-auto">
            <div
              className={`flipper-inner relative w-full min-h-[195px] ${
                isFlipped ? "flipper-flipped" : ""
              }`}
              id="diagnostic-flip-card"
            >
              {/* FRONT FACE: The Diagnostic Intro Card */}
              <div className="flipper-front w-full zen-core-card rounded-3xl p-6 sm:p-8 cyber-core-glow relative overflow-hidden group">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-950/90 border-2 border-cyan-400/40 flex items-center justify-center shrink-0 text-cyan-300 shadow-xl shadow-cyan-500/20">
                      <Compass className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/15 px-3 py-0.5 rounded-full border border-cyan-400/30">
                          Personalized Diagnostic
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
                        Assess your real-world System Design Level
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 font-light mt-1 max-w-xl leading-relaxed">
                        Answer 6 scenario questions to uncover architectural gaps and get a custom track.
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto shrink-0 flex flex-col gap-2">
                    <button
                      onClick={() => setIsFlipped(true)}
                      className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-bold text-xs sm:text-sm tracking-wide transition shadow-xl shadow-cyan-500/25 active:scale-95"
                      id="flip-to-questions-btn"
                    >
                      <span>Start Diagnostic</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-mono text-center text-cyan-400/80">
                      Click to flip 3D card ↷
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-2 text-cyan-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    Engine ready for evaluation
                  </span>
                  <div className="flex items-center gap-4">
                    <Link
                      href="/practice"
                      className="hover:text-cyan-300 transition-colors"
                    >
                      50+ Problem Catalog →
                    </Link>
                  </div>
                </div>
              </div>

              {/* BACK FACE: Interactive 3D Question Preview */}
              <div className="flipper-back absolute inset-0 w-full h-full zen-core-card rounded-3xl p-6 sm:p-8 cyber-core-glow flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <span className="text-xs font-mono text-cyan-300 font-semibold uppercase tracking-wider">
                    Question 01 / 06 • Scalability Dilemma
                  </span>
                  <button
                    onClick={() => setIsFlipped(false)}
                    className="text-xs font-mono text-slate-400 hover:text-white px-2.5 py-1 rounded bg-white/[0.05]"
                  >
                    ↶ Flip Back
                  </button>
                </div>
                <div className="py-3">
                  <p className="text-sm sm:text-base font-medium text-white mb-3">
                    Your API Gateway spikes from 15,000 to 180,000 QPS in 4 seconds due to flash sales. What is your primary defense?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div
                      onClick={() => switchFold(1)}
                      className="p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-xs text-cyan-200 cursor-pointer hover:bg-cyan-950/40 flex items-center gap-2"
                    >
                      <span className="font-mono text-cyan-400 font-bold">A</span>
                      <span>Token Bucket rate limiting + Redis cluster replica pool</span>
                    </div>
                    <div
                      onClick={() => switchFold(1)}
                      className="p-2.5 rounded-xl bg-slate-900/90 border border-white/[0.06] text-xs text-slate-300 cursor-pointer hover:border-cyan-500/40 flex items-center gap-2"
                    >
                      <span className="font-mono text-slate-400 font-bold">B</span>
                      <span>Immediately autoscale pod count to 500 replicas</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs font-mono">
                  <span className="text-emerald-400">Evaluating: p99 Latency resilience</span>
                  <button
                    className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                    onClick={() => switchFold(1)}
                  >
                    Jump into Live Topology Arena →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FOLD 2: INTERACTIVE ARCHITECTURE SIMULATION WORKSPACE ==================== */}
        <section
          className={`binder-fold-card absolute inset-0 pt-16 pb-24 px-4 sm:px-8 flex flex-col justify-between overflow-hidden ${getFoldClass(
            1
          )}`}
          id="fold-1"
        >
          {/* Section Mini Title Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 max-w-7xl mx-auto w-full pt-2 pb-1">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-[10px] font-mono text-cyan-400 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Live Spatial Simulation Canvas
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white tracking-tight leading-tight">
                Interactive Architecture Canvas &amp; Live Simulation
              </h2>
              <p className="text-xs text-slate-400 font-light hidden sm:block">
                Experience our 3-panel developer workspace: Palette, Live Topology Node Graph, and AI Socratic Inspector.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs font-mono text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] transition"
                onClick={() => switchFold(0)}
              >
                ← Previous
              </button>
              <button
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg bg-cyan-950/50 border border-cyan-800/40 transition"
                onClick={() => switchFold(2)}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Main Canvas Container */}
          <div className="relative max-w-7xl mx-auto w-full flex-1 rounded-2xl border border-white/[0.08] bg-[#070d18] shadow-2xl overflow-hidden flex flex-col my-1">
            {/* Control Bar */}
            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="font-medium text-slate-400 hidden sm:inline">Scenario:</span>
                <span className="text-cyan-300 font-semibold bg-cyan-950/80 px-2.5 py-0.5 rounded-md border border-cyan-800/60 font-mono text-[11px] truncate max-w-[240px] sm:max-w-none">
                  Netflix Video Recommendation Engine (100M Daily Users)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-slate-400 text-[11px]">Traffic:</span>
                  <span
                    className="text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900/60 text-xs"
                    id="qps-counter"
                  >
                    {isSimulating ? `${qps.toLocaleString()} QPS` : "0 QPS (Idle)"}
                  </span>
                </div>
                <div className="hidden md:flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-slate-400 text-[11px]">p99 Latency:</span>
                  <span className="text-emerald-400 font-bold">14.2 ms</span>
                </div>
                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition duration-150 active:scale-95 ${
                    isSimulating
                      ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  {isSimulating ? (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Simulating Traffic</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3 h-3 fill-current" />
                      <span>Traffic Paused</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setDrawerOpen(!drawerOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-950/70 hover:bg-violet-900/70 border border-violet-500/40 text-violet-300 font-medium text-xs transition active:scale-95"
                >
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  <span className="hidden sm:inline">AI Architect Coach</span>
                  <span className="sm:hidden">AI</span>
                </button>
                <Link
                  href="/design"
                  className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-mono font-medium transition"
                >
                  Open Full Canvas
                </Link>
              </div>
            </div>

            {/* 3-Panel Arena Body */}
            <div className="relative flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
              {/* LEFT PANEL: Component Palette */}
              <div className="hidden lg:flex lg:col-span-3 border-r border-white/[0.06] bg-[#091122]/90 p-4 flex-col justify-between overflow-y-auto">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.06] text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    <span>Building Blocks</span>
                    <span className="text-cyan-400 font-semibold">11 Palette Types</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-white/[0.05] hover:border-cyan-500/50 cursor-pointer text-xs group transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-mono text-[11px] border border-sky-500/25">
                          LB
                        </span>
                        <span className="font-medium text-slate-200">Load Balancer</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-400">
                        NGINX
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-white/[0.05] hover:border-cyan-500/50 cursor-pointer text-xs group transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-mono text-[11px] border border-purple-500/25">
                          API
                        </span>
                        <span className="font-medium text-slate-200">API Gateway</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-400">
                        Limiter
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-white/[0.05] hover:border-cyan-500/50 cursor-pointer text-xs group transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono text-[11px] border border-emerald-500/25">
                          SVC
                        </span>
                        <span className="font-medium text-slate-200">Rec Microservice</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-400">
                        gRPC
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-white/[0.05] hover:border-cyan-500/50 cursor-pointer text-xs group transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-mono text-[11px] border border-rose-500/25">
                          RED
                        </span>
                        <span className="font-medium text-slate-200">Redis Cache</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-400">
                        Cluster
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-white/[0.05] hover:border-cyan-500/50 cursor-pointer text-xs group transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-mono text-[11px] border border-blue-500/25">
                          DB
                        </span>
                        <span className="font-medium text-slate-200">PostgreSQL (Primary)</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-400">
                        ACID
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-white/[0.05] hover:border-cyan-500/50 cursor-pointer text-xs group transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono text-[11px] border border-amber-500/25">
                          MQ
                        </span>
                        <span className="font-medium text-slate-200">Apache Kafka</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-400">
                        Stream
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-900/40 text-[10.5px] text-cyan-300">
                  <span className="font-semibold block mb-0.5">Architecture Tip:</span>
                  Decouple user video impressions into Kafka before processing ranking pipelines.
                </div>
              </div>

              {/* CENTER TOPOLOGY GRAPH WITH LIVE ANIMATED FLOW PACKETS */}
              <div
                className="lg:col-span-9 relative bg-[#050a16] p-4 sm:p-6 flex items-center justify-center overflow-hidden"
                id="topology-canvas"
              >
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

                {/* Curved SVG Trajectories */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  preserveAspectRatio="none"
                  viewBox="0 0 800 460"
                >
                  <defs>
                    <linearGradient id="cyanTrail" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
                    </linearGradient>
                    <linearGradient id="purpleTrail" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#c084fc" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>
                  <path
                    className="traffic-flow-fast"
                    d="M 120 230 C 180 230, 190 230, 230 230"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />
                  <path
                    className="traffic-flow"
                    d="M 285 220 C 340 160, 390 140, 460 140"
                    fill="none"
                    stroke="url(#cyanTrail)"
                    strokeWidth="2"
                  />
                  <path
                    className="traffic-flow"
                    d="M 285 240 C 340 300, 390 320, 460 320"
                    fill="none"
                    stroke="url(#purpleTrail)"
                    strokeWidth="2"
                  />
                  <path
                    className="traffic-flow-fast"
                    d="M 570 130 C 620 110, 650 100, 690 100"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M 570 150 C 620 180, 640 210, 690 220"
                    fill="none"
                    stroke="#64748b"
                    strokeDasharray="4,4"
                    strokeWidth="1.8"
                  />
                  <path
                    className="traffic-flow-reverse"
                    d="M 550 320 C 640 320, 670 280, 710 240"
                    fill="none"
                    stroke="#f59e0b"
                    strokeOpacity="0.75"
                    strokeWidth="1.8"
                  />
                </svg>

                {/* Topology Nodes */}
                <div className="relative z-10 w-full flex items-center justify-between px-2 sm:px-8">
                  {/* Node 1: Client Fleet */}
                  <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-slate-900/90 border-2 border-slate-700/80 group-hover:border-sky-400 flex items-center justify-center text-slate-300 shadow-xl transition-all group-hover:scale-105">
                      <Globe className="w-6 h-6 text-sky-400" />
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-300">100M Clients</span>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                      Edge
                    </span>
                  </div>

                  {/* Node 2: Central API Gateway Core */}
                  <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-950/90 border-2 border-cyan-400 flex flex-col items-center justify-center text-cyan-300 shadow-2xl shadow-cyan-500/30 group-hover:scale-110 transition-all">
                      <ShieldCheck className="w-5 h-5 text-cyan-300 mb-0.5 animate-pulse" />
                      <span className="text-[9px] font-extrabold tracking-wider">GATEWAY</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-emerald-400">Auth &amp; Rate</span>
                    <span className="text-[10px] font-mono text-slate-400">25,000 QPS</span>
                  </div>

                  {/* Node 3: Microservice Cluster & Event Stream */}
                  <div className="flex flex-col gap-10 items-center">
                    <div className="flex flex-col items-center gap-1 group cursor-pointer">
                      <div className="px-3.5 py-2 rounded-xl bg-indigo-950/90 border-2 border-indigo-400 text-white flex items-center gap-2 shadow-xl shadow-indigo-500/25 group-hover:scale-105 transition-all">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold font-mono">Ranking SVC (x12)</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-300">Go / Vector Search</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 group cursor-pointer">
                      <div className="px-3 py-2 rounded-xl bg-slate-900/90 border-2 border-amber-500/70 text-slate-200 flex items-center gap-2 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-all">
                        <Radio className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                        <span className="text-xs font-bold font-mono">Kafka Logs</span>
                      </div>
                      <span className="text-[9px] font-mono text-amber-400">450k/sec</span>
                    </div>
                  </div>

                  {/* Node 4: Storage & Caching Cluster */}
                  <div className="flex flex-col gap-8 items-center">
                    <div className="flex flex-col items-center gap-1 group cursor-pointer">
                      <div className="px-3 py-2 rounded-xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 flex items-center gap-1.5 shadow-xl shadow-rose-500/25 group-hover:scale-105 transition-all">
                        <Zap className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-xs font-bold font-mono">Redis Cache</span>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400">98.4% Hit Rate</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 group cursor-pointer">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border-2 border-blue-500/70 text-slate-300 flex items-center gap-1.5 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all">
                        <Database className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs font-bold font-mono">PostgreSQL</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">Master + 3 Replicas</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Telemetry Bar */}
                <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2 bg-slate-900/90 border border-white/[0.06] px-3 py-1 rounded-lg text-[10.5px] text-slate-400 font-mono pointer-events-auto">
                    <span className="text-emerald-400">● 100% Availability</span>
                    <span className="text-slate-600">|</span>
                    <span>Cluster: us-east-1</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-cyan-400">Active Topology: Mesh v2.4</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 hidden sm:block">
                    Click nodes on canvas to inspect telemetry
                  </div>
                </div>
              </div>

              {/* SLIDE-DRAWER / EMBEDDED AI SOCRATIC COACH */}
              <div
                className={`absolute inset-y-0 right-0 w-full sm:w-[380px] bg-[#091122]/95 backdrop-blur-2xl border-l border-violet-500/40 p-5 flex flex-col justify-between z-30 transition-transform duration-300 shadow-2xl ${
                  drawerOpen ? "translate-x-0" : "translate-x-full"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center font-bold text-xs border border-violet-500/40">
                        AI
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Senior Staff Coach</span>
                        <span className="text-[9px] text-violet-400 font-mono">
                          Socratic Architect Inspector
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setDrawerOpen(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                      title="Close Drawer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-slate-900/95 border border-violet-500/40 text-xs shadow-lg">
                      <div className="flex items-center gap-2 text-violet-300 font-semibold mb-1.5">
                        <Cpu className="w-3.5 h-3.5 text-violet-400" />
                        <span>Critical Socratic Challenge</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px] font-light">
                        &quot;At 25k QPS, what happens if your{" "}
                        <span className="text-rose-400 font-mono font-medium">
                          Redis cache cluster
                        </span>{" "}
                        suffers a node failover during high evening prime-time traffic?&quot;
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex flex-col gap-1.5">
                        <button
                          onClick={() => {
                            setDrawerOpen(false);
                            switchFold(2);
                          }}
                          className="text-left text-[10.5px] text-cyan-300 hover:text-cyan-200 bg-cyan-950/50 p-2 rounded-lg transition border border-cyan-800/40"
                        >
                          👉 Suggest: Introduce Circuit Breaker + Stale Cache Policy
                        </button>
                        <button
                          onClick={() => {
                            setDrawerOpen(false);
                            switchFold(2);
                          }}
                          className="text-left text-[10.5px] text-slate-300 hover:text-white bg-slate-800/70 p-2 rounded-lg transition border border-slate-700/50"
                        >
                          👉 Evaluate: Fallback database connection pool exhaustion
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/70 border border-white/[0.06] text-xs">
                      <div className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wide mb-2 flex items-center justify-between">
                        <span>Selected Node Specs</span>
                        <span className="text-emerald-400">Active</span>
                      </div>
                      <div className="space-y-1.5 font-mono text-[10.5px]">
                        <div className="flex justify-between text-slate-300">
                          <span>Node Type:</span>
                          <span className="text-white font-medium">Redis v7.2 Cluster</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Eviction:</span>
                          <span className="text-cyan-400">volatile-lru</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Replication:</span>
                          <span className="text-emerald-400">Async (Multi-AZ)</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Memory Cap:</span>
                          <span className="text-white">64 GB / Node</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/[0.06]">
                  <Link
                    href="/interview"
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition"
                  >
                    <span>Launch AI Mock Interview</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FOLD 3: THE 6 ARCHITECTURAL INVARIANTS & 3 CAPABILITY PILLARS ==================== */}
        <section
          className={`binder-fold-card absolute inset-0 pt-16 pb-24 px-6 sm:px-10 flex flex-col justify-between overflow-y-auto custom-scrollbar ${getFoldClass(
            2
          )}`}
          id="fold-2"
        >
          <div className="max-w-7xl mx-auto w-full pt-4">
            {/* Eyebrow with loop shortcut hint */}
            <div className="text-center mb-6 flex items-center justify-center gap-3">
              <span className="text-[10px] font-mono font-semibold tracking-widest text-cyan-400/90 uppercase px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-800/30">
                THE 6 ARCHITECTURAL INVARIANTS DESIGNKARO FORCES YOU TO ANSWER
              </span>
            </div>

            {/* 6 Invariants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {/* Pillar 1: WHAT */}
              <div className="zen-bento-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.05]">
                    <span className="text-xs font-mono font-bold text-cyan-400 tracking-widest">
                      WHAT?
                    </span>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                  </div>
                  <h4 className="text-base font-bold font-display text-white mb-1 group-hover:text-cyan-300 transition-colors">
                    Functional Bounds
                  </h4>
                  <p className="text-xs font-light text-slate-400 leading-relaxed">
                    Define scope, strict API contracts, and user flows
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/[0.03] flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>01 / BOUNDARY</span>
                  <span className="text-cyan-400/60 font-semibold group-hover:text-cyan-300">
                    STRICT SCOPE →
                  </span>
                </div>
              </div>

              {/* Pillar 2: WHY */}
              <div className="zen-bento-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.05]">
                    <span className="text-xs font-mono font-bold text-sky-400 tracking-widest">
                      WHY?
                    </span>
                    <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                  </div>
                  <h4 className="text-base font-bold font-display text-white mb-1 group-hover:text-sky-300 transition-colors">
                    Quantitative Math
                  </h4>
                  <p className="text-xs font-light text-slate-400 leading-relaxed">
                    Back-of-envelope calculations, QPS, IOPS &amp; egress
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/[0.03] flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>02 / ESTIMATION</span>
                  <span className="text-sky-400/60 font-semibold group-hover:text-sky-300">
                    NUMBERS FIRST →
                  </span>
                </div>
              </div>

              {/* Pillar 3: WHAT IF */}
              <div className="zen-bento-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.05]">
                    <span className="text-xs font-mono font-bold text-amber-400 tracking-widest">
                      WHAT IF?
                    </span>
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                  </div>
                  <h4 className="text-base font-bold font-display text-white mb-1 group-hover:text-amber-300 transition-colors">
                    10x Traffic Spikes
                  </h4>
                  <p className="text-xs font-light text-slate-400 leading-relaxed">
                    Burst resilience, backpressure, and graceful degradation
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/[0.03] flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>03 / SPIKE PROOF</span>
                  <span className="text-amber-400/60 font-semibold group-hover:text-amber-300">
                    BACKPRESSURE →
                  </span>
                </div>
              </div>

              {/* Pillar 4: WHAT BREAKS */}
              <div className="zen-bento-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.05]">
                    <span className="text-xs font-mono font-bold text-rose-400 tracking-widest">
                      WHAT BREAKS?
                    </span>
                    <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#fb7185]" />
                  </div>
                  <h4 className="text-base font-bold font-display text-white mb-1 group-hover:text-rose-300 transition-colors">
                    Single Points of Failure
                  </h4>
                  <p className="text-xs font-light text-slate-400 leading-relaxed">
                    Cascading drops, partition nets &amp; circuit breaker tests
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/[0.03] flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>04 / RESILIENCE</span>
                  <span className="text-rose-400/60 font-semibold group-hover:text-rose-300">
                    CIRCUIT BREAKERS →
                  </span>
                </div>
              </div>

              {/* Pillar 5: HOW SCALE */}
              <div className="zen-bento-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.05]">
                    <span className="text-xs font-mono font-bold text-emerald-400 tracking-widest">
                      HOW SCALE?
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  </div>
                  <h4 className="text-base font-bold font-display text-white mb-1 group-hover:text-emerald-300 transition-colors">
                    Sharding &amp; Caching
                  </h4>
                  <p className="text-xs font-light text-slate-400 leading-relaxed">
                    Consistent hashing, multi-tier cache, read replicas
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/[0.03] flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>05 / DISTRIBUTION</span>
                  <span className="text-emerald-400/60 font-semibold group-hover:text-emerald-300">
                    HASH RINGS →
                  </span>
                </div>
              </div>

              {/* Pillar 6: TRADE-OFFS */}
              <div className="zen-bento-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.05]">
                    <span className="text-xs font-mono font-bold text-violet-400 tracking-widest">
                      TRADE-OFFS?
                    </span>
                    <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa]" />
                  </div>
                  <h4 className="text-base font-bold font-display text-white mb-1 group-hover:text-violet-300 transition-colors">
                    Latency vs Consistency
                  </h4>
                  <p className="text-xs font-light text-slate-400 leading-relaxed">
                    CAP theorem compromises, ACID vs BASE storage
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/[0.03] flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>06 / CAP THEOREM</span>
                  <span className="text-violet-400/60 font-semibold group-hover:text-violet-300">
                    STRICT TRADE-OFF →
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Capability Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="zen-bento-card p-5 rounded-2xl group">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold font-display text-white mb-1.5">
                  Chaos Engineering Tests
                </h3>
                <p className="text-xs font-light text-slate-400 leading-relaxed">
                  Trigger packet drops, database network partitions, and spike loads to observe how your designed distributed system reacts under real chaos.
                </p>
              </div>

              <div className="zen-bento-card p-5 rounded-2xl group">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold font-display text-white mb-1.5">
                  Socratic AI Interviewer
                </h3>
                <p className="text-xs font-light text-slate-400 leading-relaxed">
                  Stop reciting generic high-level architectures. Our conversational AI challenges your decisions in real-time, asking &quot;Why Redis over Memcached here?&quot;.
                </p>
              </div>

              <div className="zen-bento-card p-5 rounded-2xl group">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-3 border border-sky-500/20 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold font-display text-white mb-1.5">
                  Live Cost &amp; Cloud Estimation
                </h3>
                <p className="text-xs font-light text-slate-400 leading-relaxed">
                  Every node computes real AWS/GCP bills. Learn how your design decisions impact infrastructure cost, cross-AZ traffic, and compute efficiency.
                </p>
              </div>
            </div>

            {/* Continuous Loop Return Action Banner */}
            <div className="my-6 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-sky-950/30 to-indigo-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Closed-Loop 360° Continuity</div>
                  <div className="text-[11px] text-slate-400">
                    Jump forward seamlessly back to the Hero Diagnostic canvas or explore earlier folds.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-slate-300 transition"
                  onClick={() => switchFold(1)}
                >
                  ← Previous
                </button>
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold transition shadow-lg shadow-cyan-500/20 active:scale-95"
                  onClick={() => switchFold(0)}
                >
                  <span>Return to Start</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Compact Footer Embedded in Fold 3 */}
            <footer className="border-t border-white/[0.06] pt-4 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-300 font-display tracking-tight text-sm">
                  Design<span className="text-cyan-400">Karo</span>
                </span>
                <span>© 2026. Built for distributed engineers.</span>
              </div>
              <div className="flex items-center gap-5">
                <Link className="hover:text-cyan-400 transition" href="/learn">
                  Curriculum
                </Link>
                <Link className="hover:text-cyan-400 transition" href="/practice">
                  Scenario Catalog
                </Link>
                <Link className="hover:text-cyan-400 transition" href="/design">
                  Canvas
                </Link>
                <a
                  className="hover:text-cyan-400 transition"
                  href="http://127.0.0.1:8000/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  API Docs
                </a>
              </div>
            </footer>
          </div>
        </section>
      </div>

      {/* FIXED SLEEK FLOATING 3D CLOSED-LOOP FOLD DOCK */}
      <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
        <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-xl border border-white/[0.1] rounded-2xl px-3 py-2 flex items-center gap-3 shadow-2xl">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              onClick={() => switchFold(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`rounded-full transition-all duration-300 ${
                idx === currentFoldIndex
                  ? "w-6 h-2 bg-cyan-400 shadow-[0_0_12px_#06b6d4]"
                  : "w-2 h-2 bg-slate-600 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
