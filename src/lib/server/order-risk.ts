export type RealOrderSide = "BUY" | "SELL";

export interface RealOrderRiskInput {
  executionMode: "DEMO" | "REAL";
  exchange: string;
  credentialsVerified: boolean;
  canTrade: boolean;
  circuitBreaker: "none" | "emergency" | "profitLock";
  symbol: string;
  side: RealOrderSide;
  quoteOrderQty: number;
  freeUsdt: number;
  configuredCapital: number;
  allocationPct: number;
  confirmed: boolean;
}

export type RealOrderRiskResult =
  | { ok: true; maxQuoteOrderQty: number }
  | { ok: false; reason: string };

const SYMBOL = /^[A-Z0-9]{2,20}USDT$/;

export function validateRealOrderRisk(input: RealOrderRiskInput): RealOrderRiskResult {
  if (input.executionMode !== "REAL") return { ok: false, reason: "Modo REAL não está ativo." };
  if (input.exchange !== "binance") return { ok: false, reason: "Somente Binance é suportada." };
  if (!input.credentialsVerified) return { ok: false, reason: "Credencial Binance não verificada." };
  if (!input.canTrade) return { ok: false, reason: "A conta Binance não possui permissão de trade." };
  if (input.circuitBreaker !== "none") return { ok: false, reason: "Circuit breaker impede novas ordens." };
  if (!input.confirmed) return { ok: false, reason: "Confirmação explícita da ordem REAL é obrigatória." };
  if (!SYMBOL.test(input.symbol)) return { ok: false, reason: "Símbolo inválido para ordem spot USDT." };
  if (!Number.isFinite(input.quoteOrderQty) || input.quoteOrderQty <= 0) {
    return { ok: false, reason: "Valor da ordem deve ser maior que zero." };
  }
  if (!Number.isFinite(input.freeUsdt) || input.freeUsdt <= 0) {
    return { ok: false, reason: "Saldo USDT disponível indisponível." };
  }

  const configuredCapital =
    input.configuredCapital < 100
      ? Math.max(0, input.configuredCapital)
      : Math.max(0, input.configuredCapital * (input.allocationPct / 100));
  const maxQuoteOrderQty = Math.min(input.freeUsdt, configuredCapital);

  if (maxQuoteOrderQty <= 0) return { ok: false, reason: "Capital configurado não permite uma ordem." };
  if (input.quoteOrderQty > maxQuoteOrderQty) {
    return { ok: false, reason: `Valor excede o limite seguro de USDT ${maxQuoteOrderQty.toFixed(2)}.` };
  }

  return { ok: true, maxQuoteOrderQty };
}
