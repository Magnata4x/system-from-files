import { describe, expect, it, vi, afterEach } from "vitest";
import { computeDnaStats } from "@/lib/server/dna.server";
import { mapDnaProfile } from "@/adapters/backend/dna.adapter";

function makeUser(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
  const order = vi.fn(() => ({ limit }));
  const gte = vi.fn(() => ({ order }));
  const eq = vi.fn(() => ({ gte }));
  const select = vi.fn(() => ({ eq }));
  return {
    userId: "user-1",
    email: "test@example.com",
    role: "authenticated",
    supabase: { from: vi.fn(() => ({ select })) },
  } as never;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("computeDnaStats", () => {
  it("returns an explicit empty state and real analysis window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T00:00:00Z"));

    const result = await computeDnaStats(makeUser([]));

    expect(result.hasData).toBe(false);
    expect(result.totalTrades).toBe(0);
    expect(result.periodDays).toBe(180);
    expect(result.periodStart).toBe("2026-04-07T00:00:00.000Z");
    expect(result.periodEnd).toBe("2026-10-04T00:00:00.000Z");
    expect(result.generatedAt).toBe("2026-10-04T00:00:00.000Z");
  });

  it("calculates DNA metrics only from the supplied trades", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T00:00:00Z"));

    const result = await computeDnaStats(
      makeUser([
        { day: "2026-10-01", pair: "BTC/USDT", result: "win", pnl: 20, pnl_pct: 2, hour: 9, created_at: "2026-10-01T09:00:00Z" },
        { day: "2026-10-02", pair: "BTC/USDT", result: "loss", pnl: -10, pnl_pct: -1, hour: 9, created_at: "2026-10-02T09:00:00Z" },
        { day: "2026-10-03", pair: "ETH/USDT", result: "win", pnl: 10, pnl_pct: 1, hour: 14, created_at: "2026-10-03T14:00:00Z" },
      ]),
    );

    expect(result.hasData).toBe(true);
    expect(result.totalTrades).toBe(3);
    expect(result.winRate).toBeCloseTo(66.67, 2);
    expect(result.totalPnl).toBe(20);
    expect(result.avgPnlPct).toBeCloseTo(0.67, 2);
    expect(result.bestPair).toBe("BTC/USDT");
    expect(result.bestHour).toBe(9);
    expect(result.periodDays).toBe(180);
    expect(result.evolution.length).toBeGreaterThan(0);
    expect(result.heatmap.length).toBe(90);
    expect(result.generatedAt).toBe("2026-10-04T00:00:00.000Z");
  });
});

describe("mapDnaProfile", () => {
  it("maps persisted profile fields without inventing values", () => {
    const result = mapDnaProfile({
      userId: "user-1",
      consistency: 81,
      discipline: 72,
      riskControl: 90,
      timing: 68,
      emotionalControl: 64,
      avgWinRate: 61.5,
      bestSession: "London",
      worstSession: "Asia",
      overtradingRisk: true,
      tradingStyle: "moderate",
    });

    expect(result).toMatchObject({
      userId: "user-1",
      dnaConsistency: 81,
      dnaDiscipline: 72,
      dnaRiskControl: 90,
      dnaTiming: 68,
      dnaEmotionalControl: 64,
      avgWinRate: 61.5,
      bestSession: "London",
      worstSession: "Asia",
      overtradingRisk: true,
      style: "moderate",
    });
  });
});
