import type { Kline } from "./market.server"

export type SignalTerminalResult = "sl" | "tp1" | "expired"

export interface PersistedSignalLifecycle {
  side: "BUY" | "SELL"
  status: string
  entry_price: number
  stop_loss: number | null
  take_profit1: number | null
  valid_until: string | null
  candles_elapsed: number
}

export interface SignalLifecycleUpdate {
  status: "invalidated" | "closed" | "expired"
  result: SignalTerminalResult
  closed_at: string
  result_price: number | null
  invalidation_reason: "stop_loss" | null
  candles_elapsed: number
}

/**
 * Evaluates one fully closed candle. Stop loss wins when SL and TP1 are both
 * inside the same candle because OHLC data cannot establish intrabar order.
 */
export function evaluateSignalLifecycle(
  signal: PersistedSignalLifecycle,
  candle: Kline,
  options: { now?: Date; maxCandles?: number } = {},
): SignalLifecycleUpdate | null {
  if (signal.status !== "active") return null
  const now = options.now ?? new Date()
  const maxCandles = options.maxCandles ?? 24
  if (!Number.isInteger(maxCandles) || maxCandles < 1) {
    throw new RangeError("maxCandles deve ser um inteiro positivo")
  }
  if (![candle.openTime, candle.high, candle.low, candle.close].every(Number.isFinite)
    || candle.high <= 0 || candle.low <= 0 || candle.low > candle.high) {
    throw new Error("Candle inválido para avaliação do ciclo de vida")
  }

  const elapsed = signal.candles_elapsed + 1
  const closeAt = new Date(candle.openTime).toISOString()
  const finish = (
    status: SignalLifecycleUpdate["status"],
    result: SignalTerminalResult,
    resultPrice: number | null,
    invalidationReason: SignalLifecycleUpdate["invalidation_reason"] = null,
  ): SignalLifecycleUpdate => ({
    status,
    result,
    closed_at: closeAt,
    result_price: resultPrice,
    invalidation_reason: invalidationReason,
    candles_elapsed: elapsed,
  })

  const stopHit = signal.stop_loss != null && (
    signal.side === "BUY" ? candle.low <= signal.stop_loss : candle.high >= signal.stop_loss
  )
  if (stopHit) return finish("invalidated", "sl", signal.stop_loss, "stop_loss")

  const targetHit = signal.take_profit1 != null && (
    signal.side === "BUY" ? candle.high >= signal.take_profit1 : candle.low <= signal.take_profit1
  )
  if (targetHit) return finish("closed", "tp1", signal.take_profit1)

  const expiredByCount = elapsed >= maxCandles
  const expiredByTime = signal.valid_until != null && now.getTime() >= Date.parse(signal.valid_until)
  if (expiredByCount || expiredByTime) return finish("expired", "expired", candle.close)

  return null
}
