// Sentimento de mercado calculado a partir de dados reais da Binance.
import { getKlines, getTickers, TARGET_PAIRS } from './market.server'

export interface SentimentAsset {
  asset: string
  overall: number
  trend: 'up' | 'upup' | 'flat' | 'down'
  signal: 'BULLISH' | 'NEUTRAL' | 'BEARISH'
  spark: number[]
}

export interface SentimentOverview {
  overall: number
  bullBear: { bull: number; bear: number }
  advancers: number
  decliners: number
  topGainer: { asset: string; changePct: number } | null
  topLoser: { asset: string; changePct: number } | null
  quoteVolume24h: number
  assets: SentimentAsset[]
  updatedAt: string
}

const clamp = (n: number) => Math.max(1, Math.min(99, Math.round(n)))
const scoreFromChange = (pct: number) => clamp(50 + pct * 6)

export async function computeSentiment(): Promise<SentimentOverview> {
  const pairs = TARGET_PAIRS.slice(0, 6)
  const tickers = await getTickers(pairs)

  if (!tickers.length) {
    throw new Error('Sentimento de mercado indisponível: nenhuma cotação real foi retornada.')
  }

  const assets = await Promise.all(
    tickers.map(async (t): Promise<SentimentAsset> => {
      const base = t.pair.split('/')[0] ?? t.pair
      let closes: number[] = []
      try {
        const klines = await getKlines(t.pair, '4h', 42)
        closes = klines.map((k) => k.close)
      } catch {
        closes = []
      }

      const spark = closes.length
        ? (() => {
            const min = Math.min(...closes)
            const max = Math.max(...closes)
            const span = max - min || 1
            return closes.slice(-14).map((c) => 10 + ((c - min) / span) * 80)
          })()
        : []

      // Momento curto (últimas 6 barras) x variação de 24h.
      const recent = closes.slice(-6)
      const momentum =
        recent.length >= 2 && recent[0]
          ? ((recent[recent.length - 1]! - recent[0]!) / recent[0]!) * 100
          : 0

      const changeScore = scoreFromChange(t.changePct)
      const momentumScore = scoreFromChange(momentum)
      const range = t.high - t.low || 1
      const rangePosition = clamp(((t.price - t.low) / range) * 100)
      const overall = clamp(changeScore * 0.4 + momentumScore * 0.35 + rangePosition * 0.25)

      const trend: SentimentAsset['trend'] =
        momentum > 1.5 ? 'upup' : momentum > 0.3 ? 'up' : momentum < -0.3 ? 'down' : 'flat'
      const signal: SentimentAsset['signal'] =
        overall >= 60 ? 'BULLISH' : overall <= 40 ? 'BEARISH' : 'NEUTRAL'

      return { asset: base, overall, trend, signal, spark }
    }),
  )

  const advancers = tickers.filter((t) => t.changePct > 0).length
  const decliners = tickers.length - advancers
  const overall = clamp(assets.reduce((s, a) => s + a.overall, 0) / assets.length)
  const sorted = [...tickers].sort((a, b) => b.changePct - a.changePct)
  const top = sorted[0]
  const bottom = sorted[sorted.length - 1]

  return {
    overall,
    bullBear: { bull: overall, bear: 100 - overall },
    advancers,
    decliners,
    topGainer: top ? { asset: top.pair, changePct: top.changePct } : null,
    topLoser: bottom ? { asset: bottom.pair, changePct: bottom.changePct } : null,
    quoteVolume24h: tickers.reduce((s, t) => s + t.quoteVolume, 0),
    assets,
    updatedAt: new Date().toISOString(),
  }
}
