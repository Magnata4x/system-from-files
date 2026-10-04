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
