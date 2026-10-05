export const BOT4X_CIRCUIT_BREAKER_PNL_PCT = -1.5;

export function isBot4xCircuitBreakerTriggered(pnlPct: number): boolean {
  return pnlPct <= BOT4X_CIRCUIT_BREAKER_PNL_PCT;
}
