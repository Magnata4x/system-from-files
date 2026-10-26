// Testes negativos do gate de ativação REAL (P1 crítico):
// somente credencial de PRODUÇÃO verificada libera o modo REAL —
// credencial Testnet/Demo verificada ou produção ausente devem falhar.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getExchangeStatusMock = vi.fn()

vi.mock('./exchange.server', () => ({
  getExchangeStatus: (...args: unknown[]) => getExchangeStatusMock(...args),
  getVerifiedBinanceOrder: vi.fn(),
  getVerifiedBinanceOrderByClientOrderId: vi.fn(),
  getVerifiedBinanceTrades: vi.fn(),
}))

vi.mock('./supabase-admin.server', () => ({
  getSupabaseAdmin: vi.fn(),
}))

import { updateConfig } from './bot4x.server'

const CONFIG_ROW = {
  user_id: 'user-1',
  active: false,
  execution_mode: 'DEMO',
  profile: 'conservador',
  daily_pnl: 0,
  open_slots: 0,
  circuit_breaker: 'none',
  rsi_threshold_low: 35,
  rsi_threshold_high: 65,
  ai_score_min: 85,
  fomo_limit: 15,
  leverage: 5,
  active_capital: 0,
  total_capital: 1000,
  allocation_pct: 30,
  sl_pct: 0.5,
  tp_pct: 1,
  exchange: 'binance',
  api_key_set: true,
  total_trades_today: 0,
  preferred_pairs: [],
  avoid_pairs: [],
  updated_at: '2026-10-26T00:00:00.000Z',
}

function makeSupabase() {
  const updateChain = {
    eq: vi.fn(() => ({
      select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { ...CONFIG_ROW, execution_mode: 'REAL' }, error: null })) })),
    })),
  }
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: CONFIG_ROW, error: null })) })),
      })),
      update: vi.fn(() => updateChain),
    })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

const verifiedStatus = (environment: string) => ({
  connected: true,
  exchange: 'binance',
  environment,
  keyPreview: 'abcd••••wxyz',
  verified: true,
  verifiedAt: '2026-10-26T00:00:00.000Z',
  lastError: null,
})

const unverifiedStatus = (environment: string) => ({
  connected: false,
  exchange: 'binance',
  environment,
  keyPreview: '',
  verified: false,
  verifiedAt: null,
  lastError: null,
})

describe('gate de ativação REAL — somente credencial de produção', () => {
  beforeEach(() => {
    getExchangeStatusMock.mockReset()
  })

  it('consulta explicitamente o ambiente production ao ativar REAL', async () => {
    getExchangeStatusMock.mockResolvedValue(verifiedStatus('production'))
    const supabase = makeSupabase()
    await updateConfig(supabase, 'user-1', { executionMode: 'REAL' })
    expect(getExchangeStatusMock).toHaveBeenCalledWith(supabase, 'user-1', 'production')
  })

  it('rejeita REAL quando só existe credencial Testnet verificada', async () => {
    // Com BINANCE_TRADING_ENV=testnet, a consulta sem filtro retornaria a
    // credencial testnet verificada; com o filtro production, vem não verificada.
    getExchangeStatusMock.mockResolvedValue(unverifiedStatus('production'))
    await expect(updateConfig(makeSupabase(), 'user-1', { executionMode: 'REAL' })).rejects.toThrow(
      'Modo REAL exige credencial Binance de produção verificada.',
    )
  })

  it('rejeita REAL quando a credencial de produção não está verificada', async () => {
    getExchangeStatusMock.mockResolvedValue({ ...verifiedStatus('production'), verified: false })
    await expect(updateConfig(makeSupabase(), 'user-1', { executionMode: 'REAL' })).rejects.toThrow(
      'Modo REAL exige credencial Binance de produção verificada.',
    )
  })

  it('não consulta credenciais para patch DEMO', async () => {
    const supabase = makeSupabase()
    await updateConfig(supabase, 'user-1', { executionMode: 'DEMO' })
    expect(getExchangeStatusMock).not.toHaveBeenCalled()
  })
})
