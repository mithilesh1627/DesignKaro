import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { ArchitectureGraph } from "@/types/simulator";
import { useFocusTrap } from "@/lib/useFocusTrap";

export interface SimulatorClearCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphState: ArchitectureGraph;
  onConfirmClear: () => void;
}

export function SimulatorClearCanvasModal({
  isOpen,
  onClose,
  graphState,
  onConfirmClear,
}: SimulatorClearCanvasModalProps) {
  const modalRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="clear-canvas-title"
        aria-describedby="clear-canvas-desc"
        className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-950 p-6 shadow-2xl shadow-rose-950/50 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 id="clear-canvas-title" className="text-sm font-bold text-white font-sans">
              Clear Architecture Canvas?
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <p id="clear-canvas-desc" className="text-xs text-slate-300 font-sans leading-relaxed">
          Are you sure you want to clear the canvas? All {graphState.nodes.length} component(s) and{" "}
          {graphState.edges.length} connection(s) will be permanently wiped.
        </p>
        <div className="flex items-center justify-end gap-3 pt-2 font-mono">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/[0.08] hover:border-white/20 bg-slate-900 text-xs text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmClear}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Yes, Clear Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
}
