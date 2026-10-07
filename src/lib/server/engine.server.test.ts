import { describe, expect, it } from 'vitest'
import { assertSignalMarketData, MIN_SIGNAL_CANDLES } from './engine.server'
import type { Kline } from './market.server'

function candle(overrides: Partial<Kline> = {}): Kline {
  return {
    openTime: 1_700_000_000_000,
    open: 100,
    high: 102,
    low: 99,
    close: 101,
    volume: 1000,
    ...overrides,
  }
}

describe('Engine — dados de mercado reais', () => {
  it('aceita uma série completa de candles reais', () => {
    const candles = Array.from({ length: MIN_SIGNAL_CANDLES }, (_, i) =>
      candle({ openTime: 1_700_000_000_000 + i * 14_400_000 }),
    )

    expect(() => assertSignalMarketData('BTC/USDT', candles)).not.toThrow()
  })

  it('rejeita dados insuficientes em vez de fabricar indicadores', () => {
    const candles = Array.from({ length: MIN_SIGNAL_CANDLES - 1 }, (_, i) =>
      candle({ openTime: 1_700_000_000_000 + i * 14_400_000 }),
    )

    expect(() => assertSignalMarketData('BTC/USDT', candles)).toThrow('Dados de mercado insuficientes')
  })

  it('rejeita preço final inválido', () => {
    const candles = Array.from({ length: MIN_SIGNAL_CANDLES }, (_, i) =>
      candle({ openTime: 1_700_000_000_000 + i * 14_400_000, close: i === MIN_SIGNAL_CANDLES - 1 ? 0 : 101 }),
    )

    expect(() => assertSignalMarketData('BTC/USDT', candles)).toThrow('Dados de mercado inválidos')
  })

  it('rejeita série sem volatilidade observável', () => {
    const candles = Array.from({ length: MIN_SIGNAL_CANDLES }, (_, i) =>
      candle({ openTime: 1_700_000_000_000 + i * 14_400_000, open: 100, high: 100, low: 100, close: 100 }),
    )

    expect(() => assertSignalMarketData('BTC/USDT', candles)).toThrow('Volatilidade de mercado indisponível')
  })
})
