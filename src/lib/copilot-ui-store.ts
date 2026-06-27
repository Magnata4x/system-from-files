import { create } from "zustand";

interface CopilotUIState {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

export const useCopilotUI = create<CopilotUIState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
