import { describe, expect, it } from 'vitest'
import { exportExecutionsCsv } from './bot4x.server'

function createFakeSupabase(rows: unknown[], calls: string[]) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    gte: () => builder,
    lte: () => builder,
    order: () => builder,
    limit: async () => ({ data: rows, error: null }),
  }

  return {
    from: (table: string) => {
      calls.push(table)
      return builder
    },
  }
}

describe('Fase 52 — exportação do histórico verificado', () => {
  it('usa o ledger verificado por padrão e preserva campos financeiros indisponíveis', async () => {
    const calls: string[] = []
    const csv = await exportExecutionsCsv(
      createFakeSupabase(
        [{
          id: 'intent-1',
          pair: 'BTCUSDT',
          side: 'BUY',
          status: 'pending',
          created_at: '2026-10-07T04:00:00.000Z',
          readings: { lifecycle: 'pending' },
        }],
        calls,
      ) as never,
      'user-1',
    )

    expect(calls).toEqual(['bot4x_execution_intents'])
    expect(csv).toContain('data,par,lado,perfil,alavancagem,entrada,stop,alvo,resultado,pnl,pnl_pct,motivo')
    expect(csv).toContain('2026-10-07T04:00:00.000Z,BTCUSDT,LONG,,,,,pending,open,,,pending')
    expect(csv).not.toContain(',0,0,')
  })

  it('só consulta bot4x_trades quando source=legacy é explícito', async () => {
    const calls: string[] = []
    await exportExecutionsCsv(
      createFakeSupabase([], calls) as never,
      'user-1',
      { source: 'legacy' },
    )

    expect(calls).toEqual(['bot4x_trades'])
  })
})
