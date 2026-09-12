import React from "react";
import Link from "next/link";
import { Layers, Terminal, ShieldCheck, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-surface-950 text-slate-400 text-xs font-mono">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Mission */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Layers className="h-4 w-4 text-sky-400" />
              <span>DesignKaro</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              &ldquo;Socho. Design Karo. Scale Karo.&rdquo;
            </p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Don&apos;t memorize architectures. Learn how to reason through distributed systems, trade-offs, bottlenecks, and failure modes.
            </p>
          </div>

          {/* Col 2: Learning & Practice */}
          <div>
            <h4 className="text-slate-200 font-bold uppercase tracking-wider mb-3">
              Platform Modes
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <Link href="/learn" className="hover:text-sky-400 transition-colors">
                  Learn Fundamentals
                </Link>
              </li>
              <li>
                <Link href="/practice" className="hover:text-sky-400 transition-colors">
                  Practice Problems (50+ Labs)
                </Link>
              </li>
              <li>
                <Link href="/design" className="hover:text-sky-400 transition-colors">
                  Architecture Canvas
                </Link>
              </li>
              <li>
                <Link href="/simulate" className="hover:text-sky-400 transition-colors">
                  Traffic &amp; Chaos Simulator
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Evaluation & Interview */}
          <div>
            <h4 className="text-slate-200 font-bold uppercase tracking-wider mb-3">
              Evaluation &amp; Mentorship
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <Link href="/interview" className="hover:text-sky-400 transition-colors">
                  AI System Design Interview
                </Link>
              </li>
              <li>
                <Link href="/review" className="hover:text-sky-400 transition-colors">
                  Deterministic Rule Engine
                </Link>
              </li>
              <li>
                <Link href="/progress" className="hover:text-sky-400 transition-colors">
                  Skill Mastery Graph (0-100)
                </Link>
              </li>
              <li>
                <a
                  href="http://127.0.0.1:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-sky-400 transition-colors flex items-center gap-1"
                >
                  <Terminal className="h-3 w-3" />
                  <span>FastAPI OpenAPI Specs</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Quality & Philosophy */}
          <div>
            <h4 className="text-slate-200 font-bold uppercase tracking-wider mb-3">
              Core Philosophy
            </h4>
            <div className="space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-sky-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Deterministic Sizing &amp; Rules</span>
              </div>
              <p className="text-slate-500">
                No hallucinated AI answers. Architecture as structured data with quantitative verification.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            &copy; 2026 DesignKaro. Built with Next.js, React Flow, FastAPI, PostgreSQL &amp; Redis.
          </div>
          <div className="flex items-center gap-1">
            <span>Engineered for engineers with</span>
            <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
            <span>first-principles thinking</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
