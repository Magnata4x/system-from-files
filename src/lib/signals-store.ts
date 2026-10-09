import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { createSelector } from "reselect";
import { type Signal, type AssetClass } from "./signals-data";
import { backendWs } from "@/adapters/backend/ws-client";
import { collectNewSignals } from "@/lib/dashboard-store";

export type ViewMode = "cards" | "table" | "radar";
export type SortKey = "score" | "rr";
export type SignalSourceStatus = "loading" | "ok" | "stale" | "unavailable";

type SignalToast = { id: string; signal: Signal; createdAt: number };
type Filters = {
  search: string;
  assetClass: "All" | AssetClass;
  timeframe: "All" | Signal["tf"];
  direction: "All" | "BUY" | "SELL";
  scoreMin: 0 | 60 | 75 | 90;
  exchanges: string[];
  scoreRange: [number, number];
  minRR: number;
  volatility: { low: boolean; med: boolean; high: boolean };
  manipRisk: { low: boolean; medium: boolean; high: boolean };
  setups: Record<string, boolean>;
  session: "All" | "Asia" | "London" | "NY";
  dnaCompat70: boolean;
  bot4xOnly: boolean;
};
type State = {
  signals: Signal[];
  filters: Filters;
  view: ViewMode;
  sort: SortKey;
  live: boolean;
  advOpen: boolean;
  streamOpen: boolean;
  pinnedId: string | null;
  hoverId: string | null;
  detailId: string | null;
  toasts: SignalToast[];
  flashIds: string[];
  lastSyncAt: number | null;
  sourceStatus: SignalSourceStatus;
  discardedCount: number;
  failedPairs: string[];
  discardedByReason: { sideways: number; below_min_score: number; source_error: number } | null;
  emptyStatusUnavailable: boolean;
  _intervalIds: Set<number>;
  _wsUnsub: (() => void) | null;
  _listenerCleanup: (() => void)[];
  syncFromBackend: () => Promise<void>;
  setView: (v: ViewMode) => void;
  setSort: (s: SortKey) => void;
  setLive: (v: boolean) => void;
  toggleAdv: () => void;
  toggleStream: () => void;
  setFilter: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  toggleExchange: (e: string) => void;
  pin: (id: string | null) => void;
  setHover: (id: string | null) => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  dismissToast: (id: string) => void;
  init: () => void;
  cleanup: () => void;
};

const POLL_INTERVAL_MS = 10_000;
const STALE_AFTER_MS = POLL_INTERVAL_MS * 3;
let seenSignalIds: Set<string> | null = null;

function mapBackendSignal(s: import("@/adapters/backend/signal.adapter").SignalUI): Signal {
  const createdMs = s.createdAt ? Date.parse(s.createdAt) : NaN;
  const ageMin = Number.isFinite(createdMs) ? Math.max(0, Math.floor((Date.now() - createdMs) / 60_000)) : null;
  const risk = s.entry != null && s.sl != null ? Math.abs(s.entry - s.sl) : 0;
  const reward = s.entry != null && s.tp != null ? Math.abs(s.tp - s.entry) : 0;
  const derivedRR = risk > 0 && reward > 0 ? Number((reward / risk).toFixed(4)) : null;
  return {
    id: s.id,
    asset: s.symbol,
    assetClass: "Crypto",
    exchange: s.exchange ?? null,
    direction: s.direction,
    score: s.confidence,
    tf: s.tf === "1H" || s.tf === "4H" ? s.tf : null,
    entry: s.entry,
    stop: s.sl,
    target: s.tp,
    rr: derivedRR,
    riskPct: s.riskPct ?? null,
    volDelta: s.volDelta ?? null,
    confirms: s.confirms ?? null,
    dnaMatch: s.dnaMatch ?? null,
    manipRisk: s.manipRisk ?? null,
    setup: s.setup ?? null,
    session: s.session ?? null,
    createdAt: s.createdAt ?? null,
    ageMin,
    status: s.state === "active" ? "active" : s.state === "pending" ? "new" : s.state === "closed" ? "expired" : null,
    isMock: false,
  };
}

