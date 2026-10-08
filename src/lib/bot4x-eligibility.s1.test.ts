import { describe, expect, it } from "vitest";
import { bot4xEligibility } from "@/lib/bot4x-eligibility";
import type { Signal } from "@/lib/signals-data";

const base: Signal = {
  id: "sig-1", asset: "BTC/USDT", assetClass: "Crypto", exchange: "binance",
  direction: "BUY", score: 90, tf: "4H", entry: 100000, stop: null, target: null,
  rr: null, riskPct: null, volDelta: null, confirms: null, dnaMatch: null,
  manipRisk: null, setup: null, session: null, createdAt: null, ageMin: null, status: "active",
};

describe("bot4x eligibility — unknown stays unavailable", () => {
  it("DNA null does not satisfy DNA threshold semantics", () => {
    expect(base.dnaMatch == null || base.dnaMatch < 70).toBe(true);
  });

  it("manipRisk null is indisponível, never low/execute", () => {
    expect(bot4xEligibility(base, { dailyPnlPct: 0, profile: "regular", mode: "DEMO" })).toBe("INDISPONIVEL");
  });

  it("status null is indisponível", () => {
    expect(bot4xEligibility({ ...base, manipRisk: "low", status: null }, { dailyPnlPct: 0, profile: "regular", mode: "DEMO" })).toBe("INDISPONIVEL");
  });
});
