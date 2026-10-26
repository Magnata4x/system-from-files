import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  type ExecMode,
  type CalibProfile,
  type Order,
  type Side,
  type Tick,
  type Trade,
} from "./bot4x-data";
import { bot4xAdapter, type BackendBot4xVerifiedHistory } from "@/adapters/backend/bot4x.adapter";
import { api } from "@/adapters/backend/api.adapter";
import { backendWs } from "@/adapters/backend/ws-client";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";
import { loadConfig, saveConfig } from "./bot4x-config-db";
import type { CalibProfile as CalibProfileType } from "./bot4x-data";
import { BOT4X_CIRCUIT_BREAKER_PNL_PCT, isBot4xCircuitBreakerTriggered } from "./bot4x-breaker";

export { BOT4X_CIRCUIT_BREAKER_PNL_PCT, isBot4xCircuitBreakerTriggered } from "./bot4x-breaker";

// ─── REAL MODE GATE ───────────────────────────────────────────────────────────
// Mantido apenas para compatibilidade com testes/consumidores legados.
// A flag permanece permanentemente desabilitada: REAL só é liberado após
// verificação da exchange em runtime pelo backend.
export const REAL_MODE_ENABLED = false;
let exchangeVerified = false;
export function setExchangeVerified(value: boolean) {
  exchangeVerified = value;
}
export function isRealModeUnlocked(): boolean {
  return exchangeVerified;
}
export function getEffectiveMode(persistedMode: ExecMode): ExecMode {
  return exchangeVerified && persistedMode === "REAL" ? "REAL" : "DEMO";
}

// ─── DATA SOURCE CONTRACT ────────────────────────────────────────────────────
// DEMO e REAL usam exclusivamente o backend operacional: DEMO executa ordens
// reais no Binance Spot Testnet e REAL permanece gated. Nenhuma operação
// fictícia é criada em nenhum modo — o ledger verificado é a única fonte.
export type Bot4xDataSource = "BACKEND_OPERATIONAL";

export function getBot4xDataSource(_mode: ExecMode): Bot4xDataSource {
  return "BACKEND_OPERATIONAL";
}

export function getRealModeStateReset(): Pick<State, "orders" | "ticks" | "ticksProcessed" | "history"> {
  return {
    orders: [],
    ticks: [],
    ticksProcessed: 0,
    history: [],
  };
}

// ─── RISK MODEL CONSTANTS ─────────────────────────────────────────────────────
export const MAX_SLOTS = 10;
export const RISK_PER_SLOT = 0.1;
 // ─── USER-SCOPED STORAGE ──────────────────────────────────────────────────────
// Cada usuário tem sua própria chave: "bot4x-store-v1:<uid>".
// O storage dinâmico lê o userId do próprio state na hora de montar/hidratar.
function makeUserStorage(getUserId: () => string | null) {
  return {
    getItem: (name: string) => {
      const uid = getUserId();
      const key = uid ? `${name}:${uid}` : name;
      return localStorage.getItem(key);
    },
    setItem: (name: string, value: string) => {
      const uid = getUserId();
      const key = uid ? `${name}:${uid}` : name;
      localStorage.setItem(key, value);
    },
    removeItem: (name: string) => {
      const uid = getUserId();
      const key = uid ? `${name}:${uid}` : name;
      localStorage.removeItem(key);
    },
  };
}

// ─── STATE TYPE ───────────────────────────────────────────────────────────────

