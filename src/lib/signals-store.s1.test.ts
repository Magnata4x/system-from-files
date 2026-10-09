import { beforeEach, describe, expect, it, vi } from "vitest";

const adapterMocks = vi.hoisted(() => ({
  list: vi.fn(),
  getLastDiscardedCount: vi.fn(() => 0),
  getLastFailedPairs: vi.fn(() => [] as string[]),
}));
vi.mock("@/adapters/backend/signal.adapter", () => ({
  signalAdapter: {
    list: adapterMocks.list,
    getLastDiscardedCount: adapterMocks.getLastDiscardedCount,
    getLastFailedPairs: adapterMocks.getLastFailedPairs,
  },
  mapSignal: vi.fn(),
}));

vi.mock("@/adapters/backend/ws-client", () => ({
  backendWs: {
    on: vi.fn(() => () => {}),
    isAuthenticatedOpen: vi.fn(() => false),
  },
}));

import { useSignalsStore } from "@/lib/signals-store";

describe("signals-store — contrato S1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSignalsStore.setState({
      signals: [],
      lastSyncAt: null,
      sourceStatus: "loading",
      discardedCount: 0,
    });
  });

  it("[] é sincronização válida e preenche lastSyncAt", async () => {
    adapterMocks.list.mockResolvedValueOnce([]);
    await useSignalsStore.getState().syncFromBackend();
    const state = useSignalsStore.getState();
    expect(state.sourceStatus).toBe("ok");
    expect(state.lastSyncAt).not.toBeNull();
    expect(state.signals).toEqual([]);
  });

  it("primeira falha fica unavailable", async () => {
    adapterMocks.list.mockRejectedValueOnce(new Error("backend down"));
    await useSignalsStore.getState().syncFromBackend();
    expect(useSignalsStore.getState().sourceStatus).toBe("unavailable");
  });

  it("falha após sincronização válida fica stale e preserva dados", async () => {
    adapterMocks.list.mockResolvedValueOnce([{
      id: "sig-1", symbol: "BTC/USDT", direction: "BUY", confidence: 80, entry: 100000,
      sl: null, tp: null, state: "active", tf: "4H", exchange: "binance", createdAt: new Date().toISOString(),
    }]);
    await useSignalsStore.getState().syncFromBackend();
    const before = useSignalsStore.getState().signals;
    // The S2.1 contract marks a failed source stale only after 30 seconds without a successful sync.
    useSignalsStore.setState({ lastSyncAt: Date.now() - 30_001 });
    adapterMocks.list.mockRejectedValueOnce(new Error("backend down"));
    await useSignalsStore.getState().syncFromBackend();
    expect(useSignalsStore.getState().sourceStatus).toBe("stale");
    expect(useSignalsStore.getState().signals).toEqual(before);
  });
});
