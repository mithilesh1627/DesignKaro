"use client";

import React, { useState, useEffect } from "react";
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
  Cpu,
  Settings,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { LlmSettingsModal } from "./LlmSettingsModal";
import { MentorResponseCard } from "./MentorResponseCard";
import { MentorResponse } from "@/types/mentor";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured?: MentorResponse;
  dimension?: string;
  followups?: string[];
  provider?: string;
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
  const { accessToken, isAuthenticated } = useAuthStore();

  const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content: "",
      structured: {
        response_type: "socratic",
        intent: "concept_explanation",
        title: "System Design Consultation",
        summary: "I will mentor you through first-principles system design trade-offs.",
        explanation:
          "Rather than lecturing or dumping textbook definitions, I challenge your architectural choices one decision at a time. What are your primary scale invariants?",
        architecture_observations: [],
        assumptions: [],
        recommendations: ["Anchor your architecture in explicit read-to-write ratios and latency SLAs."],
        tradeoffs: ["Synchronous transactional consistency vs. asynchronous high-throughput decoupling."],
        next_question: "What read/write ratio and p99 latency SLA are you designing for?",
        difficulty: "intermediate",
      },
      followups: [
        "What is Envoy Gateway and what if I remove it?",
        "How do I prevent single points of failure (SPOF)?",
        "Calculate Little's Law for my system",
      ],
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeHintLevel, setActiveHintLevel] = useState<number | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [activeProviderName, setActiveProviderName] = useState<string>("ollama");
  const [activeModel, setActiveModel] = useState<string>("llama3.2:3b");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch active provider info
  const fetchProviderInfo = async () => {
    try {
      if (isAuthenticated && accessToken) {
        const res = await fetch(`${API_BASE}/api/v1/llm/settings`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.active_provider) setActiveProviderName(data.active_provider);
          if (data.active_model) setActiveModel(data.active_model);
          return;
        }
      }

      // Default check
      const res = await fetch(`${API_BASE}/api/v1/llm/providers`);
      if (res.ok) {
        const data = await res.json();
        const ollama = data.find((p: any) => p.provider === "ollama");
        if (ollama) {
          setActiveProviderName("ollama");
          setActiveModel(ollama.default_model);
        }
      }
    } catch (err) {
      console.warn("Could not retrieve provider status:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProviderInfo();
    }
  }, [isOpen, isAuthenticated, accessToken]);

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

    const assistantMsgId = `asst-${Date.now()}`;
    // Add empty assistant response to stream into
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        dimension: "Socratic Architecture Dialogue",
        provider: activeProviderName,
      },
    ]);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`${API_BASE}/api/v1/mentor/chat/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: history,
          problem_slug: problemSlug || null,
          graph_data: graphData || null,
          user_skill_level: skillLevel,
        }),
      });

      if (!res.ok || !res.body) {
        // Fall back to non-streaming endpoint
        const fallbackRes = await fetch(`${API_BASE}/api/v1/mentor/chat`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: history,
            problem_slug: problemSlug || null,
            graph_data: graphData || null,
            user_skill_level: skillLevel,
          }),
        });

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: fallbackData.reply,
                    structured: fallbackData.structured_response,
                    dimension: fallbackData.dimension_focus,
                    followups: fallbackData.suggested_followups,
                    provider: fallbackData.llm_provider || "heuristic-engine",
                  }
                : m
            )
          );
        }
        return;
      }

      // Stream SSE chunks
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.delta) {
              accumulatedContent += parsed.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: accumulatedContent,
                        provider: parsed.provider || activeProviderName,
                      }
                    : m
                )
              );
            }
            if (parsed.structured) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: parsed.rendered_markdown || accumulatedContent,
                        structured: parsed.structured,
                        provider: parsed.provider || activeProviderName,
                      }
                    : m
                )
              );
            }
          } catch {
            // Ignore parse errors on partial chunks
          }
        }
      }
    } catch (err) {
      console.error("Mentor chat stream error:", err);
      // Ensure the message has at least error notice
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId && !m.content
            ? {
                ...m,
                content:
                  "I was unable to complete the live response stream. Please verify your LLM connection or check the AI Model settings.",
              }
            : m
        )
      );
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
    <>
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-surface-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-surface-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-display">
                  Senior Staff Architect
                </h3>
                {/* Active Provider Badge */}
                <button
                  onClick={() => setSettingsOpen(true)}
                  title="Click to configure LLM provider"
                  className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 hover:border-cyan-500 hover:text-white transition"
                >
                  <Cpu className="w-2.5 h-2.5 text-cyan-400" />
                  <span className="capitalize">{activeProviderName}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Real LLM • First-principles trade-off analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSettingsOpen(true)}
              title="LLM Settings"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Subheader: Skill Level & 4-Tier Progressive Hints */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-amber-400" />
              <span>Progressive Socratic Hints</span>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-mono">
              <span className="text-slate-500">Depth:</span>
              {(["beginner", "intermediate", "advanced"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSkillLevel(lvl)}
                  className={`px-1.5 py-0.5 rounded capitalize transition-all ${
                    skillLevel === lvl
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { level: 1, label: "L1: Nudge" },
              { level: 2, label: "L2: Math" },
              { level: 3, label: "L3: Tradeoff" },
              { level: 4, label: "L4: Blueprint" },
            ].map((hint) => (
              <button
                key={hint.level}
                onClick={() => handleFetchHint(hint.level)}
                disabled={hintLoading}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-medium border transition-all ${
                  activeHintLevel === hint.level
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                    : "bg-surface-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                {hintLoading && activeHintLevel === hint.level ? (
                  <Loader2 className="w-3 h-3 animate-spin mx-auto text-amber-400" />
                ) : (
                  hint.label
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Body */}
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
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "bg-slate-800 text-cyan-400 border border-slate-700"
                }`}
              >
                {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>

              <div
                className={`max-w-[88%] rounded-xl p-3.5 space-y-2 ${
                  m.role === "user"
                    ? "bg-cyan-600 text-slate-950 font-medium shadow-md"
                    : "bg-surface-900 border border-slate-800 text-slate-200"
                }`}
              >
                {m.role === "assistant" && m.structured ? (
                  <MentorResponseCard
                    response={m.structured}
                    onFollowupClick={handleSendMessage}
                  />
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                )}

                {m.followups && m.followups.length > 0 && !m.structured?.next_question && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5 mt-2">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Suggested Exploration:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.followups.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(q)}
                          className="text-[11px] text-left px-2 py-1 rounded bg-slate-950/80 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 transition-colors"
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
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              <span>Senior Staff Architect is reasoning...</span>
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
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !inputMsg.trim()}
            className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 disabled:opacity-50 text-slate-950 font-bold transition-colors shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      {/* Embedded LLM Settings Modal */}
      <LlmSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onProviderChanged={(newProv, newModel) => {
          setActiveProviderName(newProv);
          setActiveModel(newModel);
        }}
      />
    </>
  );
};