type State = {
  // Identity
  userId: string | null;

  mode: ExecMode;
  totalCapital: number;
  allocationPct: number;
  leverage: number;
  profile: CalibProfile;
  slPct: number;
  tpPct: number;
  orders: Order[];
  dailyPnlPct: number;
  trailingPeakPct: number;
  ticks: Tick[];
  ticksProcessed: number;
  feedPaused: boolean;
  history: Trade[];
  monitorTab: "tick" | "order" | "shutdown";
  preferredPairs: string[];
  avoidPairs: string[];
  dnaMinSample: number; // mínimo de trades fechados por par para veredito DNA
  _ticker?: ReturnType<typeof setInterval>;

  // Real mode state
  status: "IDLE" | "LOADING" | "STARTING" | "RUNNING" | "STOPPING" | "STOPPED" | "ERROR";
  circuitBreaker: "none" | "emergency" | "profitLock";
  errorMsg: string | null;
  realInited: boolean;
  todayStats: { trades: number; wins: number; losses: number; open: number; pnl: number; serverTime: string | null };

  setUserId: (uid: string | null) => void;
  init: () => void;
  cleanup: () => void;
  setMode: (m: ExecMode) => void;
  setTotalCapital: (n: number) => void;
  setAllocationPct: (n: number) => void;
  setLeverage: (n: number) => void;
  setProfile: (p: CalibProfile) => void;
  setSlPct: (n: number) => void;
  setTpPct: (n: number) => void;
  setPreferredPairs: (pairs: string[]) => void;
  setAvoidPairs: (pairs: string[]) => void;
  setDnaMinSample: (n: number) => void;
  closeOrder: (id: string) => void;
  setMonitorTab: (t: "tick" | "order" | "shutdown") => void;
  toggleFeedPaused: () => void;
  clearTicks: () => void;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function mapBackendProfile(p: string | undefined): CalibProfile {
  if (p === "calibradoRSI") return "rsi";
  if (p === "calibradoAiScore") return "aiscore";
  if (
    p === "conservador" ||
    p === "agressivo" ||
    p === "scalper" ||
    p === "intraday" ||
    p === "swing" ||
    p === "position" ||
    p === "rsi" ||
    p === "aiscore"
  ) {
    return p as CalibProfile;
  }
  return "conservador";
}

export function verifiedHistoryToTrade(e: BackendBot4xVerifiedHistory, accumulated: number): Trade {
  const openedAt = new Date(e.createdAt).getTime();
  const pnl = e.realizedPnl;
  const side: Side = e.side === "BUY" ? "LONG" : "SHORT";
  const entry = e.entryPrice ?? 0;
  const result: Trade["result"] = pnl === null ? "OPEN" : pnl >= 0 ? "WIN" : "LOSS";
  return {
    id: e.id,
    day: new Date(openedAt).toISOString().slice(0, 10),
    pair: e.pair,
    side,
    entry,
    stop: entry,
    target: entry,
    result,
    pnl: pnl ?? 0,
    pnlPct: 0,
    accumulated: pnl === null ? accumulated : accumulated + pnl,
    profile: mapBackendProfile(e.profile),
    leverage: e.leverage,
    motivo: e.lifecycle ?? "execução Binance verificada",
    hour: new Date(openedAt).getHours(),
  };
}

let wsUnsubs: Array<() => void> = [];
let realPoller: ReturnType<typeof setInterval> | undefined;


// ─── STORE ────────────────────────────────────────────────────────────────────

// Guardamos o userId fora do store para o storage customizado poder acessá-lo
// sem criar dependência circular.
let _currentUserId: string | null = null;

export const useBot4xStore = create<State>()(
  persist(
    (set, get) => ({
      // Identity
      userId: null,

      mode: "DEMO",
      totalCapital: 1000,
      allocationPct: 30,
      leverage: 3,
      profile: "conservador",
      slPct: 0.5,
      tpPct: 1.0,
      orders: [],
      dailyPnlPct: 0,
      trailingPeakPct: 0,
      ticks: [],
      ticksProcessed: 0,
      feedPaused: false,
      history: [],
      monitorTab: "tick",
      preferredPairs: [],
      avoidPairs: [],
      dnaMinSample: 10,

      status: "IDLE",
      circuitBreaker: "none",
      errorMsg: null,
      realInited: false,
      todayStats: { trades: 0, wins: 0, losses: 0, open: 0, pnl: 0, serverTime: null },

      // ─── SET USER ID ──────────────────────────────────────────────────────
      // Chamado ao login/logout via supabase.auth.onAuthStateChange.
      // Ao trocar de usuário, força rehidratação do storage correto.
      setUserId: (uid) => {
        const prev = get().userId;
        // No primeiro carregamento, o persist pode ter lido a chave genérica
        // antes de a sessão ficar disponível. Mesmo com o mesmo uid no state,
        // ainda precisamos trocar para a chave específica do usuário.
        if (prev === uid && _currentUserId === uid) return;
        const userStorageKey = uid ? `bot4x-store-v1:${uid}` : "bot4x-store-v1";
        const persistedForUser = typeof localStorage !== "undefined"
          ? localStorage.getItem(userStorageKey)
          : null;
        // Limpa tickers/WS antes de trocar de usuário para não vazar handles
        // do usuário anterior nem misturar streams entre contas.
        get().cleanup();
        _currentUserId = uid;
        setExchangeVerified(false);
        set({ userId: uid, realInited: false });

        // O set acima passa a gravar na chave do usuário. Restaure o snapshot
        // capturado antes dessa troca para não sobrescrever sua preferência.
        if (persistedForUser && typeof localStorage !== "undefined") {
          localStorage.setItem(userStorageKey, persistedForUser);
        }
        // Rehidrata o store com os dados do novo usuário.
        useBot4xStore.persist.rehydrate();
        // O backend é a fonte de verdade para liberar REAL.
        if (uid) {
          void (async () => {
            try {
              const status = await api.get<{ verified?: boolean }>("/exchange/credentials");
              const verified = status?.verified === true;
              setExchangeVerified(verified);

              const cfg = await loadConfig(uid);
              if (!cfg) return;

              // Nunca restauramos REAL a partir do localStorage. A credencial
              // verificada pelo backend precisa existir neste login.
              const executionMode: ExecMode =
                cfg.executionMode === "REAL" && verified ? "REAL" : "DEMO";

              const sourceReset = getRealModeStateReset();
              set({
                ...sourceReset,
                mode: executionMode,
                profile: cfg.profile as CalibProfileType,
                leverage: cfg.leverage,
                slPct: cfg.slPct,
                tpPct: cfg.tpPct,
                allocationPct: cfg.allocationPct,
                totalCapital: cfg.totalCapital,
                preferredPairs: cfg.preferredPairs,
                avoidPairs: cfg.avoidPairs,
                circuitBreaker: cfg.circuitBreaker as State["circuitBreaker"],
                dailyPnlPct: cfg.dailyPnl,
              });

              if (executionMode !== cfg.executionMode) {
                void saveConfig(uid, { executionMode });
              }
            } catch {
              setExchangeVerified(false);
              if (get().mode === "REAL") {
                set({ mode: "DEMO", realInited: false, status: "IDLE" });
              }
            }
          })();
        }
      },

      // ─── INIT ─────────────────────────────────────────────────────────────
      init: async () => {
        // ── MODO OPERACIONAL (DEMO Testnet / REAL) ───────────────────────────
        // DEMO não roda mais simulador local: ambos os modos leem o backend
        // operacional e o ledger verificado. DEMO executa ordens reais no
        // Binance Spot Testnet via orquestrador; REAL permanece gated.
        if (get().realInited) return;
        // Barreira de fonte: nenhum estado sintético persistido pode entrar no
        // ciclo operacional. A partir daqui, history/orders/ticks vêm somente
        // do backend operacional/ledger; o DEMO continua isolado acima.
        set({ ...getRealModeStateReset(), status: "LOADING", realInited: true });

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const uid = user?.id;
          if (!uid) throw new Error("Usuário não autenticado");

          const [config, verifiedHistory, telemetry] = await Promise.all([
            bot4xAdapter.getConfig(uid),
            bot4xAdapter.verifiedHistory(),
            bot4xAdapter.telemetry(),
          ]);

          const profile = mapBackendProfile(config?.profile);
          let accumulated = 0;
          const mappedHistory: Trade[] = (verifiedHistory ?? []).map((e) => {
            const trade = verifiedHistoryToTrade(e, accumulated);
            accumulated = trade.accumulated;
            return trade;
          });

          set({
            status: config?.active ? "RUNNING" : "IDLE",
            profile,
            circuitBreaker: (config?.circuitBreaker as State["circuitBreaker"]) ?? "none",
            history: mappedHistory,
            dailyPnlPct: typeof telemetry?.dailyPnl === "number" ? telemetry.dailyPnl : get().dailyPnlPct,
            todayStats: telemetry?.today
              ? { ...telemetry.today, serverTime: telemetry.serverTime ?? null }
              : get().todayStats,
            errorMsg: null,
          });

          // Backend real emite eventos separados em vez de um único "bot4x:update".
          // Namespace /bot4x: shutdown (circuit breaker) e profit_lock (trava de lucro).
          // Namespace /signals: bot4x:status (atualização geral do bot).
          void backendWs.connect("/bot4x");
          const offShutdown = backendWs.on("bot4x:shutdown", (raw) => {
            const ev = (raw ?? {}) as { userId?: string; reason?: string };
            set({
              status: "STOPPED",
              circuitBreaker: "emergency",
              errorMsg: ev.reason ?? null,
            });
          });
          const offProfitLock = backendWs.on("bot4x:profit_lock", (raw) => {
            const ev = (raw ?? {}) as { userId?: string; pnlPct?: number; message?: string };
            set({
              circuitBreaker: "profitLock",
              dailyPnlPct: typeof ev.pnlPct === "number" ? ev.pnlPct : get().dailyPnlPct,
              errorMsg: ev.message ?? null,
            });
          });
          void backendWs.connect("/signals");
          const offStatus = backendWs.on("bot4x:status", (raw) => {
            const ev = (raw ?? {}) as {
              userId?: string;
              status?: State["status"];
              dailyPnL?: number;
              circuitBreaker?: State["circuitBreaker"];
            };
            const patch: Partial<State> = {};
            if (ev.status) patch.status = ev.status;
            if (typeof ev.dailyPnL === "number") patch.dailyPnlPct = ev.dailyPnL;
            if (ev.circuitBreaker) patch.circuitBreaker = ev.circuitBreaker;
            if (Object.keys(patch).length > 0) set(patch as State);
            // Histórico REAL não é alimentado por eventos de UI nem por bot4x_trades.
            // O ledger verificado é a única fonte; o próximo polling o recarrega.
          });
          wsUnsubs = [offShutdown, offProfitLock, offStatus];

          // O backend interno não expõe WebSocket — mantemos o estado do bot
          // em dia por polling (config + execuções) a cada 10s.
          if (realPoller) clearInterval(realPoller);
          realPoller = setInterval(() => {
            void (async () => {
              try {
                const [cfg, verifiedHistory, telemetry] = await Promise.all([
                  bot4xAdapter.getConfig(uid),
                  bot4xAdapter.verifiedHistory(),
                  bot4xAdapter.telemetry(),
                ]);
                if (!cfg) return;
                const prof = mapBackendProfile(cfg.profile);
                set({
                  status: cfg.active ? "RUNNING" : "IDLE",
                  profile: prof,
                  circuitBreaker: (cfg.circuitBreaker as State["circuitBreaker"]) ?? "none",
                  dailyPnlPct: typeof telemetry?.dailyPnl === "number" ? telemetry.dailyPnl : (cfg.dailyPnl ?? get().dailyPnlPct),
                  todayStats: telemetry?.today
                    ? { ...telemetry.today, serverTime: telemetry.serverTime ?? null }
                    : get().todayStats,
                  history: (() => {
                    let accumulated = 0;
                    return (verifiedHistory ?? []).map((e) => {
                      const trade = verifiedHistoryToTrade(e, accumulated);
                      accumulated = trade.accumulated;
                      return trade;
                    });
                  })(),
                  errorMsg: null,
                });
              } catch (err) {
                logger.error("[Bot4x] poll real failed", { error: err });
              }
            })();
          }, 10_000);
        } catch (err) {
          logger.error("[Bot4x] init real failed", { error: err });
          set({
            status: "ERROR",
            errorMsg: "Não foi possível conectar ao backend. Tente novamente.",
            realInited: false,
          });
        }
      },

      // ─── CLEANUP ──────────────────────────────────────────────────────────
      cleanup: () => {
        const t = get()._ticker;
        if (t) clearInterval(t);
        if (realPoller) {
          clearInterval(realPoller);
          realPoller = undefined;
        }
        if (wsUnsubs.length > 0) {
          wsUnsubs.forEach((fn) => fn());
          wsUnsubs = [];
        }
        set({ _ticker: undefined });
      },

      // ─── SETTERS ──────────────────────────────────────────────────────────
      setMode: (mode) => {
        // REAL é impossível sem credencial Binance verificada pelo backend.
        if (mode === "REAL" && !isRealModeUnlocked()) return;
        if (get().mode === mode) return;
        get().cleanup();
        const sourceReset = getRealModeStateReset();
        set({ ...sourceReset, mode, realInited: false, status: "IDLE", errorMsg: null });
        const uid = get().userId;
        if (uid) {
          void saveConfig(uid, { executionMode: mode }).catch((error) =>
            logger.error("[Bot4x] save execution mode failed", { error }),
          );
        }
        queueMicrotask(() => get().init());
      },
      setTotalCapital: (n) => {
        const v = Math.max(0, n);
        set({ totalCapital: v });
        const uid = get().userId;
        if (uid) saveConfig(uid, { totalCapital: v });
      },
      setAllocationPct: (n) => {
        const v = Math.min(100, Math.max(1, n));
        set({ allocationPct: v });
        const uid = get().userId;
        if (uid) saveConfig(uid, { allocationPct: v });
      },
      setLeverage: (n) => {
        const v = Math.min(10, Math.max(1, n));
        set({ leverage: v });
        const uid = get().userId;
        if (uid) saveConfig(uid, { leverage: v });
      },
      setProfile: (profile) => {
        set({ profile });
        const uid = get().userId;
        if (uid) saveConfig(uid, { profile });
      },
      setSlPct: (n) => {
        const v = Math.min(10, Math.max(0.1, +Number(n).toFixed(2)));
        set({ slPct: v });
        const uid = get().userId;
        if (uid) saveConfig(uid, { slPct: v });
      },
      setTpPct: (n) => {
        const v = Math.min(20, Math.max(0.1, +Number(n).toFixed(2)));
        set({ tpPct: v });
        const uid = get().userId;
        if (uid) saveConfig(uid, { tpPct: v });
      },
      setPreferredPairs: (pairs) => {
        set({ preferredPairs: pairs });
        const uid = get().userId;
        if (uid) saveConfig(uid, { preferredPairs: pairs });
      },
      setAvoidPairs: (pairs) => {
        set({ avoidPairs: pairs });
        const uid = get().userId;
        if (uid) saveConfig(uid, { avoidPairs: pairs });
      },
      setDnaMinSample: (n) => {
        const clamped = Math.max(5, Math.min(100, Math.floor(Number(n) || 10)));
        set({ dnaMinSample: clamped });
      },

      closeOrder: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),
      setMonitorTab: (monitorTab) => set({ monitorTab }),
      toggleFeedPaused: () => set((s) => ({ feedPaused: !s.feedPaused })),
      clearTicks: () => set({ ticks: [] }),
    }),
    {
      name: "bot4x-store-v1",
      storage: createJSONStorage(() => makeUserStorage(() => _currentUserId)),
      // v2: descarta as ordens de demonstração antigas (preços hardcoded)
      // para que sejam re-semeadas com preços reais do backend.
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Partial<State> | undefined;
        if (!state) return persisted as State;
        if (version < 2) {
          const legacy = new Set(["o1", "o2", "o3"]);
          return { ...state, orders: (state.orders ?? []).filter((o) => !legacy.has(o.id)) } as State;
        }
        return state as State;
      },
      // Campos persistidos — ticks e _ticker são runtime
      partialize: (s) => ({
        userId: s.userId,
        mode: s.mode,
        totalCapital: s.totalCapital,
        allocationPct: s.allocationPct,
        leverage: s.leverage,
        profile: s.profile,
        slPct: s.slPct,
        tpPct: s.tpPct,
        dailyPnlPct: s.dailyPnlPct,
        trailingPeakPct: s.trailingPeakPct,
        history: s.history,
        orders: s.orders,
        preferredPairs: s.preferredPairs,
        avoidPairs: s.avoidPairs,
        monitorTab: s.monitorTab,
        ticksProcessed: s.ticksProcessed,
        circuitBreaker: s.circuitBreaker,
        dnaMinSample: s.dnaMinSample,
      }),
    },
  ),
);

