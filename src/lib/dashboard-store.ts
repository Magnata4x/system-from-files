import { create } from "zustand";
import { heatmap as initialHeatmap, initialSignals, upcomingSignals, type HeatmapAsset, type Signal } from "./dashboard-data";
import { api, endpoints } from "@/adapters/backend/api.adapter";
import { signalAdapter } from "@/adapters/backend/signal.adapter";
import { logger } from "./logger";

type Toast = {
  id: string;
  signal: Signal;
};

export type RiskStatus = {
  level?: string;
  dailyPnl?: number;
  dailyPnlPct?: number;
  raw?: unknown;
};

export type MarketRegime = {
  regime?: string;
  pair?: string;
  raw?: unknown;
};

interface DashboardState {
  prices: Record<string, { price: number; change: number; pulse: number }>;
  heatmap: HeatmapAsset[];
  signals: Signal[];
  toasts: Toast[];
  selectedSignal: Signal | null;
  cmdkOpen: boolean;
  risk: RiskStatus | null;
  regime: MarketRegime | null;
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
  risk: null,
  regime: null,
  _intervalIds: new Set<number>(),

  init: () => {
    if (get()._intervalIds.size > 0) return;
    const ids = new Set<number>();

    // Substitui a randomização client-side por pulls reais no backend.
    // Os campos ainda não expostos pelo backend (heatmap, sentiment, etc.)
    // permanecem no mock até existir um endpoint dedicado de dashboard.
    const pullRisk = async () => {
      try {
        const raw = await api.get<Record<string, unknown>>(endpoints.risk.status);
        if (raw) {
          set({
            risk: {
              level: (raw.level ?? raw.status) as string | undefined,
              dailyPnl: raw.dailyPnl as number | undefined,
              dailyPnlPct: (raw.dailyPnlPct ?? raw.pnlPct) as number | undefined,
              raw,
            },
          });
        }
      } catch (err) {
        logger.warn("[dashboard] risk/status falhou", { error: err });
      }
    };
    const pullRegime = async () => {
      try {
        const raw = await api.get<Record<string, unknown>>(
          `${endpoints.marketRegime.current}?pair=BTC/USDT`,
        );
        if (raw) {
          set({
            regime: {
              regime: (raw.regime ?? raw.state) as string | undefined,
              pair: (raw.pair as string | undefined) ?? "BTC/USDT",
              raw,
            },
          });
        }
      } catch (err) {
        logger.warn("[dashboard] market-regime/current falhou", { error: err });
      }
    };
    const pullSignals = async () => {
      try {
        const list = await signalAdapter.list();
        if (list.length > 0) {
          const mapped: Signal[] = list.slice(0, 12).map((s) => ({
            id: s.id,
            asset: s.symbol,
            direction: s.direction,
            score: Math.round(s.confidence),
            entry: s.entry,
            stop: s.sl ?? s.entry,
            target: s.tp ?? s.entry,
            rr:
              s.sl && s.tp && s.entry - s.sl !== 0
                ? +(Math.abs((s.tp - s.entry) / (s.entry - s.sl))).toFixed(2)
                : 0,
            tf: s.tf ?? "1H",
            time: s.createdAt ?? "",
          }));
          set({ signals: mapped });
        }
      } catch (err) {
        logger.warn("[dashboard] signals falhou", { error: err });
      }
    };

    // Kick inicial + polling contínuo (10s).
    void pullRisk();
    void pullRegime();
    void pullSignals();
    const backendPoll = window.setInterval(() => {
      void pullRisk();
      void pullRegime();
      void pullSignals();
    }, 10_000);
    ids.add(backendPoll);

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

