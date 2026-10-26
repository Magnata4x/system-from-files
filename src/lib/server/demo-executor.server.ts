// Executor DEMO genérico (Binance Spot Testnet).
//
// Diferente do executor de teste (ordem fixa de US$ 6 em BTCUSDT), este
// executor:
// - dimensiona a entrada pelo perfil do usuário (capital, alocação, slot);
// - valida os filtros da exchange (LOT_SIZE, MIN_NOTIONAL/NOTIONAL);
// - trata SELL como venda Spot real (exige saldo do ativo — Spot não tem short);
// - registra SL/TP do sinal no ledger e fecha posições abertas quando o
//   preço do Testnet atinge um dos gatilhos;
// - deixa o PnL para a reconciliação FIFO já existente em getTelemetry,
//   que pareia BUY/SELL verificados e calcula realizedPnl líquido de taxas.
//
// REAL permanece gated: este módulo só opera no ambiente Testnet.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { ApiError } from './api-auth.server'
import { getOrCreateConfig } from './bot4x.server'
import {
  getBinanceEnvironment,
  getExchangeStatus,
  getVerifiedBinanceAccount,
  getVerifiedBinanceOrderByClientOrderId,
  submitVerifiedBinanceMarketOrder,
} from './exchange.server'
import { validateDemoOrderRisk, type RealOrderSide } from './order-risk'
import { binanceEnvironmentForMode } from './execution-environment'
import { toBinanceSymbol } from './market.server'
import type { BackendSignal } from './engine.server'

type Client = SupabaseClient<Database>

const TESTNET_PUBLIC_BASE = 'https://testnet.binance.vision/api'
const EXCHANGE_INFO_TTL_MS = 5 * 60 * 1000
const MAX_OPEN_SLOTS = 10
const SLOT_RISK_FRACTION = 0.1

// ─── Helpers puros (testáveis) ───────────────────────────────────────────────

/** Tamanho da entrada: capital < US$ 100 usa tudo em uma operação; acima
 *  disso, usa Allocation % dividido em 10 slots. Limitado ao USDT livre. */
export function computeDemoEntryQuoteQty(input: {
  totalCapital: number
  allocationPct: number
  freeUsdt: number
}): number {
  const capital = Math.max(0, input.totalCapital)
  const activeCapital = capital < 100 ? capital : capital * (input.allocationPct / 100)
  const slotSize = capital < 100 ? activeCapital : activeCapital * SLOT_RISK_FRACTION
  return Math.floor(Math.min(slotSize, Math.max(0, input.freeUsdt)) * 100) / 100
}

/** Arredonda uma quantidade para baixo no stepSize do filtro LOT_SIZE. */
export function floorToStep(qty: number, stepSize: number): number {
  if (!Number.isFinite(qty) || !Number.isFinite(stepSize) || stepSize <= 0) return 0
  const steps = Math.floor(qty / stepSize)
  const precision = Math.max(0, Math.round(-Math.log10(stepSize)))
  return Number((steps * stepSize).toFixed(precision))
}

export interface ExchangeSymbolFilters {
  minQty: number
  stepSize: number
  minNotional: number
}

/** Extrai LOT_SIZE e NOTIONAL/MIN_NOTIONAL do exchangeInfo da Binance. */
export function parseExchangeFilters(exchangeInfo: unknown): ExchangeSymbolFilters {
  const root = exchangeInfo as { symbols?: Array<{ filters?: Array<Record<string, unknown>> }> }
  const filters = root?.symbols?.[0]?.filters ?? []
  let minQty = 0
  let stepSize = 0
  let minNotional = 0
  for (const filter of filters) {
    const type = typeof filter['filterType'] === 'string' ? filter['filterType'] : ''
    if (type === 'LOT_SIZE') {
      minQty = Number(filter['minQty'] ?? 0)
      stepSize = Number(filter['stepSize'] ?? 0)
    }
    if (type === 'NOTIONAL' || type === 'MIN_NOTIONAL') {
      minNotional = Math.max(minNotional, Number(filter['minNotional'] ?? 0))
    }
  }
  return { minQty, stepSize, minNotional }
}