// ─── AUTH LISTENER — atualiza userId ao login/logout ─────────────────────────
// Monte isso uma vez no entry-point da app (ex: __root.tsx ou App.tsx).
// Aqui já inicializamos com o usuário atual se já estiver logado.
supabase.auth.getSession().then(({ data }) => {
  const uid = data.session?.user?.id ?? null;
  useBot4xStore.getState().setUserId(uid);
});

supabase.auth.onAuthStateChange((event, session) => {
  const uid = session?.user?.id ?? null;
  useBot4xStore.getState().setUserId(uid);

  // Ao fazer logout: encerra ticker/WS antes de zerar o estado em memória
  // para evitar memory leaks e callbacks rodando contra um store já limpo.
  if (event === "SIGNED_OUT") {
    useBot4xStore.getState().cleanup();
    useBot4xStore.setState({
      userId: null,
      history: [],
      orders: [],
      dailyPnlPct: 0,
      trailingPeakPct: 0,
      ticksProcessed: 0,
      circuitBreaker: "none",
      status: "IDLE",
      realInited: false,
      errorMsg: null,
    });
  }
});


// ─── SELECTORS ────────────────────────────────────────────────────────────────

export function selectActiveCapital(s: State) {
  if (s.totalCapital < 100) return +s.totalCapital.toFixed(2);
  return +(s.totalCapital * (s.allocationPct / 100)).toFixed(2);
}
export function selectSlotSize(s: State) {
  if (s.totalCapital < 100) return +s.totalCapital.toFixed(2);
  return +(selectActiveCapital(s) * RISK_PER_SLOT).toFixed(2);
}
