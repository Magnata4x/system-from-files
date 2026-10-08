import { describe, expect, it } from "vitest";
import { mapSignal, mapSignalList, normalizeExchange } from "@/adapters/backend/signal.adapter";

const base = {
  id: "sig-1",
  pair: "BTC/USDT",
  side: "BUY" as const,
  score: 82,
  entryPrice: 100000,
  status: "active" as const,
  exchange: "binance",
  createdAt: "2026-10-08T00:00:00.000Z",
};

describe("signalAdapter — contrato S1", () => {
  it("usa score operacional, não aiScore", () => {
    expect(mapSignal({ ...base, score: 82, aiScore: 99 })).toMatchObject({ confidence: 82 });
  });

  it("mantém campos ausentes como null", () => {
    const mapped = mapSignal(base);
    expect(mapped.sl).toBeNull();
    expect(mapped.tp).toBeNull();
    expect(mapped.rr).toBeNull();
    expect(mapped.riskPct).toBeNull();
    expect(mapped.dnaMatch).toBeNull();
    expect(mapped.manipRisk).toBeNull();
    expect(mapped.setup).toBeNull();
    expect(mapped.session).toBeNull();
    expect(mapped.volDelta).toBeNull();
    expect(mapped.confirms).toBeNull();
  });

  it("normaliza Binance em um único valor", () => {
    expect(normalizeExchange("Binance")).toBe("binance");
    expect(normalizeExchange("binance")).toBe("binance");
    expect(normalizeExchange("Bybit")).toBe("bybit");
  });

  it("rejeita side inválido sem converter para SELL", () => {
    expect(() => mapSignal({ ...base, side: "UNKNOWN" as never })).toThrow("side inválido");
  });

  it("descarta somente itens inválidos e conta o descarte", () => {
    const result = mapSignalList([
      base,
      { ...base, id: "bad", entryPrice: null },
      { ...base, id: "sig-2", side: "SELL" },
    ]);
    expect(result.signals).toHaveLength(2);
    expect(result.discardedCount).toBe(1);
  });

  it("não calcula idade artificialmente no mapper", () => {
    expect(mapSignal(base).createdAt).toBe(base.createdAt);
  });
});
