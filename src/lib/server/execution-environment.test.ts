import { describe, expect, it } from 'vitest'
import {
  binanceEnvironmentForMode,
  createExecutionContext,
  assertExecutionContext,
  isRealExecutionAuthorized,
} from './execution-environment'

describe('Fase 45 — ambiente DEMO/REAL', () => {
  it('mapeia DEMO exclusivamente para Binance Spot Testnet', () => {
    expect(binanceEnvironmentForMode('DEMO')).toBe('testnet')
    expect(createExecutionContext('DEMO')).toEqual({ mode: 'DEMO', environment: 'TEST' })
  })

  it('mapeia REAL para production sem conceder autorização', () => {
    expect(binanceEnvironmentForMode('REAL')).toBe('production')
    expect(createExecutionContext('REAL')).toEqual({ mode: 'REAL', environment: 'PRODUCTION' })
    expect(isRealExecutionAuthorized(createExecutionContext('REAL'))).toBe(false)
  })

  it('rejeita contexto incompatível com o modo', () => {
    expect(() => assertExecutionContext({ mode: 'DEMO', environment: 'PRODUCTION' })).toThrow(
      'Ambiente de execução incompatível com o modo DEMO',
    )
  })
})
