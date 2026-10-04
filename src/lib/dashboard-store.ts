import { create } from "zustand";
import { api, endpoints } from "@/adapters/backend/api.adapter";
import { signalAdapter } from "@/adapters/backend/signal.adapter";
import { manipulationAdapter } from "@/adapters/backend/manipulation.adapter";
import type { Alert as ManipulationAlert } from "@/lib/manipulation-data";
import { logger } from "./logger";

type Toast = { id: string; signal: Signal; };

export type Signal = { id:string; asset:string; direction:"BUY"|"SELL"; score:number; entry:number; stop:number|null; target:number|null; rr:number|null; tf:string; time:string; };
export type HeatmapAsset = { symbol:string; name:string; price:number; change:number; volume:number; };

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
  /** true enquanto o primeiro pull de sinais não retornou. */
  signalsLoading: boolean;
  signalsError: string | null;
  signalsStale: boolean;
  manipAlerts: ManipulationAlert[];
  manipLoading: boolean;
  manipError: string | null;
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

/** Ids de sinais já vistos — usados para emitir toast só de novidade real. */
let seenSignalIds: Set<string> | null = null;

export const useDashboardStore = create<DashboardState>((set, get) => ({
  prices: {},
  heatmap: [],
  signals: [],
  signalsLoading: true,
  signalsError: null,
  signalsStale: false,
  manipAlerts: [],
  manipLoading: true,
  manipError: null,
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
        const mapped: Signal[] = list.slice(0, 12).map((s) => ({
          id: s.id,
          asset: s.symbol,
          direction: s.direction,
          score: Math.round(s.confidence),
          entry: s.entry,
          stop: s.sl ?? null,
          target: s.tp ?? null,
          rr:
            s.sl != null && s.tp != null && s.entry - s.sl !== 0
              ? +Math.abs((s.tp - s.entry) / (s.entry - s.sl)).toFixed(2)
              : null,
          tf: s.tf ?? "—",
          time: s.createdAt ?? "",
        }));
        set({ signals: mapped, signalsLoading: false, signalsError: null, signalsStale: false });

        // Toast apenas para sinais novos (nunca na primeira carga).
        if (seenSignalIds === null) {
          seenSignalIds = new Set(mapped.map((m) => m.id));
        } else {
          for (const m of mapped) {
            if (!seenSignalIds.has(m.id)) {
              seenSignalIds.add(m.id);
              get().pushToast(m);
            }
          }
        }
      } catch (err) {
        logger.warn("[dashboard] signals falhou", { error: err });
        set({
          signalsLoading: false,
          signalsStale: get().signals.length > 0,
          signalsError: err instanceof Error ? err.message : "Falha ao carregar sinais",
        });
      }
    };
    const pullManipulation = async () => {
      try {
        const list = await manipulationAdapter.getAlerts({ limit: 8 });
        set({ manipAlerts: list, manipLoading: false, manipError: null });
      } catch (err) {
        logger.warn("[dashboard] manipulation/alerts falhou", { error: err });
        set({
          manipLoading: false,
          manipError: err instanceof Error ? err.message : "Falha ao carregar alertas",
        });
      }
    };

    // Kick inicial + polling contínuo (10s).
    void pullRisk();
    void pullRegime();
    void pullSignals();
    void pullManipulation();
    const backendPoll = window.setInterval(() => {
      void pullRisk();
      void pullRegime();
      void pullSignals();
      void pullManipulation();
    }, 10_000);
    ids.add(backendPoll);



    set({ _intervalIds: ids });
  },

  cleanup: () => {
    get()._intervalIds.forEach((id) => {
      clearInterval(id);
      clearTimeout(id);
    });
    seenSignalIds = null;
    set({ _intervalIds: new Set<number>(), toasts: [] });
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

