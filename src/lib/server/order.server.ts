import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { ApiError } from './api-auth.server'
import { getOrCreateConfig } from './bot4x.server'
import { getExchangeStatus, getVerifiedBinanceAccount, submitVerifiedBinanceMarketOrder } from './exchange.server'
import { validateRealOrderRisk, type RealOrderSide } from './order-risk'

type Client = SupabaseClient<Database>

export interface ExecuteRealOrderInput {
  symbol: string
  side: RealOrderSide
  quoteOrderQty: number
  confirmed: boolean
}

export async function executeAuthorizedSixDollarBtcOrder(
  supabase: Client,
  userId: string,
  input: { side: RealOrderSide; confirmed: boolean },
) {
  if (!input.confirmed) throw new ApiError('Confirmação explícita da ordem REAL é obrigatória.', 409)

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
