"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users2,
  ArrowLeft,
  ShieldCheck,
  Send,
  Sparkles,
  Award,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  Layers,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { API_BASE } from "@/lib/api";

interface ChatMessage {
  id: string;
  sender: "interviewer" | "candidate" | "system";
  content: string;
  timestamp: string;
}

const INTERVIEW_TOPICS = [
  { slug: "url-shortener-tinyurl", title: "Design TinyURL / Bitly (100M URLs)" },
  { slug: "distributed-rate-limiter", title: "Design Distributed Rate Limiter (100k QPS)" },
  { slug: "real-time-chat-engine", title: "Design Real-Time Discord / Slack Chat" },
  { slug: "video-transcoding-cdn", title: "Design Global Video Transcoding & CDN (Netflix)" },
  { slug: "distributed-ride-dispatch", title: "Design Real-Time Uber Ride Dispatch Engine" },
];

const STAGE_LABELS = [
  "Scope & Requirements",
  "Capacity Estimation",
  "High-Level Blueprint",
  "Deep-Dive & Data Model",
  "Failure Modes & Chaos",
];

export default function InterviewSimulatorPage() {
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("url-shortener-tinyurl");
  const [targetRole, setTargetRole] = useState<string>("Staff Systems Architect");
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [stageName, setStageName] = useState<string>(STAGE_LABELS[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [hiringScorecard, setHiringScorecard] = useState<any | null>(null);

  // Start Interview Session
  const handleStartInterview = async () => {
    try {
      setIsSending(true);
      const res = await fetch(`${API_BASE}/api/v1/interviews/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_slug: selectedTopic,
          target_role: targetRole,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSessionId(data.session_id);
        setCurrentStage(data.current_stage);
        setStageName(data.stage_name);
        setMessages([
          {
            id: "msg-0",
            sender: "interviewer",
            content: data.initial_message,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        setSessionActive(true);
      }
    } catch (err) {
      console.error("Failed to start interview:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Send candidate reply
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    const newMsg: ChatMessage = {
      id: `cand-${Date.now()}`,
      sender: "candidate",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);

    try {
      setIsSending(true);
      const res = await fetch(`${API_BASE}/api/v1/interviews/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          current_stage: currentStage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentStage(data.current_stage);
        setStageName(data.stage_name);

        const interviewerMsg: ChatMessage = {
          id: `int-${Date.now()}`,
          sender: "interviewer",
          content: data.interviewer_reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, interviewerMsg]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Finish interview and get scorecard
  const handleFinishInterview = async () => {
    try {
      setIsFinishing(true);
      const res = await fetch(`${API_BASE}/api/v1/interviews/${sessionId}/finish`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setHiringScorecard(data);
      }
    } catch (err) {
      console.error("Failed to finish interview:", err);
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
              title="Return to Home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-0.5">
                <Users2 className="h-3.5 w-3.5" />
                <span>STAFF ARCHITECT MOCK INTERVIEW</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                System Design Mock Interview
              </h1>
            </div>
          </div>

          {sessionActive && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 hidden sm:inline px-3 py-1 rounded-xl bg-slate-900 border border-white/[0.08]">
                Role: <span className="text-cyan-400 font-semibold">{targetRole}</span>
              </span>
              <button
                onClick={handleFinishInterview}
                disabled={isFinishing}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
              >
                <Award className="h-3.5 w-3.5" />
                <span>{isFinishing ? "Grading..." : "Finish Interview"}</span>
              </button>
            </div>
          )}
        </div>

        {!sessionActive ? (
          /* Interview Setup Screen */
          <div className="my-auto max-w-2xl mx-auto w-full p-8 sm:p-10 rounded-3xl bg-slate-900/80 border border-white/[0.08] shadow-2xl backdrop-blur-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/10 mb-2">
                <Users2 className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-extrabold font-display text-white tracking-tight">
                Configure Your Mock Interview
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-light">
                Experience a rigorous FAANG/Tier-1 Staff Architect interview with multi-stage Socratic questioning and real-time evaluation.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5 font-semibold">
                  Choose Architecture Problem:
                </label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/[0.08] text-sm text-slate-200 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
                >
                  {INTERVIEW_TOPICS.map((top) => (
                    <option key={top.slug} value={top.slug}>
                      {top.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5 font-semibold">
                  Target Candidate Level:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {["Senior Engineer (L5)", "Staff Systems Architect (L6)", "Principal Architect (L7)"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setTargetRole(role)}
                      className={`p-3 rounded-xl border text-xs font-mono text-center transition-all ${
                        targetRole === role
                          ? "bg-cyan-500/10 border-cyan-400 text-cyan-300 font-bold ring-1 ring-cyan-500/30"
                          : "bg-slate-950 border-white/[0.06] text-slate-400 hover:border-white/20"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/[0.06] text-xs font-mono text-slate-400 space-y-1.5">
                <div className="text-slate-300 font-semibold mb-1">5-Stage Structured Evaluation:</div>
                <div className="text-cyan-400 flex flex-wrap gap-1 items-center">
                  <span>1. Scope</span>
                  <span>→</span>
                  <span>2. Capacity</span>
                  <span>→</span>
                  <span>3. Blueprint</span>
                  <span>→</span>
                  <span>4. Data Model</span>
                  <span>→</span>
                  <span>5. Chaos</span>
                </div>
              </div>

              <button
                onClick={handleStartInterview}
                disabled={isSending}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-sm font-mono flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/20 active:scale-95"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span>Begin Mock Interview</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Interview Room */
          <div className="flex-1 flex flex-col min-h-0 space-y-3.5">
            {/* Stage Progress Bar */}
            <div className="grid grid-cols-5 gap-2 p-2 rounded-2xl bg-slate-900/80 border border-white/[0.08] shrink-0">
              {STAGE_LABELS.map((name, idx) => {
                const stepNum = idx + 1;
                const isCurrent = stepNum === currentStage;
                const isPassed = stepNum < currentStage;
                return (
                  <div
                    key={name}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? "bg-cyan-500/10 border-cyan-500/60 text-cyan-300 ring-1 ring-cyan-500/20"
                        : isPassed
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-slate-950/40 border-white/[0.04] text-slate-500"
                    }`}
                  >
                    <div className="text-[9px] font-mono uppercase tracking-wider font-bold">
                      Stage {stepNum}
                    </div>
                    <div className="text-[11px] font-medium truncate mt-0.5">{name}</div>
                  </div>
                );
              })}
            </div>

            {/* Chat Transcript Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 rounded-2xl bg-slate-900/50 border border-white/[0.08] space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === "candidate" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-mono text-slate-400">
                      {m.sender === "candidate" ? "You (Candidate)" : "Staff Architect Interviewer"}
                    </span>
                    <span className="text-[9px] font-mono text-slate-600">{m.timestamp}</span>
                  </div>
                  <div
                    className={`max-w-2xl p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-lg ${
                      m.sender === "candidate"
                        ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-medium rounded-br-none"
                        : "bg-slate-950 border border-white/[0.08] text-slate-200 rounded-bl-none font-light"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 p-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                  <span>Interviewer is analyzing your architectural choices...</span>
                </div>
              )}
            </div>

            {/* Candidate Input Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2.5 shrink-0">
              <input
                type="text"
                placeholder={`Answer Stage ${currentStage} question or ask clarifying requirements...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-white/[0.08] text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              <button
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 disabled:opacity-40 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
              >
                <span>Send</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Final Hiring Scorecard Modal */}
        {hiringScorecard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="max-w-xl w-full p-8 rounded-3xl bg-slate-900/95 border border-white/[0.1] space-y-6 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
                  <Award className="h-4 w-4" />
                  <span>INTERVIEW COMPLETE: HIRING SCORECARD</span>
                </div>
                <button
                  onClick={() => setHiringScorecard(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 border border-white/[0.06]">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                    Hiring Decision
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                    {hiringScorecard.hiring_decision}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                    Composite Score
                  </div>
                  <div className="text-3xl font-black font-mono text-white mt-1">
                    {hiringScorecard.overall_score}<span className="text-slate-600 text-lg font-normal">/100</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/60 p-4 rounded-2xl border border-white/[0.06]">
                "{hiringScorecard.interviewer_verdict}"
              </p>

              <div className="space-y-2.5">
                <div className="text-xs font-mono text-slate-400 font-bold">Stage Breakdown:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                  {Object.entries(hiringScorecard.dimension_scores).map(([k, v]) => (
                    <div key={k} className="p-3 rounded-xl bg-slate-950 border border-white/[0.06] flex justify-between items-center">
                      <span className="text-slate-400 truncate mr-2">{k}</span>
                      <span className="text-cyan-400 font-bold">{String(v)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setHiringScorecard(null);
                    setSessionActive(false);
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                >
                  Start New Mock Interview
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
