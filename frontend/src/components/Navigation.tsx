"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  ArrowRight,
  Menu,
  X,
  Cpu,
} from "lucide-react";
import { AuthModal } from "./AuthModal";
import { LlmSettingsModal } from "./LlmSettingsModal";
import { useAuthStore } from "@/lib/authStore";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "LEARN", href: "/learn" },
  { label: "PRACTICE", href: "/practice" },
  { label: "CANVAS", href: "/design" },
  { label: "SIMULATE", href: "/simulate" },
  { label: "INTERVIEW", href: "/interview" },
  { label: "REVIEW", href: "/review" },
  { label: "PROGRESS", href: "/progress" },
];

interface NavigationProps {
  onOpenDiagnostic?: () => void;
}

export const Navigation: React.FC<NavigationProps> = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [llmModalOpen, setLlmModalOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

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

        {/* Right Actions & Auth */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* LLM Engine BYOK Settings Button */}
          <button
            onClick={() => setLlmModalOpen(true)}
            title="Configure LLM Provider (Ollama / BYOK)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-cyan-500/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 text-xs font-mono transition group"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline font-medium">AI Model</span>
          </button>

          {/* User Session or Sign In / Sign Up */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-300 font-semibold">
                  {user.profile?.username || user.email.split("@")[0]}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  {user.profile?.current_rank?.split(" ")[0] || "Architect"}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-xs font-mono text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setAuthModalOpen(true)}
                className="text-xs font-mono font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition hidden sm:block"
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 transition duration-200 shadow-md shadow-cyan-500/20 active:scale-95"
              >
                <span>Sign Up</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
              </button>
            </div>
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
          <div className="lg:hidden absolute top-16 inset-x-0 border-b border-white/[0.08] bg-[#050914]/95 px-6 pt-3 pb-6 backdrop-blur-2xl shadow-2xl space-y-3 z-50">
            <div className="grid grid-cols-2 gap-2 pt-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-mono rounded-lg border transition-all ${
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

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3">
              {!isAuthenticated ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-xs font-bold font-mono text-slate-950 text-center shadow-md shadow-cyan-500/20"
                >
                  Sign In / Sign Up
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
