import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./api-auth.server', () => ({
  ApiError: class ApiError extends Error {
    status: number
    code?: number
    constructor(message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

vi.mock('./exchange.server', () => ({
  getBinanceEnvironment: vi.fn(() => 'production'),
  getExchangeStatus: vi.fn(),
  getVerifiedBinanceAccount: vi.fn(),
  getVerifiedBinanceOrderByClientOrderId: vi.fn(),
  submitVerifiedBinanceMarketOrder: vi.fn(),
}))

vi.mock('./bot4x.server', () => ({
  getOrCreateConfig: vi.fn(),
}))

vi.mock('./order-risk', () => ({
  validateDemoOrderRisk: vi.fn(),
  validateRealOrderRisk: vi.fn(),
}))

import { executeAuthorizedSixDollarBtcOrder } from './order.server'

describe('S0 — gate REAL no executor', () => {
  it('rejeita antes de qualquer chamada ao Supabase ou à exchange', async () => {
    const from = vi.fn()
    const supabase = { from } as never

    await expect(
      executeAuthorizedSixDollarBtcOrder(supabase, 'user-1', {
        side: 'BUY',
        confirmed: true,
        idempotencyKey: 's0-gate-test',
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Execução REAL não autorizada pelo gate operacional.',
    })

    expect(from).not.toHaveBeenCalled()
  })

  it('não mantém o gate dentro de comentário com literal \\n', () => {
    const source = readFileSync('src/lib/server/order.server.ts', 'utf8')
    const commentedLiteralNewline = source
      .split('\n')
      .filter((line) => /^\s*\/\//.test(line) && line.includes('\\n'))

    expect(commentedLiteralNewline).toEqual([])
  })
})
