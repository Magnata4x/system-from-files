import { describe, expect, it } from 'vitest'
import { validateIntentCandidate, type IntentAccountState, type IntentCandidate } from '../execution-intent'

const candidate: IntentCandidate = {
  pair: 'BTC/USDT', side: 'BUY', quoteAmount: 6, score: 95,
  manipulationRisk: 'low', signalStatus: 'active',
}
const account: IntentAccountState = {
  executionMode: 'REAL', verified: true, availableUsdt: 7, dailyPnlPct: 0,
  circuitBreaker: 'none', profile: 'conservador', totalTradesToday: 0,
  maxTradesToday: 10, preferredPairs: ['BTC/USDT'], avoidPairs: [],
}

describe('validateIntentCandidate', () => {
  it('aprova um candidato REAL válido', () => {
    expect(validateIntentCandidate(candidate, account)).toBeNull()
  })

  it.each([
    [{ executionMode: 'DEMO' }, 'modo REAL'],
    [{ verified: false }, 'verificada'],
    [{ availableUsdt: 5 }, 'Saldo USDT'],
    [{ circuitBreaker: 'emergency' }, 'Circuit breaker'],
    [{ totalTradesToday: 10 }, 'Limite diário'],
  ])('bloqueia quando a conta falha uma validação crítica', (patch, message) => {
    expect(validateIntentCandidate(candidate, { ...account, ...patch })).toContain(message)
  })

  it('bloqueia manipulação alta e score insuficiente', () => {
    expect(validateIntentCandidate({ ...candidate, manipulationRisk: 'high' }, account)).toContain('manipulação')
    expect(validateIntentCandidate({ ...candidate, score: 80 }, account)).toContain('Score')
  })
})