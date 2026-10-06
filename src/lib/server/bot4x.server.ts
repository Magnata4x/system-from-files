// Config e execuções do Bot4x sobre o banco interno.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/integrations/supabase/types'
import { ApiError } from './api-auth.server'
import { CIRCUIT_BREAKER_LOSS_PCT, PROFIT_LOCK_TARGET_PCT } from './engine.server'
import { getExchangeStatus, getVerifiedBinanceOrder, getVerifiedBinanceTrades } from './exchange.server'

type Client = SupabaseClient<Database>
type ConfigRow = Database['public']['Tables']['bot4x_configs']['Row']

export function mapConfig(row: ConfigRow) {
  return {
    userId: row.user_id,
    active: row.active,
    executionMode: row.execution_mode === 'REAL' ? 'REAL' : 'DEMO',
    profile: row.profile,
    dailyPnl: Number(row.daily_pnl ?? 0),
    openSlots: row.open_slots ?? 0,
    circuitBreaker: row.circuit_breaker ?? 'none',
    rsiThresholdLow: Number(row.rsi_threshold_low ?? 35),
    rsiThresholdHigh: Number(row.rsi_threshold_high ?? 65),
    aiScoreMin: row.ai_score_min ?? 85,
    fomoLimit: Number(row.fomo_limit ?? 15),
    leverage: row.leverage ?? 5,
    activeCapital: Number(row.active_capital ?? 0),
    totalCapital: Number(row.total_capital ?? 1000),
    allocationPct: row.allocation_pct ?? 30,
    slPct: Number(row.sl_pct ?? 0.5),
    tpPct: Number(row.tp_pct ?? 1),
    exchange: row.exchange ?? 'binance',
    apiKeySet: row.api_key_set ?? false,
    totalTradesToday: row.total_trades_today ?? 0,
    preferredPairs: row.preferred_pairs,
    avoidPairs: row.avoid_pairs,
    updatedAt: row.updated_at,
  }
}

export async function getOrCreateConfig(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from('bot4x_configs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new ApiError(error.message, 500)
  if (data) return applyCircuitBreaker(supabase, data)

  const { data: created, error: insertError } = await supabase
    .from('bot4x_configs')
    .insert({ user_id: userId })
    .select('*')
    .single()
  if (insertError) throw new ApiError(insertError.message, 500)
  return mapConfig(created)
}

/** Circuit breaker / profit lock — portado do Bot4xService (cron a cada 10s). */
async function applyCircuitBreaker(supabase: Client, row: ConfigRow) {
  const pnl = Number(row.daily_pnl ?? 0)
  let next: Partial<ConfigRow> | null = null
  if (row.active && pnl <= CIRCUIT_BREAKER_LOSS_PCT && row.circuit_breaker !== 'emergency') {
    next = { circuit_breaker: 'emergency', active: false, emergency_triggered_at: new Date().toISOString() }
  } else if (row.active && pnl >= PROFIT_LOCK_TARGET_PCT && row.circuit_breaker !== 'profitLock') {
    next = { circuit_breaker: 'profitLock', profit_lock_triggered_at: new Date().toISOString() }
  }
  if (!next) return mapConfig(row)

  const { data, error } = await supabase
    .from('bot4x_configs')
    .update(next)
    .eq('user_id', row.user_id)
    .select('*')
    .single()
  if (error) return mapConfig(row)
  return mapConfig(data)
}

const PATCHABLE: Record<string, keyof ConfigRow> = {
  active: 'active',
  profile: 'profile',
  rsiThresholdLow: 'rsi_threshold_low',
  rsiThresholdHigh: 'rsi_threshold_high',
  aiScoreMin: 'ai_score_min',
  fomoLimit: 'fomo_limit',
  leverage: 'leverage',
  slPct: 'sl_pct',
  tpPct: 'tp_pct',
  allocationPct: 'allocation_pct',
  totalCapital: 'total_capital',
  activeCapital: 'active_capital',
  exchange: 'exchange',
  preferredPairs: 'preferred_pairs',
  avoidPairs: 'avoid_pairs',
  circuitBreaker: 'circuit_breaker',
  executionMode: 'execution_mode',
}

export async function updateConfig(
  supabase: Client,
  userId: string,
  patch: Record<string, unknown>,
) {
  const current = await getOrCreateConfig(supabase, userId)
  const requestedMode = patch.executionMode === 'REAL' ? 'REAL' : patch.executionMode === 'DEMO' ? 'DEMO' : current.executionMode
  const enablingReal = patch.executionMode === 'REAL' || (patch.active === true && current.executionMode === 'REAL')
  if (enablingReal) {
    const exchange = await getExchangeStatus(supabase, userId)
    if (!exchange.verified) {
      throw new ApiError('Modo REAL exige credencial Binance verificada.', 409)
    }
    if (requestedMode === 'REAL' && exchange.exchange !== 'binance') {
      throw new ApiError('Modo REAL exige Binance.', 409)
    }
  }
  const update: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    const column = PATCHABLE[key] ?? (key in PATCHABLE ? undefined : undefined)
    if (column) update[column] = value
    else if (Object.values(PATCHABLE).includes(key as keyof ConfigRow)) update[key] = value
  }
  if (Object.keys(update).length === 0) return getOrCreateConfig(supabase, userId)

  const { data, error } = await supabase
    .from('bot4x_configs')
    .update(update as Database['public']['Tables']['bot4x_configs']['Update'])
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw new ApiError(error.message, 400)
  return mapConfig(data)
}