export type ExitTrigger = 'stop_loss' | 'take_profit'

/** Gatilho de saída para posição comprada (LONG Spot). */
export function exitTriggerForPrice(
  position: { stopLoss: number; takeProfit1: number },
  price: number,
): ExitTrigger | null {
  if (!Number.isFinite(price) || price <= 0) return null
  if (position.stopLoss > 0 && price <= position.stopLoss) return 'stop_loss'
  if (position.takeProfit1 > 0 && price >= position.takeProfit1) return 'take_profit'
  return null
}

export function baseAssetForSpotSymbol(symbol: string): string {
  return symbol.endsWith('USDT') ? symbol.slice(0, -4) : symbol
}

// ─── Exchange info (público, Testnet) ────────────────────────────────────────

const exchangeInfoCache = new Map<string, { expires: number; value: ExchangeSymbolFilters }>()

async function getExchangeFilters(symbol: string): Promise<ExchangeSymbolFilters> {
  const hit = exchangeInfoCache.get(symbol)
  if (hit && hit.expires > Date.now()) return hit.value
  const res = await fetch(`${TESTNET_PUBLIC_BASE}/v3/exchangeInfo?symbol=${symbol}`, {
    signal: AbortSignal.timeout(10_000),
  })
  const body = (await res.json().catch(() => ({}))) as unknown
  if (!res.ok) {
    const msg = (body as { msg?: string })?.msg ?? `Binance Testnet respondeu ${res.status}`
    throw new ApiError(msg, res.status)
  }
  const filters = parseExchangeFilters(body)
  if (filters.minNotional <= 0 && filters.stepSize <= 0) {
    throw new ApiError(`Símbolo ${symbol} indisponível no Binance Spot Testnet.`, 409)
  }
  exchangeInfoCache.set(symbol, { expires: Date.now() + EXCHANGE_INFO_TTL_MS, value: filters })
  return filters
}

/** Preço atual no Testnet (público) — usado apenas para gatilhos de saída. */
async function getTestnetPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`${TESTNET_PUBLIC_BASE}/v3/ticker/price?symbol=${symbol}`, {
      signal: AbortSignal.timeout(10_000),
    })
    const body = (await res.json().catch(() => ({}))) as { price?: string }
    if (!res.ok) return null
    const price = Number(body.price)
    return Number.isFinite(price) && price > 0 ? price : null
  } catch {
    return null
  }
}

