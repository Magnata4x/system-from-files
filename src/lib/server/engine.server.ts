// Motores internos (portados do backend NestJS): sinais, manipulação,
// risco, regime, DNA e calibrador. Tudo roda dentro do próprio app.
import {
  TARGET_PAIRS, atr, getKlines, getMarketRegime, getTickers, rsi, toPair, type Kline,
} from './market.server'

// ── Sinais ────────────────────────────────────────────────────────────────

export interface BackendSignal {
  id: string
  pair: string
  side: 'BUY' | 'SELL'
  score: number
  aiScore: number
  entryPrice: number
  stopLoss: number
  takeProfit1: number
  takeProfit2: number
  status: 'active' | 'pending' | 'closed'
  tf: string
  exchange: string
  createdAt: string
  rsi: number
  regime: string
}

function stableId(pair: string, bucket: number): string {
  return `${pair.replace('/', '-').toLowerCase()}-${bucket}`
}

export async function generateSignals(): Promise<BackendSignal[]> {
  const results = await Promise.all<BackendSignal | null>(
    TARGET_PAIRS.map(async (pair): Promise<BackendSignal | null> => {
      try {
        const [regime, candles] = await Promise.all([
          getMarketRegime(pair),
          getKlines(pair, '4h', 200),
        ])
        const last = candles.at(-1)
        if (!last) return null
        const price = last.close
        const range = atr(candles)
        const r = regime.rsi

        // Score: alinhamento tendência + RSI + volatilidade saudável.
        let score = 50 + regime.strength / 2
        if (regime.regime === 'BULLISH' && r < 65) score += 12
        if (regime.regime === 'BEARISH' && r > 35) score += 12
        if (r < 30 || r > 70) score += 8
        if (regime.volatility > 0.4 && regime.volatility < 6) score += 6
        score = Math.max(0, Math.min(100, Math.round(score)))
        if (regime.regime === 'SIDEWAYS' || score < 60) return null

        const side: 'BUY' | 'SELL' = regime.regime === 'BULLISH' ? 'BUY' : 'SELL'
        const dir = side === 'BUY' ? 1 : -1
        const bucket = Math.floor(last.openTime / 1000)

        return {
          id: stableId(pair, bucket),
          pair: toPair(pair),
          side,
          score,
          aiScore: Math.min(100, score + (regime.strength > 60 ? 4 : 0)),
          entryPrice: Number(price.toFixed(6)),
          stopLoss: Number((price - dir * range * 1.5).toFixed(6)),
          takeProfit1: Number((price + dir * range * 2).toFixed(6)),
          takeProfit2: Number((price + dir * range * 3.5).toFixed(6)),
          status: 'active' as const,
          tf: '4H',
          exchange: 'binance',
          createdAt: new Date(last.openTime).toISOString(),
          rsi: r,
          regime: regime.regime,
        }
      } catch {
        return null
      }
    }),
  )
  return results
    .filter((s): s is BackendSignal => s !== null)
    .sort((a, b) => b.aiScore - a.aiScore)
}

// ── Manipulação ───────────────────────────────────────────────────────────

export interface ManipulationAlert {
  id: string
  symbol: string
  price: number
  volume: number
  score: number
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  patterns: string[]
  timestamp: string
}

