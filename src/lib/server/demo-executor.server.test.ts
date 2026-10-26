import { describe, expect, it } from 'vitest'
import {
  baseAssetForSpotSymbol,
  computeDemoEntryQuoteQty,
  exitTriggerForPrice,
  floorToStep,
  parseExchangeFilters,
} from './demo-executor.server'

describe('executor DEMO genérico — sizing de entrada', () => {
  it('capital abaixo de US$ 100 usa todo o capital em uma operação', () => {
    expect(computeDemoEntryQuoteQty({ totalCapital: 50, allocationPct: 30, freeUsdt: 1000 })).toBe(50)
  })

  it('capital >= US$ 100 usa Allocation % dividido em 10 slots', () => {
    expect(computeDemoEntryQuoteQty({ totalCapital: 1000, allocationPct: 30, freeUsdt: 1000 })).toBe(30)
  })

  it('nunca excede o USDT livre da conta', () => {
    expect(computeDemoEntryQuoteQty({ totalCapital: 1000, allocationPct: 30, freeUsdt: 12 })).toBe(12)
  })

  it('sem saldo retorna zero', () => {
    expect(computeDemoEntryQuoteQty({ totalCapital: 1000, allocationPct: 30, freeUsdt: 0 })).toBe(0)
  })
})

describe('executor DEMO genérico — filtros da exchange', () => {
  it('extrai LOT_SIZE e NOTIONAL do exchangeInfo', () => {
    const exchangeInfo = {
      symbols: [
        {
          symbol: 'BTCUSDT',
          filters: [
            { filterType: 'PRICE_FILTER', minPrice: '0.01', tickSize: '0.01' },
            { filterType: 'LOT_SIZE', minQty: '0.00001', maxQty: '9000', stepSize: '0.00001' },
            { filterType: 'NOTIONAL', minNotional: '5', applyToMarket: true },
          ],
        },
      ],
    }
    expect(parseExchangeFilters(exchangeInfo)).toEqual({ minQty: 0.00001, stepSize: 0.00001, minNotional: 5 })
  })

  it('suporta o filtro legado MIN_NOTIONAL', () => {
    const exchangeInfo = {
      symbols: [{ filters: [{ filterType: 'MIN_NOTIONAL', minNotional: '10' }] }],
    }
    expect(parseExchangeFilters(exchangeInfo).minNotional).toBe(10)
  })

  it('arredonda quantidade para baixo no stepSize', () => {
    expect(floorToStep(0.123456, 0.001)).toBe(0.123)
    expect(floorToStep(0.000999, 0.001)).toBe(0)
    expect(floorToStep(1.5, 0.5)).toBe(1.5)
  })
})

describe('executor DEMO genérico — gatilhos de saída SL/TP', () => {
  const position = { stopLoss: 100, takeProfit1: 110 }

  it('dispara stop_loss quando o preço cai até o stop', () => {
    expect(exitTriggerForPrice(position, 99.5)).toBe('stop_loss')
    expect(exitTriggerForPrice(position, 100)).toBe('stop_loss')
  })

  it('dispara take_profit quando o preço sobe até o alvo', () => {
    expect(exitTriggerForPrice(position, 110)).toBe('take_profit')
    expect(exitTriggerForPrice(position, 115)).toBe('take_profit')
  })

  it('não dispara dentro da faixa', () => {
    expect(exitTriggerForPrice(position, 105)).toBeNull()
  })

  it('ignora preço inválido', () => {
    expect(exitTriggerForPrice(position, 0)).toBeNull()
    expect(exitTriggerForPrice(position, Number.NaN)).toBeNull()
  })
})

describe('executor DEMO genérico — ativo base Spot', () => {
  it('deriva o ativo base de símbolos USDT', () => {
    expect(baseAssetForSpotSymbol('BTCUSDT')).toBe('BTC')
    expect(baseAssetForSpotSymbol('SOLUSDT')).toBe('SOL')
  })
})
