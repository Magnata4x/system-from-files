import { describe, expect, it } from "vitest";
import { computeFilteredSorted, useSignalsStore } from "./signals-store";
import type { Signal } from "./signals-data";

const base: Signal = {
  id: "s1", asset: "BTC/USDT", assetClass: "Crypto", exchange: "binance",
  direction: "BUY", score: 85, tf: "4H", entry: 100, stop: 95, target: 110,
  rr: 2, riskPct: null, volDelta: null, confirms: null, dnaMatch: null,
  manipRisk: null, setup: null, session: null, createdAt: null, ageMin: null,
  status: "active", isMock: false,
};

describe("S1.1 signal filters", () => {
  it("filters by normalized exchange and excludes unknown exchanges when selected", () => {
    const filters = useSignalsStore.getState().filters;
    expect(computeFilteredSorted([base], { ...filters, exchanges: ["binance"] }, "score")).toHaveLength(1);
    expect(computeFilteredSorted([{ ...base, exchange: null }], { ...filters, exchanges: ["binance"] }, "score")).toHaveLength(0);
  });

  it("does not treat null DNA as compatible with the >=70% filter", () => {
    const filters = useSignalsStore.getState().filters;
    expect(computeFilteredSorted([base], { ...filters, dnaCompat70: true }, "score")).toHaveLength(0);
    expect(computeFilteredSorted([{ ...base, dnaMatch: 70 }], { ...filters, dnaCompat70: true }, "score")).toHaveLength(1);
  });
});
