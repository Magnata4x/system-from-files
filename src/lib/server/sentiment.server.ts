// Sentimento de mercado calculado a partir de dados reais da Binance.
import { getKlines, getTickers, TARGET_PAIRS } from './market.server'
import { cachedJson } from '../cache'

const MARKETAUX_ENDPOINT = 'https://api.marketaux.com/v1/news/all'
const MARKETAUX_CACHE_SECONDS = 300

export interface MarketauxArticle {
  id: string
  title: string
  url: string
  source: string
  publishedAt: string
  score: number | null
  symbols: string[]
}

export interface MarketauxNews {
  provider: 'Marketaux'
  status: 'available' | 'unavailable'
  count: number
  score: number | null
  articles: MarketauxArticle[]
  updatedAt: string | null
}

interface MarketauxEntityResponse {
  symbol?: unknown
  sentiment_score?: unknown
}

interface MarketauxArticleResponse {
  uuid?: unknown
  title?: unknown
  url?: unknown
  source?: unknown
  published_at?: unknown
  relevance_score?: unknown
  entities?: unknown
}

interface MarketauxResponse {
  data?: unknown
}

export interface SentimentAsset {
  asset: string
  social: number
  news: number
  onchain: number
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
  newsFeed: MarketauxNews
  updatedAt: string
}

const clamp = (n: number) => Math.max(1, Math.min(99, Math.round(n)))
const scoreFromChange = (pct: number) => clamp(50 + pct * 6)

function finiteNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function unavailableNews(): MarketauxNews {
  return {
    provider: 'Marketaux',
    status: 'unavailable',
    count: 0,
    score: null,
    articles: [],
    updatedAt: null,
  }
}

async function loadMarketauxNews(): Promise<MarketauxNews> {
  const token = process.env['MARKETAUX_API_TOKEN']
  if (!token) return unavailableNews()

  try {
    const url = new URL(MARKETAUX_ENDPOINT)
    url.searchParams.set('api_token', token)
    url.searchParams.set('language', 'en')
    url.searchParams.set('filter_entities', 'true')
    url.searchParams.set('limit', '10')

    const response = await fetch(url, { headers: { accept: 'application/json' } })
    if (!response.ok) return unavailableNews()

    const payload = (await response.json()) as MarketauxResponse
    if (!Array.isArray(payload.data)) return unavailableNews()

    const articles = payload.data.flatMap((raw): MarketauxArticle[] => {
      const item = raw as MarketauxArticleResponse
      if (typeof item.title !== 'string' || typeof item.url !== 'string') return []

      const entities = Array.isArray(item.entities)
        ? (item.entities as MarketauxEntityResponse[])
        : []
      const sentimentValues = entities
        .map((entity) => finiteNumber(entity.sentiment_score))
        .filter((value): value is number => value !== null && value >= -1 && value <= 1)
      const averageSentiment = sentimentValues.length
        ? sentimentValues.reduce((sum, value) => sum + value, 0) / sentimentValues.length
        : null
      const relevanceScore = finiteNumber(item.relevance_score)
      const score = averageSentiment === null
        ? relevanceScore !== null && relevanceScore >= 0 && relevanceScore <= 1
          ? Math.round(relevanceScore * 100)
          : null
        : Math.round(((averageSentiment + 1) / 2) * 100)
      const symbols = Array.from(new Set(entities.flatMap((entity) =>
        typeof entity.symbol === 'string' && entity.symbol.trim()
          ? [entity.symbol.trim().toUpperCase()]
          : [],
      )))

      return [{
        id: typeof item.uuid === 'string' ? item.uuid : item.url,
        title: item.title,
        url: item.url,
        source: typeof item.source === 'string' && item.source.trim() ? item.source : 'Marketaux',
        publishedAt: typeof item.published_at === 'string' ? item.published_at : '',
        score,
        symbols,
      }]
    })
    const scores = articles
      .map((article) => article.score)
      .filter((score): score is number => score !== null)

    return {
      provider: 'Marketaux',
      status: 'available',
      count: articles.length,
      score: scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null,
      articles,
      updatedAt: new Date().toISOString(),
    }
  } catch {
    return unavailableNews()
  }
}

export function getMarketauxNews(): Promise<MarketauxNews> {
  return cachedJson('marketaux:financial-news', MARKETAUX_CACHE_SECONDS, loadMarketauxNews)
}

export async function computeSentiment(): Promise<SentimentOverview> {
  const pairs = TARGET_PAIRS.slice(0, 6)
  const [tickers, newsFeed] = await Promise.all([getTickers(pairs), getMarketauxNews()])

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

      const news = scoreFromChange(t.changePct)
      const social = clamp(news * 0.6 + scoreFromChange(momentum) * 0.4)
      const range = t.high - t.low || 1
      const onchain = clamp(((t.price - t.low) / range) * 100)
      const overall = clamp(news * 0.4 + social * 0.35 + onchain * 0.25)

      const trend: SentimentAsset['trend'] =
        momentum > 1.5 ? 'upup' : momentum > 0.3 ? 'up' : momentum < -0.3 ? 'down' : 'flat'
      const signal: SentimentAsset['signal'] =
        overall >= 60 ? 'BULLISH' : overall <= 40 ? 'BEARISH' : 'NEUTRAL'

      return { asset: base, social, news, onchain, overall, trend, signal, spark }
    }),
  )

  const advancers = tickers.filter((t) => t.changePct > 0).length
  const decliners = tickers.length - advancers
  const overall = assets.length
    ? clamp(assets.reduce((s, a) => s + a.overall, 0) / assets.length)
    : 50
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
    newsFeed,
    updatedAt: new Date().toISOString(),
  }
}
