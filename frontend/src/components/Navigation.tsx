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
  ChevronDown,
  LogOut,
  LogIn,
  BookOpen,
  Activity,
  Code2,
  Compass,
} from "lucide-react";
import { AuthModal } from "./AuthModal";
import { LlmSettingsModal } from "./LlmSettingsModal";
import { QuickDiagnosticModal } from "./QuickDiagnosticModal";
import { useAuthStore } from "@/lib/authStore";
import { useDiagnosticModal } from "@/lib/diagnosticStore";
import { API_BASE } from "@/lib/api";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Learn", href: "/learn" },
  { label: "Practice", href: "/practice" },
  { label: "Simulator", href: "/simulator" },
  { label: "Progress", href: "/progress" },
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

export const Navigation: React.FC<NavigationProps> = ({ onOpenDiagnostic }) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [llmModalOpen, setLlmModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [progressData, setProgressData] = useState<QuickProgress | null>(null);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { isOpen: isDiagnosticOpen, openDiagnostic, closeDiagnostic } = useDiagnosticModal();

  const handleOpenDiagnostic = () => {
    if (onOpenDiagnostic) {
      onOpenDiagnostic();
    } else {
      openDiagnostic();
    }
  };

  const { user, accessToken, isAuthenticated, logout } = useAuthStore();
  const isUserLoggedIn = mounted && isAuthenticated && !!user;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch telemetry for user dashboard (authenticated only)
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
        setMobileOpen(false);
      }
    };
    if (userMenuOpen || mobileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [userMenuOpen, mobileOpen]);

  return (
    <>
      <header className="sticky top-0 inset-x-0 z-50 h-16 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-colors">
        {/* Brand Logo & Nav */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center text-sky-400 group-hover:border-zinc-600 transition-colors">
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="4" cy="12" r="2" fill="#38bdf8" />
                <circle cx="12" cy="4" r="2" fill="#38bdf8" />
                <circle cx="12" cy="20" r="2" fill="#38bdf8" />
                <circle cx="20" cy="8" r="1.8" fill="#38bdf8" />
                <circle cx="20" cy="16" r="1.8" fill="#38bdf8" />
                <line x1="6" y1="11" x2="10" y2="5.5" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.5" />
                <line x1="6" y1="13" x2="10" y2="18.5" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.5" />
                <line x1="14" y1="5" x2="18.5" y2="7.5" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.5" />
                <line x1="14" y1="19" x2="18.5" y2="16.5" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.5" />
                <circle cx="8" cy="8" r="1.5" fill="#38bdf8" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wider font-mono text-white">
                Design<span className="text-sky-400">Karo</span>
              </span>
              <span className="text-[9px] text-zinc-400 font-mono hidden sm:block tracking-widest uppercase">
                System Simulator
              </span>
            </div>
          </Link>

          {/* Desktop Primary Navigation */}
          <nav className="hidden lg:flex items-center gap-1 font-mono text-xs">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
                    isActive
                      ? "text-white bg-surface-elevated border border-surface-border shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-surface-elevated/60"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions & User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3 relative" ref={dropdownRef}>
          {/* LLM Engine Settings (signed-in only) */}
          {isUserLoggedIn && (
            <button
              onClick={() => setLlmModalOpen(true)}
              title="Configure LLM Provider (Ollama / BYOK)"
              className="flex items-center gap-1.5 min-h-[38px] px-3 py-2 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition"
            >
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Model</span>
            </button>
          )}

          {/* Authenticated User Menu OR Unauthenticated Sign In */}
          {isUserLoggedIn ? (
            <>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title="User Profile & Progress Dashboard"
                aria-label="User Profile"
                aria-expanded={userMenuOpen}
                className={`flex items-center gap-2 min-h-[38px] px-3 py-2 rounded-md border transition duration-150 text-xs font-medium ${
                  userMenuOpen
                    ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                    <User className="w-3 h-3" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>

                <div className="hidden md:flex items-center gap-1">
                  <span className="font-medium text-zinc-200">
                    {user?.profile?.username || user?.email?.split("@")[0]}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${
                      userMenuOpen ? "rotate-180 text-zinc-200" : ""
                    }`}
                  />
                </div>
              </button>

              {/* USER DASHBOARD DROPDOWN PANEL */}
              {userMenuOpen && (
                <div className="absolute top-12 right-0 w-80 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl z-50 overflow-hidden animate-in fade-in duration-150">
                  {/* User Header Profile */}
                  <div className="p-3.5 border-b border-zinc-800 bg-zinc-950/50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 font-semibold text-xs shrink-0">
                          {(user?.profile?.username?.[0] || user?.email?.[0] || "U").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-xs text-zinc-100 truncate">
                            {user?.profile?.username || user?.email?.split("@")[0]}
                          </h3>
                          <p className="text-[11px] text-zinc-400 truncate">{user?.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition text-xs font-sans flex items-center gap-1"
                        title="Sign Out"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sign Out</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick User Telemetry Grid */}
                  <div className="p-3 border-b border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-blue-400" />
                        <span>Readiness Telemetry</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {progressData?.current_rank || "System Architect"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80">
                        <div className="text-[10px] text-zinc-400">Readiness</div>
                        <div className="text-xs font-semibold font-mono text-blue-400 mt-0.5">
                          {progressData?.readiness_score ?? 0}%
                        </div>
                      </div>
                      <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80">
                        <div className="text-[10px] text-zinc-400">Streak</div>
                        <div className="text-xs font-semibold font-mono text-amber-400 mt-0.5">
                          {progressData?.streak_days ?? 0}d
                        </div>
                      </div>
                      <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80">
                        <div className="text-[10px] text-zinc-400">Total XP</div>
                        <div className="text-xs font-semibold font-mono text-emerald-400 mt-0.5">
                          {progressData?.total_xp ?? 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User Actions List */}
                  <div className="p-1.5 space-y-0.5">
                    <Link
                      href="/progress"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Progress Dashboard</span>
                    </Link>

                    <Link
                      href="/practice"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
                    >
                      <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Practice Problems</span>
                    </Link>

                    <Link
                      href="/learn"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Curriculum &amp; Topics</span>
                    </Link>

                    <Link
                      href="/simulator"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
                    >
                      <Activity className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Architecture Simulator</span>
                    </Link>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setLlmModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition text-left"
                    >
                      <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Configure LLM Provider</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleOpenDiagnostic();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-sky-300 hover:text-sky-100 hover:bg-sky-950/30 transition text-left"
                    >
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      <span>Skill Diagnostic Evaluation</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAuthModalOpen(true)}
                className="min-h-[38px] text-xs font-mono tracking-wider uppercase text-zinc-400 hover:text-white px-3.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 transition inline-flex items-center"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-11 h-11 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Toggle Navigation"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileOpen && (
          <div
            id="mobile-nav-menu"
            role="region"
            aria-label="Mobile navigation"
            className="lg:hidden absolute top-full inset-x-0 border-b border-surface-border bg-surface-ground/95 backdrop-blur-xl px-5 pt-3 pb-5 shadow-2xl space-y-3 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <div className="grid grid-cols-2 gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-center min-h-[44px] px-3 py-2.5 text-xs font-mono uppercase tracking-wider rounded-md border transition ${
                      isActive
                        ? "bg-surface-elevated border-surface-border text-zinc-100"
                        : "border-zinc-800/80 bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-surface-elevated"
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Progress Section (Authenticated Only) */}
            {isUserLoggedIn && (
              <div className="p-3 rounded-md border border-zinc-800 bg-zinc-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                    <span>Readiness</span>
                  </div>
                  <span className="text-xs font-mono text-blue-400 font-semibold">
                    {progressData?.readiness_score ?? 0}%
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {progressData?.streak_days ?? 0}d streak • {progressData?.current_rank || "Guest Engineer"}
                </p>
                <Link
                  href="/progress"
                  onClick={() => setMobileOpen(false)}
                  className="w-full min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
                >
                  <span>Open Progress Dashboard</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800">
              {!isAuthenticated ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full min-h-[44px] flex items-center justify-center py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white text-center shadow-sm"
                >
                  Sign In / Register
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="w-full min-h-[44px] flex items-center justify-center py-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-medium text-rose-400 text-center hover:bg-zinc-800"
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

      {/* Quick Diagnostic Assessment Modal */}
      <QuickDiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={closeDiagnostic}
      />
    </>
  );
};
