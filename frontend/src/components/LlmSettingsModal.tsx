"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Key,
  ExternalLink,
  Zap,
  Server,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

interface ProviderInfo {
  provider: string;
  name: string;
  type: string;
  requires_key: boolean;
  default_model: string;
  recommended_models: string[];
  description: string;
  is_available: boolean;
  status_detail?: string;
}

interface UserConfigSummary {
  provider: string;
  model: string;
  masked_api_key?: string;
  base_url?: string;
  is_active: boolean;
  updated_at?: string;
}

interface LlmSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProviderChanged?: (provider: string, model: string) => void;
}

export const LlmSettingsModal: React.FC<LlmSettingsModalProps> = ({
  isOpen,
  onClose,
  onProviderChanged,
}) => {
  const { accessToken, isAuthenticated } = useAuthStore();

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("ollama");
  const [model, setModel] = useState<string>("llama3.2:3b");
  const [apiKey, setApiKey] = useState<string>("");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [configuredProviders, setConfiguredProviders] = useState<UserConfigSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latency_ms?: number;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load providers and user settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      // 1. Fetch available providers
      const provRes = await fetch(`${API_BASE}/api/v1/llm/providers`);
      if (provRes.ok) {
        const provData: ProviderInfo[] = await provRes.json();
        setProviders(provData);
      }

      // 2. If authenticated, fetch user's saved configurations
      if (isAuthenticated && accessToken) {
        const setRes = await fetch(`${API_BASE}/api/v1/llm/settings`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (setRes.ok) {
          const setData = await setRes.json();
          setConfiguredProviders(setData.configured_providers || []);
          if (setData.active_provider) {
            setSelectedProvider(setData.active_provider);
            setModel(setData.active_model);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load LLM settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setTestResult(null);
      setSaveMessage(null);
    }
  }, [isOpen, isAuthenticated, accessToken]);

  // When selected provider changes, update default model and clear entered key
  const handleSelectProvider = (pId: string) => {
    setSelectedProvider(pId);
    setTestResult(null);
    setSaveMessage(null);
    const pMeta = providers.find((p) => p.provider === pId);
    const existing = configuredProviders.find((c) => c.provider === pId);

    if (existing) {
      setModel(existing.model);
      setApiKey(existing.masked_api_key || "");
    } else if (pMeta) {
      setModel(pMeta.default_model);
      setApiKey("");
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`${API_BASE}/api/v1/llm/test`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          provider: selectedProvider,
          model: model,
          api_key: apiKey.includes("...") ? undefined : apiKey || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `Connected! Sample: "${data.sample_response}"`,
          latency_ms: data.latency_ms,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error_message || "Connection failed.",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to reach backend test endpoint.",
      });
    } finally {
      setTesting(false);
    }
  };

  // Save BYOK configuration
  const handleSave = async () => {
    if (!isAuthenticated || !accessToken) {
      setSaveMessage("Please sign in to save your BYOK cloud provider keys.");
      return;
    }

    setLoading(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/llm/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          provider: selectedProvider,
          model: model,
          api_key: apiKey.includes("...") ? undefined : apiKey || undefined,
          set_as_active: true,
        }),
      });

      if (res.ok) {
        setSaveMessage("Settings saved and activated successfully!");
        if (onProviderChanged) onProviderChanged(selectedProvider, model);
        await fetchSettings();
      } else {
        const err = await res.json();
        setSaveMessage(`Error: ${err.detail || "Failed to save settings."}`);
      }
    } catch (err: any) {
      setSaveMessage(`Error: ${err.message || "Network error."}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const activeProviderMeta = providers.find((p) => p.provider === selectedProvider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-surface-950/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-surface-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
                <span>LLM Engine Architecture</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Hybrid • Real LLM
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ollama for local development • Bring-Your-Own-Key (BYOK) for production
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Provider Selection Tabs */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2.5">
              Select Inference Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {providers.map((p) => {
                const isSelected = selectedProvider === p.provider;
                return (
                  <button
                    key={p.provider}
                    onClick={() => handleSelectProvider(p.provider)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white"
                        : "border-slate-800 bg-white/[0.02] text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="text-xs font-bold font-display uppercase tracking-wide">
                        {p.provider}
                      </span>
                      {p.provider === "ollama" ? (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            p.is_available ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400"
                          }`}
                          title={p.is_available ? "Connected" : "Offline"}
                        />
                      ) : (
                        <Key className="w-3 h-3 text-slate-500" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 truncate">
                      {p.type === "local" ? "Local Daemon" : "Cloud BYOK"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider Status Details Card */}
          {activeProviderMeta && (
            <div className="p-4 rounded-xl border border-slate-800/80 bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{activeProviderMeta.name}</span>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                    activeProviderMeta.provider === "ollama" && !activeProviderMeta.is_available
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  }`}
                >
                  {activeProviderMeta.status_detail}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {activeProviderMeta.description}
              </p>

              {activeProviderMeta.provider === "ollama" && !activeProviderMeta.is_available && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2 mt-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-semibold">Ollama offline: </span>
                    Start your local Ollama daemon using{" "}
                    <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">ollama serve</code>{" "}
                    and pull the recommended lightweight model{" "}
                    <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">
                      ollama pull llama3.2:3b
                    </code>
                    . DesignKaro will automatically fall back to deterministic heuristics in the meantime.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Model Selector */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs font-mono focus:outline-none focus:border-cyan-500 transition"
            >
              {activeProviderMeta?.recommended_models.map((m) => (
                <option key={m} value={m}>
                  {m} {m === activeProviderMeta.default_model ? "(Default)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* API Key Input for Cloud BYOK */}
          {activeProviderMeta?.requires_key && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  API Key
                </label>
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  AES-Fernet encrypted at rest
                </span>
              </div>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder={
                    selectedProvider === "gemini"
                      ? "AIzaSy..."
                      : selectedProvider === "openai"
                      ? "sk-proj-..."
                      : "sk-ant-..."
                  }
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Your key is never logged or exposed to the browser. It is encrypted on the server and used solely for your architectural requests.
              </p>
            </div>
          )}

          {/* Connection Test Result Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold flex items-center gap-2">
                  <span>{testResult.success ? "Test Succeeded" : "Test Failed"}</span>
                  {testResult.latency_ms && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {testResult.latency_ms}ms
                    </span>
                  )}
                </div>
                <div className="text-[11px] leading-relaxed break-all">
                  {testResult.message}
                </div>
              </div>
            </div>
          )}

          {/* Save feedback */}
          {saveMessage && (
            <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-mono">
              {saveMessage}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-surface-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold transition disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>Save & Activate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
