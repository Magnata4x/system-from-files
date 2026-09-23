import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  type ExecMode,
  type CalibProfile,
  type Order,
  type Side,
  type Tick,
  type Trade,
  makeTick,
  genHistory,
} from "./bot4x-data";
import { PROFILES } from "./bot4x-data";
import { bot4xAdapter, type BackendBot4xExecution } from "@/adapters/backend/bot4x.adapter";
import { api } from "@/adapters/backend/api.adapter";
import { backendWs } from "@/adapters/backend/ws-client";
import { supabase } from "@/integrations/supabase/client";
import { saveTrade, loadTrades, saveTradeWithOutbox } from "./bot4x-trades-db";
import { logger } from "./logger";
import { loadConfig, saveConfig } from "./bot4x-config-db";
import type { CalibProfile as CalibProfileType } from "./bot4x-data";

// ─── FEATURE FLAG ─────────────────────────────────────────────────────────────
// Quando false, TODA a execução cai em DEMO (simulação client-side com Math.random).
// A UI deve refletir isso via getEffectiveMode(), nunca o `mode` cru do store.
export const REAL_MODE_ENABLED = import.meta.env.VITE_BOT4X_REAL_ENABLED === "true";

// Destrave em runtime: só há modo REAL com credenciais de exchange verificadas.
let exchangeVerified = false;
export function setExchangeVerified(value: boolean) {
  exchangeVerified = value;
}
export function isRealModeUnlocked(): boolean {
  return REAL_MODE_ENABLED || exchangeVerified;
}

