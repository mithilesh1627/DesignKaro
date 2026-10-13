"use client";

import React, { useState, useMemo } from "react";
import {
  HelpCircle,
  FlaskConical,
  BarChart3,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Layers,
  Zap,
  Info,
} from "lucide-react";
import type { ArchitectureGraph } from "@/types/simulator";
import {
  CACHING_PREDICTION_SCENARIO,
  CACHING_PREDICTION_QUESTIONS,
  CACHING_TRANSFER_CHALLENGE,
  runBaselineExperiment,
  runCacheActiveExperiment,
  generateEvidenceFeedback,
  computeGraphSignature,
} from "@/lib/cachingTradeoffs";
import { useTradeoffStore } from "@/lib/tradeoffStore";

interface SimulatorTradeoffLabProps {
  graphState: ArchitectureGraph;
  onNavigateToCanvas?: () => void;
}

export function SimulatorTradeoffLab({ graphState, onNavigateToCanvas }: SimulatorTradeoffLabProps) {
  const {
    predictions,
    isPredictionSubmitted,
    baselineRun,
    cacheRun,
    isExplanationReviewed,
    transferSelectedOptionId,
    isTransferSubmitted,
    setPrediction,
    submitPredictions,
    recordBaselineRun,
    recordCacheRun,
    setExplanationReviewed,
    setTransferOption,
    submitTransferChallenge,
    resetLabState,
  } = useTradeoffStore();

  const [activeTab, setActiveTab] = useState<"predict" | "experiment" | "observe" | "explain" | "transfer">(() => {
    if (!isPredictionSubmitted) return "predict";
    if (!baselineRun || !cacheRun) return "experiment";
    if (!isExplanationReviewed) return "explain";
    return "transfer";
  });

  const [selectedPreset, setSelectedPreset] = useState<string>("normal");
  const [isRunningBaseline, setIsRunningBaseline] = useState<boolean>(false);
  const [isRunningCache, setIsRunningCache] = useState<boolean>(false);

  // Detect whether active canvas has been modified since cacheRun was executed
  const isCacheRunStale = useMemo(() => {
    if (!cacheRun) return false;
    const currentSig = computeGraphSignature(graphState);
    return !!cacheRun.graphSignature && cacheRun.graphSignature !== currentSig;
  }, [cacheRun, graphState]);

  // Detect whether baseline and active runs used mismatched load profiles
  const isPresetMismatch = useMemo(() => {
    if (!baselineRun || !cacheRun) return false;
    return baselineRun.trafficPresetId !== cacheRun.trafficPresetId;
  }, [baselineRun, cacheRun]);

  // Evidence feedback dynamically generated from current experiment data and active graph
  const evidenceFeedback = useMemo(() => {
    return generateEvidenceFeedback(baselineRun, cacheRun, predictions, graphState);
  }, [baselineRun, cacheRun, predictions, graphState]);

  const allQuestionsAnswered = CACHING_PREDICTION_QUESTIONS.every((q) => !!predictions[q.id]);

  const handleRunBaseline = () => {
    setIsRunningBaseline(true);
    setTimeout(() => {
      const result = runBaselineExperiment(selectedPreset);
      recordBaselineRun(result);
      setIsRunningBaseline(false);
    }, 250);
  };

  const handleRunCache = () => {
    setIsRunningCache(true);
    setTimeout(() => {
      const result = runCacheActiveExperiment(graphState, selectedPreset);
      recordCacheRun(result);
      setIsRunningCache(false);
    }, 250);
  };

  const transferChoice = CACHING_TRANSFER_CHALLENGE.options.find(
    (o) => o.id === transferSelectedOptionId
  );

  return (
    <div className="space-y-4 font-sans text-zinc-200">
      {/* Mini Stepper Header */}
      <div className="p-2 rounded-lg border border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-[11px] overflow-x-auto">
        <button
          onClick={() => setActiveTab("predict")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition ${
            activeTab === "predict"
              ? "bg-blue-600 text-white font-medium"
              : isPredictionSubmitted
              ? "text-emerald-400 hover:bg-zinc-800"
              : "text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>1. Predict</span>
        </button>

        <span className="text-zinc-600 font-mono">→</span>

        <button
          onClick={() => setActiveTab("experiment")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition ${
            activeTab === "experiment"
              ? "bg-blue-600 text-white font-medium"
              : baselineRun && cacheRun
              ? "text-emerald-400 hover:bg-zinc-800"
              : "text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>2. Experiment</span>
        </button>

        <span className="text-zinc-600 font-mono">→</span>

        <button
          onClick={() => setActiveTab("observe")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition ${
            activeTab === "observe"
              ? "bg-blue-600 text-white font-medium"
              : baselineRun || cacheRun
              ? "text-emerald-400 hover:bg-zinc-800"
              : "text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>3. Observe</span>
        </button>

        <span className="text-zinc-600 font-mono">→</span>

        <button
          onClick={() => setActiveTab("explain")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition ${
            activeTab === "explain"
              ? "bg-blue-600 text-white font-medium"
              : isExplanationReviewed
              ? "text-emerald-400 hover:bg-zinc-800"
              : "text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>4. Explain</span>
        </button>

        <span className="text-zinc-600 font-mono">→</span>

        <button
          onClick={() => setActiveTab("transfer")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition ${
            activeTab === "transfer"
              ? "bg-blue-600 text-white font-medium"
              : isTransferSubmitted
              ? "text-emerald-400 hover:bg-zinc-800"
              : "text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>5. Transfer</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* STEP 1: PREDICT                                                      */}
      {/* ==================================================================== */}
      {activeTab === "predict" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-3.5 rounded-lg border border-blue-900/40 bg-blue-950/20 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>{CACHING_PREDICTION_SCENARIO.title}</span>
            </div>
            <p className="text-zinc-300 leading-relaxed font-sans">
              {CACHING_PREDICTION_SCENARIO.context}
            </p>
          </div>

          <div className="space-y-4">
            {CACHING_PREDICTION_QUESTIONS.map((q, idx) => (
              <div key={q.id} className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">
                    Question {idx + 1}: {q.title}
                  </span>
                  {predictions[q.id] && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800">
                      Answered
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{q.prompt}</p>

                <div className="space-y-2 pt-1">
                  {q.options.map((opt) => {
                    const isSelected = predictions[q.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPrediction(q.id, opt.id)}
                        className={`w-full text-left p-2.5 rounded-md border text-xs transition duration-150 flex items-start gap-2.5 ${
                          isSelected
                            ? "border-blue-500 bg-blue-950/40 text-blue-100"
                            : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-850 text-zinc-300"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-[10px] ${
                            isSelected
                              ? "border-blue-400 bg-blue-500 text-white font-bold"
                              : "border-zinc-700 bg-zinc-900 text-zinc-400"
                          }`}
                        >
                          {isSelected ? "✓" : ""}
                        </span>
                        <div>
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5 leading-normal">
                            {opt.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                submitPredictions();
                setActiveTab("experiment");
              }}
              disabled={!allQuestionsAnswered}
              className={`w-full min-h-[40px] py-2.5 px-4 rounded-md font-medium text-xs transition flex items-center justify-center gap-2 shadow-sm ${
                allQuestionsAnswered
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
              }`}
            >
              <span>{isPredictionSubmitted ? "Update & Proceed to Experiment" : "Lock In Predictions & Continue"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 2: EXPERIMENT                                                   */}
      {/* ==================================================================== */}
      {activeTab === "experiment" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
              <span className="flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
                <span>Simulation Experiment Setup</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                Deterministic Discrete Simulation
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Compare an unshielded direct-database baseline against your active architecture canvas under identical load profiles.
            </p>

            {/* Load Profile Selector */}
            <div className="pt-2">
              <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                Select Traffic Load Profile:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPreset("normal")}
                  className={`p-2 rounded-md border text-left text-xs transition ${
                    selectedPreset === "normal"
                      ? "border-blue-500 bg-blue-950/40 text-blue-200"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-850"
                  }`}
                >
                  <div className="font-semibold text-zinc-200">Normal Traffic</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">10K–15K QPS • 85% Reads</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPreset("surge")}
                  className={`p-2 rounded-md border text-left text-xs transition ${
                    selectedPreset === "surge"
                      ? "border-blue-500 bg-blue-950/40 text-blue-200"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-850"
                  }`}
                >
                  <div className="font-semibold text-zinc-200">Peak Hour Surge</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">50K Peak QPS • 90% Reads</div>
                </button>
              </div>
            </div>
          </div>

          {/* Dual Action Cards */}
          <div className="grid grid-cols-1 gap-3">
            {/* 1. Baseline Run */}
            <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Scenario A: Un-Cached Baseline</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Application reads PostgreSQL directly with no cache layer.
                  </p>
                </div>
                {baselineRun && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                    Simulated ({baselineRun.trafficPresetId})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleRunBaseline}
                disabled={isRunningBaseline}
                className="w-full py-2 px-3 rounded-md bg-zinc-800 hover:bg-zinc-750 text-xs font-medium text-zinc-200 border border-zinc-700 transition flex items-center justify-center gap-1.5"
              >
                <FlaskConical className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isRunningBaseline ? "Simulating Baseline..." : baselineRun ? "Re-Run Baseline Simulation" : "Run Baseline Simulation"}</span>
              </button>
            </div>

            {/* 2. Active Canvas Run */}
            <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Scenario B: Active Canvas Architecture</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Evaluates the live nodes and connections on your canvas.
                  </p>
                </div>
                {cacheRun && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                      isCacheRunStale
                        ? "text-amber-400 bg-amber-950/50 border-amber-800"
                        : "text-emerald-400 bg-emerald-950/50 border-emerald-800"
                    }`}
                  >
                    {isCacheRunStale ? "Canvas Changed" : `Simulated (${cacheRun.trafficPresetId})`}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleRunCache}
                disabled={isRunningCache}
                className="w-full py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-blue-200" />
                <span>
                  {isRunningCache
                    ? "Simulating Active Canvas..."
                    : isCacheRunStale
                    ? "Re-Run Simulation (Canvas Updated)"
                    : cacheRun
                    ? "Re-Run Canvas Simulation"
                    : "Run Active Canvas Simulation"}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              onClick={() => setActiveTab("observe")}
              disabled={!baselineRun && !cacheRun}
              className={`flex-1 py-2.5 px-3 rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                baselineRun || cacheRun
                  ? "bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700"
                  : "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed"
              }`}
            >
              <span>Inspect Observations Table</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 3: OBSERVE                                                      */}
      {/* ==================================================================== */}
      {activeTab === "observe" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>Comparative Performance Metrics</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Profile: {selectedPreset.toUpperCase()}
            </span>
          </div>

          {/* Stale / Mismatch Diagnostic Alerts */}
          {isCacheRunStale && (
            <div className="p-2.5 rounded-md border border-amber-800/80 bg-amber-950/40 text-amber-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Canvas modified since simulation run. Active metrics may not reflect your current graph.</span>
              </div>
              <button
                onClick={() => setActiveTab("experiment")}
                className="text-[11px] underline font-mono text-amber-200 hover:text-white shrink-0"
              >
                Re-run in Step 2
              </button>
            </div>
          )}

          {isPresetMismatch && (
            <div className="p-2.5 rounded-md border border-amber-800/80 bg-amber-950/40 text-amber-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Preset Mismatch: Baseline used <strong>{baselineRun?.trafficPresetId.toUpperCase()}</strong>, but Active Canvas used <strong>{cacheRun?.trafficPresetId.toUpperCase()}</strong>.
                </span>
              </div>
              <button
                onClick={() => setActiveTab("experiment")}
                className="text-[11px] underline font-mono text-amber-200 hover:text-white shrink-0"
              >
                Align Presets
              </button>
            </div>
          )}

          {/* Metric Comparison Table */}
          <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-950/60 text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 text-[11px]">
                  <th className="p-2.5 font-medium">Metric Dimension</th>
                  <th className="p-2.5 font-medium">Baseline (No Cache)</th>
                  <th className="p-2.5 font-medium">Active Canvas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                {/* 1. Database Peak Utilization */}
                <tr>
                  <td className="p-2.5 text-zinc-300 font-sans">
                    <div>PostgreSQL Peak Utilization</div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">[Simulator Output]</span>
                  </td>
                  <td className="p-2.5 text-rose-400 font-semibold">
                    {baselineRun ? `${baselineRun.metrics.databaseUtilizationPercent}%` : "—"}
                  </td>
                  <td className="p-2.5 text-emerald-400 font-semibold">
                    {cacheRun ? `${cacheRun.metrics.databaseUtilizationPercent}%` : "—"}
                  </td>
                </tr>

                {/* 2. p99 Tail Latency */}
                <tr>
                  <td className="p-2.5 text-zinc-300 font-sans">
                    <div>p99 Tail Latency</div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">[Simulator Output]</span>
                  </td>
                  <td className="p-2.5 text-rose-400">
                    {baselineRun ? `${baselineRun.metrics.p99LatencyMs} ms` : "—"}
                  </td>
                  <td className="p-2.5 text-emerald-400 font-semibold">
                    {cacheRun ? `${cacheRun.metrics.p99LatencyMs} ms` : "—"}
                  </td>
                </tr>

                {/* 3. Error Rate */}
                <tr>
                  <td className="p-2.5 text-zinc-300 font-sans">
                    <div>Request Error Rate</div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">[Simulator Output]</span>
                  </td>
                  <td className="p-2.5 text-zinc-400">
                    {baselineRun ? `${(baselineRun.metrics.errorRate * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="p-2.5 text-zinc-300">
                    {cacheRun ? `${(cacheRun.metrics.errorRate * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>

                {/* 4. Delivered Throughput */}
                <tr>
                  <td className="p-2.5 text-zinc-300 font-sans">
                    <div>Delivered Throughput</div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">[Simulator Output]</span>
                  </td>
                  <td className="p-2.5 text-zinc-400">
                    {baselineRun ? `${baselineRun.metrics.throughputQps.toLocaleString()} QPS` : "—"}
                  </td>
                  <td className="p-2.5 text-zinc-200 font-semibold">
                    {cacheRun ? `${cacheRun.metrics.throughputQps.toLocaleString()} QPS` : "—"}
                  </td>
                </tr>

                {/* 5. Primary Bottleneck */}
                <tr>
                  <td className="p-2.5 text-zinc-300 font-sans">
                    <div>Primary Saturated Component</div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">[Simulator Output]</span>
                  </td>
                  <td className="p-2.5 text-rose-400 font-sans">
                    {baselineRun ? baselineRun.metrics.bottleneckNodeName : "—"}
                  </td>
                  <td className="p-2.5 text-emerald-300 font-sans">
                    {cacheRun ? cacheRun.metrics.bottleneckNodeName : "—"}
                  </td>
                </tr>

                {/* 6. Provisioned Database Capacity (Infrastructure Input) */}
                <tr className="bg-zinc-900/30">
                  <td className="p-2.5 text-zinc-400 font-sans">
                    <div>PostgreSQL Provisioned Capacity</div>
                    <span className="text-[9px] text-blue-400 uppercase tracking-wider">[Topology Input]</span>
                  </td>
                  <td className="p-2.5 text-zinc-400">
                    {baselineRun ? `${(baselineRun.dbCapacityQps || 8000).toLocaleString()} QPS (${baselineRun.dbReplicas || 1} rep)` : "8,000 QPS (1 rep)"}
                  </td>
                  <td className="p-2.5 text-zinc-300">
                    {cacheRun ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{(cacheRun.dbCapacityQps || 8000).toLocaleString()} QPS ({cacheRun.dbReplicas || 1} rep)</span>
                        {(cacheRun.dbCapacityQps || 8000) > (baselineRun?.dbCapacityQps || 8000) ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800">
                            +DB Scale
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800">
                            Identical DB
                          </span>
                        )}
                      </div>
                    ) : "—"}
                  </td>
                </tr>

                {/* 7. Assumed Cache Hit Ratio */}
                <tr className="bg-zinc-900/30">
                  <td className="p-2.5 text-zinc-400 font-sans">
                    <div>Cache Hit Ratio Assumption</div>
                    <span className="text-[9px] text-amber-500/80 uppercase tracking-wider">[Model Assumption]</span>
                  </td>
                  <td className="p-2.5 text-zinc-500">0% (No Cache)</td>
                  <td className="p-2.5 text-zinc-300">
                    {cacheRun ? `${Math.round(cacheRun.metrics.assumedCacheHitRatio * 100)}% (Profile)` : "—"}
                  </td>
                </tr>

                {/* 8. Assumed Read / Write Ratio */}
                <tr className="bg-zinc-900/30">
                  <td className="p-2.5 text-zinc-400 font-sans">
                    <div>Read / Write Ratio Assumption</div>
                    <span className="text-[9px] text-amber-500/80 uppercase tracking-wider">[Model Assumption]</span>
                  </td>
                  <td className="p-2.5 text-zinc-400">
                    {baselineRun ? `${Math.round(baselineRun.metrics.assumedReadRatio * 100)}% R / ${Math.round((1 - baselineRun.metrics.assumedReadRatio) * 100)}% W` : "—"}
                  </td>
                  <td className="p-2.5 text-zinc-300">
                    {cacheRun ? `${Math.round(cacheRun.metrics.assumedReadRatio * 100)}% R / ${Math.round((1 - cacheRun.metrics.assumedReadRatio) * 100)}% W` : "—"}
                  </td>
                </tr>

                {/* 9. Unsupported Metric Guard: LRU Churn */}
                <tr className="bg-zinc-950 text-zinc-500">
                  <td className="p-2.5 font-sans">
                    <div>Cache Eviction Churn (LRU)</div>
                    <span className="text-[9px] text-zinc-600 uppercase tracking-wider">[Unsupported Dimension]</span>
                  </td>
                  <td colSpan={2} className="p-2.5 text-zinc-500 text-[10px] font-sans italic">
                    Not calculated by discrete event simulator (tracked in theoretical trade-offs)
                  </td>
                </tr>

                {/* 10. Unsupported Metric Guard: Replication Lag */}
                <tr className="bg-zinc-950 text-zinc-500">
                  <td className="p-2.5 font-sans">
                    <div>Replication Lag (Async Sync)</div>
                    <span className="text-[9px] text-zinc-600 uppercase tracking-wider">[Unsupported Dimension]</span>
                  </td>
                  <td colSpan={2} className="p-2.5 text-zinc-500 text-[10px] font-sans italic">
                    Not simulated in discrete single-cluster simulation mode
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-zinc-500 italic leading-relaxed pt-0.5">
            * Model Note: The discrete event simulator distributes traffic uniformly across provisioned outbound links from the server (50% to Redis, 50% to PostgreSQL in cache-aside). In the reference cache-aside topology, PostgreSQL also has 20,000 QPS capacity vs baseline 8,000 QPS capacity, meaning observed 37% DB utilization reflects both link-splitting offload AND database capacity scaling. Read ratio and cache hit ratio are workload profile inputs.
          </p>

          <div className="pt-2">
            <button
              onClick={() => {
                setExplanationReviewed();
                setActiveTab("explain");
              }}
              className="w-full py-2.5 px-4 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>View Architectural Evidence &amp; Explanation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 4: EXPLAIN                                                      */}
      {/* ==================================================================== */}
      {activeTab === "explain" && (
        <div className="space-y-4 animate-in fade-in">
          <div
            className={`p-3.5 rounded-lg border text-xs space-y-2 ${
              evidenceFeedback.category === "success"
                ? "border-emerald-800 bg-emerald-950/30 text-emerald-200"
                : evidenceFeedback.category === "missing_topology"
                ? "border-rose-800 bg-rose-950/30 text-rose-200"
                : "border-amber-800 bg-amber-950/30 text-amber-200"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs">
              {evidenceFeedback.category === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{evidenceFeedback.headline}</span>
            </div>

            <ul className="space-y-1.5 pl-5 list-disc text-[11px] leading-relaxed font-sans">
              {evidenceFeedback.findings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>

          {/* Prediction Evaluation Matrix */}
          <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Prediction vs. Observed Reality</span>
            </h4>

            <div className="space-y-2.5">
              {evidenceFeedback.predictionComparison.map((item) => (
                <div key={item.questionId} className="p-2.5 rounded-md border border-zinc-800 bg-zinc-950/60 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-300">{item.questionTitle}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        item.wasAccurate
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                          : "bg-amber-950/80 text-amber-400 border-amber-800"
                      }`}
                    >
                      {item.wasAccurate ? "Accurately Predicted" : "Misconception Detected"}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Your choice: <span className="text-zinc-200">{item.predictedOptionLabel}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed font-light">
                    {item.observedEvidence}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Architectural Synthesis */}
          <div className="p-3 rounded-md border border-zinc-800 bg-zinc-900/40 text-[11px] text-zinc-400 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>{evidenceFeedback.architecturalInsight}</span>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              onClick={() => setActiveTab("transfer")}
              className="w-full py-2.5 px-4 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Take Transfer Challenge</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 5: TRANSFER CHALLENGE                                           */}
      {/* ==================================================================== */}
      {activeTab === "transfer" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-3.5 rounded-lg border border-purple-900/40 bg-purple-950/20 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Architectural Transfer Challenge</span>
            </div>
            <p className="text-zinc-300 leading-relaxed font-sans">
              {CACHING_TRANSFER_CHALLENGE.scenario}
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-2.5">
            <h4 className="text-xs font-semibold text-zinc-200">
              {CACHING_TRANSFER_CHALLENGE.question}
            </h4>

            <div className="space-y-2 pt-1">
              {CACHING_TRANSFER_CHALLENGE.options.map((opt) => {
                const isSelected = transferSelectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTransferOption(opt.id)}
                    className={`w-full text-left p-2.5 rounded-md border text-xs transition duration-150 flex items-start gap-2.5 ${
                      isSelected
                        ? "border-purple-500 bg-purple-950/40 text-purple-100"
                        : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-850 text-zinc-300"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-[10px] ${
                        isSelected
                          ? "border-purple-400 bg-purple-500 text-white font-bold"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                    <div>
                      <div className="font-medium text-zinc-200">{opt.title}</div>
                      <div className="text-[11px] text-zinc-400 mt-1 leading-normal font-light">
                        {opt.tradeoffSummary}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {!isTransferSubmitted && (
              <button
                type="button"
                onClick={submitTransferChallenge}
                disabled={!transferSelectedOptionId}
                className={`w-full py-2.5 px-4 rounded-md font-medium text-xs transition mt-2 ${
                  transferSelectedOptionId
                    ? "bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                }`}
              >
                Submit Trade-off Strategy
              </button>
            )}
          </div>

          {/* Post-Submission Reference Evaluation */}
          {isTransferSubmitted && transferChoice && (
            <div
              className={`p-3.5 rounded-lg border text-xs space-y-2 animate-in fade-in ${
                transferChoice.isOptimal
                  ? "border-emerald-800 bg-emerald-950/30 text-emerald-200"
                  : "border-amber-800 bg-amber-950/30 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                {transferChoice.isOptimal ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>
                  {transferChoice.isOptimal
                    ? "Optimal Trade-off Selected!"
                    : "Trade-off Vulnerability Detected"}
                </span>
              </div>

              {!transferChoice.isOptimal && transferChoice.misconception && (
                <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
                  <strong>Trade-off Risk:</strong> {transferChoice.misconception}
                </p>
              )}

              <div className="pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-300 leading-relaxed font-sans">
                <strong>Reference Explanation:</strong> {CACHING_TRANSFER_CHALLENGE.referenceExplanation}
              </div>

              <div className="text-[10px] font-mono text-zinc-400 mt-1">
                {CACHING_TRANSFER_CHALLENGE.keyArchitecturalPrinciple}
              </div>
            </div>
          )}

          {/* Reset / Restart Lab Action */}
          <div className="pt-2 flex items-center justify-between text-[11px]">
            <button
              onClick={resetLabState}
              className="text-zinc-500 hover:text-zinc-300 transition flex items-center gap-1 font-mono"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Experiment Lab</span>
            </button>

            {onNavigateToCanvas && (
              <button
                onClick={onNavigateToCanvas}
                className="text-blue-400 hover:text-blue-300 transition flex items-center gap-1 font-mono"
              >
                <Layers className="w-3 h-3" />
                <span>Return to Canvas Editor</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