export const useSignalsStore = create<State>((set, get) => ({
  signals: [],
  filters: {
    search: "", assetClass: "All", timeframe: "All", direction: "All", scoreMin: 0,
    exchanges: [], scoreRange: [0, 100], minRR: 0,
    volatility: { low: true, med: true, high: true },
    manipRisk: { low: true, medium: true, high: true },
    setups: {}, session: "All", dnaCompat70: false, bot4xOnly: false,
  },
  view: "cards", sort: "score", live: true, advOpen: false, streamOpen: false,
  pinnedId: null, hoverId: null, detailId: null, toasts: [], flashIds: [],
  lastSyncAt: null, sourceStatus: "loading", discardedCount: 0, failedPairs: [], discardedByReason: null, emptyStatusUnavailable: false, _intervalIds: new Set<number>(), _wsUnsub: null, _listenerCleanup: [],
  setView: (v) => set({ view: v }),
  setSort: (s) => set({ sort: s }),
  setLive: (v) => set({ live: v }),
  toggleAdv: () => set((s) => ({ advOpen: !s.advOpen })),
  toggleStream: () => set((s) => ({ streamOpen: !s.streamOpen })),
  setFilter: (k, v) => set((s) => ({ filters: { ...s.filters, [k]: v } })),
  toggleExchange: (e) => set((s) => {
    const normalized = e.toLowerCase() === "binance" ? "binance" : e.toLowerCase();
    const has = s.filters.exchanges.includes(normalized);
    return { filters: { ...s.filters, exchanges: has ? s.filters.exchanges.filter((x) => x !== normalized) : [...s.filters.exchanges, normalized] } };
  }),
  pin: (id) => set({ pinnedId: id }),
  setHover: (id) => set({ hoverId: id }),
  openDetail: (id) => set({ detailId: id }),
  closeDetail: () => set({ detailId: null }),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  syncFromBackend: async () => {
    try {
      const { signalAdapter } = await import("@/adapters/backend/signal.adapter");
      const backendSignals = await signalAdapter.list();
      const mapped = backendSignals.map(mapBackendSignal);
      let freshIds: string[] = [];
      if (seenSignalIds == null) {
        // First successful load establishes the baseline; never toast initial data.
        seenSignalIds = new Set(mapped.map((signal) => signal.id));
      } else {
        const dashboardSignals = mapped.map((signal) => ({
          id: signal.id,
          asset: signal.asset,
          direction: signal.direction,
          score: signal.score,
          entry: signal.entry,
          stop: signal.stop,
          target: signal.target,
          rr: signal.rr,
          tf: signal.tf ?? "—",
          time: signal.createdAt ?? "",
        }));
        freshIds = collectNewSignals(seenSignalIds, dashboardSignals).map((signal) => signal.id);
      }
      const fresh = mapped.filter((signal) => freshIds.includes(signal.id));
      if (fresh.length) {
        const timers = new Set(get()._intervalIds);
        const flashTimer = window.setTimeout(() => {
          set((state) => ({ flashIds: state.flashIds.filter((id) => !freshIds.includes(id)) }));
          const next = new Set(get()._intervalIds);
          next.delete(flashTimer);
          set({ _intervalIds: next });
        }, 3_000);
        timers.add(flashTimer);
        set((state) => ({
          toasts: [...fresh.map((signal) => ({ id: signal.id, signal, createdAt: Date.now() })), ...state.toasts]
            .filter((toast, index, all) => all.findIndex((candidate) => candidate.id === toast.id) === index)
            .slice(0, 3),
          flashIds: [...new Set([...state.flashIds, ...freshIds])],
          _intervalIds: timers,
        }));
      }
      set({
        signals: mapped,
        lastSyncAt: Date.now(),
        sourceStatus: "ok",
        discardedCount: signalAdapter.getLastDiscardedCount(),
        failedPairs: signalAdapter.getLastFailedPairs(),
      });
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[signals] syncFromBackend falhou:", err);
      try {
        const { signalAdapter } = await import("@/adapters/backend/signal.adapter");
        set((state) => ({
          sourceStatus: state.lastSyncAt == null ? "unavailable" : Date.now() - state.lastSyncAt > STALE_AFTER_MS ? "stale" : state.sourceStatus,
          failedPairs: signalAdapter.getLastFailedPairs(),
        }));
      } catch {
        set((state) => ({ sourceStatus: state.lastSyncAt == null ? "unavailable" : Date.now() - state.lastSyncAt > STALE_AFTER_MS ? "stale" : state.sourceStatus }));
      }
    }
  },
  init: () => {
    if (get()._intervalIds.size > 0 || get()._wsUnsub || get()._listenerCleanup.length > 0) return;

    void get().syncFromBackend();
    const unsub = backendWs.on("signal:new", async (payload) => {
      if (!get().live) return;
      try {
        const { mapSignal } = await import("@/adapters/backend/signal.adapter");
        const signal = mapSignal(payload as import("@/adapters/backend/signal.adapter").BackendSignal);
        const mapped = mapBackendSignal(signal);
        const isNew = seenSignalIds != null && !seenSignalIds.has(mapped.id);
        seenSignalIds?.add(mapped.id);
        set((state) => ({
          signals: [mapped, ...state.signals.filter((item) => item.id !== mapped.id)].slice(0, 60),
          ...(isNew ? {
            toasts: [{ id: mapped.id, signal: mapped, createdAt: Date.now() }, ...state.toasts].slice(0, 3),
            flashIds: [...new Set([...state.flashIds, mapped.id])],
          } : {}),
          sourceStatus: "ok",
          lastSyncAt: Date.now(),
        }));
        if (isNew) {
          const timer = window.setTimeout(() => {
            set((state) => ({ flashIds: state.flashIds.filter((id) => id !== mapped.id) }));
            const ids = new Set(get()._intervalIds);
            ids.delete(timer);
            set({ _intervalIds: ids });
          }, 3_000);
          set((state) => ({ _intervalIds: new Set([...state._intervalIds, timer]) }));
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[signals] payload WS inválido:", err);
        set((state) => ({ sourceStatus: state.lastSyncAt ? "stale" : "unavailable" }));
      }
    });

    let pollTimer: number | null = null;
    const startPolling = () => {
      if (pollTimer != null || document.visibilityState === "hidden") return;
      pollTimer = window.setInterval(() => {
        if (document.visibilityState !== "hidden") void get().syncFromBackend();
        const lastSyncAt = get().lastSyncAt;
        if (lastSyncAt != null && Date.now() - lastSyncAt > STALE_AFTER_MS && get().sourceStatus === "ok") {
          set({ sourceStatus: "stale" });
        }
      }, POLL_INTERVAL_MS);
      set((state) => ({ _intervalIds: new Set([...state._intervalIds, pollTimer as number]) }));
    };
    const stopPolling = () => {
      if (pollTimer == null) return;
      window.clearInterval(pollTimer);
      const stopped = pollTimer;
      pollTimer = null;
      set((state) => {
        const ids = new Set(state._intervalIds);
        ids.delete(stopped);
        return { _intervalIds: ids };
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopPolling();
      } else {
        void get().syncFromBackend();
        startPolling();
      }
    };
    const onFocus = () => {
      if (document.visibilityState !== "hidden") void get().syncFromBackend();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    startPolling();
    set({
      _wsUnsub: unsub,
      _listenerCleanup: [
        () => document.removeEventListener("visibilitychange", onVisibilityChange),
        () => window.removeEventListener("focus", onFocus),
        stopPolling,
      ],
    });
  },
  cleanup: () => {
    get()._intervalIds.forEach((id) => {
      window.clearInterval(id);
      window.clearTimeout(id);
    });
    get()._listenerCleanup.forEach((remove) => remove());
    get()._wsUnsub?.();
    seenSignalIds = null;
    set({
      _intervalIds: new Set<number>(),
      _wsUnsub: null,
      _listenerCleanup: [],
      flashIds: [],
      toasts: [],
    });
  },
}));

export function computeFilteredSorted(signals: Signal[], filters: Filters, sort: SortKey): Signal[] {
  const exchSet = new Set(filters.exchanges);
  const setupKeys = Object.keys(filters.setups).filter((k) => filters.setups[k]);
  const list = signals.filter((s) => {
    if (filters.search && !s.asset.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.assetClass !== "All" && s.assetClass !== filters.assetClass) return false;
    if (filters.timeframe !== "All" && s.tf !== filters.timeframe) return false;
    if (filters.direction !== "All" && s.direction !== filters.direction) return false;
    if (s.score < filters.scoreMin) return false;
    if (exchSet.size && (s.exchange == null || !exchSet.has(s.exchange.toLowerCase()))) return false;
    if (s.score < filters.scoreRange[0] || s.score > filters.scoreRange[1]) return false;
    if (filters.minRR > 0 && (s.rr == null || s.rr < filters.minRR)) return false;
    if (s.manipRisk != null && !filters.manipRisk[s.manipRisk]) return false;
    if (setupKeys.length && (s.setup == null || !setupKeys.includes(s.setup))) return false;
    if (filters.session !== "All" && s.session !== filters.session) return false;
    if (filters.dnaCompat70 && (s.dnaMatch == null || s.dnaMatch < 70)) return false;
    if (filters.bot4xOnly && (s.manipRisk == null || s.status == null)) return false;
    return true;
  });
  return [...list].sort((a, b) => {
    if (sort === "score") return b.score - a.score;
    if (sort === "rr") return (b.rr ?? -Infinity) - (a.rr ?? -Infinity);
    return 0;
  });
}

export const selectFilteredSorted = createSelector(
  [(state: State) => state.signals, (state: State) => state.filters, (state: State) => state.sort],
  (signals, filters, sort) => computeFilteredSorted(signals, filters, sort),
);

export function useFilteredSignals(): Signal[] {
  return useSignalsStore(useShallow((state) => selectFilteredSorted(state)));
}

export function selectStats(signals: Signal[]) {
  const total = signals.length;
  const buy = signals.filter((s) => s.direction === "BUY").length;
  const sell = signals.filter((s) => s.direction === "SELL").length;
  const avg = total ? Math.round(signals.reduce((a, s) => a + s.score, 0) / total) : null;
  const inst = signals.filter((s) => s.score >= 90).length;
  const high = signals.filter((s) => s.score >= 75).length;
  const expired = signals.filter((s) => s.status === "expired").length;
  return { total, buy, sell, avg, inst, high, expired };
}
