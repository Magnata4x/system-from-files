// Sentimento de mercado calculado a partir de dados reais da Binance.
import { getKlines, getTickers, TARGET_PAIRS } from './market.server'
import { cachedJson } from '@/lib/cache'

export interface SentimentAsset {
  asset: string
  overall: number
  trend: 'up' | 'upup' | 'flat' | 'down'
  signal: 'BULLISH' | 'NEUTRAL' | 'BEARISH'
  spark: number[]
}

export interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  sentimentScore: number | null
  tone: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  assets: string[]
}

export interface NewsSentiment {
  status: 'ok' | 'stale' | 'unavailable'
  score: number | null
  articleCount: number
  updatedAt: string | null
  source: 'Marketaux' | null
  articles: NewsItem[]
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
  news: NewsSentiment
}

const clamp = (n: number) => Math.max(1, Math.min(99, Math.round(n)))
const scoreFromChange = (pct: number) => clamp(50 + pct * 6)

const toneFromScore = (score: number | null): NewsItem['tone'] =>
  score === null ? 'NEUTRAL' : score > 0.1 ? 'POSITIVE' : score < -0.1 ? 'NEGATIVE' : 'NEUTRAL'

type MarketauxEntity = { symbol?: string; name?: string; type?: string; sentiment_score?: number }
type MarketauxArticle = {
  uuid?: string
  title?: string
  source?: string
  url?: string
  published_at?: string
  entities?: MarketauxEntity[]
}
type MarketauxResponse = { data?: MarketauxArticle[] }

async function fetchNewsSentiment(): Promise<NewsSentiment> {
  const token = process.env['MARKETAUX_API_TOKEN']
  if (!token) {
    return { status: 'unavailable', score: null, articleCount: 0, updatedAt: null, source: null, articles: [] }
  }

  try {
    const payload = await cachedJson<MarketauxResponse>('sentiment:marketaux:news:v1', 300, async () => {
      const params = new URLSearchParams({
        api_token: token,
        entity_types: 'cryptocurrency,equity,index,etf,mutualfund,currency',
        language: 'en,pt',
        must_have_entities: 'true',
        filter_entities: 'true',
        limit: '3',
      })
      const response = await fetch('https://api.marketaux.com/v1/news/all?' + params.toString(), {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Marketaux HTTP ' + response.status)
      return (await response.json()) as MarketauxResponse
    })

    const articles = (payload.data ?? [])
      .filter((article) => article.title && article.url && article.published_at)
      .map((article): NewsItem => {
        const scores = (article.entities ?? [])
          .map((entity) => entity.sentiment_score)
          .filter((score): score is number => typeof score === 'number' && Number.isFinite(score))
        const sentimentScore = scores.length
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : null
        return {
          id: article.uuid ?? article.url!,
          title: article.title!,
          source: article.source ?? 'fonte indisponível',
          url: article.url!,
          publishedAt: article.published_at!,
          sentimentScore,
          tone: toneFromScore(sentimentScore),
          assets: (article.entities ?? [])
            .map((entity) => entity.symbol ?? entity.name ?? '')
            .filter(Boolean)
            .slice(0, 5),
        }
      })

    const scores = articles
      .map((article) => article.sentimentScore)
      .filter((score): score is number => score !== null)
    const average = scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : null

    return {
      status: articles.length ? 'ok' : 'unavailable',
      score: average === null ? null : clamp(50 + average * 50),
      articleCount: articles.length,
      updatedAt: articles.length ? new Date().toISOString() : null,
      source: articles.length ? 'Marketaux' : null,
      articles,
    }
  } catch (error) {
    console.error('[sentiment/news]', error instanceof Error ? error.message : error)
    return { status: 'unavailable', score: null, articleCount: 0, updatedAt: null, source: null, articles: [] }
  }
}

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

  const news = await fetchNewsSentiment()

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
    news,
  }
}
