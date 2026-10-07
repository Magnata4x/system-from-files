import type { SupabaseClient } from '@supabase/supabase-js'
import { getVerifiedBinanceOrderByClientOrderId } from './exchange.server'

interface ExecutionIntentRow { id: string; user_id: string; mode: string; pair: string; side: string; status: string; readings: unknown }

export type ReconciliationResult = { intentId: string; status: 'pending' | 'submitted' | 'completed' | 'failed'; reconciled: boolean; exchangeStatus: string | null; orderId: number | null }

export function mapBinanceOrderStatus(status: string | null): ReconciliationResult['status'] {
  switch (status) {
    case 'FILLED': return 'completed'
    case 'CANCELED': case 'REJECTED': case 'EXPIRED': case 'EXPIRED_IN_MATCH': return 'failed'
    case 'NEW': case 'PARTIALLY_FILLED': case 'PENDING_CANCEL': return 'submitted'
    default: return 'pending'
  }
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function numeric(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

export async function reconcileUserExecutionIntents(supabase: SupabaseClient, userId: string): Promise<ReconciliationResult[]> {
  const { data, error } = await supabase.from('bot4x_execution_intents').select('id,user_id,mode,pair,side,status,readings').eq('user_id', userId).in('status', ['pending', 'submitted']).order('created_at', { ascending: true }).limit(50)
  if (error) throw new Error('Falha ao carregar intenções para reconciliação: ' + error.message)
  const results: ReconciliationResult[] = []
  const intents: ExecutionIntentRow[] = (data ?? []).map((row) => ({ id: row.id, user_id: row.user_id, mode: row.mode, pair: row.pair, side: row.side, status: row.status, readings: row.readings }))
  for (const intent of intents) {
    if (intent.mode !== 'DEMO' || intent.pair !== 'BTCUSDT') {
      results.push({ intentId: intent.id, status: 'pending', reconciled: false, exchangeStatus: null, orderId: null })
      continue
    }
    let order: Record<string, unknown>
    try {
      const rawOrder = await getVerifiedBinanceOrderByClientOrderId(supabase, userId, { symbol: intent.pair, clientOrderId: intent.id })
      order = jsonRecord(rawOrder)
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? (error as { code?: unknown }).code : undefined
      if (code === -2013) {
        results.push({ intentId: intent.id, status: 'pending', reconciled: false, exchangeStatus: null, orderId: null })
        continue
      }
      throw error
    }
    const exchangeStatus = typeof order.status === 'string' ? order.status : null
    const status = mapBinanceOrderStatus(exchangeStatus)
    const orderId = numeric(order.orderId)
    const readings = { ...jsonRecord(intent.readings), environment: 'testnet', clientOrderId: intent.id, orderId, status: exchangeStatus, executedQty: numeric(order.executedQty), cummulativeQuoteQty: numeric(order.cummulativeQuoteQty), reconciledAt: new Date().toISOString() }
    const { error: updateError } = await supabase.from('bot4x_execution_intents').update({ status, processed_at: new Date().toISOString(), readings }).eq('id', intent.id).eq('user_id', userId)
    if (updateError) throw new Error('Falha ao persistir reconciliação ' + intent.id + ': ' + updateError.message)
    results.push({ intentId: intent.id, status, reconciled: true, exchangeStatus, orderId })
  }
  return results
}
