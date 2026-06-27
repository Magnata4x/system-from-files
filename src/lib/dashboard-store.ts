import { create } from "zustand";
import { heatmap as initialHeatmap, initialSignals, upcomingSignals, type HeatmapAsset, type Signal } from "./dashboard-data";

type Toast = {
  id: string;
  signal: Signal;
};

interface DashboardState {
  prices: Record<string, { price: number; change: number; pulse: number }>;
  heatmap: HeatmapAsset[];
  signals: Signal[];
  toasts: Toast[];
  selectedSignal: Signal | null;
  cmdkOpen: boolean;
  _intervalIds: Set<number>;
  init: () => void;
  cleanup: () => void;
  pushToast: (s: Signal) => void;
  dismissToast: (id: string) => void;
  setSelectedSignal: (s: Signal | null) => void;
  setCmdkOpen: (v: boolean) => void;
}

let signalIndex = 0;

export const useDashboardStore = create<DashboardState>((set, get) => ({
  prices: Object.fromEntries(
    initialHeatmap.map((h) => [h.symbol, { price: h.price, change: h.change, pulse: 0 }]),
  ),
  heatmap: initialHeatmap,
  signals: initialSignals,
  toasts: [],
  selectedSignal: null,
  cmdkOpen: false,
  _intervalIds: new Set<number>(),

  init: () => {
    if (get()._intervalIds.size > 0) return;
    const ids = new Set<number>();

    const priceInterval = window.setInterval(() => {
      set((state) => {
        const next = { ...state.prices };
        const nextHeatmap = state.heatmap.map((h) => {
          const drift = (Math.random() - 0.5) * 0.4;
          const newChange = +(h.change + drift).toFixed(2);
          const newPrice = +(h.price * (1 + drift / 100)).toFixed(h.price > 100 ? 1 : 3);
          next[h.symbol] = { price: newPrice, change: newChange, pulse: Date.now() };
          return { ...h, price: newPrice, change: newChange };
        });
        return { prices: next, heatmap: nextHeatmap };
      });
    }, 3000);
    ids.add(priceInterval);

    const scheduleNext = () => {
      const tid = window.setTimeout(function fire() {
        const s = upcomingSignals[signalIndex % upcomingSignals.length];
        signalIndex++;
        get().pushToast(s);
        // remove resolved id, schedule next
        get()._intervalIds.delete(tid);
        const nextId = window.setTimeout(fire, 22000);
        get()._intervalIds.add(nextId);
      }, 15000);
      ids.add(tid);
    };
    scheduleNext();

    set({ _intervalIds: ids });
  },

  cleanup: () => {
    get()._intervalIds.forEach((id) => {
      clearInterval(id);
      clearTimeout(id);
    });
    set({ _intervalIds: new Set<number>() });
  },

  pushToast: (signal) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({ toasts: [...state.toasts, { id, signal }].slice(-3) }));
    const timerId = window.setTimeout(() => {
      get().dismissToast(id);
      // Auto-limpa o próprio id do tracking set para não vazar entradas.
      const ids = new Set(get()._intervalIds);
      ids.delete(timerId);
      set({ _intervalIds: ids });
    }, 8000);
    const ids = new Set(get()._intervalIds);
    ids.add(timerId);
    set({ _intervalIds: ids });
  },


  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  setSelectedSignal: (s) => set({ selectedSignal: s }),
  setCmdkOpen: (v) => set({ cmdkOpen: v }),
}));

