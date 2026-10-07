import { afterEach, describe, expect, it, vi } from "vitest"
import { getKlines, getTickers } from "./market.server"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
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

    await expect(getTickers(['ETH/USDT'])).rejects.toThrow('dados de mercado incompletos')
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

  it('propagates Binance HTTP failures as unavailable market data', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('rate limited', { status: 429 }))
    await expect(getKlines('BTC/USDT', '1h', 1)).rejects.toThrow('Binance 429')
  })
})