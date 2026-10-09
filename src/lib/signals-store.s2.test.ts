import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const adapter = vi.hoisted(() => ({
  list: vi.fn(),
  getLastDiscardedCount: vi.fn(() => 0),
  getLastFailedPairs: vi.fn(() => [] as string[]),
  mapSignal: vi.fn(),
}));
const ws = vi.hoisted(() => ({ on: vi.fn(() => () => {}) }));

vi.mock("@/adapters/backend/signal.adapter", () => ({
  signalAdapter: adapter,
  mapSignal: adapter.mapSignal,
}));
vi.mock("@/adapters/backend/ws-client", () => ({ backendWs: ws }));

import { useSignalsStore } from "@/lib/signals-store";

const btc = {
  id: "btc-1",
  symbol: "BTC/USDT",
  direction: "BUY",
  confidence: 80,
  entry: 100,
  sl: 95,
  tp: 110,
  state: "active",
  tf: "4H",
  exchange: "binance",
  createdAt: "2026-10-09T00:00:00.000Z",
};

describe("signals-store S2.1 live refresh", () => {
  let originalVisibility: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    originalVisibility = Object.getOwnPropertyDescriptor(document, "visibilityState");
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    useSignalsStore.getState().cleanup();
    useSignalsStore.setState({
      signals: [],
      toasts: [],
      flashIds: [],
      lastSyncAt: null,
      sourceStatus: "loading",
      _intervalIds: new Set<number>(),
      _wsUnsub: null,
      _listenerCleanup: [],
    });
    adapter.list.mockResolvedValue([btc]);
  });

  afterEach(() => {
    useSignalsStore.getState().cleanup();
    vi.useRealTimers();
    if (originalVisibility) Object.defineProperty(document, "visibilityState", originalVisibility);
    else Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  it("polls every 10 seconds without requiring an authenticated WebSocket", async () => {
    useSignalsStore.getState().init();
    await vi.advanceTimersByTimeAsync(0);
    expect(adapter.list).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(adapter.list).toHaveBeenCalledTimes(2);
  });

  it("pauses while hidden and refetches immediately when visible again", async () => {
    useSignalsStore.getState().init();
    await vi.advanceTimersByTimeAsync(0);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(adapter.list).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(adapter.list).toHaveBeenCalledTimes(2);
  });

  it("does not toast on first load and toasts only newly seen ids", async () => {
    await useSignalsStore.getState().syncFromBackend();
    expect(useSignalsStore.getState().toasts).toHaveLength(0);

    adapter.list.mockResolvedValueOnce([
      btc,
      { ...btc, id: "eth-2", symbol: "ETH/USDT" },
    ]);
    await useSignalsStore.getState().syncFromBackend();
    expect(useSignalsStore.getState().toasts.map((toast) => toast.id)).toEqual(["eth-2"]);
    expect(useSignalsStore.getState().flashIds).toContain("eth-2");
  });

  it("clears intervals, listeners, seen ids, toasts and flashes on cleanup", async () => {
    useSignalsStore.getState().init();
    await vi.advanceTimersByTimeAsync(0);
    useSignalsStore.setState({ toasts: [{ id: "t", signal: useSignalsStore.getState().signals[0]!, createdAt: Date.now() }], flashIds: ["btc-1"] });
    useSignalsStore.getState().cleanup();
    expect(useSignalsStore.getState()._intervalIds.size).toBe(0);
    expect(useSignalsStore.getState()._listenerCleanup).toHaveLength(0);
    expect(useSignalsStore.getState().toasts).toHaveLength(0);
    expect(useSignalsStore.getState().flashIds).toHaveLength(0);
  });

  it("marks a failed source stale after three cycles and returns to ok on success", async () => {
    useSignalsStore.getState().init();
    await vi.advanceTimersByTimeAsync(0);
    expect(useSignalsStore.getState().sourceStatus).toBe("ok");

    adapter.list.mockRejectedValue(new Error("backend unavailable"));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(useSignalsStore.getState().sourceStatus).toBe("stale");

    adapter.list.mockResolvedValue([btc]);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(useSignalsStore.getState().sourceStatus).toBe("ok");
  })
});
