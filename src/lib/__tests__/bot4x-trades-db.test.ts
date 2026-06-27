// Cobre persistência de trades: mapeamento snake_case ↔ camelCase, outbox
// pattern com escopo por PK (sem filtro JSONB) e tratamento de erros.
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Trade } from "../bot4x-data";

type AnyMock = ReturnType<typeof vi.fn>;
type Builder = {
  upsert: AnyMock;
  insert: AnyMock;
  update: AnyMock;
  delete: AnyMock;
  select: AnyMock;
  single: AnyMock;
  eq: AnyMock;
  gte: AnyMock;
  order: AnyMock;
  limit: AnyMock;
  __upsertResult: { error: unknown };
  __insertResult: { data: unknown; error: unknown };
  __updateResult: { error: unknown };
  __selectResult: { data: unknown; error: unknown };
};

// vi.mock é hoisted → estado compartilhado precisa vir de vi.hoisted.
const hoisted = vi.hoisted(() => {
  const state: { builder: Builder | null; from: AnyMock | null } = {
    builder: null,
    from: null,
  };
  return state;
});

function wireBuilder(): Builder {
  const b = {
    __upsertResult: { error: null },
    __insertResult: { data: { id: "outbox-1" }, error: null },
    __updateResult: { error: null },
    __selectResult: { data: [], error: null },
  } as Builder;
  b.upsert = vi.fn(() => Promise.resolve(b.__upsertResult));
  b.single = vi.fn(() => Promise.resolve(b.__insertResult));
  b.select = vi.fn((arg?: string) => {
    if (arg === "id") return { single: b.single };
    return b;
  });
  b.insert = vi.fn(() => ({ select: b.select }));
  b.update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve(b.__updateResult)) }));
  b.delete = vi.fn(() => ({
    eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
  }));
  b.limit = vi.fn(() => Promise.resolve(b.__selectResult));
  b.order = vi.fn(() => ({ limit: b.limit }));
  b.gte = vi.fn(() => ({ order: b.order }));
  b.eq = vi.fn(() => ({ gte: b.gte }));
  return b;
}

hoisted.builder = wireBuilder();
hoisted.from = vi.fn(() => hoisted.builder);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => (hoisted.from as unknown as (...a: unknown[]) => unknown)(...args),
  },
}));



vi.mock("../logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

import { saveTrade, saveTradeWithOutbox, loadTrades } from "../bot4x-trades-db";

const builder = hoisted.builder!;
const fromMock = hoisted.from!;

const baseTrade: Trade = {
  id: "trade-abc",
  day: "2026-06-25",
  pair: "BTC/USDT",
  side: "LONG",
  entry: 100,
  stop: 95,
  target: 110,
  result: "WIN",
  pnl: 10,
  pnlPct: 0.1,
  accumulated: 50,
  profile: "conservador",
  leverage: 3,
  motivo: "ok",
  hour: 12,
};

beforeEach(() => {
  // Reseta resultados e contadores; mantém referências (vi.mock já vinculou).
  fromMock.mockClear();
  builder.upsert.mockClear();
  builder.insert.mockClear();
  builder.update.mockClear();
  builder.select.mockClear();
  builder.single.mockClear();
  builder.eq.mockClear();
  builder.__upsertResult = { error: null };
  builder.__insertResult = { data: { id: "outbox-1" }, error: null };
  builder.__updateResult = { error: null };
  builder.__selectResult = { data: [], error: null };
});

describe("saveTrade", () => {
  it("faz upsert com colunas snake_case mapeadas do Trade", async () => {
    await saveTrade("user-1", baseTrade);
    expect(fromMock).toHaveBeenCalledWith("bot4x_trades");
    const payload = builder.upsert.mock.calls[0][0];
    expect(payload).toMatchObject({
      id: "trade-abc",
      user_id: "user-1",
      day: "2026-06-25",
      pair: "BTC/USDT",
      side: "LONG",
      entry: 100,
      stop: 95,
      target: 110,
      result: "WIN",
      pnl: 10,
      pnl_pct: 0.1,
      accumulated: 50,
      profile: "conservador",
      leverage: 3,
      motivo: "ok",
      hour: 12,
    });
    expect(builder.upsert.mock.calls[0][1]).toEqual({ onConflict: "id" });
  });

  it("lança Error contendo tradeId quando supabase retorna erro", async () => {
    builder.__upsertResult = { error: { message: "db down", code: "X", details: "", hint: "" } };
    await expect(saveTrade("user-1", baseTrade)).rejects.toThrow(/trade-abc/);
  });
});

describe("saveTradeWithOutbox", () => {
  it("insere no outbox, salva e marca processed pelo PK do outbox", async () => {
    await saveTradeWithOutbox("user-1", baseTrade);

    expect(fromMock).toHaveBeenNthCalledWith(1, "trade_outbox");
    expect(builder.insert).toHaveBeenCalledTimes(1);
    expect(builder.insert.mock.calls[0][0]).toMatchObject({
      user_id: "user-1",
      status: "pending",
    });
    expect(fromMock).toHaveBeenNthCalledWith(2, "bot4x_trades");
    expect(builder.upsert).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenNthCalledWith(3, "trade_outbox");
    expect(builder.update).toHaveBeenCalledTimes(1);
    const updatePayload = builder.update.mock.calls[0][0];
    expect(updatePayload.status).toBe("processed");
    expect(updatePayload.processed_at).toEqual(expect.any(String));
    const eqMock = builder.update.mock.results[0].value.eq as AnyMock;
    expect(eqMock).toHaveBeenCalledWith("id", "outbox-1");
  });

  it("falha no insert do outbox: lança e NÃO chama saveTrade", async () => {
    builder.__insertResult = { data: null, error: { message: "outbox fail" } };
    await expect(saveTradeWithOutbox("user-1", baseTrade)).rejects.toBeTruthy();
    expect(builder.upsert).not.toHaveBeenCalled();
  });
});

describe("loadTrades", () => {
  it("mapeia snake_case do banco para camelCase do Trade", async () => {
    builder.__selectResult = {
      data: [
        {
          id: "t1",
          day: "2026-06-25",
          pair: "ETH/USDT",
          side: "SHORT",
          entry: "200",
          stop: "210",
          target: "180",
          result: "LOSS",
          pnl: "-10",
          pnl_pct: "-0.05",
          accumulated: "40",
          profile: "rsi",
          leverage: 5,
          motivo: "stop",
          hour: 9,
        },
      ],
      error: null,
    };
    const trades = await loadTrades("user-1");
    expect(trades).toHaveLength(1);
    expect(trades[0]).toEqual({
      id: "t1",
      day: "2026-06-25",
      pair: "ETH/USDT",
      side: "SHORT",
      entry: 200,
      stop: 210,
      target: 180,
      result: "LOSS",
      pnl: -10,
      pnlPct: -0.05,
      accumulated: 40,
      profile: "rsi",
      leverage: 5,
      motivo: "stop",
      hour: 9,
    });
  });

  it("retorna [] (e não lança) quando supabase retorna erro", async () => {
    builder.__selectResult = { data: null, error: { message: "boom" } };
    await expect(loadTrades("user-1")).resolves.toEqual([]);
  });
});
