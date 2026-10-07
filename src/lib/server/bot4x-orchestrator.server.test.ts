import { afterEach, describe, expect, it } from 'vitest'
import { automaticExecutionRoute, demoAutoExecutionEnabled, demoIdempotencyKey } from './bot4x-orchestrator.server'
import type { BackendSignal } from './engine.server'

describe('Fase 46 — execução DEMO pelo Orchestrator', () => {
  afterEach(() => {
    delete process.env.BOT4X_DEMO_AUTO_EXECUTION
  })

  it('mantém a autoexecução DEMO desligada por padrão', () => {
    expect(demoAutoExecutionEnabled()).toBe(false)
  })

  it('só habilita a autoexecução com true explícito', () => {
    process.env.BOT4X_DEMO_AUTO_EXECUTION = 'true'
    expect(demoAutoExecutionEnabled()).toBe(true)
    process.env.BOT4X_DEMO_AUTO_EXECUTION = 'TRUE'
    expect(demoAutoExecutionEnabled()).toBe(true)
    process.env.BOT4X_DEMO_AUTO_EXECUTION = '1'
    expect(demoAutoExecutionEnabled()).toBe(false)
  })

  it('encaminha DEMO BTCUSDT ao executor TESTNET quando a flag está explicitamente ativa', () => {
    process.env.BOT4X_DEMO_AUTO_EXECUTION = 'true'
    expect(automaticExecutionRoute('DEMO', 'BTC/USDT')).toBe('DEMO_TESTNET')
  })

  it('nunca encaminha REAL ao executor, mesmo com autoexecução DEMO ativa', () => {
    process.env.BOT4X_DEMO_AUTO_EXECUTION = 'true'
    expect(automaticExecutionRoute('REAL', 'BTC/USDT')).toBe('REAL_BLOCKED')
  })

  it('não encaminha pares diferentes de BTCUSDT ao executor DEMO', () => {
    process.env.BOT4X_DEMO_AUTO_EXECUTION = 'true'
    expect(automaticExecutionRoute('DEMO', 'ETH/USDT')).toBe('NONE')
  })

  it('gera a mesma idempotency key para o mesmo sinal', () => {
    const signal = {
      pair: 'BTC/USDT', side: 'BUY', score: 92, aiScore: 94,
      entryPrice: 100000, stopLoss: 99500, takeProfit1: 101000,
      takeProfit2: 102000, createdAt: '2026-10-07T03:00:00.000Z',
    } as unknown as BackendSignal
    expect(demoIdempotencyKey(signal)).toBe(demoIdempotencyKey(signal))
  })

  it('diferencia sinais operacionais distintos', () => {
    const base = {
      pair: 'BTC/USDT', side: 'BUY', score: 92, aiScore: 94,
      entryPrice: 100000, stopLoss: 99500, takeProfit1: 101000,
      takeProfit2: 102000, createdAt: '2026-10-07T03:00:00.000Z',
    } as unknown as BackendSignal
    const changed = { ...base, entryPrice: 100100 }
    expect(demoIdempotencyKey(base)).not.toBe(demoIdempotencyKey(changed))
  })
})