export async function listExecutions(supabase: Client, userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('bot4x_trades')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new ApiError(error.message, 500)
  return (data ?? []).map((t) => ({
    id: t.id,
    pair: t.pair,
    side: t.side as 'LONG' | 'SHORT',
    entryPrice: Number(t.entry),
    stopLoss: t.stop === null ? undefined : Number(t.stop),
    takeProfit: t.target === null ? undefined : Number(t.target),
    pnl: Number(t.pnl ?? 0),
    pnlPct: Number(t.pnl_pct ?? 0),
    status: t.result === 'open' ? 'open' : 'closed',
    result: t.result,
    createdAt: t.created_at,
  }))
}

export interface ExecutionQuery {
  limit?: number
  offset?: number
  result?: string
  pair?: string
  side?: string
  /** Data inicial (YYYY-MM-DD) — filtra pela coluna `day`. */
  from?: string
  /** Data final (YYYY-MM-DD) — filtra pela coluna `day`. */
  to?: string
  /** Perfil do bot no momento da execução. */
  profile?: string
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

function applyFilters<T extends { eq: (c: string, v: string) => T; gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(
  builder: T,
  query: ExecutionQuery,
): T {
  let b = builder
  if (query.result && query.result !== 'all') b = b.eq('result', query.result)
  if (query.pair && query.pair !== 'all') b = b.eq('pair', query.pair)
  if (query.side && query.side !== 'all') b = b.eq('side', query.side)
  if (query.profile && query.profile !== 'all') b = b.eq('profile', query.profile)
  if (query.from && ISO_DAY.test(query.from)) b = b.gte('day', query.from)
  if (query.to && ISO_DAY.test(query.to)) b = b.lte('day', query.to)
  return b
}

/** Lista paginada + filtrada de execuções, com total para a UI. */
export async function listExecutionsPaged(
  supabase: Client,
  userId: string,
  query: ExecutionQuery = {},
) {
  const limit = Math.min(Math.max(Number(query.limit ?? 20) || 20, 1), 100)
  const offset = Math.max(Number(query.offset ?? 0) || 0, 0)

  let builder = supabase
    .from('bot4x_trades')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)

  builder = applyFilters(builder, query)

  const { data, error, count } = await builder
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw new ApiError(error.message, 500)

  return {
    items: (data ?? []).map((t) => ({
      id: t.id,
      pair: t.pair,
      side: t.side as 'LONG' | 'SHORT',
      entryPrice: Number(t.entry),
      stopLoss: t.stop === null ? undefined : Number(t.stop),
      takeProfit: t.target === null ? undefined : Number(t.target),
      pnl: Number(t.pnl ?? 0),
      pnlPct: Number(t.pnl_pct ?? 0),
      status: t.result === 'open' ? 'open' : 'closed',
      result: t.result,
      motivo: t.motivo ?? '',
      createdAt: t.created_at,
    })),
    total: count ?? 0,
    limit,
    offset,
  }
}

function quoteAssetForSymbol(symbol: string): string | null {
  const normalized = symbol.toUpperCase()
  for (const suffix of ['USDT', 'USDC', 'FDUSD', 'TUSD', 'USDP', 'BUSD', 'BTC', 'ETH', 'BNB']) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length) return suffix
  }
  return null
}

