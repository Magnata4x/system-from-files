import { afterEach, describe, expect, it, vi } from "vitest"
import { getKlines, getTickers, MarketDataError, rsi, selectClosedCandles } from "./market.server"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('real Binance market data flow', () => {
  it('accepts only complete real Binance ticker payloads', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { symbol: 'BTCUSDT', lastPrice: '100000', priceChangePercent: '1.25', volume: '10', quoteVolume: '1000000', highPrice: '101000', lowPrice: '99000' },
    ]), { status: 200 }))

    const result = await getTickers(['BTC/USDT'])

    expect(result).toEqual([{
      pair: 'BTC/USDT', symbol: 'BTCUSDT', price: 100000, changePct: 1.25,
      volume: 10, quoteVolume: 1000000, high: 101000, low: 99000,
    }])
  })

  it('rejects incomplete ticker data instead of manufacturing zero values', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { symbol: 'ETHUSDT', lastPrice: '4000', priceChangePercent: '1.25' },
    ]), { status: 200 }))

    await expect(getTickers(['ETH/USDT'])).rejects.toThrow('ticker inválido')
  })

  it('rejects malformed candles instead of passing synthetic values downstream', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      [Date.now(), '100000', '101000', '99000', '100500', '0'],
    ]), { status: 200 }))

    await expect(getKlines('BTC/USDT', '4h', 1)).resolves.toHaveLength(1)

    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      [Date.now(), '100000', '101000', '99000', 'NaN', '10'],
    ]), { status: 200 }))
    await expect(getKlines('BTC/USDT', '4h', 2)).rejects.toThrow('candle inválido')
  })

  it("falls back to the secondary market data endpoint when Binance primary fails", async () => {
    const payload = [[1_700_000_000_000, "100", "102", "99", "101", "10"]]
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }))

    await expect(getKlines("XRP/USDT", "1h", 7)).resolves.toHaveLength(1)
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    expect(String(vi.mocked(globalThis.fetch).mock.calls[1]?.[0])).toContain("data-api.binance.vision")
  })

  it("throws a typed error when both market sources fail", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 }))
    await expect(getKlines("ADA/USDT", "1h", 8)).rejects.toMatchObject({
      name: "MarketDataError",
      code: "SOURCE_UNAVAILABLE",
      failures: expect.arrayContaining([expect.stringContaining("HTTP 429")]),
    })
  })

  it("uses Wilder smoothing against a known RSI reference vector", () => {
    expect(rsi([1, 2, 1, 2, 1], 3)).toBeCloseTo(44.444444, 5)
  })

  it("rejects an RSI request without enough real closes", () => {
    expect(() => rsi([1, 2, 3], 3)).toThrow(MarketDataError)
  })

  it("ignores the final open candle and keeps the penultimate candle", () => {
    const candles = [
      { openTime: 1, open: 10, high: 12, low: 9, close: 11, volume: 1 },
      { openTime: 2, open: 11, high: 13, low: 10, close: 12, volume: 2 },
      { openTime: 3, open: 12, high: 999, low: 1, close: 500, volume: 999 },
    ]
    expect(selectClosedCandles(candles)).toEqual([candles[0], candles[1]])
  })

  it("times out both providers using fake timers", async () => {
    vi.useFakeTimers()
    globalThis.fetch = vi.fn((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
    })) as typeof fetch

    const pending = getKlines("DOGE/USDT", "30m", 9)
    const rejection = expect(pending).rejects.toMatchObject({ name: "MarketDataError", code: "TIMEOUT" })
    await vi.runAllTimersAsync()
    await rejection
    vi.useRealTimers()
  })
})