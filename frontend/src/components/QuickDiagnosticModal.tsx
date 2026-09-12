"use client";

import React, { useState } from "react";
import { X, CheckCircle2, ArrowRight, Compass, ShieldAlert, Sparkles } from "lucide-react";

interface QuickDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Question {
  id: number;
  text: string;
  options: {
    label: string;
    level: "beginner" | "intermediate" | "advanced";
  }[];
}

const DIAGNOSTIC_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "When a single PostgreSQL database reaches 95% CPU utilization under heavy read load, what is your first mitigation?",
    options: [
      { label: "Upgrade the VM hardware vertically (Bigger CPU/RAM)", level: "beginner" },
      { label: "Introduce Redis cache for read queries + Read Replicas", level: "intermediate" },
      { label: "Consistent Hashing based sharding + CQRS read-model optimization", level: "advanced" },
    ],
  },
  {
    id: 2,
    text: "How do you guarantee exactly-once payment processing across distributed microservices?",
    options: [
      { label: "Add database transaction retry loops", level: "beginner" },
      { label: "Idempotency keys on API Gateway + Transactional Outbox pattern", level: "intermediate" },
      { label: "Two-Phase Commit / Saga orchestrator with distributed locks and dead-letter queues", level: "advanced" },
    ],
  },
  {
    id: 3,
    text: "Your workload has a 99:1 Read/Write ratio with 100M active daily users. What caching strategy fits best?",
    options: [
      { label: "Cache everything in local memory inside each app instance", level: "beginner" },
      { label: "Distributed Redis cluster with Cache-Aside pattern & TTL eviction", level: "intermediate" },
      { label: "Multi-tier Edge CDN + Redis Cluster with Write-Through / Write-Behind invalidation", level: "advanced" },
    ],
  },
];

export const QuickDiagnosticModal: React.FC<QuickDiagnosticModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<"Beginner" | "Intermediate" | "Advanced" | null>(null);

  if (!isOpen) return null;

  const handleSelectOption = (level: "beginner" | "intermediate" | "advanced") => {
    const updated = [...answers, level];
    setAnswers(updated);

    if (currentStep + 1 < DIAGNOSTIC_QUESTIONS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Evaluate result
      const advancedCount = updated.filter((l) => l === "advanced").length;
      const intermediateCount = updated.filter((l) => l === "intermediate").length;

      if (advancedCount >= 2) {
        setResult("Advanced");
      } else if (intermediateCount >= 2 || advancedCount === 1) {
        setResult("Intermediate");
      } else {
        setResult("Beginner");
      }
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers([]);
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-xl border border-slate-800 bg-surface-900 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 text-sky-400 text-xs font-mono mb-2">
          <Compass className="h-4 w-4" />
          <span>SYSTEM DESIGN DIAGNOSTIC EVALUATION</span>
        </div>

        {!result ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">
                How good are you at System Design?
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Question {currentStep + 1} of {DIAGNOSTIC_QUESTIONS.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-1 rounded-full mb-6 overflow-hidden">
              <div
                className="bg-sky-500 h-1 transition-all duration-300"
                style={{
                  width: `${((currentStep + 1) / DIAGNOSTIC_QUESTIONS.length) * 100}%`,
                }}
              />
            </div>

            <p className="text-sm text-slate-200 mb-6 font-medium leading-relaxed">
              {DIAGNOSTIC_QUESTIONS[currentStep].text}
            </p>

            <div className="space-y-3">
              {DIAGNOSTIC_QUESTIONS[currentStep].options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(opt.level)}
                  className="w-full text-left p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-sky-500/50 hover:bg-slate-800/40 text-xs text-slate-300 hover:text-white transition-all flex items-start gap-3 group"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 group-hover:border-sky-400 font-mono text-[10px] text-slate-400 group-hover:text-sky-300">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="leading-snug">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Diagnostic Complete</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Your Recommended Starting Track:
            </p>

            <div className="inline-block px-4 py-2 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono font-bold text-lg mb-4">
              {result.toUpperCase()} TRACK
            </div>

            <p className="text-xs text-slate-300 max-w-md mx-auto mb-6 leading-relaxed">
              {result === "Beginner" &&
                "We recommend starting with Core Fundamentals: Latency vs Throughput, CAP theorem, Load Balancers, and SQL vs NoSQL before complex sharding."}
              {result === "Intermediate" &&
                "You understand core caching and decoupling! We recommend diving into Consistent Hashing, Kafka streaming, and Distributed Transactions."}
              {result === "Advanced" &&
                "Outstanding! You think in multi-region, consensus, and failure modes. We recommend the Advanced ML Track and Fault-Injection Simulations."}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-md border border-slate-800 text-xs font-mono text-slate-400 hover:text-white transition-colors"
              >
                Retake
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-slate-950 transition-colors"
              >
                <span>Enter Personalized Track</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
