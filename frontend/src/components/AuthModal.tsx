"use client";

import React, { useState, useEffect } from "react";
import { X, Lock, Mail, User, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import { API_BASE } from "@/lib/api";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = "login",
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const setAuth = useAuthStore((state) => state.setAuth);
  const dialogRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const baseUrl = `${API_BASE}/api/v1/auth`;
    const endpoint = mode === "login" ? `${baseUrl}/login` : `${baseUrl}/register`;

    const body =
      mode === "login"
        ? { email, password }
        : {
            email,
            password,
            username,
            full_name: fullName || undefined,
            experience_level: experienceLevel,
          };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (Array.isArray(data.detail)) {
          const formatted = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(". ");
          throw new Error(formatted);
        }
        throw new Error(typeof data.detail === "string" ? data.detail : "Authentication failed");
      }

      setAuth(data.user, data.access_token, data.refresh_token);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <h2 id="auth-modal-title" className="sr-only">
          {mode === "login" ? "Sign In to DesignKaro" : "Create DesignKaro Account"}
        </h2>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close authentication dialog"
          className="absolute right-2 top-2 w-11 h-11 flex items-center justify-center text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800 transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Tab switchers */}
        <div role="tablist" aria-label="Authentication mode" className="flex border-b border-zinc-800 mb-6">
          <button
            role="tab"
            aria-selected={mode === "login"}
            id="auth-tab-login"
            aria-controls="auth-panel"
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
            }}
            className={`min-h-[44px] inline-flex items-center pb-2.5 pt-2 text-xs font-medium uppercase tracking-wider transition-colors mr-6 ${
              mode === "login"
                ? "text-blue-400 border-b-2 border-blue-500 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={mode === "register"}
            id="auth-tab-register"
            aria-controls="auth-panel"
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
            }}
            className={`min-h-[44px] inline-flex items-center pb-2.5 pt-2 text-xs font-medium uppercase tracking-wider transition-colors ${
              mode === "register"
                ? "text-blue-400 border-b-2 border-blue-500 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div role="alert" aria-live="polite" className="mb-4 p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form id="auth-panel" role="tabpanel" aria-labelledby={mode === "login" ? "auth-tab-login" : "auth-tab-register"} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-email-input" className="block text-xs font-medium text-zinc-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" aria-hidden="true" />
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full rounded-md border border-zinc-700/80 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {mode === "register" && (
            <>
              <div>
                <label htmlFor="auth-username-input" className="block text-xs font-medium text-zinc-300 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" aria-hidden="true" />
                  <input
                    id="auth-username-input"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="dev_architect"
                    className="w-full rounded-md border border-zinc-700/80 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-fullname-input" className="block text-xs font-medium text-zinc-300 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  id="auth-fullname-input"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full rounded-md border border-zinc-700/80 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="auth-experience-select" className="block text-xs font-medium text-zinc-300 mb-1">
                  Experience Tier
                </label>
                <select
                  id="auth-experience-select"
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full rounded-md border border-zinc-700/80 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="beginner">Beginner (CS Student / Early Career)</option>
                  <option value="intermediate">Intermediate (Backend / Full-Stack)</option>
                  <option value="advanced">Advanced (Senior / Staff)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-password-input" className="block text-xs font-medium text-zinc-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" aria-hidden="true" />
              <input
                id="auth-password-input"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-zinc-700/80 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {mode === "register" && (
              <p className="mt-1 text-[11px] text-zinc-500">
                Minimum 8 characters
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-medium text-white transition-colors shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Demo Account Hint */}
        {mode === "login" && (
          <div className="mt-4 pt-4 border-t border-zinc-800 text-[11px] text-zinc-400">
            <span className="text-zinc-500">Demo Account:</span>{" "}
            <button
              type="button"
              className="min-h-[36px] inline-flex items-center text-blue-400 hover:text-blue-300 underline font-mono ml-1"
              onClick={() => { setEmail("demo@designkaro.io"); setPassword("Password123!"); }}
            >
              demo@designkaro.io / Password123!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