// Fonte de verdade única do modo efetivo. UI e lógica de init() devem usar isto.
export function getEffectiveMode(persistedMode: ExecMode): ExecMode {
  return isRealModeUnlocked() ? persistedMode : "DEMO";
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
  seedOrders: () => void;
  setMonitorTab: (t: "tick" | "order" | "shutdown") => void;
  toggleFeedPaused: () => void;
  clearTicks: () => void;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function genCtxTick(get: () => State): Tick {
  const s = get();
  return makeTick({
    profile: PROFILES[s.profile],
    slotsUsed: s.orders.length,
    busyPairs: s.orders.map((o) => o.pair),
    shutdown: s.dailyPnlPct <= -1.5,
  });
}

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

function executionToTrade(e: BackendBot4xExecution, profile: CalibProfile, leverage: number): Trade {
  const openedAt = e.createdAt ? new Date(e.createdAt).getTime() : Date.now();
  const pnl = e.pnl ?? 0;
  const side: Side = e.side === "BUY" || e.side === "LONG" ? "LONG" : "SHORT";
  const result: Trade["result"] = e.status === "open" || e.status === "pending" ? "BLOCKED" : pnl >= 0 ? "WIN" : "LOSS";
  const entry = e.entryPrice ?? 0;
  return {
    id: e.id,
    day: new Date(openedAt).toISOString().slice(0, 10),
    pair: e.pair,
    side,
    entry,
    stop: entry,
    target: entry,
    result,
    pnl,
    pnlPct: pnl,
    accumulated: 0,
    profile,
    leverage,
    motivo: "",
    hour: new Date(openedAt).getHours(),
  };
}

let wsUnsubs: Array<() => void> = [];
let realPoller: ReturnType<typeof setInterval> | undefined;

// Preços reais do backend interno (/api/prices) usados para semear o painel.
async function fetchLivePrices(): Promise<Record<string, number>> {
  const list = await api.get<Array<{ symbol: string; price: number }>>("/prices");
  const map: Record<string, number> = {};
  for (const t of list ?? []) if (t?.symbol) map[t.symbol] = Number(t.price);
  return map;
}

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
        set({ userId: uid, realInited: false });

        // O set acima passa a gravar na chave do usuário. Restaure o snapshot
        // capturado antes dessa troca para não sobrescrever sua preferência.
        if (persistedForUser && typeof localStorage !== "undefined") {
          localStorage.setItem(userStorageKey, persistedForUser);
        }
        // Rehidrata o store com os dados do novo usuário.
        useBot4xStore.persist.rehydrate();
        // Carrega histórico real do banco ao logar
        if (uid) {
          loadTrades(uid)
            .then((trades) => {
              if (trades.length > 0) set({ history: trades });
            })
            .catch(() => {
              /* silently ignore — localStorage fallback já foi carregado */
            });
        }
        // Carrega configuração persistida no banco
        if (uid) {
          loadConfig(uid)
            .then((cfg) => {
              if (!cfg) return;
              set({
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
            })
            .catch(() => {
              /* fallback para localStorage */
            });
        }
      },

      // ─── INIT ─────────────────────────────────────────────────────────────
      init: async () => {
        const s = get();
        const mode = s.mode;

        // ── DEMO MODE ────────────────────────────────────────────────────────
        if (getEffectiveMode(mode) === "DEMO") {
          // Guard explícito: setInterval pode retornar 0 em alguns runtimes,
          // então não basta `if (s._ticker)`.
          if (s._ticker !== undefined && s._ticker !== null) return;



          if (s.history.length === 0) {
            const uid = get().userId;
            if (uid) {
              loadTrades(uid)
                .then((trades) => {
                  if (trades.length > 0) {
                    set({ history: trades });
                  } else {
                    set({ history: genHistory(183) });
                  }
                })
                .catch(() => {
                  set({ history: genHistory(183) });
                });
            } else {
              set({ history: genHistory(183) });
            }
          }

          get().seedOrders();

          const ticker = setInterval(() => {
            if (get().feedPaused) return;
            const t = genCtxTick(get);
            set((prev) => {
              const walked = prev.orders.map((o) => {
                const drift = (Math.random() - 0.48) * 0.18;
                return { ...o, pnlPct: +(o.pnlPct + drift).toFixed(2) };
              });

              const slLimit = -prev.slPct;
              const tpLimit = prev.tpPct;

              const closed = walked.filter((o) => o.pnlPct <= slLimit || o.pnlPct >= tpLimit);
              const alive = walked.filter((o) => o.pnlPct > slLimit && o.pnlPct < tpLimit);

              const newTrades: Trade[] = closed.map((o) => ({
                id: o.id,
                day: new Date().toISOString().slice(0, 10),
                pair: o.pair,
                side: o.side,
                entry: o.entry,
                stop: o.sl,
                target: o.tp,
                result: o.pnlPct >= tpLimit ? "WIN" : "LOSS",
                pnl: +((o.pnlPct * (prev.totalCapital * (prev.allocationPct / 100))) / 100).toFixed(2),
                pnlPct: o.pnlPct,
                accumulated: 0,
                profile: prev.profile,
                leverage: prev.leverage,
                motivo: o.pnlPct >= tpLimit ? "TP atingido" : "SL atingido",
                hour: new Date().getHours(),
              }));

              if (newTrades.length > 0) {
                const uid = get().userId;
                if (uid) {
                  newTrades.forEach((t) => saveTrade(uid, t));
                }
              }



              const today = new Date().toISOString().slice(0, 10);
              const allTodayTrades = [...newTrades, ...prev.history.filter((h) => h.day === today)];
              const dailyPnlPct = allTodayTrades.reduce((acc, t) => acc + t.pnlPct, 0);

              let nextOrders = alive;
              const slotsFree = alive.length < MAX_SLOTS;
              const pairBusy = alive.some((o) => o.pair === t.pair);
              const pairAvoided = prev.avoidPairs.includes(t.pair);
              if (t.verdict === "EXECUTE" && t.side && slotsFree && !pairBusy && !pairAvoided) {
                const side: Side = t.side === "BUY" ? "LONG" : "SHORT";
                const base = t.pair.startsWith("BTC")
                  ? 65000
                  : t.pair.startsWith("ETH")
                    ? 1800
                    : t.pair.startsWith("SOL")
                      ? 150
                      : t.pair.startsWith("BNB")
                        ? 580
                        : 1 + Math.random() * 40;
                const entry = +(base * (0.99 + Math.random() * 0.02)).toFixed(2);
                const slMult = prev.slPct / 100;
                const tpMult = prev.tpPct / 100;
                nextOrders = [
                  ...alive,
                  {
                    id: `o_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
                    pair: t.pair,
                    side,
                    entry,
                    sl: +(entry * (side === "LONG" ? 1 - slMult : 1 + slMult)).toFixed(2),
                    tp: +(entry * (side === "LONG" ? 1 + tpMult : 1 - tpMult)).toFixed(2),
                    openedAt: Date.now(),
                    pnlPct: 0,
                  },
                ];
              }

              return {
                ticks: [t, ...prev.ticks].slice(0, 40),
                ticksProcessed: prev.ticksProcessed + 1,
                orders: nextOrders,
                dailyPnlPct: +dailyPnlPct.toFixed(3),
                history: newTrades.length > 0 ? [...newTrades, ...prev.history].slice(0, 500) : prev.history,
              };
            });
          }, 8000);

          set({
            ticks: Array.from({ length: 5 }, () => genCtxTick(get)),
            _ticker: ticker,
          });
          return;
        }

        // ── REAL MODE ────────────────────────────────────────────────────────
        if (get().realInited) return;
        set({ status: "LOADING", realInited: true });

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const uid = user?.id;
          if (!uid) throw new Error("Usuário não autenticado");

          const [config, executions] = await Promise.all([bot4xAdapter.getConfig(uid), bot4xAdapter.executions()]);

          const profile = mapBackendProfile(config?.profile);
          const leverage = get().leverage;

          const mappedHistory: Trade[] = (executions ?? []).map((e: BackendBot4xExecution) =>
            executionToTrade(e, profile, leverage),
          );

          set({
            status: config?.active ? "RUNNING" : "IDLE",
            profile,
            circuitBreaker: (config?.circuitBreaker as State["circuitBreaker"]) ?? "none",
            history: mappedHistory,
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
              execution?: BackendBot4xExecution;
            };
            const patch: Partial<State> = {};
            if (ev.status) patch.status = ev.status;
            if (typeof ev.dailyPnL === "number") patch.dailyPnlPct = ev.dailyPnL;
            if (ev.circuitBreaker) patch.circuitBreaker = ev.circuitBreaker;
            if (Object.keys(patch).length > 0) set(patch as State);
            if (ev.execution) {
              const s = get();
              const trade = executionToTrade(ev.execution, s.profile, s.leverage);
              set((prev) => ({ history: [trade, ...prev.history].slice(0, 500) }));
              if (s.userId) {
                void saveTradeWithOutbox(s.userId, trade).catch((err) =>
                  logger.error("[Bot4x] saveTradeWithOutbox failed", { error: err, tradeId: trade.id }),
                );
              }
            }
          });
          wsUnsubs = [offShutdown, offProfitLock, offStatus];

          // O backend interno não expõe WebSocket — mantemos o estado do bot
          // em dia por polling (config + execuções) a cada 10s.
          if (realPoller) clearInterval(realPoller);
          realPoller = setInterval(() => {
            void (async () => {
              try {
                const [cfg, execs] = await Promise.all([
                  bot4xAdapter.getConfig(uid),
                  bot4xAdapter.executions(),
                ]);
                if (!cfg) return;
                const prof = mapBackendProfile(cfg.profile);
                set({
                  status: cfg.active ? "RUNNING" : "IDLE",
                  profile: prof,
                  circuitBreaker: (cfg.circuitBreaker as State["circuitBreaker"]) ?? "none",
                  dailyPnlPct: cfg.dailyPnl ?? get().dailyPnlPct,
                  history: (execs ?? []).map((e) => executionToTrade(e, prof, get().leverage)),
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
        if (mode === "REAL" && !isRealModeUnlocked()) return;
        if (get().mode === mode) return;
        get().cleanup();
        set({ mode, realInited: false, status: "IDLE", errorMsg: null });
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
      // Semeia ordens de demonstração a partir dos preços reais do backend
      // interno (/api/prices). Nunca sobrescreve ordens já existentes.
      seedOrders: () => {
        if (get().orders.length > 0) return;
        const specs: Array<{ id: string; pair: string; side: Side; ageMin: number; pnlPct: number }> = [
          { id: "o1", pair: "BTC/USDT", side: "LONG", ageMin: 4, pnlPct: +0.18 },
          { id: "o2", pair: "ETH/USDT", side: "SHORT", ageMin: 12, pnlPct: -0.09 },
          { id: "o3", pair: "SOL/USDT", side: "LONG", ageMin: 7, pnlPct: +0.31 },
        ];

        const build = (prices: Record<string, number>) => {
          const s = get();
          const slMult = s.slPct / 100;
          const tpMult = s.tpPct / 100;
          const orders: Order[] = specs
            .filter((sp) => prices[sp.pair] && prices[sp.pair]! > 0)
            .map((sp) => {
              const entry = +prices[sp.pair]!.toFixed(2);
              const long = sp.side === "LONG";
              return {
                id: sp.id,
                pair: sp.pair,
                side: sp.side,
                entry,
                sl: +(entry * (long ? 1 - slMult : 1 + slMult)).toFixed(2),
                tp: +(entry * (long ? 1 + tpMult : 1 - tpMult)).toFixed(2),
                openedAt: Date.now() - 1000 * 60 * sp.ageMin,
                pnlPct: sp.pnlPct,
              };
            });
          if (orders.length > 0 && get().orders.length === 0) set({ orders });
        };

        void fetchLivePrices()
          .then(build)
          .catch(() => {
            /* sem preços — painel inicia sem ordens abertas */
          });
      },
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
