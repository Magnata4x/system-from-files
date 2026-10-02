export interface IntentCandidate {
  pair: string
  side: 'BUY' | 'SELL'
  quoteAmount: number
  score: number
  manipulationRisk: 'low' | 'medium' | 'high'
  signalStatus: 'active' | 'new' | 'premium' | 'expiring' | 'expired' | 'invalidated'
}

export interface IntentAccountState {
  executionMode: string
  verified: boolean
  availableUsdt: number
  dailyPnlPct: number
  circuitBreaker: string
  profile: string
  totalTradesToday: number
  maxTradesToday: number
  preferredPairs: string[]
  avoidPairs: string[]
}

export function validateIntentCandidate(candidate: IntentCandidate, state: IntentAccountState) {
  if (state.executionMode !== 'REAL') return 'Ative o modo REAL antes de criar uma intenção.'
  if (!state.verified) return 'A conexão com a Binance precisa estar verificada.'
  if (!Number.isFinite(candidate.quoteAmount) || candidate.quoteAmount <= 0) return 'Valor da operação inválido.'
  if (candidate.quoteAmount > state.availableUsdt) return 'Saldo USDT disponível insuficiente.'
  if (state.dailyPnlPct <= -1.5 || state.circuitBreaker !== 'none') return 'Circuit breaker ativo.'
  if (state.totalTradesToday >= state.maxTradesToday) return 'Limite diário de operações atingido.'
  if (state.avoidPairs.includes(candidate.pair)) return 'Par bloqueado na configuração.'
  if (state.preferredPairs.length > 0 && !state.preferredPairs.includes(candidate.pair)) {
    return 'Par fora da lista permitida.'
  }
  if (candidate.signalStatus === 'expired' || candidate.signalStatus === 'invalidated') return 'Sinal indisponível.'
  if (candidate.manipulationRisk === 'high') return 'Risco de manipulação alto.'
  const threshold = state.profile === 'conservador' ? 88 : state.profile === 'agressivo' ? 75 : 82
  const effectiveScore = candidate.score - (candidate.manipulationRisk === 'medium' ? 8 : 0)
  if (effectiveScore < threshold) return 'Score abaixo do mínimo do perfil.'
  return null
}