function detectCandle(pair: string, candles: Kline[], index: number): ManipulationAlert | null {
  const c = candles[index]
  if (!c) return null
  const window = candles.slice(Math.max(0, index - 20), index)
  if (window.length < 5) return null
  const avgVol = window.reduce((s, k) => s + k.volume, 0) / window.length
  const avgRange = window.reduce((s, k) => s + (k.high - k.low), 0) / window.length
  const volRatio = avgVol > 0 ? c.volume / avgVol : 1
  const range = c.high - c.low
  const body = Math.abs(c.close - c.open)
  const upperWick = c.high - Math.max(c.open, c.close)
  const lowerWick = Math.min(c.open, c.close) - c.low

  const patterns: string[] = []
  let score = 0

  if (volRatio > 3) { score += 45; patterns.push('Extreme volume spike detected') }
  else if (volRatio > 2) { score += 28; patterns.push('Volume anomaly detected') }

  if (range > 0 && lowerWick / range > 0.55 && volRatio > 1.5) {
    score += 25; patterns.push('STOP HUNT')
  }
  if (range > 0 && upperWick / range > 0.55 && volRatio > 1.5) {
    score += 25; patterns.push('LIQUIDITY GRAB')
  }
  if (avgRange > 0 && range / avgRange > 2.5 && body / Math.max(range, 1e-9) < 0.3) {
    score += 20; patterns.push('FAKE BREAKOUT')
  }
  if (volRatio > 2.5 && body / Math.max(range, 1e-9) < 0.2) {
    score += 15; patterns.push('ABSORPTION')
  }

  if (patterns.length === 0 || score < 25) return null
  score = Math.min(100, score)

  return {
    id: `${pair.replace('/', '-').toLowerCase()}-${c.openTime}`,
    symbol: toPair(pair),
    price: Number(c.close.toFixed(6)),
    volume: Math.round(c.volume),
    score,
    riskLevel: score > 70 ? 'HIGH' : score > 45 ? 'MEDIUM' : 'LOW',
    patterns,
    timestamp: new Date(c.openTime).toISOString(),
  }
}

export async function detectManipulation(pair: string): Promise<ManipulationAlert[]> {
  const candles = await getKlines(pair, '1h', 120)
  const alerts: ManipulationAlert[] = []
  for (let i = candles.length - 1; i >= 20 && alerts.length < 20; i--) {
    const alert = detectCandle(pair, candles, i)
    if (alert) alerts.push(alert)
  }
  return alerts
}

export async function listManipulationAlerts(opts: {
  symbol?: string
  riskLevel?: string
  limit?: number
}): Promise<ManipulationAlert[]> {
  const pairs = opts.symbol ? [toPair(opts.symbol)] : TARGET_PAIRS.slice(0, 6)
  const perPair = await Promise.all(
    pairs.map((p) => detectManipulation(p).catch(() => [] as ManipulationAlert[])),
  )
  let alerts = perPair.flat()
  if (opts.riskLevel) {
    const wanted = opts.riskLevel.toUpperCase()
    alerts = alerts.filter((a) => a.riskLevel === wanted)
  }
  alerts.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
  return alerts.slice(0, opts.limit ?? 20)
}

export async function manipulationSnapshot(pair: string) {
  const alerts = await detectManipulation(pair)
  const cutoff = Date.now() - 24 * 3600_000
  const last24 = alerts.filter((a) => Date.parse(a.timestamp) >= cutoff)
  const scores = last24.map((a) => a.score)
  const latestAlert = alerts[0] ?? null
  return {
    symbol: toPair(pair),
    latestAlert,
    last24h: {
      alertCount: last24.length,
      avgScore: scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0,
      maxScore: scores.length ? Math.max(...scores) : 0,
    },
    riskLevel: latestAlert?.riskLevel ?? 'LOW',
    updatedAt: new Date().toISOString(),
  }
}

// ── Risco ─────────────────────────────────────────────────────────────────

export interface RiskStatus {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  score: number
  exposurePct: number
  dailyPnlPct: number
  openPositions: number
  circuitBreaker: string
  marketVolatility: number
  reasons: string[]
  updatedAt: string
}

export const CIRCUIT_BREAKER_LOSS_PCT = -1.5
export const PROFIT_LOCK_TARGET_PCT = 4.0

export function buildRiskStatus(input: {
  dailyPnlPct: number
  openPositions: number
  exposurePct: number
  volatility: number
  circuitBreaker: string
}): RiskStatus {
  const reasons: string[] = []
  let score = 15
  if (input.dailyPnlPct <= CIRCUIT_BREAKER_LOSS_PCT) {
    score += 45
    reasons.push(`PnL diário em ${input.dailyPnlPct.toFixed(2)}% — circuit breaker`)
  } else if (input.dailyPnlPct < 0) {
    score += 15
    reasons.push('Dia em prejuízo')
  }
  if (input.exposurePct > 60) { score += 25; reasons.push('Exposição acima de 60% do capital') }
  else if (input.exposurePct > 30) { score += 10 }
  if (input.openPositions > 4) { score += 10; reasons.push('Muitas posições abertas') }
  if (input.volatility > 4) { score += 15; reasons.push('Volatilidade de mercado elevada') }
  if (input.circuitBreaker !== 'none') { score += 20; reasons.push(`Circuit breaker: ${input.circuitBreaker}`) }
  score = Math.max(0, Math.min(100, score))

  const level: RiskStatus['level'] =
    score >= 80 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW'

  return {
    level,
    score,
    exposurePct: Number(input.exposurePct.toFixed(2)),
    dailyPnlPct: Number(input.dailyPnlPct.toFixed(2)),
    openPositions: input.openPositions,
    circuitBreaker: input.circuitBreaker,
    marketVolatility: Number(input.volatility.toFixed(2)),
    reasons,
    updatedAt: new Date().toISOString(),
  }
}

