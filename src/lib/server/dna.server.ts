// Cálculo do DNA do trader a partir do histórico real de trades (bot4x_trades).
import type { ApiUser } from './api-auth.server'

export interface DnaStatsResponse {
  hasData: boolean
  totalTrades: number
  winRate: number
  avgPnlPct: number
  bestPair: string | null
  worstPair: string | null
  bestHour: number | null
  worstHour: number | null
  maxDrawdownPct: number
  totalPnl: number
  radar: { axis: string; you: number; bench: number }[]
  gauges: { label: string; value: number }[]
  heatmap: { date: string; value: number }[]
  evolution: { month: string; overall: number; emotional: number; note?: string }[]
  insights: { tone: 'good' | 'bad' | 'warn'; icon: string; title: string; desc: string; action: string }[]
}

type TradeRow = {
  day: string
  pair: string
  result: string
  pnl: number
  pnl_pct: number
  hour: number | null
  created_at: string
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
const isWin = (t: TradeRow) => t.pnl > 0 || t.result === 'win' || t.result === 'tp'

function groupBest(
  rows: TradeRow[],
  keyOf: (t: TradeRow) => string | null,
  minSample = 3,
): { best: string | null; worst: string | null } {
  const map = new Map<string, { w: number; n: number }>()
  for (const t of rows) {
    const k = keyOf(t)
    if (k === null) continue
    const cur = map.get(k) ?? { w: 0, n: 0 }
    cur.n += 1
    if (isWin(t)) cur.w += 1
    map.set(k, cur)
  }
  const eligible = [...map.entries()].filter(([, v]) => v.n >= minSample)
  if (eligible.length === 0) return { best: null, worst: null }
  eligible.sort((a, b) => b[1].w / b[1].n - a[1].w / a[1].n)
  return { best: eligible[0][0], worst: eligible[eligible.length - 1][0] }
}

export async function computeDnaStats(user: ApiUser): Promise<DnaStatsResponse> {
  const since = new Date(Date.now() - 180 * 86_400_000).toISOString()
  const { data, error } = await user.supabase
    .from('bot4x_trades')
    .select('day, pair, result, pnl, pnl_pct, hour, created_at')
    .eq('user_id', user.userId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(5000)
  if (error) throw new Error(error.message)

  const rows: TradeRow[] = (data ?? []).map((r) => ({
    day: String(r.day),
    pair: String(r.pair),
    result: String(r.result ?? ''),
    pnl: Number(r.pnl ?? 0),
    pnl_pct: Number(r.pnl_pct ?? 0),
    hour: r.hour === null || r.hour === undefined ? null : Number(r.hour),
    created_at: String(r.created_at),
  }))

  const total = rows.length
  if (total === 0) {
    return {
      hasData: false,
      totalTrades: 0,
      winRate: 0,
      avgPnlPct: 0,
      bestPair: null,
      worstPair: null,
      bestHour: null,
      worstHour: null,
      maxDrawdownPct: 0,
      totalPnl: 0,
      radar: [],
      gauges: [],
      heatmap: [],
      evolution: [],
      insights: [],
    }
  }

  const wins = rows.filter(isWin).length
  const winRate = (wins / total) * 100
  const totalPnl = rows.reduce((s, t) => s + t.pnl, 0)
  const avgPnlPct = rows.reduce((s, t) => s + t.pnl_pct, 0) / total

  // Drawdown sobre a curva acumulada de PnL
  let acc = 0
  let peak = 0
  let maxDd = 0
  for (const t of rows) {
    acc += t.pnl
    peak = Math.max(peak, acc)
    if (peak > 0) maxDd = Math.max(maxDd, ((peak - acc) / peak) * 100)
  }

  const pairs = groupBest(rows, (t) => t.pair)
  const hours = groupBest(rows, (t) => (t.hour === null ? null : String(t.hour)))

  // Consistência: dispersão dos resultados diários
  const byDay = new Map<string, number>()
  for (const t of rows) byDay.set(t.day, (byDay.get(t.day) ?? 0) + t.pnl)
  const dayVals = [...byDay.values()]
  const mean = dayVals.reduce((a, b) => a + b, 0) / dayVals.length
  const sd = Math.sqrt(dayVals.reduce((a, b) => a + (b - mean) ** 2, 0) / dayVals.length) || 1
  const consistency = clamp(100 - Math.min(100, (sd / (Math.abs(mean) + sd)) * 100))

  const grossWin = rows.filter(isWin).reduce((s, t) => s + Math.abs(t.pnl), 0)
  const grossLoss = rows.filter((t) => !isWin(t)).reduce((s, t) => s + Math.abs(t.pnl), 0) || 1
  const rr = grossWin / grossLoss

  // Revenge trading: win rate após 2 perdas seguidas
  let afterLossN = 0
  let afterLossW = 0
  for (let i = 2; i < rows.length; i++) {
    if (!isWin(rows[i - 1]) && !isWin(rows[i - 2])) {
      afterLossN += 1
      if (isWin(rows[i])) afterLossW += 1
    }
  }
  const afterLossWr = afterLossN >= 3 ? (afterLossW / afterLossN) * 100 : winRate
  const emotional = clamp(100 - Math.max(0, winRate - afterLossWr) * 2)

  const maxPerDay = Math.max(...dayVals.map(() => 0), ...[...byDay.values()].map((v) => Math.abs(v)), 1)
  const overtrading = total / Math.max(1, byDay.size)
  const discipline = clamp(100 - Math.max(0, overtrading - 5) * 8)
  const riskControl = clamp(100 - maxDd)
  const timing = clamp(winRate)

  const gauges = [
    { label: 'Consistency', value: consistency },
    { label: 'Discipline', value: discipline },
    { label: 'Risk Control', value: riskControl },
    { label: 'Timing', value: timing },
    { label: 'Emotional Control', value: emotional },
  ]

  const radar = [
    { axis: 'Win Rate', you: clamp(winRate), bench: 72 },
    { axis: 'Avg R/R', you: clamp(rr * 40), bench: 80 },
    { axis: 'Consistency', you: consistency, bench: 85 },
    { axis: 'Drawdown Ctrl', you: riskControl, bench: 88 },
    { axis: 'Timing', you: timing, bench: 78 },
    { axis: 'Volume Disc.', you: discipline, bench: 82 },
  ]

  // Heatmap dos últimos 90 dias (intensidade -1..4)
  const heatmap: { date: string; value: number }[] = []
  const today = new Date()
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const pnl = byDay.get(key)
    let value = 0
    if (pnl !== undefined && pnl !== 0) {
      if (pnl < 0) value = -1
      else value = Math.min(4, Math.max(1, Math.ceil((Math.abs(pnl) / maxPerDay) * 4)))
    }
    heatmap.push({ date: key, value })
  }

  // Evolução mensal (últimos 6 meses)
  const byMonth = new Map<string, { w: number; n: number; afterN: number; afterW: number }>()
  rows.forEach((t, i) => {
    const key = t.created_at.slice(0, 7)
    const cur = byMonth.get(key) ?? { w: 0, n: 0, afterN: 0, afterW: 0 }
    cur.n += 1
    if (isWin(t)) cur.w += 1
    if (i >= 2 && !isWin(rows[i - 1]) && !isWin(rows[i - 2])) {
      cur.afterN += 1
      if (isWin(t)) cur.afterW += 1
    }
    byMonth.set(key, cur)
  })
  const evolution = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([key, v]) => {
      const wr = (v.w / v.n) * 100
      const after = v.afterN >= 2 ? (v.afterW / v.afterN) * 100 : wr
      return {
        month: new Date(`${key}-01T00:00:00Z`).toLocaleDateString('pt-BR', {
          month: 'short',
          timeZone: 'UTC',
        }),
        overall: clamp(wr),
        emotional: clamp(100 - Math.max(0, wr - after) * 2),
      }
    })

  const insights: DnaStatsResponse['insights'] = []
  if (winRate >= 60)
    insights.push({
      tone: 'good',
      icon: 'TrendingUp',
      title: 'Taxa de acerto acima da média',
      desc: `Você venceu ${wins} de ${total} operações (${winRate.toFixed(1)}%).`,
      action: 'Mantenha o mesmo filtro de entrada e aumente exposição gradualmente.',
    })
  else
    insights.push({
      tone: 'bad',
      icon: 'Target',
      title: 'Taxa de acerto abaixo do alvo',
      desc: `Apenas ${winRate.toFixed(1)}% das ${total} operações fecharam positivas.`,
      action: 'Suba o score mínimo de IA e reduza o número de pares operados.',
    })
  if (maxDd > 15)
    insights.push({
      tone: 'bad',
      icon: 'TrendingDown',
      title: 'Drawdown elevado',
      desc: `Queda máxima de ${maxDd.toFixed(1)}% sobre o pico de capital.`,
      action: 'Reduza a alavancagem e o percentual alocado por operação.',
    })
  if (afterLossWr < winRate - 10)
    insights.push({
      tone: 'warn',
      icon: 'Flame',
      title: 'Queda de desempenho após perdas',
      desc: `Após 2 perdas seguidas o acerto cai para ${afterLossWr.toFixed(1)}%.`,
      action: 'Ative pausa automática de 30 minutos após 2 perdas consecutivas.',
    })
  if (overtrading > 8)
    insights.push({
      tone: 'warn',
      icon: 'CalendarClock',
      title: 'Volume diário alto',
      desc: `Média de ${overtrading.toFixed(1)} operações por dia ativo.`,
      action: 'Limite o número de operações diárias para preservar a qualidade das entradas.',
    })
  if (pairs.best)
    insights.push({
      tone: 'good',
      icon: 'Sparkles',
      title: `Melhor par: ${pairs.best}`,
      desc: 'Este par concentra sua maior taxa de acerto no período analisado.',
      action: 'Priorize-o na lista de pares preferidos do Bot4x.',
    })

  return {
    hasData: true,
    totalTrades: total,
    winRate: Number(winRate.toFixed(2)),
    avgPnlPct: Number(avgPnlPct.toFixed(2)),
    bestPair: pairs.best,
    worstPair: pairs.worst,
    bestHour: hours.best === null ? null : Number(hours.best),
    worstHour: hours.worst === null ? null : Number(hours.worst),
    maxDrawdownPct: Number(maxDd.toFixed(2)),
    totalPnl: Number(totalPnl.toFixed(2)),
    radar,
    gauges,
    heatmap,
    evolution,
    insights,
  }
}
