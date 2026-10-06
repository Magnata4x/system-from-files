import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { ApiError } from './api-auth.server'
import { getOrCreateConfig } from './bot4x.server'
import { getBinanceEnvironment, getExchangeStatus, getVerifiedBinanceAccount, submitVerifiedBinanceMarketOrder } from './exchange.server'
import { validateDemoOrderRisk, validateRealOrderRisk, type RealOrderSide } from './order-risk'
import { saveTradeWithOutbox } from '@/lib/bot4x-trades-db'
import type { Trade } from '@/lib/bot4x-data'

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
    .select('status, readings')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existingIntentError) throw new ApiError(existingIntentError.message, 500)
  if (existingIntent) {
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
    throw new ApiError(intentError?.message ?? 'Falha ao registrar intenção de execução.', 500)
  }

  try {
    const result = await submitVerifiedBinanceMarketOrder(supabase, userId, {
      symbol: 'BTCUSDT',
      side: input.side,
      quoteOrderQty: 6,
    })
    const response = {
      submitted: true,
      environment: getBinanceEnvironment(),
      symbol: 'BTCUSDT',
      side: input.side,
      quoteOrderQty: 6,
      orderId: typeof result['orderId'] === 'number' ? result['orderId'] : null,
      status: typeof result['status'] === 'string' ? result['status'] : null,
      executedQty: typeof result['executedQty'] === 'string' ? Number(result['executedQty']) : null,
      cummulativeQuoteQty:
        typeof result['cummulativeQuoteQty'] === 'string' ? Number(result['cummulativeQuoteQty']) : null,
    }
    const orderId = response.orderId
    const executedQty = response.executedQty ?? 0
    const quoteQty = response.cummulativeQuoteQty ?? 0
    const entry = executedQty > 0 && quoteQty > 0 ? quoteQty / executedQty : 0
    const trade: Trade = {
      id: `binance-${intent.id}`,
      day: new Date().toISOString().slice(0, 10),
      pair: 'BTC/USDT',
      side: input.side === 'BUY' ? 'LONG' : 'SHORT',
      entry,
      stop: 0,
      target: 0,
      result: 'open',
      pnl: 0,
      pnlPct: 0,
      accumulated: 0,
      profile: config.profile as Trade['profile'],
      leverage: config.leverage ?? 1,
      motivo: `Binance ${getBinanceEnvironment()} orderId=${orderId ?? 'unknown'} status=${response.status ?? 'unknown'}`,
      hour: new Date().getHours(),
    }
    let tradeRecorded = true
    try {
      await saveTradeWithOutbox(userId, trade)
    } catch {
      tradeRecorded = false
    }

    const readings = { ...response, tradeId: trade.id, tradeRecorded }
    const { error: updateError } = await supabase
      .from('bot4x_execution_intents')
      .update({ status: 'submitted', processed_at: new Date().toISOString(), readings })
      .eq('id', intent.id)
    if (updateError) throw new ApiError(updateError.message, 500)
    return { ...response, tradeId: trade.id, tradeRecorded }
  } catch (error) {
    await supabase
      .from('bot4x_execution_intents')
      .update({
        status: 'failed',
        processed_at: new Date().toISOString(),
        readings: { environment: getBinanceEnvironment(), error: error instanceof Error ? error.message : 'Falha desconhecida' },
      })
      .eq('id', intent.id)
    throw error
  }
}

export async function executeAuthorizedSixDollarBtcOrder(
  supabase: Client,
  userId: string,
  input: { side: RealOrderSide; confirmed: boolean },
) {
  if (!input.confirmed) throw new ApiError('Confirmação explícita da ordem REAL é obrigatória.', 409)
  if (getBinanceEnvironment() !== 'production') throw new ApiError('Ordens REAL estão bloqueadas fora do ambiente de produção.', 409)

  const intent = await validateRealMarketOrder(supabase, userId, {
    symbol: 'BTCUSDT',
    side: input.side,
    quoteOrderQty: 6,
    confirmed: true,
  })

  const result = await submitVerifiedBinanceMarketOrder(supabase, userId, {
    symbol: 'BTCUSDT',
    side: input.side,
    quoteOrderQty: 6,
  })

  return {
    submitted: true,
    symbol: intent.symbol,
    side: intent.side,
    quoteOrderQty: 6,
    orderId: typeof result['orderId'] === 'number' ? result['orderId'] : null,
    status: typeof result['status'] === 'string' ? result['status'] : null,
    executedQty: typeof result['executedQty'] === 'string' ? Number(result['executedQty']) : null,
    cummulativeQuoteQty:
      typeof result['cummulativeQuoteQty'] === 'string' ? Number(result['cummulativeQuoteQty']) : null,
  }
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
