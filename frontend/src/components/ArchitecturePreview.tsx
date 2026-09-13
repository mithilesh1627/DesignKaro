"use client";

import React, { useState } from "react";
import {
  Server,
  Database,
  Layers,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Play,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Radio,
  ArrowRight,
} from "lucide-react";
import { AiMentorDrawer } from "./AiMentorDrawer";

interface NodeData {
  id: string;
  name: string;
  type: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "healthy" | "warning" | "saturated";
  properties: Record<string, string>;
  mentorNote: string;
  ruleWarning?: string;
}

const NODES: NodeData[] = [
  {
    id: "client",
    name: "Web & Mobile Clients",
    type: "Client Tier",
    role: "Global Edge Traffic",
    icon: Radio,
    status: "healthy",
    properties: {
      "Active DAU": "20,000,000",
      "Peak Request Rate": "45,000 QPS",
      "Network Protocol": "HTTPS / HTTP/2",
    },
    mentorNote: "High client traffic requires client-side exponential backoff and jitter to prevent thundering herds on recovery.",
  },
  {
    id: "gateway",
    name: "API Gateway (Kong/Envoy)",
    type: "Gateway Tier",
    role: "Reverse Proxy & Auth",
    icon: Layers,
    status: "healthy",
    properties: {
      "Rate Limiting": "Token Bucket (100 req/s/user)",
      "SSL Termination": "Enabled",
      "Timeout Policy": "350ms strict",
      "Circuit Breaker": "Configured (50% threshold)",
    },
    mentorNote: "Enforcing strict timeouts here prevents slow backend microservices from cascading into thread pool exhaustion.",
  },
  {
    id: "rec_service",
    name: "Recommendation Service",
    type: "Compute Tier",
    role: "Candidate Generation & Ranking",
    icon: Cpu,
    status: "healthy",
    properties: {
      "Instances": "24 Pods (Horizontal Auto-scaling)",
      "p99 Latency": "38ms",
      "Candidate Pool": "Top 1000 items per user",
      "Concurrency Model": "Async Event-Loop",
    },
    mentorNote: "Splitting candidate generation (fast heuristic) from deep ranking (ML model) keeps latency under 50ms.",
  },
  {
    id: "redis",
    name: "Redis Cluster (Cache-Aside)",
    type: "In-Memory Cache Tier",
    role: "Feature Store & Rec Cache",
    icon: Zap,
    status: "healthy",
    properties: {
      "Cluster Size": "6 Nodes (3 Master, 3 Replica)",
      "Hit Rate": "94.2%",
      "Eviction Policy": "allkeys-lru",
      "Memory Allocation": "64 GB",
      "TTL": "15 Minutes",
    },
    mentorNote: "Why TTL of 15m? Recommendation freshness decays rapidly; short TTL balances RAM cost vs user personalization.",
  },
  {
    id: "postgres",
    name: "PostgreSQL Primary",
    type: "Storage Tier",
    role: "Persistent User History & Catalog",
    icon: Database,
    status: "warning",
    properties: {
      "Storage": "2.4 TB NVMe",
      "Replication": "Single Primary (No Read Replicas)",
      "Connection Pool": "Max 500 connections",
      "Read/Write Ratio": "90% Reads / 10% Writes",
    },
    mentorNote: "CRITICAL: Single primary database with 90% reads is a single point of failure (SPOF) and read bottleneck under 50K+ QPS.",
    ruleWarning: "SINGLE_POINT_OF_FAILURE: Missing Read Replicas",
  },
];

