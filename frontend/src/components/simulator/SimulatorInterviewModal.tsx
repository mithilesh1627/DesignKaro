import React from "react";
import {
  MessageSquare,
  RotateCcw,
  X,
  Check,
  Lightbulb,
  Bot,
  Send,
  Workflow,
} from "lucide-react";
import {
  ArchitectureGraph,
  InterviewMessage,
  InterviewRubricScores,
} from "@/types/simulator";
import { INTERVIEW_STAGES, computeOverallRubricPercentage } from "@/lib/interviewEngine";
import { useFocusTrap } from "@/lib/useFocusTrap";

export interface SimulatorInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewStage: number;
  setInterviewStage: (stage: number) => void;
  interviewMessages: InterviewMessage[];
  isInterviewCritiqueLoading: boolean;
  interviewInput: string;
  setInterviewInput: (val: string) => void;
  handleSendInterviewTurn: () => void;
  handleRequestInterviewHint: () => void;
  handleRestartInterview: () => void;
  interviewScores: InterviewRubricScores;
  graphState: ArchitectureGraph;
}

export function SimulatorInterviewModal({
  isOpen,
  onClose,
  interviewStage,
  setInterviewStage,
  interviewMessages,
  isInterviewCritiqueLoading,
  interviewInput,
  setInterviewInput,
  handleSendInterviewTurn,
  handleRequestInterviewHint,
  handleRestartInterview,
  interviewScores,
  graphState,
}: SimulatorInterviewModalProps) {
  const modalRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 animate-fadeIn">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="interview-modal-title"
        className="w-full max-w-6xl h-[92vh] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="interview-modal-title"
                  className="text-xs font-semibold text-zinc-100 uppercase tracking-wider"
                >
                  System Design Interview
                </h2>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Socratic Assessment
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                Stage {interviewStage} of 9: {INTERVIEW_STAGES[interviewStage - 1]?.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRestartInterview}
              aria-label="Reset interview session"
              className="min-h-[44px] px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 hover:text-white text-xs transition flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              title="Reset Interview Session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close interview dialog"
              className="w-11 h-11 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition focus:outline-none focus:ring-1 focus:ring-zinc-600"
              title="Close Interview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 9-Stage Progress Stepper */}
        <div className="px-6 py-3 border-b border-white/[0.06] bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
            {INTERVIEW_STAGES.map((stg) => {
              const isCurrent = stg.stage === interviewStage;
              const isPast = stg.stage < interviewStage;
              return (
                <button
                  key={stg.stage}
                  onClick={() => setInterviewStage(stg.stage)}
                  className={`px-3 py-1 rounded-xl shrink-0 transition flex items-center gap-1.5 text-[11px] ${
                    isCurrent
                      ? "bg-violet-500/25 border border-violet-500/50 text-violet-200 font-bold shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                      : isPast
                      ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
                      : "bg-slate-900/60 border border-white/[0.06] text-slate-400 hover:text-slate-300"
                  }`}
                >
                  {isPast ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-800 text-[9px] flex items-center justify-center font-bold">
                      {stg.stage}
                    </span>
                  )}
                  <span>{stg.title.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Stage Goal description banner */}
          <div className="mt-2 text-[11px] font-mono text-slate-300 bg-slate-900/50 px-3 py-1.5 rounded-xl border border-white/[0.05] flex items-center justify-between">
            <span className="truncate pr-2">
              <strong className="text-violet-300">Target Deliverable:</strong>{" "}
              {INTERVIEW_STAGES[interviewStage - 1]?.description}
            </span>
            <span className="text-[10px] text-slate-400 shrink-0">
              {interviewMessages.length} turns exchanged
            </span>
          </div>
        </div>

        {/* Main Content: Two Columns */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Chat Dialogue (65% width) */}
          <div className="flex-1 flex flex-col border-r border-white/[0.06] overflow-hidden">
            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-mono text-xs">
              {interviewMessages.map((msg) => {
                const isInterviewer = msg.sender === "interviewer";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isInterviewer ? "justify-start" : "justify-end"}`}
                  >
                    {isInterviewer && (
                      <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 flex items-center justify-center shrink-0 mt-0.5">
                        {msg.is_hint ? (
                          <Lightbulb className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 space-y-2 ${
                        msg.is_hint
                          ? "bg-amber-950/30 border border-amber-500/30 text-amber-100"
                          : isInterviewer
                          ? "bg-slate-900/90 border border-white/[0.08] text-slate-200 shadow-md"
                          : "bg-cyan-950/40 border border-cyan-500/30 text-cyan-100 shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1 text-[10px]">
                        <span className="font-bold text-slate-400 uppercase tracking-wider">
                          {msg.is_hint
                            ? "Staff Architect Hint"
                            : isInterviewer
                            ? "Interviewer (Staff L6+)"
                            : "Candidate (You)"}
                        </span>
                        <span className="text-slate-500">{msg.timestamp}</span>
                      </div>

                      <div className="text-xs font-light leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </div>

                      {msg.feedback && (
                        <div className="mt-2 pt-2 border-t border-violet-500/20 text-[10px] text-violet-300/90 font-mono bg-violet-950/20 p-2 rounded-lg">
                          <strong className="text-violet-400">Feedback:</strong> {msg.feedback}
                        </div>
                      )}
                    </div>

                    {!isInterviewer && (
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                        You
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Thinking / Evaluating Indicator */}
              {isInterviewCritiqueLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="bg-slate-900/90 border border-white/[0.08] rounded-2xl p-3 flex items-center gap-2 text-xs text-violet-300">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                    <span>Staff Architect is analyzing your response and canvas components...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-slate-900/40 space-y-2 shrink-0">
              <div className="flex gap-2">
                <label htmlFor="sim-interview-turn-input" className="sr-only">
                  Your system design interview response
                </label>
                <textarea
                  id="sim-interview-turn-input"
                  value={interviewInput}
                  onChange={(e) => setInterviewInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendInterviewTurn();
                    }
                  }}
                  placeholder={`Explain your ${INTERVIEW_STAGES[
                    interviewStage - 1
                  ]?.title.toLowerCase()} (e.g. math, APIs, data schemas, partitions, caches)... [Enter to send]`}
                  rows={2}
                  className="flex-1 bg-slate-950 border border-white/[0.1] focus:border-violet-500/50 rounded-xl p-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <button
                  onClick={handleRequestInterviewHint}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold transition flex items-center gap-1.5 shadow-sm text-[11px]"
                  title="Request a hint from the Staff Architect"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ask Staff Hint</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    Shift+Enter for newline
                  </span>
                  <button
                    onClick={handleSendInterviewTurn}
                    disabled={!interviewInput.trim() || isInterviewCritiqueLoading}
                    className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white font-bold transition flex items-center gap-1.5 shadow-lg shadow-violet-600/25 text-[11px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Response</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Rubric Scorecard & Architecture Coupling (35% width) */}
          <div className="w-full md:w-80 lg:w-96 bg-slate-950/50 p-4 space-y-4 font-mono text-xs overflow-y-auto">
            {/* Rubric Score Card */}
            <div className="p-4 rounded-2xl border border-white/[0.08] bg-slate-900/80 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Overall Interview Score
                  </div>
                  <div className="text-2xl font-black text-white mt-0.5">
                    {computeOverallRubricPercentage(interviewScores)}%
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    computeOverallRubricPercentage(interviewScores) >= 80
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : computeOverallRubricPercentage(interviewScores) >= 60
                      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                      : computeOverallRubricPercentage(interviewScores) >= 40
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-red-500/15 text-red-300 border-red-500/30"
                  }`}
                >
                  {computeOverallRubricPercentage(interviewScores) >= 80
                    ? "Strong Hire"
                    : computeOverallRubricPercentage(interviewScores) >= 60
                    ? "Hire"
                    : computeOverallRubricPercentage(interviewScores) >= 40
                    ? "Leaning Hire"
                    : "Needs Work"}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/[0.06]">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${computeOverallRubricPercentage(interviewScores)}%` }}
                />
              </div>
            </div>

            {/* 7 Rubric Category Bars */}
            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-900/60 space-y-2.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                7-Category Staff Rubric
              </div>

              {/* 1. Requirements */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Requirements &amp; Scope</span>
                  <span className="font-bold text-slate-200">
                    {interviewScores.requirements_understanding} / 10
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-violet-400 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(interviewScores.requirements_understanding / 10) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* 2. Scale Estimation */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Scale Math &amp; Capacity</span>
                  <span className="font-bold text-slate-200">
                    {interviewScores.scale_estimation} / 10
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(interviewScores.scale_estimation / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* 3. High-Level Architecture */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">High-Level Architecture</span>
                  <span className="font-bold text-slate-200">
                    {interviewScores.architecture} / 10
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(interviewScores.architecture / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* 4. Technical Trade-offs */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Technical Trade-offs</span>
                  <span className="font-bold text-slate-200">
                    {interviewScores.trade_offs} / 10
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(interviewScores.trade_offs / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* 5. Scalability */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Scalability &amp; Sharding</span>
                  <span className="font-bold text-slate-200">
                    {interviewScores.scalability} / 10
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(interviewScores.scalability / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* 6. Reliability */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Fault Tolerance &amp; SRE</span>
                  <span className="font-bold text-slate-200">
                    {interviewScores.reliability} / 10
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(interviewScores.reliability / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* 7. Communication */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Communication &amp; Structure</span>
                  <span className="font-bold text-slate-200">
                    {interviewScores.communication} / 10
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(interviewScores.communication / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Architecture Canvas Coupling Banner */}
            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-900/60 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300">
                <Workflow className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-[11px] uppercase">Live Canvas Coupling</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                The Socratic interviewer inspects your canvas topology in real time. Drag, connect,
                and configure components to support your explanations.
              </p>
              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-300 border-t border-white/[0.06]">
                <span>Components on Canvas:</span>
                <span className="font-bold text-cyan-300 font-mono">
                  {graphState.nodes.length} Nodes • {graphState.edges.length} Edges
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