export async function marketVolatility(pair = 'BTC/USDT'): Promise<number> {
  try {
    const regime = await getMarketRegime(pair)
    return regime.volatility
  } catch {
    return 0
  }
}

// ── Preços ────────────────────────────────────────────────────────────────

export async function listPrices() {
  const tickers = await getTickers()
  return tickers.map((t) => ({
    symbol: t.pair,
    price: t.price,
    change24h: t.changePct,
    volume24h: t.quoteVolume,
    high24h: t.high,
    low24h: t.low,
    updatedAt: new Date().toISOString(),
  }))
}

// ── Calibrador (backtest real sobre candles da Binance) ───────────────────

export interface SimulationRequest {
  profile: string
  symbol: string
  period_days: number
  initial_balance?: number
  leverage?: number
}

const PROFILE_PARAMS: Record<string, { rsiLow: number; rsiHigh: number; sl: number; tp: number; minScore: number }> = {
  conservador: { rsiLow: 30, rsiHigh: 70, sl: 1.0, tp: 1.6, minScore: 70 },
  rsi: { rsiLow: 35, rsiHigh: 65, sl: 1.2, tp: 2.0, minScore: 62 },
  aiscore: { rsiLow: 40, rsiHigh: 60, sl: 1.5, tp: 2.5, minScore: 66 },
  agressivo: { rsiLow: 45, rsiHigh: 55, sl: 2.0, tp: 3.5, minScore: 55 },
  scalper: { rsiLow: 40, rsiHigh: 60, sl: 0.6, tp: 0.9, minScore: 58 },
  intraday: { rsiLow: 38, rsiHigh: 62, sl: 1.0, tp: 1.8, minScore: 60 },
  swing: { rsiLow: 32, rsiHigh: 68, sl: 2.0, tp: 4.0, minScore: 64 },
  position: { rsiLow: 28, rsiHigh: 72, sl: 3.0, tp: 6.0, minScore: 68 },
}

