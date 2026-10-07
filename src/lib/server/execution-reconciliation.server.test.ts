import { describe, expect, it } from 'vitest'
import { mapBinanceOrderStatus } from './execution-reconciliation.server'

describe('Fase 47 — reconciliação de execução', () => {
  it.each([
    ['FILLED', 'completed'],
    ['CANCELED', 'failed'],
    ['REJECTED', 'failed'],
    ['EXPIRED', 'failed'],
    ['EXPIRED_IN_MATCH', 'failed'],
    ['NEW', 'submitted'],
    ['PARTIALLY_FILLED', 'submitted'],
    ['PENDING_CANCEL', 'submitted'],
    [null, 'pending'],
    ['UNKNOWN', 'pending'],
  ] as const)('mapeia %s para %s', (exchangeStatus, expected) => {
    expect(mapBinanceOrderStatus(exchangeStatus)).toBe(expected)
  })
})
