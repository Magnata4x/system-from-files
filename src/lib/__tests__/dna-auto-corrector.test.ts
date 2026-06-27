// Testes para runDnaAutoCorrection: tiers de severidade, cooldown e
// descida na escala de risco sob estresse.
//
// Estratégia: mockamos `useBot4xStore` e `useSignalsStore` com `getState()`
// controláveis para isolar a lógica do corrector dos efeitos colaterais
// reais (supabase, persistência, WS).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PROFILE_RISK_LADDER, type CalibProfile } from "../bot4x-data";

type Bot4xMock = {
  profile: CalibProfile;
  leverage: number;
  allocationPct: number;
  history: Array<{ pnlPct: number }>;
  orders: Array<{ pnlPct: number }>;
  dailyPnlPct: number;
  setProfile: ReturnType<typeof vi.fn>;
  setLeverage: ReturnType<typeof vi.fn>;
  setAllocationPct: ReturnType<typeof vi.fn>;
};

type SignalsMock = {
  filters: { scoreMin: 0 | 60 | 75 | 90; bot4xOnly: boolean };
  setFilter: ReturnType<typeof vi.fn>;
};

const bot4x: Bot4xMock = {
  profile: PROFILE_RISK_LADDER[PROFILE_RISK_LADDER.length - 1], // mais arriscado
  leverage: 5,
  allocationPct: 50,
  history: [],
  orders: [],
  dailyPnlPct: 0,
  setProfile: vi.fn((p: CalibProfile) => {
    bot4x.profile = p;
  }),
  setLeverage: vi.fn((n: number) => {
    bot4x.leverage = n;
  }),
  setAllocationPct: vi.fn((n: number) => {
    bot4x.allocationPct = n;
  }),
};

const signals: SignalsMock = {
  filters: { scoreMin: 0, bot4xOnly: false },
  setFilter: vi.fn((k: string, v: unknown) => {
    (signals.filters as Record<string, unknown>)[k] = v;
  }),
};

vi.mock("../bot4x-store", () => ({
  useBot4xStore: {
    getState: () => bot4x,
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock("../signals-store", () => ({
  useSignalsStore: {
    getState: () => signals,
  },
}));

// Importação tardia (após os mocks).
let runDnaAutoCorrection: typeof import("../dna-auto-corrector").runDnaAutoCorrection;

beforeEach(async () => {
  // Reset módulo: os cooldowns são state interno do módulo, então
  // reimportamos a cada teste para começar com cooldowns zerados.
  vi.resetModules();
  const mod = await import("../dna-auto-corrector");
  runDnaAutoCorrection = mod.runDnaAutoCorrection;

  // Reset state dos mocks
  bot4x.profile = PROFILE_RISK_LADDER[PROFILE_RISK_LADDER.length - 1];
  bot4x.leverage = 5;
  bot4x.allocationPct = 50;
  bot4x.history = [];
  bot4x.orders = [];
  bot4x.dailyPnlPct = 0;
  bot4x.setProfile.mockClear();
  bot4x.setLeverage.mockClear();
  bot4x.setAllocationPct.mockClear();
  signals.filters = { scoreMin: 0, bot4xOnly: false };
  signals.setFilter.mockClear();
});

describe("runDnaAutoCorrection — tiers de severidade", () => {
  it("tier 0: sem perda → retorna null e não altera nada", () => {
    bot4x.dailyPnlPct = 0.5;
    const result = runDnaAutoCorrection();
    expect(result).toBeNull();
    expect(bot4x.setLeverage).not.toHaveBeenCalled();
    expect(bot4x.setProfile).not.toHaveBeenCalled();
  });

  it("tier 1: dailyPnl <= -0.5 → reduz leverage e sobe scoreMin, mas NÃO troca profile", () => {
    bot4x.dailyPnlPct = -0.6;
    const result = runDnaAutoCorrection();
    expect(result).not.toBeNull();
    expect(bot4x.setLeverage).toHaveBeenCalledWith(4);
    expect(bot4x.setProfile).not.toHaveBeenCalled();
    expect(signals.setFilter).toHaveBeenCalledWith("scoreMin", 60);
  });

  it("tier 2: dailyPnl <= -1.0 → reduz leverage, alloc, sobe filtro e ATIVA bot4xOnly", () => {
    bot4x.dailyPnlPct = -1.1;
    const result = runDnaAutoCorrection();
    expect(result).not.toBeNull();
    expect(bot4x.setLeverage).toHaveBeenCalledWith(4);
    expect(bot4x.setAllocationPct).toHaveBeenCalledWith(45);
    expect(signals.setFilter).toHaveBeenCalledWith("bot4xOnly", true);
  });

  it("tier 3: dailyPnl <= -1.5 → desce na escala de risco (perfil mais seguro)", () => {
    const startProfile = PROFILE_RISK_LADDER[PROFILE_RISK_LADDER.length - 1];
    bot4x.profile = startProfile;
    bot4x.dailyPnlPct = -1.6;

    const result = runDnaAutoCorrection();
    expect(result).not.toBeNull();
    expect(bot4x.setProfile).toHaveBeenCalledTimes(1);
    const [calledWith] = bot4x.setProfile.mock.calls[0];
    const startIdx = PROFILE_RISK_LADDER.indexOf(startProfile);
    const newIdx = PROFILE_RISK_LADDER.indexOf(calledWith);
    expect(newIdx).toBeLessThan(startIdx);
  });

  it("tier 1 também dispara por 3+ trades negativos dos últimos 5", () => {
    bot4x.dailyPnlPct = 0; // sem perda diária
    bot4x.history = [
      { pnlPct: -0.2 },
      { pnlPct: -0.3 },
      { pnlPct: -0.1 },
      { pnlPct: 0.5 },
      { pnlPct: 0.1 },
    ];
    const result = runDnaAutoCorrection();
    expect(result).not.toBeNull();
    expect(bot4x.setLeverage).toHaveBeenCalled();
  });
});

describe("runDnaAutoCorrection — cooldown", () => {
  it("não reaplica correção no mesmo eixo dentro de 60s", () => {
    bot4x.dailyPnlPct = -1.6;
    const first = runDnaAutoCorrection();
    expect(first).not.toBeNull();

    bot4x.setLeverage.mockClear();
    bot4x.setProfile.mockClear();
    bot4x.setAllocationPct.mockClear();

    // Segunda chamada imediata — todos os eixos em cooldown
    const second = runDnaAutoCorrection();
    expect(second).toBeNull();
    expect(bot4x.setLeverage).not.toHaveBeenCalled();
    expect(bot4x.setProfile).not.toHaveBeenCalled();
    expect(bot4x.setAllocationPct).not.toHaveBeenCalled();
  });

  it("avança após o cooldown expirar (>60s)", () => {
    bot4x.dailyPnlPct = -1.6;
    const realNow = Date.now;
    let fakeNow = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => fakeNow);

    runDnaAutoCorrection();
    bot4x.setLeverage.mockClear();

    // Avança 61s e ajusta state para ainda haver leverage a reduzir.
    fakeNow += 61_000;
    bot4x.leverage = 4;

    const second = runDnaAutoCorrection();
    expect(second).not.toBeNull();
    expect(bot4x.setLeverage).toHaveBeenCalledWith(3);

    Date.now = realNow;
  });
});