export async function runBacktest(req: SimulationRequest) {
  const params = PROFILE_PARAMS[req.profile] ?? PROFILE_PARAMS['conservador']!
  const leverage = Math.max(1, Math.min(125, req.leverage ?? 1))
  const balance0 = req.initial_balance ?? 1000
  const days = Math.max(1, Math.min(365, req.period_days || 30))
  const limit = Math.min(1000, days * 6) // candles de 4h
  const candles = await getKlines(req.symbol, '4h', limit)

  let balance = balance0
  let peak = balance0
  let maxDrawdown = 0
  let wins = 0
  let losses = 0
  const equityCurve: { t: string; equity: number }[] = []
  const returns: number[] = []

  for (let i = 30; i < candles.length - 1; i++) {
    const closes = candles.slice(0, i + 1).map((c) => c.close)
    const r = rsi(closes)
    const entry = candles[i]!.close
    const next = candles[i + 1]!

    let side: 'BUY' | 'SELL' | null = null
    if (r <= params.rsiLow) side = 'BUY'
    else if (r >= params.rsiHigh) side = 'SELL'
    if (!side) continue

    const dir = side === 'BUY' ? 1 : -1
    const slPrice = entry * (1 - dir * params.sl / 100)
    const tpPrice = entry * (1 + dir * params.tp / 100)

    let pnlPct: number
    const hitTp = side === 'BUY' ? next.high >= tpPrice : next.low <= tpPrice
    const hitSl = side === 'BUY' ? next.low <= slPrice : next.high >= slPrice
    if (hitTp && !hitSl) pnlPct = params.tp
    else if (hitSl) pnlPct = -params.sl
    else pnlPct = ((next.close - entry) / entry) * 100 * dir

    const gross = (pnlPct / 100) * leverage
    const pnl = balance * gross
    balance += pnl
    returns.push(gross)
    if (pnl >= 0) wins++
    else losses++
    peak = Math.max(peak, balance)
    maxDrawdown = Math.max(maxDrawdown, ((peak - balance) / peak) * 100)
    equityCurve.push({ t: new Date(next.openTime).toISOString(), equity: Number(balance.toFixed(2)) })
    if (balance <= 0) { balance = 0; break }
  }

  const trades = wins + losses
  const avg = returns.length ? returns.reduce((s, v) => s + v, 0) / returns.length : 0
  const sd = returns.length
    ? Math.sqrt(returns.reduce((s, v) => s + (v - avg) ** 2, 0) / returns.length)
    : 0
  const sharpe = sd > 0 ? Number(((avg / sd) * Math.sqrt(returns.length)).toFixed(2)) : 0
  const winRate = trades ? Number(((wins / trades) * 100).toFixed(1)) : 0
  const pnl = Number((balance - balance0).toFixed(2))

  return {
    trades,
    wins,
    losses,
    win_rate: winRate,
    pnl,
    pnl_pct: Number(((pnl / balance0) * 100).toFixed(2)),
    max_drawdown: Number(maxDrawdown.toFixed(2)),
    sharpe,
    equity_curve: equityCurve,
    commentary:
      trades === 0
        ? 'Nenhum setup encontrado nesse período com o perfil escolhido.'
        : `Perfil ${req.profile} gerou ${trades} operações com win rate de ${winRate}% e drawdown máximo de ${maxDrawdown.toFixed(2)}%.`,
    dna_feedback: {
      pattern_detected: winRate >= 55 ? 'Consistência positiva' : 'Excesso de entradas contra tendência',
      correction: winRate >= 55 ? 'Manter gestão atual' : 'Reduzir alavancagem e exigir score mínimo maior',
      expected_improvement: winRate >= 55 ? '+3% win rate' : '+8% win rate',
    },
  }
}

export function calibratorState(input: {
  dailyPnlPct: number
  winRate: number
  circuitBreaker: string
  tradesToday: number
}) {
  const flags: string[] = []
  let state: 'OPTIMAL' | 'WARNING' | 'RISK_DRIFT' | 'PROTECTION' | 'SHUTDOWN' = 'OPTIMAL'
  let riskMultiplier = 1
  let allowance: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED' = 'HIGH'

  if (input.circuitBreaker === 'emergency' || input.dailyPnlPct <= CIRCUIT_BREAKER_LOSS_PCT) {
    state = 'SHUTDOWN'; riskMultiplier = 0; allowance = 'BLOCKED'
    flags.push('circuit_breaker')
  } else if (input.circuitBreaker === 'profitLock') {
    state = 'PROTECTION'; riskMultiplier = 0.5; allowance = 'LOW'
    flags.push('profit_lock')
  } else if (input.tradesToday > 12) {
    state = 'RISK_DRIFT'; riskMultiplier = 0.6; allowance = 'LOW'
    flags.push('overtrading')
  } else if (input.winRate < 45 || input.dailyPnlPct < 0) {
    state = 'WARNING'; riskMultiplier = 0.8; allowance = 'MEDIUM'
    flags.push('below_expected_winrate')
  }

  return {
    state,
    risk_multiplier: riskMultiplier,
    trade_allowance: allowance,
    behavioral_flags: flags,
    actions:
      state === 'OPTIMAL'
        ? ['Manter plano operacional']
        : ['Reduzir tamanho de posição', 'Revisar setups do dia'],
    dna_feedback: {
      pattern_detected: flags[0] ?? 'estável',
      correction: state === 'OPTIMAL' ? 'Nenhuma' : 'Diminuir frequência e exigir confirmação extra',
      expected_improvement: state === 'OPTIMAL' ? '—' : '+5% consistência',
    },
    commentary: `Estado ${state} com win rate de ${input.winRate.toFixed(1)}% e PnL diário de ${input.dailyPnlPct.toFixed(2)}%.`,
    updatedAt: new Date().toISOString(),
  }
}