import { describe, expect, it } from 'vitest'
import { assertOperationalSignal, type BackendSignal } from './engine.server'

function signal(overrides: Partial<BackendSignal> = {}): BackendSignal {
  return {
    id: 'btc-usdt-1700000000',
    pair: 'BTC/USDT',
    side: 'BUY',
    score: 72,
    aiScore: 76,
    entryPrice: 100,
    stopLoss: 98,
    takeProfit1: 104,
    takeProfit2: 107,
    status: 'active',
    tf: '4H',
    exchange: 'binance',
    createdAt: new Date(1_700_000_000_000).toISOString(),
    rsi: 58,
    regime: 'BULLISH',
    type: 'trend-following',
    setup: 'Tendência de alta',
    confluences: ['Tendência de mercado confirmada'],
    ...overrides,
  }
}

describe('Signal — contrato operacional real', () => {
  it('aceita sinal completo derivado do Engine', () => {
    expect(() => assertOperationalSignal(signal())).not.toThrow()
  })

  it('rejeita preço operacional inválido', () => {
    expect(() => assertOperationalSignal(signal({ entryPrice: 0 }))).toThrow('preço operacional não positivo')
  })

  it('rejeita score fora do intervalo', () => {
    expect(() => assertOperationalSignal(signal({ score: 101 }))).toThrow('score fora do intervalo permitido')
  })

  it('rejeita timestamp inválido', () => {
    expect(() => assertOperationalSignal(signal({ createdAt: 'invalid' }))).toThrow('timestamp de criação')
  })

  it('rejeita níveis incompatíveis com BUY', () => {
    expect(() => assertOperationalSignal(signal({ stopLoss: 102 }))).toThrow('níveis operacionais incompatíveis')
  })

  it('rejeita exchange diferente da Binance', () => {
    expect(() => assertOperationalSignal(signal({ exchange: 'other' }))).toThrow('exchange operacional')
  })
})