function assertDemoTestnetEnvironment(): void {
  if (getBinanceEnvironment() !== binanceEnvironmentForMode('DEMO')) {
    throw new ApiError('DEMO exige Binance Spot Testnet.', 409)
  }
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

// ─── Entrada genérica por sinal ──────────────────────────────────────────────

export interface DemoSignalEntryInput {
  signal: BackendSignal
  idempotencyKey: string
  reason: string
}

export async function executeDemoSignalEntry(
  supabase: Client,
  userId: string,
  input: DemoSignalEntryInput,
) {
  assertDemoTestnetEnvironment()
  const idempotencyKey = input.idempotencyKey.trim()
  if (!idempotencyKey) throw new ApiError('Idempotency key é obrigatória.', 400)

  const symbol = toBinanceSymbol(input.signal.pair)
  const side: RealOrderSide = input.signal.side

  // Idempotência: mesma chave → replay ou rejeição, nunca ordem duplicada.
  const { data: existingIntent, error: existingIntentError } = await supabase
    .from('bot4x_execution_intents')
    .select('status, readings, mode, pair, side')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existingIntentError) throw new ApiError(existingIntentError.message, 500)
  if (existingIntent) {
    if (existingIntent.mode !== 'DEMO' || existingIntent.pair !== symbol || existingIntent.side !== side) {
      throw new ApiError('Esta idempotency key já está vinculada a outra ordem.', 409)
    }
    if (existingIntent.status === 'submitted' || existingIntent.status === 'completed') {
      const readings = jsonRecord(existingIntent.readings)
      return {
        submitted: true,
        replay: true,
        environment: getBinanceEnvironment(),
        symbol,
        side,
        orderId: typeof readings.orderId === 'number' ? readings.orderId : null,
        status: typeof readings.status === 'string' ? readings.status : null,
      }
    }
    if (existingIntent.status === 'pending') throw new ApiError('Esta ordem já está em processamento.', 409)
    throw new ApiError('Esta idempotency key já foi utilizada por uma ordem com falha.', 409)
  }

  const config = await getOrCreateConfig(supabase, userId)
  const exchange = await getExchangeStatus(supabase, userId)
  if (!exchange.verified) throw new ApiError('Binance Testnet não conectada ou não verificada.', 409)
  const account = await getVerifiedBinanceAccount(supabase, userId)
  if (!account.canTrade) throw new ApiError('A conta Binance não possui permissão de trade.', 409)

  const filters = await getExchangeFilters(symbol)
  const usdt = account.balances.find((item) => item.asset === 'USDT')
  const freeUsdt = usdt?.free ?? 0

  let quoteOrderQty: number | undefined
  let quantity: number | undefined
  let notionalEstimate: number

  if (side === 'BUY') {
    quoteOrderQty = computeDemoEntryQuoteQty({
      totalCapital: config.totalCapital,
      allocationPct: config.allocationPct,
      freeUsdt,
    })
    notionalEstimate = quoteOrderQty
    const risk = validateDemoOrderRisk({
      executionMode: config.executionMode as 'DEMO' | 'REAL',
      exchange: config.exchange,
      credentialsVerified: exchange.verified,
      canTrade: account.canTrade,
      circuitBreaker: config.circuitBreaker as 'none' | 'emergency' | 'profitLock',
      symbol,
      side,
      quoteOrderQty,
      freeUsdt,
      configuredCapital: config.totalCapital,
      allocationPct: config.allocationPct,
      confirmed: true,
    })
    if (!risk.ok) throw new ApiError(risk.reason, 409)
  } else {
    // Spot não tem short: SELL só executa com saldo real do ativo.
    const baseAsset = baseAssetForSpotSymbol(symbol)
    const baseBalance = account.balances.find((item) => item.asset === baseAsset)
    const baseFree = baseBalance?.free ?? 0
    const price = input.signal.entryPrice
    const slotQuote = computeDemoEntryQuoteQty({
      totalCapital: config.totalCapital,
      allocationPct: config.allocationPct,
      freeUsdt: Number.MAX_SAFE_INTEGER,
    })
    const targetQty = price > 0 ? slotQuote / price : 0
    quantity = floorToStep(Math.min(baseFree, targetQty), filters.stepSize)
    notionalEstimate = quantity * price
    if (quantity <= 0 || notionalEstimate < filters.minNotional) {
      throw new ApiError(`Sem saldo suficiente de ${baseAsset} para vender no Spot (mínimo da exchange não atingido).`, 409)
    }
    if (config.executionMode !== 'DEMO') throw new ApiError('Modo DEMO não está ativo.', 409)
    if (config.circuitBreaker !== 'none') throw new ApiError('Circuit breaker impede novas ordens.', 409)
  }

  if (notionalEstimate < filters.minNotional) {
    throw new ApiError(`Valor abaixo do mínimo da exchange (USDT ${filters.minNotional}).`, 409)
  }

  const { data: intent, error: intentError } = await supabase
    .from('bot4x_execution_intents')
    .insert({
      user_id: userId,
      idempotency_key: idempotencyKey,
      mode: 'DEMO',
      pair: symbol,
      side,
      quote_amount: Number(notionalEstimate.toFixed(2)),
      reason: input.reason,
      readings: {
        environment: getBinanceEnvironment(),
        confirmed: true,
        profile: config.profile,
        leverage: config.leverage,
        signal: {
          entryPrice: input.signal.entryPrice,
          stopLoss: input.signal.stopLoss,
          takeProfit1: input.signal.takeProfit1,
          takeProfit2: input.signal.takeProfit2,
          score: input.signal.score,
        },
      },
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
    result = await submitVerifiedBinanceMarketOrder(supabase, userId, {
      symbol,
      side,
      quoteOrderQty,
      quantity,
      clientOrderId: intent.id,
    })
  } catch (error) {
    // Submissão ambígua: recupera por clientOrderId antes de marcar falha.
    try {
      const recovered = await getVerifiedBinanceOrderByClientOrderId(supabase, userId, {
        symbol,
        clientOrderId: intent.id,
      })
      const recoveredStatus = typeof recovered.status === 'string' ? recovered.status : null
      if (recoveredStatus) {
        await supabase.from('bot4x_execution_intents').update({
          status:
            recoveredStatus === 'FILLED'
              ? 'completed'
              : recoveredStatus === 'CANCELED' || recoveredStatus === 'REJECTED' || recoveredStatus === 'EXPIRED'
                ? 'failed'
                : 'submitted',
          processed_at: new Date().toISOString(),
          readings: {
            environment: getBinanceEnvironment(),
            clientOrderId: intent.id,
            orderId: typeof recovered.orderId === 'number' ? recovered.orderId : null,
            status: recoveredStatus,
            executedQty: typeof recovered.executedQty === 'string' ? Number(recovered.executedQty) : null,
            cummulativeQuoteQty:
              typeof recovered.cummulativeQuoteQty === 'string' ? Number(recovered.cummulativeQuoteQty) : null,
            recoveredAt: new Date().toISOString(),
          },
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

  const response = {
    submitted: true,
    environment: getBinanceEnvironment(),
    symbol,
    side,
    quoteOrderQty: quoteOrderQty ?? null,
    quantity: quantity ?? null,
    clientOrderId: intent.id,
    profile: config.profile,
    leverage: config.leverage,
    orderId: typeof result.orderId === 'number' ? result.orderId : null,
    status: typeof result.status === 'string' ? result.status : null,
    executedQty: typeof result.executedQty === 'string' ? Number(result.executedQty) : null,
    cummulativeQuoteQty:
      typeof result.cummulativeQuoteQty === 'string' ? Number(result.cummulativeQuoteQty) : null,
  }
  const { error: updateError } = await supabase
    .from('bot4x_execution_intents')
    .update({
      status: 'submitted',
      processed_at: new Date().toISOString(),
      readings: { ...jsonRecord(undefined), ...response, signal: {
        entryPrice: input.signal.entryPrice,
        stopLoss: input.signal.stopLoss,
        takeProfit1: input.signal.takeProfit1,
        takeProfit2: input.signal.takeProfit2,
        score: input.signal.score,
      } },
    })
    .eq('id', intent.id)
  if (updateError) throw new ApiError('Ordem enviada à Binance, mas o ledger não confirmou a persistência. Não tente reenviar com a mesma idempotency key.', 503)
  return response
}

// ─── Saídas SL/TP das posições DEMO abertas ──────────────────────────────────

export interface DemoExitSummary {
  positionsChecked: number
  exitsSubmitted: number
  errors: string[]
}

/**
 * Varre posições DEMO compradas já preenchidas e fecha a mercado quando o
 * preço do Testnet atinge stopLoss ou takeProfit1 do sinal. O PnL realizado
 * é calculado pela reconciliação FIFO existente (getTelemetry), que pareia
 * este SELL com o BUY verificado.
 */
export async function manageDemoOpenPositions(
  supabase: Client,
  userId: string,
): Promise<DemoExitSummary> {
  const summary: DemoExitSummary = { positionsChecked: 0, exitsSubmitted: 0, errors: [] }
  if (getBinanceEnvironment() !== binanceEnvironmentForMode('DEMO')) return summary

  const { data, error } = await supabase
    .from('bot4x_execution_intents')
    .select('id, pair, side, status, readings')
    .eq('user_id', userId)
    .eq('mode', 'DEMO')
    .eq('side', 'BUY')
    .eq('status', 'completed')
    .order('created_at', { ascending: true })
    .limit(50)
  if (error) throw new ApiError(error.message, 500)

  for (const row of data ?? []) {
    const readings = jsonRecord(row.readings)
    if (readings.exitIntentId) continue
    const signal = jsonRecord(readings.signal)
    const stopLoss = Number(signal.stopLoss ?? 0)
    const takeProfit1 = Number(signal.takeProfit1 ?? 0)
    if (stopLoss <= 0 && takeProfit1 <= 0) continue

    summary.positionsChecked += 1
    try {
      const price = await getTestnetPrice(row.pair)
      if (price === null) continue
      const trigger = exitTriggerForPrice({ stopLoss, takeProfit1 }, price)
      if (!trigger) continue

      const filters = await getExchangeFilters(row.pair)
      const rawQty = Number(readings.netFillQty ?? readings.executedQty ?? 0)
      const quantity = floorToStep(rawQty, filters.stepSize)
      if (quantity <= 0 || quantity * price < filters.minNotional) {
        summary.errors.push(`${row.pair}: quantidade abaixo do mínimo para saída`)
        continue
      }

      const exitIdempotencyKey = `exit-${row.id}`
      const { data: exitIntent, error: exitIntentError } = await supabase
        .from('bot4x_execution_intents')
        .insert({
          user_id: userId,
          idempotency_key: exitIdempotencyKey,
          mode: 'DEMO',
          pair: row.pair,
          side: 'SELL',
          quote_amount: Number((quantity * price).toFixed(2)),
          reason: 'auto-demo-exit',
          readings: {
            environment: getBinanceEnvironment(),
            exitFor: row.id,
            trigger,
            triggerPrice: price,
          },
          status: 'pending',
          confirmed_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (exitIntentError || !exitIntent) {
        if (exitIntentError?.code === '23505') continue // saída já registrada
        throw new ApiError(exitIntentError?.message ?? 'Falha ao registrar saída.', 500)
      }

      const result = await submitVerifiedBinanceMarketOrder(supabase, userId, {
        symbol: row.pair,
        side: 'SELL',
        quantity,
        clientOrderId: exitIntent.id,
      })
      await supabase.from('bot4x_execution_intents').update({
        status: 'submitted',
        processed_at: new Date().toISOString(),
        readings: {
          environment: getBinanceEnvironment(),
          exitFor: row.id,
          trigger,
          triggerPrice: price,
          clientOrderId: exitIntent.id,
          orderId: typeof result.orderId === 'number' ? result.orderId : null,
          status: typeof result.status === 'string' ? result.status : null,
          executedQty: typeof result.executedQty === 'string' ? Number(result.executedQty) : null,
          cummulativeQuoteQty:
            typeof result.cummulativeQuoteQty === 'string' ? Number(result.cummulativeQuoteQty) : null,
        },
      }).eq('id', exitIntent.id)
      await supabase.from('bot4x_execution_intents').update({
        readings: { ...readings, exitIntentId: exitIntent.id, exitTrigger: trigger, exitPrice: price },
      }).eq('id', row.id)
      summary.exitsSubmitted += 1
    } catch (exitError) {
      summary.errors.push(
        `${row.pair}: ${exitError instanceof Error ? exitError.message : 'falha desconhecida na saída'}`,
      )
    }
  }

  return summary
}

export { MAX_OPEN_SLOTS as DEMO_MAX_OPEN_SLOTS }
