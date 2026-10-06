// Camada central de endpoints REST do backend NestJS.
// Não substitui o apiClient — apenas centraliza paths/uso.
import { api, apiClient } from "@/lib/apiClient";

export const endpoints = {
  auth: {
    me: "/auth/me",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
  },
  signals: {
    list: "/signals",
    byId: (id: string) => `/signals/${id}`,
  },
  dna: {
    profile: (userId: string) => `/dna/profile/${userId}`,
  },
  bot4x: {
    // Backend identifica o usuário pelo JWT — sem userId no path.
    config: "/bot4x/config",
    updateConfig: "/bot4x/config",
    executions: "/bot4x/executions",
    telemetry: "/bot4x/telemetry",
    cycle: "/bot4x/cycle",
    balance: "/bot4x/balance",
    start: "/bot4x/start",
    stop: "/bot4x/stop",
  },
  prices: {
    bySymbol: (sym: string) => `/prices/${sym}`,
    all: "/prices",
  },
  risk: {
    evaluate: "/risk/evaluate",
    status: "/risk/status",
  },
  marketRegime: {
    current: "/market-regime/current",
  },
  copilot: {
    history: "/copilot/history",
  },
  calibrator: {
    state: (userId: string) => `/calibrator/state/${userId}`,
    feedback: (userId: string) => `/calibrator/feedback/${userId}`,
    // /simulate foi descontinuado; o backend responde apenas em /run.
    simulate: (userId: string) => `/calibrator/run/${userId}`,
    intent: (userId: string) => `/calibrator/intent/${userId}`,
  },
  exchange: {
    credentials: "/exchange/credentials",
    test: "/exchange/test",
  },
} as const;


export { api, apiClient };
