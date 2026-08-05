// Config e execuções do Bot4x sobre o banco interno.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { ApiError } from './api-auth.server'
import { CIRCUIT_BREAKER_LOSS_PCT, PROFIT_LOCK_TARGET_PCT } from './engine.server'

type Client = SupabaseClient<Database>
type ConfigRow = Database['public']['Tables']['bot4x_configs']['Row']

export function mapConfig(row: ConfigRow) {
  return {
    userId: row.user_id,
    active: row.active,
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
}

export async function updateConfig(
  supabase: Client,
  userId: string,
  patch: Record<string, unknown>,
) {
  await getOrCreateConfig(supabase, userId)
  const update: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    const column = PATCHABLE[key] ?? (key in PATCHABLE ? undefined : undefined)
    if (column) update[column] = value
    else if (Object.values(PATCHABLE).includes(key as keyof ConfigRow)) update[key] = value
  }
  if (Object.keys(update).length === 0) return getOrCreateConfig(supabase, userId)

  const { data, error } = await supabase
    .from('bot4x_configs')
    .update(update)
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