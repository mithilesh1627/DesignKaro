import React from "react";
import { History, X, Activity, FileCode } from "lucide-react";
import { ArchitectureEvent, ArchitectureGraph } from "@/types/simulator";
import { useFocusTrap } from "@/lib/useFocusTrap";

export interface SimulatorEventStreamDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  graphState: ArchitectureGraph;
  events: ArchitectureEvent[];
}

export function SimulatorEventStreamDrawer({
  isOpen,
  onClose,
  graphState,
  events,
}: SimulatorEventStreamDrawerProps) {
  const drawerRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-stream-drawer-title"
      className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200"
    >
      <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2
              id="event-stream-drawer-title"
              className="text-xs font-semibold text-zinc-100 uppercase tracking-wider"
            >
              Architecture State &amp; Events
            </h2>
            <p className="text-[10px] text-zinc-500 font-mono">
              State Stream • Version {graphState.metadata.version}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close architecture state and events drawer"
          className="w-11 h-11 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition focus:outline-none focus:ring-1 focus:ring-zinc-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {/* Event Timeline */}
        <div>
          <div className="text-[11px] font-bold text-cyan-400 mb-2.5 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>CHRONOLOGICAL EVENT STREAM</span>
          </div>
          <div className="space-y-2">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-2.5 rounded-xl border border-white/[0.06] bg-slate-950/70 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800/40">
                    {evt.type}
                  </span>
                  <span className="text-slate-500">v{evt.architectureVersion}</span>
                </div>
                <p className="text-slate-300 text-[11px] font-light mt-0.5">{evt.description}</p>
                <span className="text-[9px] text-slate-500">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Raw JSON Graph Representation */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>ACTIVE GRAPH JSON REPRESENTATION</span>
          </div>
          <pre className="p-3 rounded-xl bg-slate-950 border border-white/[0.06] text-[10px] text-slate-400 overflow-x-auto max-h-60 no-scrollbar">
            {JSON.stringify(graphState, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
