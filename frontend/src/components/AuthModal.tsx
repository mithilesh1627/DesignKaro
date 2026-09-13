"use client";

import React, { useState, useEffect } from "react";
import { X, Lock, Mail, User, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import { API_BASE } from "@/lib/api";

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-surface-900 p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-800 mb-6">
          <button
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
            }}
            className={`pb-2.5 text-xs font-mono font-bold uppercase transition-colors mr-6 ${
              mode === "login"
                ? "text-sky-400 border-b-2 border-sky-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
            }}
            className={`pb-2.5 text-xs font-mono font-bold uppercase transition-colors ${
              mode === "register"
                ? "text-sky-400 border-b-2 border-sky-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="architect@company.com"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="architect_pro"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Experience Tier
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                >
                  <option value="beginner">Beginner (CS Student / Early Engineer)</option>
                  <option value="intermediate">Intermediate (Backend / Full-Stack)</option>
                  <option value="advanced">Advanced (Staff / Principal)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            {mode === "register" && (
              <p className="mt-1 text-[10px] text-slate-500 font-mono">
                Minimum 8 characters with bcrypt salt
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 py-2.5 text-xs font-bold text-slate-950 transition-all shadow-md disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>{mode === "login" ? "Authenticate" : "Create Developer Account"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Demo Account Hint */}
        {mode === "login" && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
            <span className="text-slate-500">Demo Account:</span>{" "}
            <span className="text-sky-400 cursor-pointer" onClick={() => { setEmail("demo@designkaro.io"); setPassword("Password123!"); }}>
              demo@designkaro.io / Password123!
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
