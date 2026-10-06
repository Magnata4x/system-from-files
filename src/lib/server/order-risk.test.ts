import { describe, expect, it } from "vitest";
import { validateRealOrderRisk } from "./order-risk";

const base = {
  executionMode: "REAL" as const,
  exchange: "binance",
  credentialsVerified: true,
  canTrade: true,
  circuitBreaker: "none" as const,
  symbol: "BTCUSDT",
  side: "BUY" as const,
  quoteOrderQty: 6,
  freeUsdt: 100,
  configuredCapital: 1000,
  allocationPct: 30,
  confirmed: true,
};

describe("REAL order risk gates", () => {
  it("allows a validated intent without submitting anything", () => {
    expect(validateRealOrderRisk(base)).toEqual({
      ok: true,
      maxQuoteOrderQty: 100,
    });
  });

  it("rejects REAL without verified credentials", () => {
    expect(validateRealOrderRisk({ ...base, credentialsVerified: false })).toEqual({
      ok: false,
      reason: "Credencial Binance não verificada.",
    });
  });

  it("rejects accounts without trade permission", () => {
    expect(validateRealOrderRisk({ ...base, canTrade: false })).toEqual({
      ok: false,
      reason: "A conta Binance não possui permissão de trade.",
    });
  });

  it("rejects every circuit-breaker state", () => {
    expect(validateRealOrderRisk({ ...base, circuitBreaker: "emergency" })).toEqual({
      ok: false,
      reason: "Circuit breaker impede novas ordens.",
    });
  });

  it("requires explicit confirmation", () => {
    expect(validateRealOrderRisk({ ...base, confirmed: false })).toEqual({
      ok: false,
      reason: "Confirmação explícita da ordem REAL é obrigatória.",
    });
  });

  it("never permits more than the real free USDT balance", () => {
    expect(validateRealOrderRisk({ ...base, quoteOrderQty: 101, freeUsdt: 100 })).toEqual({
      ok: false,
      reason: "Valor excede o limite seguro de USDT 100.00.",
    });
  });

  it("uses 100% of configured capital below US$100", () => {
    const result = validateRealOrderRisk({
      ...base,
      configuredCapital: 50,
      allocationPct: 30,
      quoteOrderQty: 51,
      freeUsdt: 100,
    });
    expect(result).toEqual({
      ok: false,
      reason: "Valor excede o limite seguro de USDT 50.00.",
    });
  });
});
