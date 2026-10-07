import { describe, expect, it } from 'vitest'
import { summarizeVerifiedExecutionTelemetry } from './execution-telemetry.server'

describe('Fase 48 — telemetria do ledger verificado', () => {
  it('usa somente PnL realizado de SELL concluído', () => {
    expect(summarizeVerifiedExecutionTelemetry([
      { status: 'completed', side: 'BUY', realizedPnl: 999, createdAt: '2026-10-07T10:00:00.000Z' },
      { status: 'completed', side: 'SELL', realizedPnl: 12.345, createdAt: '2026-10-07T11:00:00.000Z' },
      { status: 'completed', side: 'SELL', realizedPnl: -3.125, createdAt: '2026-10-07T12:00:00.000Z' },
      { status: 'completed', side: 'SELL', realizedPnl: null, createdAt: '2026-10-07T13:00:00.000Z' },
      { status: 'submitted', side: 'SELL', realizedPnl: 100, createdAt: '2026-10-07T14:00:00.000Z' },
      { status: 'pending', side: 'BUY', realizedPnl: null, createdAt: '2026-10-07T15:00:00.000Z' },
      { status: 'failed', side: 'SELL', realizedPnl: -50, createdAt: '2026-10-07T16:00:00.000Z' },
    ], 'UTC', new Date('2026-10-07T17:00:00.000Z'))).toEqual({
      wins: 1,
      losses: 1,
      pnl: 9.22,
      completed: 4,
      submitted: 1,
      pending: 1,
      failed: 1,
    })
  })

  it('exclui do resumo diário execuções de outro dia no timezone configurado', () => {
    expect(summarizeVerifiedExecutionTelemetry([
      { status: 'completed', side: 'SELL', realizedPnl: 100, createdAt: '2026-10-06T23:30:00.000Z' },
      { status: 'completed', side: 'SELL', realizedPnl: 7.5, createdAt: '2026-10-07T03:30:00.000Z' },
      { status: 'failed', side: 'SELL', realizedPnl: null, createdAt: '2026-10-06T22:00:00.000Z' },
    ], 'America/Sao_Paulo', new Date('2026-10-07T12:00:00.000Z'))).toEqual({
      wins: 1,
      losses: 0,
      pnl: 7.5,
      completed: 1,
      submitted: 0,
      pending: 0,
      failed: 0,
    })
  })
})
