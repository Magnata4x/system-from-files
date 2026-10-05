import { describe, expect, it } from "vitest";
import { mapSignal } from "@/adapters/backend/signal.adapter";

const base = {
  id: "sig-1",
  pair: "BTC/USDT",
  side: "BUY" as const,
  score: 82,
  entryPrice: 100000,
};

describe("signalAdapter — contrato de dados reais", () => {
  it("mapeia BUY/LONG e SELL/SHORT sem alterar o score real", () => {
    expect(mapSignal(base)).toMatchObject({
      id: "sig-1",
      symbol: "BTC/USDT",
      direction: "BUY",
      confidence: 82,
      entry: 100000,
      state: "active",
    });

    expect(mapSignal({ ...base, side: "SHORT", status: "closed" })).toMatchObject({
      direction: "SELL",
      state: "closed",
    });
  });

  it("preserva setup, tipo e confluências fornecidos pelo motor", () => {
    expect(
      mapSignal({
        ...base,
        type: "trend-following",
        setup: "Tendência de alta",
        confluences: ["Tendência de mercado confirmada", "RSI alinhado à direção"],
      }),
    ).toMatchObject({
      type: "trend-following",
      setup: "Tendência de alta",
      confluences: ["Tendência de mercado confirmada", "RSI alinhado à direção"],
    });
  });

  it("mantém metadados ausentes como ausentes, sem inventar valores", () => {
    expect(mapSignal(base)).toMatchObject({ id: "sig-1" });
    expect(mapSignal(base).type).toBeUndefined();
    expect(mapSignal(base).setup).toBeUndefined();
    expect(mapSignal(base).confluences).toBeUndefined();
  });

  it("não propaga status arbitrário para a UI", () => {
    expect(mapSignal({ ...base, status: "unexpected-backend-status" })).toMatchObject({
      state: "active",
    });
  });

  it("rejeita side inválido em vez de converter silenciosamente para SELL", () => {
    expect(() =>
      mapSignal({ ...base, side: "UNKNOWN" as never }),
    ).toThrow("side inválido");
  });
});
