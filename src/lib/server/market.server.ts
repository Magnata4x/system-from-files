// Camada de mercado do backend interno: dados públicos da Binance + indicadores.
// Substitui o serviço BinanceService/MarketRegime do backend NestJS externo.

import { MARKET_PAIRS, toBinanceSymbol as sharedToBinanceSymbol, toMarketPair } from "@/lib/market-symbols"

export const TARGET_PAIRS = MARKET_PAIRS

const BINANCE = "https://api.binance.com"

export function toBinanceSymbol(pair: string): string { return sharedToBinanceSymbol(pair) }

export function toPair(symbol: string): string { return toMarketPair(symbol) }

interface CacheEntry {
  expires: number
  value: unknown
}
const cache = new Map<string, CacheEntry>()

async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T
  const value = await loader()
  cache.set(key, { expires: Date.now() + ttlMs, value })
  return value
}

export interface Ticker {
  pair: string
  symbol: string
  price: number
  changePct: number
  volume: number
  quoteVolume: number
  high: number
  low: number
}

export interface Kline {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

async function binanceFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BINANCE}${path}`, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`Binance ${res.status} em ${path}`)
  return (await res.json()) as T
}

export async function getTickers(pairs: readonly string[] = TARGET_PAIRS): Promise<Ticker[]> {
  const symbols = pairs.map(toBinanceSymbol)
  return cached(`tickers:${symbols.join(',')}`, 15_000, async () => {
    const query = encodeURIComponent(JSON.stringify(symbols))
    const raw = await binanceFetch<Array<Record<string, string>>>(
      `/api/v3/ticker/24hr?symbols=${query}`,
    )
    if (!Array.isArray(raw) || raw.length !== symbols.length) {
      throw new Error('Binance retornou dados de mercado incompletos em /api/v3/ticker/24hr')
    }

    const bySymbol = new Map(raw.map((t) => [t['symbol'], t]))
    return symbols.map((expected, index) => {
      const t = bySymbol.get(expected) ?? {}
      const symbol = t['symbol']
      const price = Number(t['lastPrice'])
      const changePct = Number(t['priceChangePercent'])
      const volume = Number(t['volume'])
      const quoteVolume = Number(t['quoteVolume'])
      const high = Number(t['highPrice'])
      const low = Number(t['lowPrice'])

      if (
        symbol !== symbols[index] ||
        !Number.isFinite(price) || price <= 0 ||
        !Number.isFinite(changePct) ||
        !Number.isFinite(volume) || volume < 0 ||
        !Number.isFinite(quoteVolume) || quoteVolume < 0 ||
        !Number.isFinite(high) || high <= 0 ||
        !Number.isFinite(low) || low <= 0
      ) {
        throw new Error('Binance retornou ticker inválido para ' + (symbols[index] ?? 'símbolo desconhecido'))
      }

      return { pair: toPair(symbol), symbol, price, changePct, volume, quoteVolume, high, low }
    })
  })
}

export async function getTicker(pair: string): Promise<Ticker | null> {
  const [t] = await getTickers([pair])
  return t ?? null
}

export async function getKlines(pair: string, interval = '4h', limit = 200): Promise<Kline[]> {
  const symbol = toBinanceSymbol(pair)
  return cached(`klines:${symbol}:${interval}:${limit}`, 60_000, async () => {
    const raw = await binanceFetch<Array<Array<string | number>>>(
      `/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    )
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error('Binance retornou histórico de candles vazio para ' + symbol)
    }

    return raw.map((k, index) => {
      const openTime = Number(k[0])
      const open = Number(k[1])
      const high = Number(k[2])
      const low = Number(k[3])
      const close = Number(k[4])
      const volume = Number(k[5])

      if (
        !Number.isFinite(openTime) || openTime <= 0 ||
        !Number.isFinite(open) || open <= 0 ||
        !Number.isFinite(high) || high <= 0 ||
        !Number.isFinite(low) || low <= 0 ||
        !Number.isFinite(close) || close <= 0 ||
        !Number.isFinite(volume) || volume < 0 ||
        high < Math.max(open, close) ||
        low > Math.min(open, close)
      ) {
        throw new Error('Binance retornou candle inválido para ' + symbol + ' na posição ' + index)
      }

      return { openTime, open, high, low, close, volume }
    })
  })
}

// ── Indicadores ────────────────────────────────────────────────────────────

export function rsi(closes: number[], period = 14): number {
  if (closes.length <= period) return 50
  let gain = 0
  let loss = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = (closes[i] ?? 0) - (closes[i - 1] ?? 0)
    if (diff >= 0) gain += diff
    else loss -= diff
  }
  if (loss === 0) return 100
  const rs = gain / loss
  return Math.round(100 - 100 / (1 + rs))
}

export function ema(values: number[], period: number): number {
  if (values.length === 0) return 0
  const k = 2 / (period + 1)
  return values.reduce((acc, v, i) => (i === 0 ? v : v * k + acc * (1 - k)), 0)
}

export function atr(candles: Kline[], period = 14): number {
  if (candles.length < 2) return 0
  const slice = candles.slice(-period - 1)
  let sum = 0
  for (let i = 1; i < slice.length; i++) {
    const c = slice[i]!
    const prev = slice[i - 1]!
    sum += Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close))
  }
  return sum / (slice.length - 1)
}

export type Regime = 'BULLISH' | 'BEARISH' | 'SIDEWAYS'

export interface MarketRegime {
  pair: string
  regime: Regime
  strength: number
  rsi: number
  volatility: number
  price: number
  emaFast: number
  emaSlow: number
  updatedAt: string
}

export async function getMarketRegime(pair: string): Promise<MarketRegime> {
  const candles = await getKlines(pair, '4h', 200)
  const closes = candles.map((c) => c.close)
  const price = closes.at(-1)
  if (price == null || price <= 0) throw new Error('Dados de mercado indisponíveis para ' + pair)
  const fast = ema(closes.slice(-40), 20)
  const slow = ema(closes.slice(-100), 50)
  const r = rsi(closes)
  const volatility = price > 0 ? (atr(candles) / price) * 100 : 0
  const spread = slow > 0 ? ((fast - slow) / slow) * 100 : 0

  let regime: Regime = 'SIDEWAYS'
  if (spread > 0.6 && r > 50) regime = 'BULLISH'
  else if (spread < -0.6 && r < 50) regime = 'BEARISH'

  return {
    pair: toPair(pair),
    regime,
    strength: Math.min(100, Math.round(Math.abs(spread) * 25)),
    rsi: r,
    volatility: Number(volatility.toFixed(2)),
    price,
    emaFast: fast,
    emaSlow: slow,
    updatedAt: new Date().toISOString(),
  }
}