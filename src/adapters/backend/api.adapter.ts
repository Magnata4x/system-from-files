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
    config: (userId: string) => `/bot4x/config/${userId}`,
    updateConfig: (userId: string) => `/bot4x/config/${userId}`,
    executions: "/bot4x/executions",
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
    simulate: (userId: string) => `/calibrator/simulate/${userId}`,
  },
} as const;


export { api, apiClient };
