"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  ArrowRight,
  Menu,
  X,
  Cpu,
  TrendingUp,
  LayoutDashboard,
  User,
  Sparkles,
  Zap,
  CheckCircle2,
  ChevronDown,
  LogOut,
  LogIn,
  BookOpen,
  Activity,
} from "lucide-react";
import { AuthModal } from "./AuthModal";
import { LlmSettingsModal } from "./LlmSettingsModal";
import { useAuthStore } from "@/lib/authStore";
import { API_BASE } from "@/lib/api";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "LEARN", href: "/learn" },
  { label: "SIMULATOR", href: "/simulator" },
];

interface QuickProgress {
  readiness_score: number;
  streak_days: number;
  completed_lessons_count: number;
  current_rank: string;
  total_xp: number;
}

interface NavigationProps {
  onOpenDiagnostic?: () => void;
}

export const Navigation: React.FC<NavigationProps> = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [llmModalOpen, setLlmModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [progressData, setProgressData] = useState<QuickProgress | null>(null);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, accessToken, isAuthenticated, logout } = useAuthStore();
  const isUserLoggedIn = mounted && isAuthenticated && !!user;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch telemetry for the Progress section in the User Dashboard (authenticated only)
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setProgressData(null);
      return;
    }

    const fetchTelemetry = async () => {
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${accessToken}`,
        };
        const res = await fetch(`${API_BASE}/api/v1/dashboard`, { headers });
        if (res.ok) {
          const data = await res.json();
          setProgressData({
            readiness_score: data.readiness_score ?? 0,
            streak_days: data.streak_days ?? 0,
            completed_lessons_count: data.completed_lessons_count ?? 0,
            current_rank: data.current_rank || "Guest Engineer",
            total_xp: data.total_xp ?? 0,
          });
        }
      } catch {
        // Non-blocking fallback
      }
    };
    fetchTelemetry();
  }, [isAuthenticated, accessToken, user]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [userMenuOpen]);

  return (
    <>
      <header className="sticky top-0 inset-x-0 z-50 h-16 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-2xl px-4 sm:px-8 lg:px-10 flex items-center justify-between transition-colors">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/15">
              <div className="w-full h-full bg-[#050914] rounded-[10px] flex items-center justify-center">
                <Layers className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white font-display">
                Design<span className="text-cyan-400">Karo</span>
              </span>
              <span className="text-[10px] text-slate-400 font-light hidden sm:block tracking-wide">
                Socho. Design Karo. Scale Karo.
              </span>
            </div>
          </Link>

          {/* Desktop Primary Navigation */}
          <nav className="hidden lg:flex items-center gap-1 font-mono text-xs text-slate-400">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    isActive
                      ? "text-cyan-300 bg-white/[0.08] font-semibold border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                      : "hover:text-cyan-300 hover:bg-white/[0.04]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions & User Dashboard */}
        <div className="flex items-center gap-2.5 sm:gap-4 relative" ref={dropdownRef}>
          {/* LLM Engine BYOK Settings Button */}
          <button
            onClick={() => setLlmModalOpen(true)}
            title="Configure LLM Provider (Ollama / BYOK)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-cyan-500/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 text-xs font-mono transition group"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline font-medium">AI Model</span>
          </button>

          {/* Authenticated User Menu OR Unauthenticated Sign In */}
          {isUserLoggedIn ? (
            <>
              {/* User Dashboard & Profile Menu Button */}
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title="User Profile & Progress Dashboard"
                aria-label="User Profile"
                aria-expanded={userMenuOpen}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all duration-200 group text-xs font-mono ${
                  userMenuOpen
                    ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.2)]"
                    : "border-white/[0.08] bg-white/[0.03] hover:border-cyan-500/30 hover:bg-white/[0.06] text-slate-300 hover:text-white"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500/20 to-sky-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950" />
                </div>

                <div className="hidden md:flex items-center gap-1.5">
                  <span className="font-semibold text-white">
                    {user?.profile?.username || user?.email?.split("@")[0]}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-transform duration-200 ${
                      userMenuOpen ? "rotate-180 text-cyan-400" : ""
                    }`}
                  />
                </div>
              </button>

              {/* USER DASHBOARD DROPDOWN PANEL (AUTHENTICATED ONLY) */}
              {userMenuOpen && (
                <div className="absolute top-14 right-0 w-80 sm:w-96 rounded-2xl border border-white/[0.1] bg-[#070d1a]/95 backdrop-blur-2xl shadow-2xl shadow-cyan-950/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* User Header Profile */}
                  <div className="p-4 border-b border-white/[0.06] bg-slate-900/40">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 via-sky-500/20 to-indigo-500/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold font-mono text-sm shrink-0 shadow-sm shadow-cyan-500/20">
                          {(user?.profile?.username?.[0] || user?.email?.[0] || "U").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-white font-display truncate">
                            {user?.profile?.username || user?.email?.split("@")[0]}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono truncate">{user?.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all text-xs font-mono flex items-center gap-1.5"
                        title="Sign Out"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Sign Out</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick User Telemetry Grid */}
                  <div className="p-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Practice Readiness Telemetry</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                        {progressData?.current_rank || "System Architect"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl border border-white/[0.06] bg-slate-900/60">
                        <div className="text-xs text-slate-400 font-mono">Readiness</div>
                        <div className="text-sm font-bold font-mono text-cyan-400 mt-0.5">
                          {progressData?.readiness_score ?? 0}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl border border-white/[0.06] bg-slate-900/60">
                        <div className="text-xs text-slate-400 font-mono">Streak</div>
                        <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                          {progressData?.streak_days ?? 0}d
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl border border-white/[0.06] bg-slate-900/60">
                        <div className="text-xs text-slate-400 font-mono">Total XP</div>
                        <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                          {progressData?.total_xp ?? 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User Actions List */}
                  <div className="p-2 space-y-1">
                    <Link
                      href="/progress"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono text-slate-300 hover:text-cyan-300 hover:bg-white/[0.04] transition"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
                      <span>View Full Progress Dashboard</span>
                    </Link>

                    <Link
                      href="/learn"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono text-slate-300 hover:text-cyan-300 hover:bg-white/[0.04] transition"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Curriculum &amp; Learning Paths</span>
                    </Link>

                    <Link
                      href="/simulator"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono text-slate-300 hover:text-cyan-300 hover:bg-white/[0.04] transition"
                    >
                      <Activity className="w-3.5 h-3.5 text-amber-400" />
                      <span>AI System Simulator</span>
                    </Link>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setLlmModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono text-slate-300 hover:text-cyan-300 hover:bg-white/[0.04] transition text-left"
                    >
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Configure AI Model (Ollama / BYOK)</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Sign In CTA for Guests */
            <button
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 transition duration-200 shadow-sm shadow-cyan-500/20 active:scale-95 font-mono"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-950" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileOpen && (
          <div className="lg:hidden absolute top-16 inset-x-0 border-b border-white/[0.08] bg-[#050914]/98 px-6 pt-4 pb-6 backdrop-blur-2xl shadow-2xl space-y-4 z-50">
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-mono rounded-xl border transition-all ${
                      isActive
                        ? "bg-white/[0.08] border-cyan-500/40 text-cyan-300 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        : "border-white/[0.04] bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Progress Section (Authenticated Only) */}
            {isUserLoggedIn && (
              <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-slate-900/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>PROGRESS</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 font-bold">
                    {progressData?.readiness_score ?? 0}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mb-3">
                  {progressData?.streak_days ?? 0} Day Streak • {progressData?.current_rank || "Guest Engineer"}
                </p>
                <Link
                  href="/progress"
                  onClick={() => setMobileOpen(false)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold"
                >
                  <span>Open Progress Dashboard</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-3">
              {!isAuthenticated ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-xs font-bold font-mono text-slate-950 text-center shadow-md shadow-cyan-500/20"
                >
                  Sign In / Register
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-rose-400 text-center"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* LLM Provider Configuration Modal */}
      <LlmSettingsModal
        isOpen={llmModalOpen}
        onClose={() => setLlmModalOpen(false)}
      />
    </>
  );
};
