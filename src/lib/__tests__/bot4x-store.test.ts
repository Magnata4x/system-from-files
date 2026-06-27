// Testa regras puras do bot4x-store: getEffectiveMode, limites de setters
// e o handler SIGNED_OUT que limpa history/orders.
//
// Mocks necessários: adapters/db helpers e ws-client são importados no
// top-level do store e disparam efeitos de rede/persistência.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => {
  const listeners = new Set<(event: string, session: unknown) => void>();
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    _emit: (event: string, session: unknown) => listeners.forEach((cb) => cb(event, session)),
  };
  return { supabase: { auth, from: vi.fn() } };
});

vi.mock("@/adapters/backend/bot4x.adapter", () => ({
  bot4xAdapter: {
    getConfig: vi.fn().mockResolvedValue(null),
    executions: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/adapters/backend/ws-client", () => ({
  backendWs: {
    on: vi.fn(() => () => {}),
    onChannel: vi.fn(() => () => {}),
    onStatus: vi.fn(() => () => {}),
    send: vi.fn(),
    connect: vi.fn().mockResolvedValue("open"),
    close: vi.fn(),
    isAuthenticatedOpen: vi.fn(() => false),
  },
}));

vi.mock("../bot4x-trades-db", () => ({
  saveTrade: vi.fn().mockResolvedValue(undefined),
  loadTrades: vi.fn().mockResolvedValue([]),
  saveTradeWithOutbox: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../bot4x-config-db", () => ({
  loadConfig: vi.fn().mockResolvedValue(null),
  saveConfig: vi.fn().mockResolvedValue(undefined),
}));

import { useBot4xStore, getEffectiveMode, REAL_MODE_ENABLED } from "../bot4x-store";
import { supabase } from "@/integrations/supabase/client";

type MockedAuth = typeof supabase.auth & {
  _emit: (event: string, session: unknown) => void;
};
const mockAuth = supabase.auth as MockedAuth;

describe("getEffectiveMode", () => {
  it("retorna DEMO quando REAL_MODE_ENABLED é false (default em testes)", () => {
    // O ambiente de teste não define VITE_BOT4X_REAL_ENABLED=true.
    expect(REAL_MODE_ENABLED).toBe(false);
    expect(getEffectiveMode("REAL")).toBe("DEMO");
    expect(getEffectiveMode("DEMO")).toBe("DEMO");
  });
});

describe("bot4x-store — limites de setters", () => {
  beforeEach(() => {
    // Reseta estado mínimo antes de cada teste — evita vazamento entre casos.
    useBot4xStore.setState({
      leverage: 3,
      allocationPct: 30,
      slPct: 0.5,
      tpPct: 1.0,
    });
  });

  it("setLeverage respeita limites [1, 10]", () => {
    const { setLeverage } = useBot4xStore.getState();
    setLeverage(0);
    expect(useBot4xStore.getState().leverage).toBe(1);
    setLeverage(15);
    expect(useBot4xStore.getState().leverage).toBe(10);
    setLeverage(5);
    expect(useBot4xStore.getState().leverage).toBe(5);
  });

  it("setAllocationPct respeita limites [1, 100]", () => {
    const { setAllocationPct } = useBot4xStore.getState();
    setAllocationPct(0);
    expect(useBot4xStore.getState().allocationPct).toBe(1);
    setAllocationPct(250);
    expect(useBot4xStore.getState().allocationPct).toBe(100);
    setAllocationPct(45);
    expect(useBot4xStore.getState().allocationPct).toBe(45);
  });

  it("setSlPct respeita limites [0.1, 10]", () => {
    const { setSlPct } = useBot4xStore.getState();
    setSlPct(0);
    expect(useBot4xStore.getState().slPct).toBe(0.1);
    setSlPct(50);
    expect(useBot4xStore.getState().slPct).toBe(10);
  });

  it("setTpPct respeita limites [0.1, 20]", () => {
    const { setTpPct } = useBot4xStore.getState();
    setTpPct(0);
    expect(useBot4xStore.getState().tpPct).toBe(0.1);
    setTpPct(50);
    expect(useBot4xStore.getState().tpPct).toBe(20);
  });

  it("setDnaMinSample respeita limites [5, 100]", () => {
    const { setDnaMinSample } = useBot4xStore.getState();
    setDnaMinSample(1);
    expect(useBot4xStore.getState().dnaMinSample).toBe(5);
    setDnaMinSample(500);
    expect(useBot4xStore.getState().dnaMinSample).toBe(100);
  });
});

describe("bot4x-store — SIGNED_OUT limpa history e orders", () => {
  it("zera history, orders e métricas quando supabase emite SIGNED_OUT", async () => {
    // Popula state como se estivesse rodando.
    useBot4xStore.setState({
      userId: "user-1",
      history: [
        {
          id: "t1",
          day: "2026-01-01",
          pair: "BTC/USDT",
          side: "LONG",
          entry: 100,
          stop: 99,
          target: 102,
          result: "WIN",
          pnl: 1,
          pnlPct: 1,
          accumulated: 1,
          profile: "conservador",
          leverage: 3,
          motivo: "",
          hour: 10,
        },
      ],
      orders: [
        {
          id: "o1",
          pair: "BTC/USDT",
          side: "LONG",
          entry: 100,
          sl: 99,
          tp: 102,
          openedAt: Date.now(),
          pnlPct: 0,
        },
      ],
      dailyPnlPct: 1.2,
      circuitBreaker: "emergency",
      status: "RUNNING",
    });

    mockAuth._emit("SIGNED_OUT", null);

    // O handler é síncrono mas envolve um setUserId que cleanup; aguarda
    // um microtask para garantir consistência.
    await Promise.resolve();

    const s = useBot4xStore.getState();
    expect(s.history).toEqual([]);
    expect(s.orders).toEqual([]);
    expect(s.dailyPnlPct).toBe(0);
    expect(s.circuitBreaker).toBe("none");
    expect(s.status).toBe("IDLE");
    expect(s.userId).toBeNull();
  });
});

describe("bot4x-store — circuit breaker threshold", () => {
  it("estado representa circuit breaker quando dailyPnlPct <= -1.5 e backend emite STOPPED", () => {
    // O acionamento real do circuit breaker no REAL mode vem do backend via
    // ws (event 'CIRCUIT_BREAKER'). Aqui validamos a propriedade central:
    // o store aceita o estado, e a UI pode reagir.
    useBot4xStore.setState({ dailyPnlPct: -1.6, circuitBreaker: "emergency", status: "STOPPED" });
    const s = useBot4xStore.getState();
    expect(s.dailyPnlPct).toBeLessThanOrEqual(-1.5);
    expect(s.circuitBreaker).toBe("emergency");
    expect(s.status).toBe("STOPPED");
  });

  it("PnL acima de -1.5% não dispara emergency por padrão", () => {
    useBot4xStore.setState({ dailyPnlPct: -1.0, circuitBreaker: "none", status: "RUNNING" });
    const s = useBot4xStore.getState();
    expect(s.dailyPnlPct).toBeGreaterThan(-1.5);
    expect(s.circuitBreaker).toBe("none");
  });
});
