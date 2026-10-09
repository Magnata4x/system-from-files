import { describe, expect, it } from "vitest"
import { evaluateSignalLifecycle } from "./signal-lifecycle.server"
import type { Kline } from "./market.server"

const candle: Kline = {
  openTime: Date.parse("2026-10-08T12:00:00.000Z"),
  open: 100,
  high: 110,
  low: 90,
  close: 105,
  volume: 10,
}

const base = {
  side: "BUY" as const,
  status: "active",
  entry_price: 100,
  stop_loss: 95,
  take_profit1: 108,
  valid_until: "2026-10-09T00:00:00.000Z",
  candles_elapsed: 0,
}

describe("evaluateSignalLifecycle", () => {
  it("invalidates on stop loss and conservatively prioritizes SL if both levels were touched", () => {
    expect(evaluateSignalLifecycle(base, candle, { now: new Date("2026-10-08T13:00:00Z") })).toMatchObject({
      status: "invalidated",
      result: "sl",
      result_price: 95,
      invalidation_reason: "stop_loss",
      candles_elapsed: 1,
    })
  })

  it("closes at TP1 when target is touched without touching SL", () => {
    const tpCandle = { ...candle, low: 99, high: 109 }
    expect(evaluateSignalLifecycle(base, tpCandle, { now: new Date("2026-10-08T13:00:00Z") })).toMatchObject({
      status: "closed",
      result: "tp1",
      result_price: 108,
      invalidation_reason: null,
    })
  })

  it("expires after the configured number of closed candles", () => {
    const quietCandle = { ...candle, low: 99, high: 107 }
    expect(evaluateSignalLifecycle({ ...base, candles_elapsed: 2 }, quietCandle, {
      now: new Date("2026-10-08T13:00:00Z"),
      maxCandles: 3,
    })).toMatchObject({ status: "expired", result: "expired", candles_elapsed: 3 })
  })

  it("does not mutate an already terminal signal", () => {
    expect(evaluateSignalLifecycle({ ...base, status: "closed" }, candle)).toBeNull()
  })
})
