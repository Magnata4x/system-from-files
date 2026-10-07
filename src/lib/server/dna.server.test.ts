import { describe, expect, it } from 'vitest'
import { verifiedTradeRows } from './dna.server'

describe('Fase 54 — DNA financeiro verificado', () => {
  it('ignora execuções não concluídas e PnL ausente', () => {
    const rows = verifiedTradeRows([
      { created_at: '2026-10-07T10:00:00Z', pair: 'BTCUSDT', status: 'submitted', readings: { realizedPnl: 10 } },
      { created_at: '2026-10-07T11:00:00Z', pair: 'BTCUSDT', status: 'completed', readings: {} },
      { created_at: '2026-10-07T12:00:00Z', pair: 'BTCUSDT', status: 'completed', readings: { realizedPnl: 12, realizedPnlPct: 1.2 } },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].pnl).toBe(12)
    expect(rows[0].pnl_pct).toBe(1.2)
  })

  it('não usa bot4x_trades como fonte financeira', () => {
    const rows = verifiedTradeRows([
      { created_at: '2026-10-07T12:00:00Z', pair: 'BTCUSDT', status: 'completed', readings: { realizedPnl: -3 } },
    ])
    expect(rows[0].result).toBe('loss')
  })
})