function baseAssetForSymbol(symbol: string, quoteAsset: string | null): string | null {
  if (!quoteAsset) return null
  const normalized = symbol.toUpperCase()
  return normalized.endsWith(quoteAsset) ? normalized.slice(0, -quoteAsset.length) : null
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const CSV_HEADERS = [
  'data', 'par', 'lado', 'perfil', 'alavancagem', 'entrada', 'stop', 'alvo',
  'resultado', 'pnl', 'pnl_pct', 'motivo',
] as const

/** Exporta o histórico de execuções filtrado como CSV (máx. 5000 linhas). */
export async function exportExecutionsCsv(
  supabase: Client,
  userId: string,
  query: ExecutionQuery = {},
): Promise<string> {
  let builder = supabase.from('bot4x_trades').select('*').eq('user_id', userId)
  builder = applyFilters(builder, query)

  const { data, error } = await builder.order('created_at', { ascending: false }).limit(5000)
  if (error) throw new ApiError(error.message, 500)

  const lines = [CSV_HEADERS.join(',')]
  for (const t of data ?? []) {
    lines.push(
      [
        t.created_at, t.pair, t.side, t.profile ?? '', t.leverage ?? '',
        t.entry, t.stop ?? '', t.target ?? '', t.result,
        Number(t.pnl ?? 0), Number(t.pnl_pct ?? 0), t.motivo ?? '',
      ].map(csvCell).join(','),
    )
  }
  return lines.join('\n')
}

/** Telemetria do bot: estado atual + agregados do dia, para polling da UI. */
export async function getTelemetry(supabase: Client, userId: string) {
  const config = await getOrCreateConfig(supabase, userId)

  // Daily telemetry uses the user's configured timezone. Legacy trades remain
  // available for operational history but are not the source of verified PnL.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) throw new ApiError(profileError.message, 500)

  const timezone = profile?.timezone || 'UTC'
  const now = new Date()
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const recentStart = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('bot4x_trades')
    .select('result, pnl, pair, side, created_at, motivo')
    .eq('user_id', userId)
    .gte('created_at', recentStart)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new ApiError(error.message, 500)

  const rows = (data ?? []).filter((r) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(r.created_at)) === localDay
  )

  const { data: intents, error: intentsError } = await supabase
    .from('bot4x_execution_intents')
    .select('id, status, pair, side, created_at, readings')
    .eq('user_id', userId)
    .gte('created_at', new Date(new Date().getTime() - 48 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(200)
  if (intentsError) throw new ApiError(intentsError.message, 500)

  const executionRows = intents ?? []

  // Reconcile submitted Binance orders before exposing telemetry. This only
  // reads order state and updates the execution ledger; it never submits,
  // cancels, or modifies an order.
  for (const intent of executionRows) {
    if (intent.status !== 'submitted') continue
    const readings = (intent.readings ?? {}) as Record<string, unknown>
    const orderId = typeof readings.orderId === 'number' ? readings.orderId : null
    if (!orderId) continue

    try {
      const order = await getVerifiedBinanceOrder(supabase, userId, {
        symbol: intent.pair,
        orderId,
      })
      const binanceStatus = typeof order.status === 'string' ? order.status : null
      if (!binanceStatus) continue

      const nextStatus =
        binanceStatus === 'FILLED'
          ? 'completed'
          : binanceStatus === 'CANCELED' || binanceStatus === 'REJECTED' || binanceStatus === 'EXPIRED'
            ? 'failed'
            : 'submitted'

      const nextReadings = {
        ...readings,
        status: binanceStatus,
        orderId,
        executedQty: typeof order.executedQty === 'string' ? Number(order.executedQty) : null,
        cummulativeQuoteQty:
          typeof order.cummulativeQuoteQty === 'string'
            ? Number(order.cummulativeQuoteQty)
            : null,
        averageFillPrice: (() => {
          const executedQty = typeof order.executedQty === 'string' ? Number(order.executedQty) : NaN
          const quoteQty = typeof order.cummulativeQuoteQty === 'string' ? Number(order.cummulativeQuoteQty) : NaN
          return Number.isFinite(executedQty) && executedQty > 0 && Number.isFinite(quoteQty)
            ? quoteQty / executedQty
            : null
        })(),
        lifecycle: binanceStatus === 'FILLED'
          ? 'filled_unrealized'
          : binanceStatus === 'CANCELED' || binanceStatus === 'REJECTED' || binanceStatus === 'EXPIRED'
            ? 'not_executed'
            : 'pending',
        realizedPnl: null,
        reconciledAt: new Date().toISOString(),
      }

      if (nextStatus !== intent.status || JSON.stringify(nextReadings) !== JSON.stringify(readings)) {
        const { error: updateError } = await supabase
          .from('bot4x_execution_intents')
          .update({
            status: nextStatus,
            processed_at: nextStatus === 'submitted' ? undefined : new Date().toISOString(),
            readings: nextReadings,
          })
          .eq('id', intent.id)
        if (updateError) throw new ApiError(updateError.message, 500)
        intent.status = nextStatus
        intent.readings = nextReadings
      }
    } catch (error) {
      // A temporary reconciliation failure must not erase a confirmed
      // submission or turn it into a false failure.
      if (error instanceof ApiError && error.status >= 500) throw error
    }
  }

  // Fase 15: consulta os fills reais de cada ordem concluída e só calcula
  // PnL realizado quando existe uma contraparte OPPOSTA também registrada
  // no ledger. Isso evita atribuir manualmente/externalmente uma venda à compra.
  const completed = executionRows
    .filter((r) => r.status === 'completed')
    .slice(0, 50)
    .map((r) => ({ row: r, readings: ((r.readings ?? {}) as Record<string, unknown>) }))

  for (const item of completed) {
    const orderId = typeof item.readings.orderId === 'number' ? item.readings.orderId : null
    if (!orderId) continue
    try {
      const raw = await getVerifiedBinanceTrades(supabase, userId, { symbol: item.row.pair, orderId })
      const fills = Array.isArray(raw) ? raw : []
      const quoteAsset = quoteAssetForSymbol(item.row.pair)
      const baseAsset = baseAssetForSymbol(item.row.pair, quoteAsset)
      const isBuy = item.row.side === 'BUY'
      const normalized = fills.map((fill) => {
        const qty = typeof fill.qty === 'string' ? Number(fill.qty) : NaN
        const quoteQty = typeof fill.quoteQty === 'string' ? Number(fill.quoteQty) : NaN
        const commission = typeof fill.commission === 'string' ? Number(fill.commission) : NaN
        const commissionAsset = typeof fill.commissionAsset === 'string' ? fill.commissionAsset.toUpperCase() : null
        const hasCommission = Number.isFinite(commission) && commission > 0
        const commissionInBase = hasCommission && commissionAsset === baseAsset
        const commissionInQuote = hasCommission && commissionAsset === quoteAsset
        const supportedFee = !hasCommission || commissionInBase || commissionInQuote

        let netQty = qty
        let netQuoteQty = quoteQty

        if (hasCommission && commissionInBase && isBuy) {
          netQty = qty - commission
        } else if (hasCommission && commissionInQuote) {
          netQuoteQty = isBuy ? quoteQty + commission : quoteQty - commission
        } else if (hasCommission && commissionInBase && !isBuy) {
          // A base-asset SELL fee changes the asset accounting but cannot be
          // valued safely without an additional verified fee valuation source.
          netQty = NaN
          netQuoteQty = NaN
        }

        return {
          qty,
          quoteQty,
          netQty,
          netQuoteQty,
          commission,
          commissionAsset,
          supportedFee,
          time: typeof fill.time === 'number' ? fill.time : null,
        }
      }).filter((f) =>
        Number.isFinite(f.qty) &&
        f.qty > 0 &&
        Number.isFinite(f.quoteQty) &&
        f.quoteQty >= 0 &&
        (!Number.isFinite(f.netQty) || f.netQty > 0)
      )
      const grossQty = normalized.reduce((sum, f) => sum + f.qty, 0)
      const grossQuote = normalized.reduce((sum, f) => sum + f.quoteQty, 0)
      const netQty = normalized.every((f) => Number.isFinite(f.netQty))
        ? normalized.reduce((sum, f) => sum + Number(f.netQty), 0)
        : null
      const netQuote = normalized.every((f) => Number.isFinite(f.netQuoteQty))
        ? normalized.reduce((sum, f) => sum + Number(f.netQuoteQty), 0)
        : null
      const feeAware = normalized.length > 0 && normalized.every((f) => f.supportedFee && Number.isFinite(f.netQty) && Number.isFinite(f.netQuoteQty) && f.netQty > 0 && f.netQuoteQty >= 0)
      const nextReadings = {
        ...item.readings,
        verifiedFills: normalized,
        verifiedFillCount: normalized.length,
        verifiedFillQty: Number(grossQty.toFixed(12)),
        verifiedFillQuoteQty: Number(grossQuote.toFixed(12)),
        feeAware,
        netFillQty: netQty === null ? null : Number(netQty.toFixed(12)),
        netFillQuoteQty: netQuote === null ? null : Number(netQuote.toFixed(12)),
        fillsReconciledAt: new Date().toISOString(),
      }
      const { error: fillUpdateError } = await supabase
        .from('bot4x_execution_intents')
        .update({ readings: nextReadings })
        .eq('id', item.row.id)
      if (fillUpdateError) throw new ApiError(fillUpdateError.message, 500)
      item.readings = nextReadings
      item.row.readings = nextReadings
    } catch (error) {
      if (error instanceof ApiError && error.status >= 500) throw error
    }
  }

  // FIFO apenas entre execuções do próprio ledger, usando quantidade e quote
  // efetivamente confirmados pela Binance. Sem contraparte registrada, o
  // estado continua filled_unrealized e realizedPnl permanece indisponível.
  const fifo = completed
    .filter((item) =>
      item.readings.feeAware === true &&
      typeof item.readings.netFillQty === 'number' &&
      item.readings.netFillQty > 0 &&
      typeof item.readings.netFillQuoteQty === 'number' &&
      item.readings.netFillQuoteQty >= 0,
    )
    .sort((a, b) => new Date(a.row.created_at).getTime() - new Date(b.row.created_at).getTime())
    .map((item) => ({
      item,
      remainingQty: Number(item.readings.netFillQty),
      quoteQty: Number(item.readings.netFillQuoteQty),
    }))

  for (const sell of fifo.filter((x) => x.item.row.side === 'SELL')) {
    for (const buy of fifo.filter((x) =>
      x.item.row.side === 'BUY' &&
      x.item.row.pair === sell.item.row.pair &&
      x.remainingQty > 0 &&
      new Date(x.item.row.created_at).getTime() <= new Date(sell.item.row.created_at).getTime()
    )) {
      if (sell.remainingQty <= 0) break
      const matchedQty = Math.min(buy.remainingQty, sell.remainingQty)
      if (matchedQty <= 0) continue
      const buyUnit = buy.quoteQty / Number(buy.item.readings.netFillQty)
      const sellUnit = sell.quoteQty / Number(sell.item.readings.netFillQty)
      const pnl = (sellUnit - buyUnit) * matchedQty
      const existingBuy = Number(buy.item.readings.realizedPnl ?? 0)
      const existingSell = Number(sell.item.readings.realizedPnl ?? 0)
      buy.item.readings = {
        ...buy.item.readings,
        matchedQty: Number(((Number(buy.item.readings.matchedQty ?? 0)) + matchedQty).toFixed(12)),
        realizedPnl: Number((existingBuy + pnl).toFixed(8)),
        realizedPnlType: 'net_of_verified_fees',
        lifecycle: matchedQty >= Number(buy.item.readings.netFillQty) ? 'closed_verified' : 'partially_closed',
      }
      sell.item.readings = {
        ...sell.item.readings,
        matchedQty: Number(((Number(sell.item.readings.matchedQty ?? 0)) + matchedQty).toFixed(12)),
        realizedPnl: Number((existingSell + pnl).toFixed(8)),
        realizedPnlType: 'net_of_verified_fees',
        lifecycle: matchedQty >= Number(sell.item.readings.netFillQty) ? 'closed_verified' : 'partially_closed',
      }
      buy.remainingQty -= matchedQty
      sell.remainingQty -= matchedQty
    }
  }

  for (const item of completed) {
    if (item.readings.lifecycle === 'closed_verified' || item.readings.lifecycle === 'partially_closed') {
      const { error: lifecycleError } = await supabase.from('bot4x_execution_intents').update({ readings: item.readings as unknown as Json }).eq('id', item.row.id)
      if (lifecycleError) throw new ApiError(lifecycleError.message, 500)
    }
  }

  const verifiedRealizedRows = executionRows
    .filter((r) => r.status === 'completed' && r.side === 'SELL')
    .map((r) => Number(((r.readings ?? {}) as Record<string, unknown>).realizedPnl))
    .filter((value) => Number.isFinite(value))
    .map((value) => ({ pnl: value }))

  const wins = verifiedRealizedRows.filter((r) => r.pnl > 0).length
  const losses = verifiedRealizedRows.filter((r) => r.pnl < 0).length
  const open = rows.filter((r) => r.result === 'open').length
  const pnl = verifiedRealizedRows.reduce((acc, r) => acc + r.pnl, 0)

  const submitted = executionRows.filter((r) => r.status === 'submitted' || r.status === 'completed').length
  const pending = executionRows.filter((r) => r.status === 'pending').length
  const failed = executionRows.filter((r) => r.status === 'failed').length

  return {
    serverTime: new Date().toISOString(),
    active: config.active,
    profile: config.profile,
    circuitBreaker: config.circuitBreaker,
    dailyPnl: config.dailyPnl,
    openSlots: config.openSlots,
    today: {
      trades: rows.length,
      wins,
      losses,
      open,
      pnl: Number(pnl.toFixed(2)),
      pnlSource: 'verified_binance_execution_ledger',
      timezone,
      executions: executionRows.length,
      submitted,
      pending,
      failed,
    },
    logs: [
      ...executionRows.slice(0, 20).map((r) => ({
        at: r.created_at,
        level: r.status === 'failed' ? 'warn' : 'info',
        message: r.pair + ' ' + r.side + ' · Binance · ' + r.status,
        detail: ((r.readings ?? {}) as Record<string, unknown>).orderId
          ? 'orderId=' + String(((r.readings ?? {}) as Record<string, unknown>).orderId)
          : 'Execução registrada no ledger',
      })),
      ...rows.slice(0, 20).map((r) => ({
        at: r.created_at,
        level: r.result === 'LOSS' ? 'warn' : 'info',
        message: r.pair + ' ' + r.side + ' · ' + r.result + ' · ' +
          (Number(r.pnl ?? 0) >= 0 ? '+' : '') + Number(r.pnl ?? 0).toFixed(2),
        detail: r.motivo ?? '',
      })),
    ].slice(0, 20),
  }
}

