"use client";

import React, { useState } from "react";
import {
  Zap,
  X,
  Send,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Bot,
  User,
  Loader2,
  HelpCircle,
  Brain,
  Lightbulb,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  dimension?: string;
  followups?: string[];
}

interface AiMentorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  problemSlug?: string;
  graphData?: any;
}

export const AiMentorDrawer: React.FC<AiMentorDrawerProps> = ({
  isOpen,
  onClose,
  problemSlug,
  graphData,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content:
        "Welcome. I am your Senior Staff Architect Mentor. I will challenge your architectural choices using first-principles Socratic questions.\n\nWhat are your scale invariants? Which components handle your primary read and write paths?",
      dimension: "Scalability & Invariants",
      followups: [
        "How do I prevent single points of failure (SPOF)?",
        "Calculate Little's Law for my system",
        "Explain Cache-Aside vs Write-Through trade-offs",
      ],
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeHintLevel, setActiveHintLevel] = useState<number | null>(null);
  const [hintLoading, setHintLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMsg).trim();
    if (!text || loading) return;

    setInputMsg("");
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${API_BASE}/api/v1/mentor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          problem_slug: problemSlug || null,
          graph_data: graphData || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          dimension: data.dimension_focus,
          followups: data.suggested_followups,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error("Mentor chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchHint = async (level: number) => {
    setActiveHintLevel(level);
    setHintLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/mentor/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_slug: problemSlug || "fundamentals",
          target_level: level,
          current_design_score: 75,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const hintMsg: ChatMessage = {
          id: `hint-${Date.now()}`,
          role: "assistant",
          content: `💡 **${data.title}**\n\n${data.content}\n\n*Trade-off Analysis:* ${data.trade_off_analysis}`,
          dimension: `Tier ${level} Guidance`,
        };
        setMessages((prev) => [...prev, hintMsg]);
      }
    } catch (err) {
      console.error("Failed to load hint:", err);
    } finally {
      setHintLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-surface-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-surface-900/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-display">
              <span>Senior Staff Architect</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Socratic AI
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Zero fluff • First-principles trade-off analysis
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 4-Tier Progressive Hints Bar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/40">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
          <Lightbulb className="h-3 w-3 text-amber-400" />
          <span>Progressive Socratic Hints</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { level: 1, label: "L1: Nudge" },
            { level: 2, label: "L2: Math" },
            { level: 3, label: "L3: Tradeoff" },
            { level: 4, label: "L4: Blueprint" },
          ].map((tier) => (
            <button
              key={tier.level}
              onClick={() => handleFetchHint(tier.level)}
              disabled={hintLoading}
              className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition-all text-center border ${
                activeHintLevel === tier.level
                  ? "bg-sky-500/20 border-sky-500/40 text-sky-300"
                  : "bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 text-xs leading-relaxed ${
              m.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                m.role === "user"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "bg-slate-800 text-sky-400 border border-slate-700"
              }`}
            >
              {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>

            <div
              className={`max-w-[85%] rounded-xl p-3.5 space-y-2 ${
                m.role === "user"
                  ? "bg-sky-600 text-white shadow-md"
                  : "bg-surface-900 border border-slate-800 text-slate-200"
              }`}
            >
              {m.dimension && (
                <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-sky-400">
                  Focus: {m.dimension}
                </div>
              )}
              <div className="whitespace-pre-wrap">{m.content}</div>

              {m.followups && m.followups.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 mt-2">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Suggested Exploration:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.followups.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(q)}
                        className="text-[11px] text-left px-2 py-1 rounded bg-slate-950/80 hover:bg-sky-950/40 border border-slate-800 hover:border-sky-500/40 text-sky-300 transition-colors"
                      >
                        {q} →
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 p-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
            <span>Senior Staff Architect is formulating Socratic response...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t border-slate-800 bg-surface-900/80 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          placeholder="Ask about SPOFs, Little's Law, caching, partition keys..."
          className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !inputMsg.trim()}
          className="p-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold transition-colors shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
};
