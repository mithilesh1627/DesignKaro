"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  BookOpen,
  Code2,
  Cpu,
  PlayCircle,
  Users2,
  FileCheck2,
  TrendingUp,
  Menu,
  X,
  Compass,
  User as UserIcon,
  LogOut,
} from "lucide-react";
import { HealthBadge } from "./HealthBadge";
import { AuthModal } from "./AuthModal";
import { useAuthStore } from "@/lib/authStore";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "HOME", href: "/", icon: Layers },
  { label: "LEARN", href: "/learn", icon: BookOpen },
  { label: "PRACTICE", href: "/practice", icon: Code2, badge: "50+ Labs" },
  { label: "DESIGN", href: "/design", icon: Cpu, badge: "Canvas" },
  { label: "SIMULATE", href: "/simulate", icon: PlayCircle },
  { label: "INTERVIEW", href: "/interview", icon: Users2, badge: "AI" },
  { label: "REVIEW", href: "/review", icon: FileCheck2 },
  { label: "PROGRESS", href: "/progress", icon: TrendingUp },
];

interface NavigationProps {
  onOpenDiagnostic?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ onOpenDiagnostic }) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-surface-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 group-hover:border-sky-400 group-hover:bg-sky-500/20 transition-colors">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white group-hover:text-sky-400 transition-colors">
                  DesignKaro
                </span>
                <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-sky-400 border border-sky-500/20">
                  v0.1
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-400 font-mono tracking-tight">
                Socho. Design Karo. Scale Karo.
              </p>
            </div>
          </Link>
        </div>

        {/* Desktop Primary Navigation */}
        <nav className="hidden xl:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${
                  isActive
                    ? "bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action & Telemetry */}
        <div className="flex items-center gap-2.5">
          <HealthBadge />

          {/* User Session or Sign In */}
          {isAuthenticated && user ? (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-sky-400">
                <UserIcon className="h-3.5 w-3.5" />
                <span className="font-semibold text-white">
                  {user.profile?.username || user.email.split("@")[0]}
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                {user.profile?.current_rank?.split(" ")[0] || "Architect"}
              </span>
              <button
                onClick={logout}
                title="Log Out"
                className="text-slate-400 hover:text-rose-400 p-0.5 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-200 transition-colors shadow-sm"
            >
              <UserIcon className="h-3.5 w-3.5 text-sky-400" />
              <span>Sign In</span>
            </button>
          )}

          {onOpenDiagnostic && (
            <button
              onClick={onOpenDiagnostic}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-sky-500 hover:bg-sky-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors shadow-sm"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Diagnostic</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="xl:hidden border-b border-slate-800 bg-surface-950/95 px-4 pt-2 pb-6 backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-2 pt-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-mono rounded-md border ${
                    isActive
                      ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                      : "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {onOpenDiagnostic && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  onOpenDiagnostic();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-sky-500 py-2 text-xs font-semibold text-slate-950"
              >
                <Compass className="h-4 w-4" />
                <span>Take Quick Diagnostic</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
