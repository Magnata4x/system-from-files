import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseFrom } = vi.hoisted(() => ({ supabaseFrom: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: supabaseFrom,
  },
}));

vi.mock("@/adapters/backend/bot4x.adapter", () => ({
  bot4xAdapter: {
    getConfig: vi.fn().mockResolvedValue(null),
    executions: vi.fn().mockResolvedValue([]),
    verifiedHistory: vi.fn().mockResolvedValue([]),
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
vi.mock("./bot4x-trades-db", () => ({
  saveTrade: vi.fn().mockResolvedValue(undefined),
  loadTrades: vi.fn().mockResolvedValue([]),
  saveTradeWithOutbox: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./bot4x-config-db", () => ({
  loadConfig: vi.fn().mockResolvedValue(null),
  saveConfig: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./signals-store", () => ({
  useSignalsStore: {
    getState: () => ({
      filters: { scoreMin: 0, bot4xOnly: false },
      setFilter: vi.fn(),
    }),
  },
}));
vi.mock("sonner", () => ({ toast: { warning: vi.fn() } }));

import { useBot4xStore, setExchangeVerified } from "./bot4x-store";
import { runDnaAutoCorrection } from "./dna-auto-corrector";

describe("runDnaAutoCorrection — confiança operacional", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setExchangeVerified(false);
    supabaseFrom.mockClear();
    useBot4xStore.setState({
      mode: "DEMO",
      dailyPnlPct: -2,
      profile: "agressivo",
      leverage: 3,
      allocationPct: 30,
      history: [],
      orders: [],
      userId: null,
      todayStats: { trades: 0, wins: 0, losses: 0, open: 0, pnl: 0, serverTime: null },
    });
  });

  it("não altera perfil, alavancagem nem Supabase quando o modo efetivo é DEMO", () => {
    const state = useBot4xStore.getState();
    const setProfile = vi.spyOn(state, "setProfile");
    const setLeverage = vi.spyOn(state, "setLeverage");

    expect(runDnaAutoCorrection()).toBeNull();
    expect(setProfile).not.toHaveBeenCalled();
    expect(setLeverage).not.toHaveBeenCalled();
    expect(supabaseFrom).not.toHaveBeenCalled();
  });

  it("aplica correção em REAL com métricas verificadas e recentes do servidor", () => {
    setExchangeVerified(true);
    useBot4xStore.setState({
      mode: "REAL",
      dailyPnlPct: -2,
      profile: "agressivo",
      leverage: 3,
      todayStats: { trades: 2, wins: 0, losses: 2, open: 0, pnl: -4, serverTime: new Date().toISOString() },
    });
    const state = useBot4xStore.getState();
    const setProfile = vi.spyOn(state, "setProfile");
    const setLeverage = vi.spyOn(state, "setLeverage");

    const result = runDnaAutoCorrection();

    expect(result).not.toBeNull();
    expect(setProfile).toHaveBeenCalled();
    expect(setLeverage).toHaveBeenCalled();
  });

  it("não aplica correção em REAL sem métricas verificadas do servidor", () => {
    setExchangeVerified(true);
    useBot4xStore.setState({
      mode: "REAL",
      dailyPnlPct: -2,
      profile: "agressivo",
      leverage: 3,
      todayStats: { trades: 0, wins: 0, losses: 0, open: 0, pnl: 0, serverTime: null },
    });
    const state = useBot4xStore.getState();
    const setProfile = vi.spyOn(state, "setProfile");

    expect(runDnaAutoCorrection()).toBeNull();
    expect(setProfile).not.toHaveBeenCalled();
  });

  it("não aplica correção em REAL com métricas desatualizadas", () => {
    setExchangeVerified(true);
    useBot4xStore.setState({
      mode: "REAL",
      dailyPnlPct: -2,
      profile: "agressivo",
      leverage: 3,
      todayStats: { trades: 2, wins: 0, losses: 2, open: 0, pnl: -4, serverTime: new Date(Date.now() - 120_000).toISOString() },
    });
    const state = useBot4xStore.getState();
    const setProfile = vi.spyOn(state, "setProfile");

    expect(runDnaAutoCorrection()).toBeNull();
    expect(setProfile).not.toHaveBeenCalled();
  });
});
