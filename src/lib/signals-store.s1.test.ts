import { beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.fn();
const getLastDiscardedCount = vi.fn(() => 0);

vi.mock("@/adapters/backend/signal.adapter", () => ({
  signalAdapter: { list, getLastDiscardedCount },
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
    list.mockResolvedValueOnce([]);
    await useSignalsStore.getState().syncFromBackend();
    const state = useSignalsStore.getState();
    expect(state.sourceStatus).toBe("ok");
    expect(state.lastSyncAt).not.toBeNull();
    expect(state.signals).toEqual([]);
  });

  it("primeira falha fica unavailable", async () => {
    list.mockRejectedValueOnce(new Error("backend down"));
    await useSignalsStore.getState().syncFromBackend();
    expect(useSignalsStore.getState().sourceStatus).toBe("unavailable");
  });

  it("falha após sincronização válida fica stale e preserva dados", async () => {
    list.mockResolvedValueOnce([{
      id: "sig-1", symbol: "BTC/USDT", direction: "BUY", confidence: 80, entry: 100000,
      sl: null, tp: null, state: "active", tf: "4H", exchange: "binance", createdAt: new Date().toISOString(),
    }]);
    await useSignalsStore.getState().syncFromBackend();
    const before = useSignalsStore.getState().signals;
    list.mockRejectedValueOnce(new Error("backend down"));
    await useSignalsStore.getState().syncFromBackend();
    expect(useSignalsStore.getState().sourceStatus).toBe("stale");
    expect(useSignalsStore.getState().signals).toEqual(before);
  });
});
