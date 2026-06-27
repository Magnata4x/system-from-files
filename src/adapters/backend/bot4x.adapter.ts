// Adaptador para configuração e execuções do Bot4x.
import { api, endpoints } from "./api.adapter";

export interface BackendBot4xConfig {
  userId: string;
  active: boolean;
  profile: "conservador" | "calibradoRSI" | "calibradoAiScore" | "agressivo";
  dailyPnl?: number;
  openSlots?: number;
  circuitBreaker?: "none" | "emergency" | "profitLock";
  [k: string]: unknown;
}

export interface Bot4xConfigUI {
  userId: string;
  active: boolean;
  profile: BackendBot4xConfig["profile"];
  dailyPnl?: number;
  openSlots?: number;
  circuitBreaker?: BackendBot4xConfig["circuitBreaker"];
  raw?: BackendBot4xConfig;
}

export interface BackendBot4xExecution {
  id: string;
  pair: string;
  side: "LONG" | "SHORT" | "BUY" | "SELL";
  entryPrice: number;
  pnl?: number;
  status: "open" | "closed" | "pending" | string;
  createdAt?: string;
}

export function mapBot4xConfig(c: BackendBot4xConfig): Bot4xConfigUI {
  return {
    userId: c.userId,
    active: c.active,
    profile: c.profile,
    dailyPnl: c.dailyPnl,
    openSlots: c.openSlots,
    circuitBreaker: c.circuitBreaker ?? "none",
    raw: c,
  };
}

export const bot4xAdapter = {
  async getConfig(userId: string): Promise<Bot4xConfigUI | null> {
    try {
      const data = await api.get<BackendBot4xConfig | null>(endpoints.bot4x.config(userId));
      return data ? mapBot4xConfig(data) : null;
    } catch {
      return null;
    }
  },
  async updateConfig(userId: string, patch: Partial<BackendBot4xConfig>): Promise<Bot4xConfigUI | null> {
    try {
      const data = await api.patch<BackendBot4xConfig>(endpoints.bot4x.updateConfig(userId), patch);
      return mapBot4xConfig(data);
    } catch {
      return null;
    }
  },
  async executions(): Promise<BackendBot4xExecution[]> {
    try {
      return (await api.get<BackendBot4xExecution[]>(endpoints.bot4x.executions)) ?? [];
    } catch {
      return [];
    }
  },
  async start(userId: string) {
    try {
      return await api.post(endpoints.bot4x.start, { userId });
    } catch {
      return null;
    }
  },
  async stop(userId: string) {
    try {
      return await api.post(endpoints.bot4x.stop, { userId });
    } catch {
      return null;
    }
  },
};
