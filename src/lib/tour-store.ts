import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  tourEnabled: boolean;
  skipAll: boolean;
  completedTours: string[];
  welcomeSeen: boolean;
  activeTour: string | null;
  activeStep: number;
  paused: boolean;

  startTour: (id: string) => void;
  closeTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (i: number) => void;
  completeTour: (id: string) => void;
  setSkipAll: (v: boolean) => void;
  markWelcomeSeen: () => void;
  resetTour: (id: string) => void;
  resetAll: () => void;
};

export const useTourStore = create<State>()(
  persist(
    (set, get) => ({
      tourEnabled: true,
      skipAll: false,
      completedTours: [],
      welcomeSeen: false,
      activeTour: null,
      activeStep: 0,
      paused: false,

      startTour: (id) => set({ activeTour: id, activeStep: 0, paused: false }),
      closeTour: () => set({ activeTour: null, activeStep: 0, paused: false }),
      pauseTour: () => set({ paused: true }),
      resumeTour: () => set({ paused: false }),
      nextStep: () => set((s) => ({ activeStep: s.activeStep + 1 })),
      prevStep: () => set((s) => ({ activeStep: Math.max(0, s.activeStep - 1) })),
      goToStep: (i) => set({ activeStep: Math.max(0, i) }),
      completeTour: (id) =>
        set((s) => ({
          completedTours: s.completedTours.includes(id) ? s.completedTours : [...s.completedTours, id],
          activeTour: null,
          activeStep: 0,
          paused: false,
        })),
      setSkipAll: (v) => set({ skipAll: v, activeTour: v ? null : get().activeTour }),
      markWelcomeSeen: () => set({ welcomeSeen: true }),
      resetTour: (id) =>
        set((s) => ({ completedTours: s.completedTours.filter((c) => c !== id) })),
      resetAll: () =>
        set({ completedTours: [], skipAll: false, welcomeSeen: false, activeTour: null, activeStep: 0 }),
    }),
    {
      name: "aisignalradar_tour",
      partialize: (s) => ({
        tourEnabled: s.tourEnabled,
        skipAll: s.skipAll,
        completedTours: s.completedTours,
        welcomeSeen: s.welcomeSeen,
      }),
    },
  ),
);
