"use client";

import React from "react";
import Link from "next/link";
import { Layers } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/[0.08] bg-[#040710] py-10 px-6 sm:px-12 text-xs text-slate-400 font-mono">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Tagline */}
        <div className="flex flex-col gap-1.5 items-center md:items-start text-center md:text-left">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 p-[1px] shadow-sm">
              <div className="w-full h-full bg-[#050914] rounded-[7px] flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <span className="text-base font-bold text-white font-display tracking-tight">
              Design<span className="text-cyan-400">Karo</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
              Live Platform
            </span>
          </Link>
          <p className="text-[11px] text-slate-500">
            Socho. Design Karo. Scale Karo.
          </p>
        </div>

        {/* Attribution & Copyright */}
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-medium">Mithilesh Chaurasiya</span>
          </div>
          <span>&copy; 2026 DesignKaro</span>
        </div>
      </div>
    </footer>
  );
};