export const ArchitecturePreview: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("postgres");
  const [simTraffic, setSimTraffic] = useState<number>(25000);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isMentorOpen, setIsMentorOpen] = useState<boolean>(false);

  const selectedNode = NODES.find((n) => n.id === selectedNodeId) || NODES[0];

  const handleRunTraffic = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setSimTraffic((prev) => (prev >= 75000 ? 25000 : prev + 25000));
    }, 800);
  };

  return (
    <div className="w-full rounded-xl border border-slate-800 bg-surface-950/80 shadow-2xl overflow-hidden backdrop-blur-sm">
      {/* Canvas Top Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-white">Scenario:</span>
            <span className="text-sky-400">Netflix Recommendation Engine (100M Users)</span>
          </div>
          <span className="hidden sm:inline-block rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400 border border-slate-700">
            Interactive 3-Panel Playground
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
            <span>Traffic:</span>
            <span className="text-sky-400 font-bold">{simTraffic.toLocaleString()} QPS</span>
          </div>
          <button
            onClick={handleRunTraffic}
            disabled={isSimulating}
            className="flex items-center gap-1.5 rounded bg-sky-500 hover:bg-sky-400 px-2.5 py-1 text-slate-950 font-bold transition-all text-xs"
          >
            {isSimulating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>{isSimulating ? "Simulating..." : "Test Traffic"}</span>
          </button>
        </div>
      </div>

      {/* 3-Panel Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
        {/* LEFT PANEL: Component Library / Palette (Col 3) */}
        <div className="lg:col-span-3 border-r border-slate-800/80 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
            <span>COMPONENT PALETTE</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
              Drag & Drop
            </span>
          </div>

          <div className="space-y-2">
            {NODES.map((node) => {
              const Icon = node.icon;
              const isSelected = node.id === selectedNodeId;
              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                    isSelected
                      ? "border-sky-500/50 bg-sky-500/10 text-white shadow-[0_0_12px_rgba(14,165,233,0.15)]"
                      : "border-slate-800/80 bg-slate-900/30 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-md ${
                        isSelected
                          ? "bg-sky-500/20 text-sky-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-medium">{node.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {node.type}
                      </div>
                    </div>
                  </div>
                  {node.status === "warning" && (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  )}
                  {node.status === "healthy" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/60 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Architecture Rule Warning */}
          <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>DETERMINISTIC RULE ALERT</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Single Primary Database without Read Replicas fails high-concurrency read queries at &gt;50K QPS.
            </p>
          </div>
        </div>

        {/* CENTER PANEL: Interactive Architecture Canvas (Col 5) */}
        <div className="lg:col-span-5 relative bg-grid-pattern p-6 flex flex-col justify-center items-center overflow-hidden border-b lg:border-b-0">
          <div className="absolute top-3 left-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            CANVAS VIEWPORT [LIVE GRAPH]
          </div>

          {/* Connected Graph Visualization */}
          <div className="w-full max-w-sm space-y-4 relative">
            {NODES.map((node, index) => {
              const Icon = node.icon;
              const isSelected = node.id === selectedNodeId;
              return (
                <div key={node.id} className="relative group">
                  <div
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                      isSelected
                        ? "border-sky-400 bg-slate-900/90 shadow-[0_0_20px_rgba(14,165,233,0.25)] ring-1 ring-sky-400/50"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-800 text-sky-400">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{node.name}</span>
                          {node.status === "warning" && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              SPOF
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {node.role}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[10px] text-slate-400">
                      <div>{node.type.split(" ")[0]}</div>
                    </div>
                  </div>

                  {/* Connecting Flow Line */}
                  {index < NODES.length - 1 && (
                    <div className="flex justify-center py-1">
                      <div className="h-4 w-0.5 bg-gradient-to-b from-sky-500/80 to-sky-500/20 relative">
                        <div className="absolute top-1 -left-0.5 h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping"></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-[11px] text-slate-500 font-mono text-center">
            Click any node above to inspect system properties and senior engineer reasoning
          </div>
        </div>

        {/* RIGHT PANEL: Properties Inspector & Socratic Mentor (Col 4) */}
        <div className="lg:col-span-4 border-l border-slate-800/80 bg-slate-950/60 p-4 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sky-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  NODE PROPERTIES
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {selectedNode.type}
              </span>
            </div>

            {/* Selected Node Details */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-white mb-1">
                {selectedNode.name}
              </h4>
              <p className="text-xs text-slate-400 font-mono mb-3">
                {selectedNode.role}
              </p>

              {/* Property Key-Value Pairs */}
              <div className="space-y-2 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3">
                {Object.entries(selectedNode.properties).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between text-xs font-mono"
                  >
                    <span className="text-slate-400">{k}:</span>
                    <span className="text-slate-200 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rule Engine Violation */}
            {selectedNode.ruleWarning && (
              <div className="mb-4 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold mb-1">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <span>CRITICAL ARCHITECTURE VIOLATION</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-200">
                  {selectedNode.ruleWarning}
                </p>
              </div>
            )}

            {/* Socratic Senior Engineer Guidance */}
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
              <div className="flex items-center gap-1.5 text-sky-400 text-xs font-mono font-bold mb-1.5">
                <Zap className="h-3.5 w-3.5" />
                <span>AI SENIOR ENGINEER: SOCRATIC THINKING</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &ldquo;{selectedNode.mentorNote}&rdquo;
              </p>
              <div className="mt-3 pt-2 border-t border-sky-500/20 flex items-center justify-between text-[11px] font-mono text-sky-400">
                <span>Reasoning Level: Architectural</span>
                <button
                  onClick={() => setIsMentorOpen(true)}
                  className="hover:underline cursor-pointer flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Ask Mentor <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 flex justify-between items-center">
            <span>Status: Deterministic Rules Active</span>
            <span className="text-emerald-400 font-bold">100% Type-Safe</span>
          </div>
        </div>
      </div>

      <AiMentorDrawer
        isOpen={isMentorOpen}
        onClose={() => setIsMentorOpen(false)}
      />
    </div>
  );
};
