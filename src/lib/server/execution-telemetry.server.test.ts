import { describe, expect, it } from 'vitest'
import { summarizeVerifiedExecutionTelemetry } from './execution-telemetry.server'

describe('Fase 48 — telemetria do ledger verificado', () => {
  it('usa somente PnL realizado de SELL concluído', () => {
    expect(summarizeVerifiedExecutionTelemetry([
      { status: 'completed', side: 'BUY', realizedPnl: 999 },
      { status: 'completed', side: 'SELL', realizedPnl: 12.345 },
      { status: 'completed', side: 'SELL', realizedPnl: -3.125 },
      { status: 'completed', side: 'SELL', realizedPnl: null },
      { status: 'submitted', side: 'SELL', realizedPnl: 100 },
      { status: 'pending', side: 'BUY', realizedPnl: null },
      { status: 'failed', side: 'SELL', realizedPnl: -50 },
    ])).toEqual({ wins: 1, losses: 1, pnl: 9.22, completed: 4, submitted: 1, pending: 1, failed: 1 })
  })
})
