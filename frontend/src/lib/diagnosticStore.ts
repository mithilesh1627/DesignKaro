import { create } from "zustand";

interface DiagnosticModalState {
  isOpen: boolean;
  openDiagnostic: () => void;
  closeDiagnostic: () => void;
}

export const useDiagnosticModal = create<DiagnosticModalState>((set) => ({
  isOpen: false,
  openDiagnostic: () => set({ isOpen: true }),
  closeDiagnostic: () => set({ isOpen: false }),
}));
