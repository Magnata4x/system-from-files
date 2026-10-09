import { describe, expect, it } from "vitest";
import { deriveRiskReward, mapSignalList, mapSignal } from "./signal.adapter";
import type { BackendSignal } from "./signal.adapter";

function signal(overrides: Partial<BackendSignal> = {}): BackendSignal {
  return {
    id: "signal-1",
    pair: "BTC/USDT",
    side: "BUY",
    score: 82,
    entryPrice: 100,
    stopLoss: 95,
    takeProfit1: 110,
    status: "active",
    tf: "4H",
    exchange: " Binance ",
    createdAt: "2026-10-08T10:00:00.000Z",
    ...overrides,
  };
}

describe("signal adapter integrity", () => {
  it("normalizes exchange and derives R/R only from real entry, stop and target", () => {
    const mapped = mapSignal(signal({ rr: null }));
    expect(mapped.exchange).toBe("binance");
    expect(mapped.rr).toBe(2);
  });

  it("returns null R/R when any required price is unavailable or risk is zero", () => {
    expect(deriveRiskReward(100, null, 110)).toBeNull();
    expect(deriveRiskReward(100, 100, 110)).toBeNull();
    expect(deriveRiskReward(100, 95, Number.NaN)).toBeNull();
  });

  it("counts invalid items and preserves valid items", () => {
    const result = mapSignalList([
      signal(),
      signal({ id: "bad-entry", entryPrice: null }),
      signal({ id: "bad-side", side: "HOLD" as BackendSignal["side"] }),
    ]);
    expect(result.signals.map((item) => item.id)).toEqual(["signal-1"]);
    expect(result.discardedCount).toBe(2);
  });
});
