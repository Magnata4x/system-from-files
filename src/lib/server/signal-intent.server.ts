import type { Database } from '@/integrations/supabase/types'
import { evaluateEligibility, type ManipulationRisk } from '@/lib/bot4x-eligibility-core'
import type { ApiUser } from './api-auth.server'
import { ApiError } from './api-auth.server'
import { getSupabaseAdmin } from './supabase-admin.server'
import { getOrCreateConfig } from './bot4x.server'
import { listManipulationAlerts } from './engine.server'

type IntentRow = Database['public']['Tables']['bot4x_execution_intents']['Row']

const ACTIVE_INTENT_LIMIT = 3

function normalizePair(pair: string) {
  return pair.replace('/', '').replace('-', '').toUpperCase()
}

/**
 * Creates a confirmation-only ledger record. This function intentionally has
 * no exchange/order imports and can never submit an order to Binance.
 */
export async function createSignalIntent(user: ApiUser, signalId: string, idempotencyKey: string) {
  const key = idempotencyKey.trim()
  if (!key || key.length > 200) throw new ApiError('Idempotency-Key obrigatória (até 200 caracteres).', 400)
  if (!signalId.trim()) throw new ApiError('ID do sinal obrigatório.', 400)

  const existing = await user.supabase
    .from('bot4x_execution_intents')
    .select('id, idempotency_key, signal_id, pair, side, status, mode')
    .eq('user_id', user.userId)
    .eq('idempotency_key', key)
    .maybeSingle()
  if (existing.error) throw new ApiError('Não foi possível verificar a idempotência.', 500)
  if (existing.data) {
    if (existing.data.signal_id !== signalId) {
      throw new ApiError('Idempotency-Key já utilizada por outra intenção.', 409)
    }
    return { id: existing.data.id, signalId, status: existing.data.status, replay: true, orderSubmitted: false }
  }

  // Use the trusted service client for the canonical shared signal record.
  const admin = getSupabaseAdmin()
  const { data: rawSignal, error: signalError } = await admin
    .from('signals')
    .select('*')
    .eq('id', signalId)
    .maybeSingle()
  if (signalError) throw new ApiError('Não foi possível validar o sinal.', 503)
  if (!rawSignal) throw new ApiError('Sinal não encontrado.', 404)

  const signal = rawSignal as unknown as Record<string, unknown>
  const status = String(signal.status ?? '')
  if (status !== 'active' && status !== 'new' && status !== 'premium' && status !== 'expiring') {
    throw new ApiError('Sinal inativo ou invalidado.', 409)
  }
  const expiresAt = signal.valid_until ?? signal.expires_at
  if (typeof expiresAt === 'string' && Date.parse(expiresAt) <= Date.now()) {
    throw new ApiError('Sinal expirado.', 409)
  }
  if (signal.closed_at != null) throw new ApiError('Sinal encerrado.', 409)

  const pair = String(signal.pair ?? '')
  const side = String(signal.side ?? '').toUpperCase()
  const score = Number(signal.score)
  const entry = Number(signal.entry_price)
  const stop = typeof signal.stop_loss === 'number' ? signal.stop_loss : null
  if (!pair || (side !== 'BUY' && side !== 'SELL') || !Number.isFinite(score) ||
      !Number.isFinite(entry) || entry <= 0 || stop == null || !Number.isFinite(stop) || stop <= 0) {
    throw new ApiError('Dados operacionais do sinal incompletos; intenção bloqueada.', 409)
  }

  const config = await getOrCreateConfig(user.supabase, user.userId)
  const { data: activeIntents, error: activeError } = await user.supabase
    .from('bot4x_execution_intents')
    .select('status')
    .eq('user_id', user.userId)
    .in('status', ['pending_confirmation', 'pending', 'submitted'])
  if (activeError) throw new ApiError('Não foi possível validar o limite de risco.', 503)

  const matchingManipulation = await listManipulationAlerts({ symbol: pair, limit: 100 }).catch(() => null)
  if (matchingManipulation === null) throw new ApiError('Risco de manipulação indisponível; intenção bloqueada.', 503)
  const normalized = normalizePair(pair)
  const manip = matchingManipulation.find((item) => normalizePair(item.symbol) === normalized)
  const manipulationRisk: ManipulationRisk = manip
    ? (String(manip.riskLevel).toLowerCase() === 'low' || String(manip.riskLevel).toLowerCase() === 'medium' || String(manip.riskLevel).toLowerCase() === 'high' ? String(manip.riskLevel).toLowerCase() as ManipulationRisk : 'unavailable')
    : 'unavailable'

  const capital = Number(config.activeCapital || config.totalCapital || 0)
  const dailyPnl = Number(config.dailyPnl || 0)
  if (!Number.isFinite(capital) || capital <= 0 || !Number.isFinite(dailyPnl)) {
    throw new ApiError('Estado financeiro incompleto; intenção bloqueada.', 409)
  }
  const dailyPnlPct = dailyPnl / capital * 100
  const riskPct = Math.abs(entry - stop) / entry * 100
  const profile = String(config.profile)
  const maxRiskPct = Number(config.slPct)
  const circuitBreaker = String(config.circuitBreaker)
  const slotLimit = ACTIVE_INTENT_LIMIT
  const quoteAmount = capital * Number(config.allocationPct || 0) / 100
  if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) {
    throw new ApiError('Alocação operacional inválida; intenção bloqueada.', 409)
  }

  const decision = evaluateEligibility({
    profile,
    score,
    riskPct,
    maxRiskPct,
    signalStatus: status,
    dailyPnlPct,
    manipulationRisk,
    circuitBreaker,
    activeIntentStatuses: (activeIntents ?? []).map((intent) => intent.status),
    slotLimit,
  })
  if (!decision.eligible) {
    throw new ApiError(`Sinal inelegível: ${decision.reason}.`, 409)
  }

  const { data: intent, error: insertError } = await user.supabase
    .from('bot4x_execution_intents')
    .insert({
      user_id: user.userId,
      idempotency_key: key,
      mode: config.executionMode,
      pair,
      side,
      quote_amount: Number(quoteAmount.toFixed(8)),
      reason: 'signal-cross-page-command',
      readings: {
        signalId,
        score,
        status,
        eligibility: decision,
        manipulationRisk,
        riskPct,
        createdFrom: 'signal',
      },
      signal_id: signalId,
      status: 'pending_confirmation',
    })
    .select('id, status')
    .single()
  if (insertError) {
    if (insertError.code === '23505') {
      const { data: replay } = await user.supabase
        .from('bot4x_execution_intents')
        .select('id, signal_id, status')
        .eq('user_id', user.userId)
        .eq('idempotency_key', key)
        .maybeSingle()
      if (replay?.signal_id === signalId) {
        return { id: replay.id, signalId, status: replay.status, replay: true, orderSubmitted: false }
      }
      throw new ApiError('Intenção concorrente detectada; repita com a mesma chave.', 409)
    }
    throw new ApiError('Falha ao persistir intenção.', 500)
  }
  return { id: intent.id, signalId, status: intent.status, replay: false, orderSubmitted: false }
}
