import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { ApiError } from './api-auth.server'
import { getOrCreateConfig } from './bot4x.server'
import { getBinanceEnvironment, getExchangeStatus, getVerifiedBinanceAccount, getVerifiedBinanceOrderByClientOrderId, submitVerifiedBinanceMarketOrder } from './exchange.server'
import { validateDemoOrderRisk, validateRealOrderRisk, type RealOrderSide } from './order-risk'

type Client = SupabaseClient<Database>

export interface ExecuteRealOrderInput {
  symbol: string
  side: RealOrderSide
  quoteOrderQty: number
  confirmed: boolean
}

export async function executeAuthorizedSixDollarBtcDemoOrder(
  supabase: Client,
  userId: string,
  input: { side: RealOrderSide; confirmed: boolean; idempotencyKey: string },
) {
  const idempotencyKey = input.idempotencyKey.trim()
  if (!idempotencyKey) throw new ApiError('Idempotency key é obrigatória.', 400)
  if (getBinanceEnvironment() === 'production') {
    throw new ApiError('Ambiente de produção bloqueado nesta fase DEMO.', 409)
  }
  if (!input.confirmed) throw new ApiError('Confirmação explícita da ordem DEMO é obrigatória.', 409)

  const { data: existingIntent, error: existingIntentError } = await supabase
    .from('bot4x_execution_intents')
    .select('status, readings, mode, pair, side, quote_amount')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existingIntentError) throw new ApiError(existingIntentError.message, 500)
  if (existingIntent) {
    if (existingIntent.mode !== 'DEMO' || existingIntent.pair !== 'BTCUSDT' || existingIntent.side !== input.side || Number(existingIntent.quote_amount) !== 6) {
      throw new ApiError('Esta idempotency key já está vinculada a outra ordem.', 409)
    }
    if (existingIntent.status === 'submitted' || existingIntent.status === 'completed') {
      const readings = (existingIntent.readings ?? {}) as Record<string, unknown>
      return {
        submitted: true,
        replay: true,
        environment: getBinanceEnvironment(),
        symbol: 'BTCUSDT',
        side: input.side,
        quoteOrderQty: 6,
        orderId: typeof readings.orderId === 'number' ? readings.orderId : null,
        status: typeof readings.status === 'string' ? readings.status : null,
        executedQty: typeof readings.executedQty === 'number' ? readings.executedQty : null,
        cummulativeQuoteQty: typeof readings.cummulativeQuoteQty === 'number' ? readings.cummulativeQuoteQty : null,
      }
    }
    if (existingIntent.status === 'pending') throw new ApiError('Esta ordem já está em processamento.', 409)
    throw new ApiError('Esta idempotency key já foi utilizada por uma ordem com falha.', 409)
  }

  const config = await getOrCreateConfig(supabase, userId)
  const exchange = await getExchangeStatus(supabase, userId)
  if (!exchange.verified) throw new ApiError('Binance não conectada ou não verificada.', 409)
  const account = await getVerifiedBinanceAccount(supabase, userId)
  if (!account.canTrade) throw new ApiError('A conta Binance não possui permissão de trade.', 409)

  const usdt = account.balances.find((item) => item.asset === 'USDT')
  const risk = validateDemoOrderRisk({
    executionMode: config.executionMode as "DEMO" | "REAL",
    exchange: config.exchange,
    credentialsVerified: exchange.verified,
    canTrade: account.canTrade,
    circuitBreaker: config.circuitBreaker as "none" | "emergency" | "profitLock",
    symbol: 'BTCUSDT',
    side: input.side,
    quoteOrderQty: 6,
    freeUsdt: usdt?.free ?? 0,
    configuredCapital: config.totalCapital,
    allocationPct: config.allocationPct,
    confirmed: true,
  })
  if (!risk.ok) throw new ApiError(risk.reason, 409)

  const { data: intent, error: intentError } = await supabase
    .from('bot4x_execution_intents')
    .insert({
      user_id: userId,
      idempotency_key: idempotencyKey,
      mode: 'DEMO',
      pair: 'BTCUSDT',
      side: input.side,
      quote_amount: 6,
      reason: 'manual-demo-order',
      readings: { environment: getBinanceEnvironment(), confirmed: true },
      status: 'pending',
      confirmed_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (intentError || !intent) {
    if (intentError?.code === '23505') {
      throw new ApiError('Esta ordem já está em processamento para esta idempotency key. Não tente reenviar.', 409)
    }
    throw new ApiError(intentError?.message ?? 'Falha ao registrar intenção de execução.', 500)
  }

  let result: Record<string, unknown>
  try {
    result = await submitVerifiedBinanceMarketOrder(supabase, userId, { symbol: 'BTCUSDT', side: input.side, quoteOrderQty: 6, clientOrderId: intent.id })
  } catch (error) {
    // A submission error is ambiguous: Binance may have accepted the order
    // before the transport failed. Recover by clientOrderId before deciding
    // whether the intent can safely become failed.
    try {
      const recovered = await getVerifiedBinanceOrderByClientOrderId(supabase, userId, {
        symbol: 'BTCUSDT',
        clientOrderId: intent.id,
      })
      const recoveredStatus = typeof recovered.status === 'string' ? recovered.status : null
      if (recoveredStatus) {
        const recoveredReadings = {
          environment: getBinanceEnvironment(),
          clientOrderId: intent.id,
          orderId: typeof recovered.orderId === 'number' ? recovered.orderId : null,
          status: recoveredStatus,
          executedQty: typeof recovered.executedQty === 'string' ? Number(recovered.executedQty) : null,
          cummulativeQuoteQty: typeof recovered.cummulativeQuoteQty === 'string' ? Number(recovered.cummulativeQuoteQty) : null,
          recoveredAt: new Date().toISOString(),
        }
        const recoveredLedgerStatus =
          recoveredStatus === 'FILLED' ? 'completed'
            : recoveredStatus === 'CANCELED' || recoveredStatus === 'REJECTED' || recoveredStatus === 'EXPIRED' ? 'failed'
              : 'submitted'
        await supabase.from('bot4x_execution_intents').update({
          status: recoveredLedgerStatus,
          processed_at: new Date().toISOString(),
          readings: recoveredReadings,
        }).eq('id', intent.id)
        throw new ApiError('A Binance recebeu a ordem, mas a resposta original foi perdida. O ledger foi recuperado; não tente reenviar.', 503)
      }
    } catch (recoveryError) {
      if (recoveryError instanceof ApiError && recoveryError.status === 503) throw recoveryError
      if (!(recoveryError instanceof ApiError) || recoveryError.status !== 404 || recoveryError.code !== -2013) {
        throw new ApiError('Não foi possível confirmar o resultado da submissão na Binance. A intenção permanece pendente; não tente reenviar.', 503)
      }
    }
    await supabase.from('bot4x_execution_intents').update({
      status: 'failed',
      processed_at: new Date().toISOString(),
      readings: { environment: getBinanceEnvironment(), error: error instanceof Error ? error.message : 'Falha desconhecida', recovery: 'not_found' },
    }).eq('id', intent.id)
    throw error
  }

  const response = { submitted: true, environment: getBinanceEnvironment(), symbol: 'BTCUSDT', side: input.side, quoteOrderQty: 6, clientOrderId: intent.id, orderId: typeof result.orderId === 'number' ? result.orderId : null, status: typeof result.status === 'string' ? result.status : null, executedQty: typeof result.executedQty === 'string' ? Number(result.executedQty) : null, cummulativeQuoteQty: typeof result.cummulativeQuoteQty === 'string' ? Number(result.cummulativeQuoteQty) : null }
  const { error: updateError } = await supabase.from('bot4x_execution_intents').update({ status: 'submitted', processed_at: new Date().toISOString(), readings: response }).eq('id', intent.id)
  if (updateError) throw new ApiError('Ordem enviada à Binance, mas o ledger não confirmou a persistência. Não tente reenviar com a mesma idempotency key.', 503)
  return response
}

export async function executeAuthorizedSixDollarBtcOrder(
  supabase: Client,
  userId: string,
  input: { side: RealOrderSide; confirmed: boolean; idempotencyKey: string },
) {
  const idempotencyKey = input.idempotencyKey.trim()
  if (!idempotencyKey) throw new ApiError('Idempotency key é obrigatória.', 400)
  if (!input.confirmed) throw new ApiError('Confirmação explícita da ordem REAL é obrigatória.', 409)
  if (getBinanceEnvironment() !== 'production') {
    throw new ApiError('Ordens REAL estão bloqueadas fora do ambiente de produção.', 409)
  }

  const { data: existingIntent, error: existingIntentError } = await supabase
    .from('bot4x_execution_intents')
    .select('status, readings, mode, pair, side, quote_amount')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existingIntentError) throw new ApiError(existingIntentError.message, 500)
  if (existingIntent) {
    if (existingIntent.mode !== 'REAL' || existingIntent.pair !== 'BTCUSDT' || existingIntent.side !== input.side || Number(existingIntent.quote_amount) !== 6) {
      throw new ApiError('Esta idempotency key já está vinculada a outra ordem.', 409)
    }
    if (existingIntent.status === 'submitted' || existingIntent.status === 'completed') {
      const readings = (existingIntent.readings ?? {}) as Record<string, unknown>
      return {
        submitted: true,
        replay: true,
        environment: 'production',
        symbol: 'BTCUSDT',
        side: input.side,
        quoteOrderQty: 6,
        orderId: typeof readings.orderId === 'number' ? readings.orderId : null,
        status: typeof readings.status === 'string' ? readings.status : null,
        executedQty: typeof readings.executedQty === 'number' ? readings.executedQty : null,
        cummulativeQuoteQty: typeof readings.cummulativeQuoteQty === 'number' ? readings.cummulativeQuoteQty : null,
      }
    }
    if (existingIntent.status === 'pending') throw new ApiError('Esta ordem já está em processamento.', 409)
    throw new ApiError('Esta idempotency key já foi utilizada por uma ordem com falha.', 409)
  }

  const intent = await validateRealMarketOrder(supabase, userId, {
    symbol: 'BTCUSDT',
    side: input.side,
    quoteOrderQty: 6,
    confirmed: true,
  })

  const { data: createdIntent, error: intentError } = await supabase
    .from('bot4x_execution_intents')
    .insert({
      user_id: userId,
      idempotency_key: idempotencyKey,
      mode: 'REAL',
      pair: intent.symbol,
      side: intent.side,
      quote_amount: 6,
      reason: 'manual-real-order',
      readings: { environment: 'production', confirmed: true },
      status: 'pending',
      confirmed_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (intentError || !createdIntent) {
    if (intentError?.code === '23505') {
      throw new ApiError('Esta ordem REAL já está em processamento para esta idempotency key. Não tente reenviar.', 409)
    }
    throw new ApiError(intentError?.message ?? 'Falha ao registrar intenção de execução REAL.', 500)
  }

  let result: Record<string, unknown>
  try {
    result = await submitVerifiedBinanceMarketOrder(supabase, userId, { symbol: intent.symbol, side: intent.side, quoteOrderQty: 6, clientOrderId: createdIntent.id })
  } catch (error) {
    // A submission error is ambiguous. Check the deterministic clientOrderId
    // before marking the intent failed so a transport error cannot cause a
    // duplicate REAL order on retry.
    try {
      const recovered = await getVerifiedBinanceOrderByClientOrderId(supabase, userId, {
        symbol: intent.symbol,
        clientOrderId: createdIntent.id,
      })
      const recoveredStatus = typeof recovered.status === 'string' ? recovered.status : null
      if (recoveredStatus) {
        const recoveredReadings = {
          environment: 'production',
          clientOrderId: createdIntent.id,
          orderId: typeof recovered.orderId === 'number' ? recovered.orderId : null,
          status: recoveredStatus,
          executedQty: typeof recovered.executedQty === 'string' ? Number(recovered.executedQty) : null,
          cummulativeQuoteQty: typeof recovered.cummulativeQuoteQty === 'string' ? Number(recovered.cummulativeQuoteQty) : null,
          recoveredAt: new Date().toISOString(),
        }
        const recoveredLedgerStatus =
          recoveredStatus === 'FILLED' ? 'completed'
            : recoveredStatus === 'CANCELED' || recoveredStatus === 'REJECTED' || recoveredStatus === 'EXPIRED' ? 'failed'
              : 'submitted'
        await supabase.from('bot4x_execution_intents').update({
          status: recoveredLedgerStatus,
          processed_at: new Date().toISOString(),
          readings: recoveredReadings,
        }).eq('id', createdIntent.id)
        throw new ApiError('A Binance recebeu a ordem, mas a resposta original foi perdida. O ledger REAL foi recuperado; não tente reenviar.', 503)
      }
    } catch (recoveryError) {
      if (recoveryError instanceof ApiError && recoveryError.status === 503) throw recoveryError
      if (!(recoveryError instanceof ApiError) || recoveryError.status !== 404 || recoveryError.code !== -2013) {
        throw new ApiError('Não foi possível confirmar o resultado da submissão REAL na Binance. A intenção permanece pendente; não tente reenviar.', 503)
      }
    }
    await supabase.from('bot4x_execution_intents').update({
      status: 'failed',
      processed_at: new Date().toISOString(),
      readings: { environment: 'production', error: error instanceof Error ? error.message : 'Falha desconhecida', recovery: 'not_found' },
    }).eq('id', createdIntent.id)
    throw error
  }

  const response = { submitted: true, environment: 'production' as const, symbol: intent.symbol, side: intent.side, quoteOrderQty: 6, clientOrderId: createdIntent.id, orderId: typeof result.orderId === 'number' ? result.orderId : null, status: typeof result.status === 'string' ? result.status : null, executedQty: typeof result.executedQty === 'string' ? Number(result.executedQty) : null, cummulativeQuoteQty: typeof result.cummulativeQuoteQty === 'string' ? Number(result.cummulativeQuoteQty) : null }
  const { error: updateError } = await supabase.from('bot4x_execution_intents').update({ status: 'submitted', processed_at: new Date().toISOString(), readings: response }).eq('id', createdIntent.id)
  if (updateError) throw new ApiError('Ordem enviada à Binance, mas o ledger não confirmou a persistência. Não tente reenviar com a mesma idempotency key.', 503)
  return response
}

export async function validateRealMarketOrder(
  supabase: Client,
  userId: string,
  input: ExecuteRealOrderInput,
) {
  const config = await getOrCreateConfig(supabase, userId)
  const exchange = await getExchangeStatus(supabase, userId)
  if (!exchange.verified) throw new ApiError('Binance não conectada ou não verificada.', 409)

  const account = await getVerifiedBinanceAccount(supabase, userId)
  if (!account.canTrade) throw new ApiError('A conta Binance não possui permissão de trade.', 409)

  const usdt = account.balances.find((item) => item.asset === 'USDT')
  const risk = validateRealOrderRisk({
    executionMode: config.executionMode as "DEMO" | "REAL",
    exchange: config.exchange,
    credentialsVerified: exchange.verified,
    canTrade: account.canTrade,
    circuitBreaker: config.circuitBreaker as "none" | "emergency" | "profitLock",
    symbol: input.symbol.toUpperCase(),
    side: input.side,
    quoteOrderQty: input.quoteOrderQty,
    freeUsdt: usdt?.free ?? 0,
    configuredCapital: config.totalCapital,
    allocationPct: config.allocationPct,
    confirmed: input.confirmed,
  })
  if (!risk.ok) throw new ApiError(risk.reason, 409)

  // This phase deliberately stops at a validated server-side execution intent.
  // No BUY/SELL is submitted to Binance. The live submission step is isolated
  // for the later, explicitly authorized manual US$6 validation.
  return {
    ready: true,
    executionMode: config.executionMode,
    exchange: config.exchange,
    symbol: input.symbol.toUpperCase(),
    side: input.side,
    quoteOrderQty: input.quoteOrderQty,
    maxQuoteOrderQty: risk.maxQuoteOrderQty,
    usdtFree: usdt?.free ?? 0,
  }
}
