"use client";

import React, { useEffect, useState } from "react";
import { Activity, Server } from "lucide-react";

interface HealthData {
  status: string;
  version: string;
  service: string;
}

export const HealthBadge: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const checkBackend = async () => {
      const startTime = performance.now();
      try {
        // Fetch via client rewrite or fallback to direct URL
        const res = await fetch("http://127.0.0.1:8000/api/v1/health", {
          signal: AbortSignal.timeout(3000),
        });
        const elapsed = Math.round(performance.now() - startTime);

        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setHealth(data);
            setLatency(elapsed);
            setIsOnline(true);
          }
        } else {
          if (isMounted) setIsOnline(false);
        }
      } catch {
        if (isMounted) {
          setIsOnline(false);
          setLatency(null);
        }
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono rounded-full bg-slate-900/80 border border-slate-800 text-slate-300">
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isOnline ? "bg-emerald-400" : "bg-amber-400"
          }`}
        ></span>
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isOnline ? "bg-emerald-500" : "bg-amber-500"
          }`}
        ></span>
      </span>
      <Server className="w-3 h-3 text-slate-400" />
      <span>
        {isOnline
          ? `API ${health?.version || "v0.1.0"} • ${latency}ms`
          : "API Standby / Starting"}
      </span>
    </div>
  );
};
