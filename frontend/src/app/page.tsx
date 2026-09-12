"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Globe,
  Database,
  Radio,
  Server,
  Zap,
  ArrowRight,
  ArrowDown,
  X,
  Play,
  Pause,
  Compass,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Activity,
  Box,
  Terminal,
  ChevronRight,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { useAuthStore } from "@/lib/authStore";

interface ArchNode {
  id: string;
  relX: number;
  relY: number;
  label: string;
  type: string;
  color: string;
  sublabel: string;
  telemetry: string;
}

interface Packet {
  edgeIndex: number;
  progress: number;
  speed: number;
  color: string;
  size: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

interface ArchContext {
  id: string;
  name: string;
  icon: string;
  description: string;
  telemetry: string;
  packetColors: string[];
  speedMultiplier: number;
  activeEdges: number[];
}

export default function LandingPage() {
  // Auth Store
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  // Traffic simulation inside Simulation Arena Section
  const [isSimulating, setIsSimulating] = useState(true);
  const [qps, setQps] = useState(24453);

  // AI Socratic drawer state in Simulation Arena
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Active Architectural Context for the Canvas Animation
  const [activeContext, setActiveContext] = useState<string>("global");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const ripplesRef = useRef<Ripple[]>([]);

  // Architectural Context Definitions
  const contexts: ArchContext[] = useMemo(
    () => [
      {
        id: "global",
        name: "Global Distributed Mesh",
        icon: "🌐",
        description: "Multi-region active-active topology with edge caching and read replicas",
        telemetry: "280,000 QPS • p99 Latency: 4.2ms • 99.999% SLA",
        packetColors: ["#38bdf8", "#06b6d4", "#818cf8"],
        speedMultiplier: 1.0,
        activeEdges: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      },
      {
        id: "flashsale",
        name: "Flash Sale Traffic Surge",
        icon: "⚡",
        description: "10x QPS spike absorbed by Redis cache shields and Kafka backpressure",
        telemetry: "1,450,000 QPS • Redis Hit: 99.6% • Kafka: 2.8M msg/s",
        packetColors: ["#f43f5e", "#f59e0b", "#fbbf24"],
        speedMultiplier: 2.4,
        activeEdges: [0, 1, 2, 3, 4, 5, 6, 7, 10],
      },
      {
        id: "eventstream",
        name: "Kafka Event-Driven Fanout",
        icon: "📡",
        description: "Real-time pub/sub event stream with idempotent worker consumer groups",
        telemetry: "4,200,000 Events/sec • Partition Count: 64 • 0ms Lag",
        packetColors: ["#f59e0b", "#10b981", "#818cf8"],
        speedMultiplier: 1.7,
        activeEdges: [2, 4, 7, 10, 11],
      },
      {
        id: "aisearch",
        name: "AI & Vector Search",
        icon: "🧠",
        description: "High-dimensional embeddings retrieval with HNSW cosine similarity index",
        telemetry: "Cosine Index: 1536-dim • Vector DB: 18ms p95 • Hybrid RAG",
        packetColors: ["#c084fc", "#a855f7", "#38bdf8"],
        speedMultiplier: 1.3,
        activeEdges: [0, 2, 4, 6, 9],
      },
    ],
    []
  );

  const activeContextData =
    contexts.find((c) => c.id === activeContext) || contexts[0];

  // Traffic Simulation jitter in Arena
  useEffect(() => {
    if (!isSimulating) return;
    const timer = setInterval(() => {
      const base = 25000;
      const variation = Math.floor(Math.random() * 2400) - 1200;
      setQps(base + variation);
    }, 1200);
    return () => clearInterval(timer);
  }, [isSimulating]);

  // Context-Aware Background Distributed Architecture Canvas Animation
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

    // Distributed Architecture Network Nodes (Context-Aware)
    const nodes: ArchNode[] = [
      { id: "clients", relX: 0.09, relY: 0.28, label: "Edge Clients", type: "CLIENT", color: "#38bdf8", sublabel: "iOS / Web / IoT", telemetry: "240k QPS" },
      { id: "cdn", relX: 0.22, relY: 0.18, label: "Cloudflare CDN", type: "CDN", color: "#0ea5e9", sublabel: "Anycast 94% Cache", telemetry: "p99 1.8ms" },
      { id: "lb", relX: 0.18, relY: 0.68, label: "Global LB (Envoy)", type: "LB", color: "#06b6d4", sublabel: "Consistent Hash", telemetry: "Round-Robin" },
      { id: "gw", relX: 0.32, relY: 0.38, label: "API Gateway", type: "GW", color: "#38bdf8", sublabel: "Rate Limiter", telemetry: "Token Bucket OK" },
      { id: "authSvc", relX: 0.48, relY: 0.18, label: "Auth & Session", type: "SVC", color: "#818cf8", sublabel: "Go / gRPC", telemetry: "JWT Valid" },
      { id: "orderSvc", relX: 0.50, relY: 0.52, label: "Core Microservices", type: "SVC", color: "#a855f7", sublabel: "Rust / Axum", telemetry: "Autoscale 32" },
      { id: "redis", relX: 0.70, relY: 0.20, label: "Redis Cluster", type: "CACHE", color: "#f43f5e", sublabel: "In-Memory", telemetry: "99.4% Hit Rate" },
      { id: "kafka", relX: 0.50, relY: 0.82, label: "Apache Kafka", type: "MQ", color: "#f59e0b", sublabel: "Event Bus", telemetry: "4.2M msg/sec" },
      { id: "postgres", relX: 0.74, relY: 0.62, label: "PostgreSQL Master", type: "DB", color: "#3b82f6", sublabel: "Primary-Replica", telemetry: "WAL Synced" },
      { id: "vector", relX: 0.88, relY: 0.32, label: "Vector Search DB", type: "VEC", color: "#c084fc", sublabel: "HNSW Embeddings", telemetry: "Cosine Sim 1536" },
      { id: "s3", relX: 0.88, relY: 0.78, label: "Object Blob Storage", type: "S3", color: "#10b981", sublabel: "Multi-AZ S3", telemetry: "99.999999999%" },
    ];

    // Edges connecting architecture nodes
    const edges: [number, number][] = [
      [0, 1], // 0: clients -> cdn
      [1, 2], // 1: cdn -> lb
      [2, 3], // 2: lb -> gw
      [3, 4], // 3: gw -> authSvc
      [3, 5], // 4: gw -> orderSvc
      [4, 6], // 5: authSvc -> redis
      [5, 6], // 6: orderSvc -> redis
      [5, 7], // 7: orderSvc -> kafka
      [5, 8], // 8: orderSvc -> postgres
      [5, 9], // 9: orderSvc -> vector
      [7, 8], // 10: kafka -> postgres
      [8, 10], // 11: postgres -> s3
    ];

    // Live Packets
    const packetCount = 28;
    const packets: Packet[] = [];
    for (let i = 0; i < packetCount; i++) {
      packets.push({
        edgeIndex: Math.floor(Math.random() * edges.length),
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
        color: "#38bdf8",
        size: 3 + Math.random() * 1.5,
      });
    }

    // Starfield for deep ambient space
    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.6 + 0.1,
    }));

    let pulseTime = 0;

    function render() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      pulseTime += 0.025;

      const currentContext = contexts.find((c) => c.id === activeContext) || contexts[0];
      const speedMult = currentContext.speedMultiplier;
      const palette = currentContext.packetColors;
      const activeEdgeSet = new Set(currentContext.activeEdges);

      // 1. Draw Starfield
      for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${star.alpha})`;
        ctx.fill();
      }

      // 2. Draw Ripples (from user clicks)
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 5;
        r.opacity = Math.max(0, 1 - r.radius / r.maxRadius);

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${r.opacity * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
        }
      }

      // 3. Draw Network Edges (Circuit tracks)
      for (let i = 0; i < edges.length; i++) {
        const [fromIdx, toIdx] = edges[i];
        const n1 = nodes[fromIdx];
        const n2 = nodes[toIdx];

        const x1 = n1.relX * w;
        const y1 = n1.relY * h;
        const x2 = n2.relX * w;
        const y2 = n2.relY * h;

        const isEdgeActiveInContext = activeEdgeSet.has(i);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        if (isEdgeActiveInContext) {
          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, "rgba(56, 189, 248, 0.25)");
          grad.addColorStop(0.5, "rgba(129, 140, 248, 0.4)");
          grad.addColorStop(1, "rgba(6, 182, 212, 0.25)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.8;
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      }

      // 4. Draw Moving Data Packets with Glowing Trails
      for (const p of packets) {
        // Adjust speed by context multiplier
        p.progress += p.speed * speedMult;
        if (p.progress > 1) {
          p.progress = 0;
          // Prefer active edges for this context
          if (Math.random() < 0.85 && currentContext.activeEdges.length > 0) {
            const rIdx = Math.floor(Math.random() * currentContext.activeEdges.length);
            p.edgeIndex = currentContext.activeEdges[rIdx];
          } else {
            p.edgeIndex = Math.floor(Math.random() * edges.length);
          }
          p.color = palette[Math.floor(Math.random() * palette.length)];
        }

        const [fromIdx, toIdx] = edges[p.edgeIndex];
        const n1 = nodes[fromIdx];
        const n2 = nodes[toIdx];

        const x1 = n1.relX * w;
        const y1 = n1.relY * h;
        const x2 = n2.relX * w;
        const y2 = n2.relY * h;

        const curX = x1 + (x2 - x1) * p.progress;
        const curY = y1 + (y2 - y1) * p.progress;

        // Packet Head
        ctx.beginPath();
        ctx.arc(curX, curY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Packet Trail
        const tailProg = Math.max(0, p.progress - 0.06);
        const tailX = x1 + (x2 - x1) * tailProg;
        const tailY = y1 + (y2 - y1) * tailProg;
        ctx.beginPath();
        ctx.moveTo(curX, curY);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.7;
        ctx.stroke();
      }

      // 5. Draw Distributed Architecture Nodes
      const mouse = mousePosRef.current;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nx = node.relX * w;
        const ny = node.relY * h;

        const distToMouse = Math.hypot(mouse.x - nx, mouse.y - ny);
        const isNear = distToMouse < 160;

        // Ambient Aura
        const baseRadius = isNear ? 18 : 13;
        const pulse = Math.sin(pulseTime + i * 0.8) * 3;
        const auraRadius = baseRadius + pulse;

        ctx.beginPath();
        ctx.arc(nx, ny, auraRadius, 0, Math.PI * 2);
        ctx.fillStyle = isNear ? "rgba(56, 189, 248, 0.35)" : "rgba(6, 182, 212, 0.09)";
        ctx.fill();

        // Node Circle Core
        ctx.beginPath();
        ctx.arc(nx, ny, baseRadius - 4, 0, Math.PI * 2);
        ctx.fillStyle = isNear ? "#0ea5e9" : "#0a1120";
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = isNear ? 18 : 8;
        ctx.shadowColor = node.color;
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Center Indicator
        ctx.beginPath();
        ctx.arc(nx, ny, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Labels & Live Telemetry HUD (visible on medium & larger displays)
        if (w > 768) {
          ctx.font = "bold 11px 'JetBrains Mono', monospace";
          ctx.fillStyle = isNear ? "#ffffff" : "rgba(226, 232, 240, 0.85)";
          ctx.fillText(node.label, nx + 18, ny - 4);

          ctx.font = "9px 'JetBrains Mono', monospace";
          ctx.fillStyle = isNear ? node.color : "rgba(148, 163, 184, 0.75)";
          ctx.fillText(isNear ? `⚡ ${node.telemetry}` : node.sublabel, nx + 18, ny + 9);
        }
      }

      animFrameId = requestAnimationFrame(render);
    }
    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrameId);
    };
  }, [activeContext, contexts]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasMouseLeave = () => {
    mousePosRef.current = { x: -1000, y: -1000 };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    ripplesRef.current.push({
      x: e.clientX,
      y: e.clientY,
      radius: 0,
      maxRadius: 320,
      opacity: 1,
    });
  };

  return (
    <div className="bg-[#050914] text-slate-200 min-h-screen w-full font-sans antialiased relative selection:bg-cyan-500 selection:text-slate-950">
      {/* ==================== FIXED TOP HEADER ==================== */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-2xl px-6 sm:px-10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/15">
              <div className="w-full h-full bg-[#050914] rounded-[10px] flex items-center justify-center">
                <Layers className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white font-display">
                Design<span className="text-cyan-400">Karo</span>
              </span>
              <span className="text-[10px] text-slate-400 font-light hidden sm:block tracking-wide">
                Socho. Design Karo. Scale Karo.
              </span>
            </div>
          </Link>

          {/* Quick Route Nav */}
          <nav className="hidden lg:flex items-center gap-1 font-mono text-xs text-slate-400">
            <Link
              href="/learn"
              className="px-3 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              LEARN
            </Link>
            <Link
              href="/practice"
              className="px-3 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              PRACTICE
            </Link>
            <Link
              href="/design"
              className="px-3 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              CANVAS
            </Link>
            <a
              href="#simulation-arena"
              className="px-3 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              SIMULATE
            </a>
            <a
              href="#invariants"
              className="px-3 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              INVARIANTS
            </a>
            <Link
              href="/interview"
              className="px-3 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              INTERVIEW
            </Link>
            <Link
              href="/progress"
              className="px-3 py-1 rounded-md hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
            >
              PROGRESS
            </Link>
          </nav>
        </div>

        {/* Auth & CTA */}
        <div className="flex items-center gap-3 sm:gap-4">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
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

      {/* ==================== HERO SECTION (PERFECTLY CENTERED HEADLINE & CONTEXT ANIMATION) ==================== */}
      <section className="relative w-full h-screen min-h-[640px] flex flex-col justify-center items-center text-center px-4 overflow-hidden pt-16">
        {/* Context-Aware Distributed Architecture Canvas */}
        <canvas
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          onClick={handleCanvasClick}
          className="absolute inset-0 w-full h-full pointer-events-auto z-0 cursor-crosshair"
          title="Click to emit architecture ripple wave"
        />

        {/* Ambient Lighting Behind Centered Content */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-cyan-600/15 blur-[160px] rounded-full pointer-events-none z-[1]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none z-[1]" />

        {/* Centered Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center max-w-5xl mx-auto px-4 my-auto">
          {/* Main Headline */}
          <div className="relative group mb-6 sm:mb-8">
            <div className="absolute -inset-10 bg-gradient-to-r from-cyan-500/20 via-sky-500/10 to-indigo-500/20 blur-3xl opacity-70 group-hover:opacity-100 transition duration-1000 -z-10" />

            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[6.5rem] font-black font-display text-white leading-[1.04] tracking-[-0.03em] drop-shadow-2xl">
              Socho. Design Karo.
              <br />
              <span className="text-gradient-scale text-glow">Scale Karo.</span>
            </h1>
          </div>

          {/* Centered Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            <Link
              href="/design"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-extrabold text-sm sm:text-base tracking-wide transition-all duration-200 shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-400/50 hover:scale-105 active:scale-95"
            >
              <Zap className="w-5 h-5 fill-current text-slate-950" />
              <span>Start System Design</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </Link>

            <Link
              href="/practice"
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.15] text-white font-semibold text-sm sm:text-base transition-all duration-200 backdrop-blur-xl hover:scale-105 active:scale-95"
            >
              <Compass className="w-5 h-5 text-cyan-400" />
              <span>Practice FAANG Problems</span>
            </Link>

            <a
              href="#simulation-arena"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 font-medium text-sm transition-all duration-200 backdrop-blur-xl hover:scale-105 active:scale-95"
            >
              <Play className="w-4 h-4 fill-current text-cyan-400" />
              <span>Live Simulation Arena ↓</span>
            </a>
          </div>

          {/* Architectural Background Context Selector */}
          <div className="mt-8 sm:mt-10 flex flex-col items-center gap-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[11px] uppercase tracking-wider text-slate-400">
                Architecture Background Context:
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-950/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/[0.1] shadow-2xl">
              {contexts.map((ctx) => (
                <button
                  key={ctx.id}
                  onClick={() => setActiveContext(ctx.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all duration-200 flex items-center gap-2 ${
                    activeContext === ctx.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold scale-105"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent"
                  }`}
                >
                  <span>{ctx.icon}</span>
                  <span>{ctx.name}</span>
                </button>
              ))}
            </div>

            {/* Dynamic Telemetry Pill */}
            <div className="text-[11px] font-mono text-cyan-400/90 bg-cyan-950/60 px-4 py-1.5 rounded-full border border-cyan-800/40 mt-1 flex items-center gap-2 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{activeContextData.telemetry}</span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-5 inset-x-0 flex flex-col items-center justify-center pointer-events-none z-10 text-slate-500 hover:text-slate-300 transition text-xs font-mono">
          <a
            href="#simulation-arena"
            className="pointer-events-auto flex flex-col items-center gap-1 opacity-70 hover:opacity-100 transition"
          >
            <span>Scroll to explore Live Simulation Arena</span>
            <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1">
              <div className="w-1.5 h-2 bg-cyan-400 rounded-full animate-bounce" />
            </div>
          </a>
        </div>
      </section>

      {/* ==================== SECTION 2: INTERACTIVE SIMULATION WORKSPACE ARENA ==================== */}
      <section
        id="simulation-arena"
        className="relative w-full py-20 px-4 sm:px-8 border-t border-white/[0.06] bg-[#060b18]"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-4 border-b border-white/[0.06]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-xs font-mono text-cyan-400 mb-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Live Spatial Simulation Arena
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                Interactive Architecture Simulation Workspace
              </h2>
              <p className="text-sm text-slate-400 font-light mt-1">
                Experience real distributed traffic, fault injections, and AI Socratic mentoring live in the browser.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/design"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition shadow-lg shadow-cyan-500/20"
              >
                <span>Launch Full Canvas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Main Simulation Container */}
          <div className="relative w-full rounded-2xl border border-white/[0.08] bg-[#070d18] shadow-2xl overflow-hidden flex flex-col">
            {/* Control Bar */}
            <div className="px-4 py-3 bg-slate-900/90 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
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
              </div>
            </div>

            {/* 3-Panel Arena Body */}
            <div className="relative flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-[440px]">
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
                    strokeWidth="1.5"
                  />
                </svg>

                {/* Nodes Grid */}
                <div className="relative z-10 w-full max-w-3xl flex items-center justify-between gap-4 py-8">
                  {/* Node: Ingress Users */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900/90 border border-sky-500/40 p-2 shadow-xl flex flex-col items-center justify-center text-center group hover:border-sky-400 transition">
                      <Globe className="w-5 h-5 text-sky-400 mb-1" />
                      <span className="text-[10px] font-mono text-slate-300 font-bold">USERS</span>
                    </div>
                    <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-900/50">
                      100M/day
                    </span>
                  </div>

                  {/* Node: Load Balancer */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900/90 border border-cyan-500/50 p-2 shadow-xl shadow-cyan-500/10 flex flex-col items-center justify-center text-center">
                      <Server className="w-5 h-5 text-cyan-400 mb-1" />
                      <span className="text-[10px] font-mono text-slate-300 font-bold">ENV_LB</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900/50">
                      Round-Robin
                    </span>
                  </div>

                  {/* Node Cluster: Microservices & Cache */}
                  <div className="flex flex-col gap-6">
                    <div className="w-20 h-16 rounded-2xl bg-slate-900/90 border border-indigo-500/40 p-2 shadow-xl flex flex-col items-center justify-center text-center">
                      <Cpu className="w-5 h-5 text-indigo-400 mb-1" />
                      <span className="text-[10px] font-mono text-slate-300 font-bold">REC_SVC</span>
                    </div>
                    <div className="w-20 h-16 rounded-2xl bg-slate-900/90 border border-amber-500/40 p-2 shadow-xl flex flex-col items-center justify-center text-center">
                      <Radio className="w-5 h-5 text-amber-400 mb-1" />
                      <span className="text-[10px] font-mono text-slate-300 font-bold">KAFKA_BUS</span>
                    </div>
                  </div>

                  {/* Node Cluster: Storage & ML Database */}
                  <div className="flex flex-col gap-6">
                    <div className="w-18 h-16 rounded-2xl bg-slate-900/90 border border-rose-500/40 p-2 shadow-xl flex flex-col items-center justify-center text-center">
                      <Database className="w-5 h-5 text-rose-400 mb-1" />
                      <span className="text-[10px] font-mono text-slate-300 font-bold">REDIS_SHARD</span>
                    </div>
                    <div className="w-18 h-16 rounded-2xl bg-slate-900/90 border border-blue-500/40 p-2 shadow-xl flex flex-col items-center justify-center text-center">
                      <Database className="w-5 h-5 text-blue-400 mb-1" />
                      <span className="text-[10px] font-mono text-slate-300 font-bold">POSTGRES</span>
                    </div>
                  </div>
                </div>

                {/* Slide-out AI Socratic Coach Drawer */}
                <div
                  className={`absolute top-0 right-0 bottom-0 w-80 bg-[#091124]/95 border-l border-white/[0.1] backdrop-blur-xl p-4 flex flex-col justify-between transition-transform duration-300 z-30 shadow-2xl ${
                    drawerOpen ? "translate-x-0" : "translate-x-full"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          Socratic AI Mentor
                        </span>
                      </div>
                      <button
                        onClick={() => setDrawerOpen(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/[0.05]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs text-violet-200 mb-3">
                      <span className="font-bold block mb-1">Architectural Challenge:</span>
                      &quot;How would you prevent a cache stampede on Redis when a popular movie drops at 12:00 AM?&quot;
                    </div>
                    <div className="space-y-2 text-xs font-mono">
                      <button className="w-full text-left p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white transition">
                        A) Mutual exclusion locks (Mutex / Singleflight)
                      </button>
                      <button className="w-full text-left p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white transition">
                        B) Probabilistic early cache recomputation (XFetch)
                      </button>
                      <button className="w-full text-left p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white transition">
                        C) Pre-warm cache via async cron 30 min before
                      </button>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/[0.06] text-[11px] font-mono text-emerald-400 flex items-center justify-between">
                    <span>Dimension: High Availability</span>
                    <span className="font-bold">Score: 92/100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 3: ARCHITECTURAL INVARIANTS (THE 6 PILLARS) ==================== */}
      <section
        id="invariants"
        className="relative w-full py-20 px-4 sm:px-8 border-t border-white/[0.06] bg-[#050914]"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-xs font-mono text-cyan-400 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Core Engineering Foundations</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
              The 6 Invariants of Scalable System Design
            </h2>
            <p className="text-sm text-slate-400 font-light mt-2">
              Every production system boils down to these 6 fundamental questions. Master them through deterministic simulation.
            </p>
          </div>

          {/* 6 Invariant Bento Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
            {/* 1. WHAT */}
            <div className="zen-bento-card rounded-2xl p-6 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                  <span className="text-xs font-mono font-bold text-cyan-400 tracking-widest">
                    WHAT?
                  </span>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                </div>
                <h3 className="text-lg font-bold font-display text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  Topology &amp; Components
                </h3>
                <p className="text-xs font-light text-slate-400 leading-relaxed">
                  Which load balancers, gateways, microservices, caches, and storage tiers form your pipeline?
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-slate-500">
                <span>01 / ARCHITECTURE</span>
                <span className="text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform">
                  EXPLORE →
                </span>
              </div>
            </div>

            {/* 2. WHY */}
            <div className="zen-bento-card rounded-2xl p-6 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                  <span className="text-xs font-mono font-bold text-sky-400 tracking-widest">
                    WHY?
                  </span>
                  <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                </div>
                <h3 className="text-lg font-bold font-display text-white mb-2 group-hover:text-sky-300 transition-colors">
                  Trade-Off Justification
                </h3>
                <p className="text-xs font-light text-slate-400 leading-relaxed">
                  Why Cassandra over PostgreSQL? Why Kafka over SQS? Defend every tool selection with latency, cost, and throughput metrics.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-slate-500">
                <span>02 / REASONING</span>
                <span className="text-sky-400 font-semibold group-hover:translate-x-1 transition-transform">
                  EXPLORE →
                </span>
              </div>
            </div>

            {/* 3. WHAT IF */}
            <div className="zen-bento-card rounded-2xl p-6 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                  <span className="text-xs font-mono font-bold text-amber-400 tracking-widest">
                    WHAT IF?
                  </span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                </div>
                <h3 className="text-lg font-bold font-display text-white mb-2 group-hover:text-amber-300 transition-colors">
                  Chaos &amp; Failure Modes
                </h3>
                <p className="text-xs font-light text-slate-400 leading-relaxed">
                  What happens when an entire AWS Availability Zone drops offline or your cache cluster evicts all keys?
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-slate-500">
                <span>03 / RESILIENCE</span>
                <span className="text-amber-400 font-semibold group-hover:translate-x-1 transition-transform">
                  EXPLORE →
                </span>
              </div>
            </div>

            {/* 4. WHAT BREAKS */}
            <div className="zen-bento-card rounded-2xl p-6 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                  <span className="text-xs font-mono font-bold text-rose-400 tracking-widest">
                    WHAT BREAKS?
                  </span>
                  <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]" />
                </div>
                <h3 className="text-lg font-bold font-display text-white mb-2 group-hover:text-rose-300 transition-colors">
                  Bottlenecks &amp; SPOF
                </h3>
                <p className="text-xs font-light text-slate-400 leading-relaxed">
                  Detect Single Points of Failure, memory leak cascading timeouts, database lock contention, and network backpressure.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-slate-500">
                <span>04 / BOTTLENECKS</span>
                <span className="text-rose-400 font-semibold group-hover:translate-x-1 transition-transform">
                  EXPLORE →
                </span>
              </div>
            </div>

            {/* 5. HOW SCALE */}
            <div className="zen-bento-card rounded-2xl p-6 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                  <span className="text-xs font-mono font-bold text-emerald-400 tracking-widest">
                    HOW SCALE?
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </div>
                <h3 className="text-lg font-bold font-display text-white mb-2 group-hover:text-emerald-300 transition-colors">
                  Sharding &amp; Horizontal Scale
                </h3>
                <p className="text-xs font-light text-slate-400 leading-relaxed">
                  Consistent hashing rings, partition keys, multi-tier CDN caching, read replicas, and asynchronous write-back.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-slate-500">
                <span>05 / DISTRIBUTION</span>
                <span className="text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform">
                  EXPLORE →
                </span>
              </div>
            </div>

            {/* 6. TRADE-OFFS */}
            <div className="zen-bento-card rounded-2xl p-6 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                  <span className="text-xs font-mono font-bold text-violet-400 tracking-widest">
                    TRADE-OFFS?
                  </span>
                  <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa]" />
                </div>
                <h3 className="text-lg font-bold font-display text-white mb-2 group-hover:text-violet-300 transition-colors">
                  Latency vs Consistency
                </h3>
                <p className="text-xs font-light text-slate-400 leading-relaxed">
                  CAP theorem compromises, PACELC theorem, ACID transactions vs BASE eventual consistency, and cloud costs.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-slate-500">
                <span>06 / CAP THEOREM</span>
                <span className="text-violet-400 font-semibold group-hover:translate-x-1 transition-transform">
                  EXPLORE →
                </span>
              </div>
            </div>
          </div>

          {/* 3 Capability Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="zen-bento-card p-6 rounded-2xl group">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold font-display text-white mb-2">
                Chaos Engineering Tests
              </h3>
              <p className="text-xs font-light text-slate-400 leading-relaxed">
                Trigger packet drops, database network partitions, and spike loads to observe how your distributed system reacts under real chaos.
              </p>
            </div>

            <div className="zen-bento-card p-6 rounded-2xl group">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold font-display text-white mb-2">
                Socratic AI Interviewer
              </h3>
              <p className="text-xs font-light text-slate-400 leading-relaxed">
                Stop reciting generic high-level architectures. Our conversational AI challenges your decisions in real-time with FAANG rubric scoring.
              </p>
            </div>

            <div className="zen-bento-card p-6 rounded-2xl group">
              <div className="w-11 h-11 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4 border border-sky-500/20 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold font-display text-white mb-2">
                Live Cost &amp; Cloud Estimation
              </h3>
              <p className="text-xs font-light text-slate-400 leading-relaxed">
                Every node computes real AWS/GCP bills. Learn how your design decisions impact infrastructure cost, cross-AZ traffic, and compute efficiency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 4: FAANG PRACTICE PROBLEM CATALOG ==================== */}
      <section
        id="practice-catalog"
        className="relative w-full py-20 px-4 sm:px-8 border-t border-white/[0.06] bg-[#060b18]"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-8 mb-6 border-b border-white/[0.06]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-xs font-mono text-cyan-400 mb-2">
                <Compass className="w-3.5 h-3.5" />
                <span>FAANG Architecture Catalog</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                Practice Real-World Production Systems
              </h2>
              <p className="text-sm text-slate-400 font-light mt-1">
                Step-by-step interactive scenarios tested against high QPS traffic and chaos conditions.
              </p>
            </div>
            <Link
              href="/practice"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono text-xs font-bold transition"
            >
              <span>View All 50+ Scenarios</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Problem 1 */}
            <Link
              href="/practice"
              className="zen-bento-card p-5 rounded-2xl group hover:border-cyan-500/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 text-[10px] font-mono">
                  <span className="text-cyan-400 font-semibold">TIER 1 • MEDIUM</span>
                  <span className="text-slate-500">100k QPS</span>
                </div>
                <h4 className="text-base font-bold font-display text-white mb-1 group-hover:text-cyan-300 transition-colors">
                  TinyURL Shortener
                </h4>
                <p className="text-xs font-light text-slate-400">
                  Base62 encoding, KGS counter, Redis LRU caching, and 301 vs 302 redirects.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-cyan-400">
                <span>Start Practice</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Problem 2 */}
            <Link
              href="/practice"
              className="zen-bento-card p-5 rounded-2xl group hover:border-sky-500/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 text-[10px] font-mono">
                  <span className="text-sky-400 font-semibold">TIER 1 • HARD</span>
                  <span className="text-slate-500">1.2M QPS</span>
                </div>
                <h4 className="text-base font-bold font-display text-white mb-1 group-hover:text-sky-300 transition-colors">
                  Uber Geospatial Matching
                </h4>
                <p className="text-xs font-light text-slate-400">
                  QuadTree / H3 Hexagonal indexing, WebSocket driver heartbeats, and Redis pub/sub.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-sky-400">
                <span>Start Practice</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Problem 3 */}
            <Link
              href="/practice"
              className="zen-bento-card p-5 rounded-2xl group hover:border-indigo-500/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 text-[10px] font-mono">
                  <span className="text-indigo-400 font-semibold">TIER 2 • HARD</span>
                  <span className="text-slate-500">500k Msg/s</span>
                </div>
                <h4 className="text-base font-bold font-display text-white mb-1 group-hover:text-indigo-300 transition-colors">
                  WhatsApp Real-Time Chat
                </h4>
                <p className="text-xs font-light text-slate-400">
                  TCP connection managers, distributed session registry, and Cassandra offline store.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-indigo-400">
                <span>Start Practice</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Problem 4 */}
            <Link
              href="/practice"
              className="zen-bento-card p-5 rounded-2xl group hover:border-amber-500/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 text-[10px] font-mono">
                  <span className="text-amber-400 font-semibold">TIER 1 • MEDIUM</span>
                  <span className="text-slate-500">2.5M QPS</span>
                </div>
                <h4 className="text-base font-bold font-display text-white mb-1 group-hover:text-amber-300 transition-colors">
                  Distributed Rate Limiter
                </h4>
                <p className="text-xs font-light text-slate-400">
                  Sliding window log, token bucket Lua scripts, and multi-region synchronization.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-amber-400">
                <span>Start Practice</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="w-full border-t border-white/[0.08] bg-[#040710] py-10 px-6 sm:px-12 text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white font-display tracking-tight">
                Design<span className="text-cyan-400">Karo</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
                Live Platform
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Socho. Design Karo. Scale Karo. • Interactive Architecture &amp; System Design Simulator
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400">
            <Link className="hover:text-cyan-400 transition" href="/learn">
              Curriculum
            </Link>
            <Link className="hover:text-cyan-400 transition" href="/practice">
              50+ Problems
            </Link>
            <Link className="hover:text-cyan-400 transition" href="/design">
              Interactive Canvas
            </Link>
            <Link className="hover:text-cyan-400 transition" href="/simulate">
              Chaos Simulator
            </Link>
            <Link className="hover:text-cyan-400 transition" href="/interview">
              Mock Interview
            </Link>
            <a
              className="hover:text-cyan-400 transition"
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
            >
              FastAPI Docs
            </a>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>All Systems Operational</span>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
