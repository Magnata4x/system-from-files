import { beforeEach, describe, expect, it, vi } from "vitest"

const market = vi.hoisted(() => ({
  TARGET_PAIRS: ["BTC/USDT", "ETH/USDT", "FAIL/USDT"] as string[],
  atr: vi.fn(() => 1),
  getClosedKlines: vi.fn(),
  getMarketRegime: vi.fn(),
  getTickers: vi.fn(),
  rsi: vi.fn(),
  toPair: vi.fn((pair: string) => pair),
}))

vi.mock("./market.server", () => market)

import { generateSignalsDetailed } from "./engine.server"
import type { Kline } from "./market.server"

function candlesWithOpenLast(): Kline[] {
  return Array.from({ length: 102 }, (_, index) => ({
    openTime: 1_700_000_000_000 + index * 14_400_000,
    open: 100 + index,
    high: 103 + index,
    low: 99 + index,
    close: 101 + index,
    volume: 1000 + index,
  })).map((candle, index, all) => index === all.length - 1
    ? { ...candle, high: 9999, close: 9990, volume: 999999 }
    : candle)
}

describe("S2 — motor de sinais determinístico", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    market.TARGET_PAIRS.splice(0, market.TARGET_PAIRS.length, "BTC/USDT", "ETH/USDT", "FAIL/USDT")
    market.atr.mockReturnValue(1)
    market.getClosedKlines.mockImplementation(async () => candlesWithOpenLast().slice(0, -1))
    market.getMarketRegime.mockResolvedValue({
      pair: "BTC/USDT",
      regime: "BULLISH",
      strength: 80,
      rsi: 55,
      volatility: 1,
      price: 200,
      emaFast: 200,
      emaSlow: 190,
      updatedAt: "2026-01-01T00:00:00.000Z",
    })
  })

  it("uses the penultimate candle, not the open last candle, for the signal price", async () => {
    market.TARGET_PAIRS.splice(0, market.TARGET_PAIRS.length, "BTC/USDT")
    const raw = candlesWithOpenLast()
    market.getClosedKlines.mockResolvedValueOnce(raw.slice(0, -1))

    const result = await generateSignalsDetailed()

    expect(result.signals).toHaveLength(1)
    expect(result.signals[0]?.entryPrice).toBe(raw.at(-2)?.close)
    expect(result.signals[0]?.entryPrice).not.toBe(raw.at(-1)?.close)
  })

  it("produces identical signals for identical market input", async () => {
    market.TARGET_PAIRS.splice(0, market.TARGET_PAIRS.length, "BTC/USDT")
    const first = await generateSignalsDetailed()
    const second = await generateSignalsDetailed()
    expect(second.signals).toEqual(first.signals)
  })

  it("reports every discard reason with pair-level evidence", async () => {
    market.getClosedKlines.mockImplementation(async (pair: string) => {
      if (pair === "FAIL/USDT") throw new Error("market source timeout")
      return candlesWithOpenLast().slice(0, -1)
    })
    market.getMarketRegime.mockImplementation(async (pair: string) => ({
      pair,
      regime: pair === "BTC/USDT" ? "SIDEWAYS" : "BEARISH",
      strength: 0,
      rsi: pair === "ETH/USDT" ? 30 : 50,
      volatility: 0,
      price: 200,
      emaFast: 200,
      emaSlow: 200,
      updatedAt: "2026-01-01T00:00:00.000Z",
    }))

    const result = await generateSignalsDetailed()

    expect(result.analyzedPairs).toEqual(["BTC/USDT", "ETH/USDT", "FAIL/USDT"])
    expect(result.failedPairs).toEqual(["FAIL/USDT"])
    expect(result.discarded).toEqual(expect.arrayContaining([
      { pair: "BTC/USDT", reason: "sideways" },
      { pair: "ETH/USDT", reason: "below_min_score" },
      expect.objectContaining({ pair: "FAIL/USDT", reason: "source_error", detail: "market source timeout" }),
    ]))
  })
})
