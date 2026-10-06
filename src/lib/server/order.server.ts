import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { ApiError } from './api-auth.server'
import { getOrCreateConfig } from './bot4x.server'
import { getExchangeStatus, getVerifiedBinanceAccount, placeVerifiedBinanceMarketOrder } from './exchange.server'
import { validateRealOrderRisk, type RealOrderSide } from './order-risk'

type Client = SupabaseClient<Database>

export interface ExecuteRealOrderInput {
  symbol: string
  side: RealOrderSide
  quoteOrderQty: number
  confirmed: boolean
}

export async function executeRealMarketOrder(
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
    executionMode: config.executionMode,
    exchange: config.exchange,
    credentialsVerified: exchange.verified,
    canTrade: account.canTrade,
    circuitBreaker: config.circuitBreaker,
    symbol: input.symbol.toUpperCase(),
    side: input.side,
    quoteOrderQty: input.quoteOrderQty,
    freeUsdt: usdt?.free ?? 0,
    configuredCapital: config.totalCapital,
    allocationPct: config.allocationPct,
    confirmed: input.confirmed,
  })
  if (!risk.ok) throw new ApiError(risk.reason, 409)

  return placeVerifiedBinanceMarketOrder(supabase, userId, {
    symbol: input.symbol.toUpperCase(),
    side: input.side,
    quoteOrderQty: input.quoteOrderQty,
  })
}
