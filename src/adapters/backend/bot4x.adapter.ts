// Adaptador para configuração e execuções do Bot4x.
import { api, apiClient, endpoints } from "./api.adapter";

export interface BackendBot4xConfig {
  userId: string;
  active: boolean;
  profile: "conservador" | "calibradoRSI" | "calibradoAiScore" | "agressivo";
  dailyPnl?: number;
  openSlots?: number;
  circuitBreaker?: "none" | "emergency" | "profitLock";
  executionMode?: "DEMO" | "REAL";
  exchange?: string;
  apiKeySet?: boolean;
  [k: string]: unknown;
}

export interface Bot4xConfigUI {
  userId: string;
  active: boolean;
  profile: BackendBot4xConfig["profile"];
  dailyPnl?: number;
  openSlots?: number;
  circuitBreaker?: BackendBot4xConfig["circuitBreaker"];
  executionMode: "DEMO" | "REAL";
  exchange: string;
  apiKeySet: boolean;
  raw?: BackendBot4xConfig;
}

export interface BackendBot4xExecution {
  id: string;
  pair: string;
  side: "LONG" | "SHORT" | "BUY" | "SELL";
  entryPrice: number | null;
  pnl?: number | null;
  status: "open" | "closed" | "pending" | string;
  createdAt?: string;
}

export interface BackendBot4xVerifiedHistory {
  id: string;
  pair: string;
  side: "BUY" | "SELL";
  status: "completed" | "submitted";
  entryPrice: number | null;
  executedQty: number | null;
  realizedPnl: number | null;
  profile: string;
  leverage: number;
  createdAt: string;
  lifecycle: string | null;
  clientOrderId: string | null;
  orderId: number | null;
}

export interface BackendBot4xExecutionRich extends BackendBot4xExecution {
  stopLoss?: number;
  takeProfit?: number;
  pnlPct?: number | null;
  result?: string;
  motivo?: string;
}

export interface ExecutionsPage {
  items: BackendBot4xExecutionRich[];
  total: number;
  limit: number;
  offset: number;
}

export interface Bot4xTelemetry {
  serverTime: string;
  active: boolean;
  profile: string;
  circuitBreaker: string;
  dailyPnl: number;
  openSlots: number;
  today: { trades: number; wins: number; losses: number; open: number; pnl: number };
  logs: Array<{ at: string; level: string; message: string; detail?: string }>;
}

export interface BackendBot4xCycleDecision {
  userId: string;
  pair: string;
  side: "BUY" | "SELL";
  score: number;
  decision: "EXECUTION_CANDIDATE" | "IGNORED" | "BLOCKED" | "INACTIVE";
  reason: string;
  mode: "DEMO" | "REAL";
  profile: string;
  circuitBreaker: string;
  openSlots: number;
  executionSubmitted: boolean;
}

export interface BackendBot4xCycle {
  startedAt: string;
  finishedAt: string;
  usersScanned: number;
  activeUsers: number;
  signalsScanned: number;
  candidates: number;
  blocked: number;
  ignored: number;
  decisions: BackendBot4xCycleDecision[];
}

export interface Bot4xUsdtBalance {
  asset: "USDT";
  free: number;
  locked: number;
  total: number;
  available: boolean;
  updatedAt: string;
}

export function mapBot4xConfig(c: BackendBot4xConfig): Bot4xConfigUI {
  return {
    userId: c.userId,
    active: c.active,
    profile: c.profile,
    dailyPnl: c.dailyPnl,
    openSlots: c.openSlots,
    circuitBreaker: c.circuitBreaker ?? "none",
    executionMode: c.executionMode === "REAL" ? "REAL" : "DEMO",
    exchange: typeof c.exchange === "string" ? c.exchange : "binance",
    apiKeySet: c.apiKeySet === true,
    raw: c,
  };
}

export const bot4xAdapter = {
  // userId permanece como parâmetro para compatibilidade, mas o backend
  // agora identifica o usuário pelo token JWT — não vai no path.
  async getConfig(_userId?: string): Promise<Bot4xConfigUI | null> {
    try {
      const data = await api.get<BackendBot4xConfig | null>(endpoints.bot4x.config);
      return data ? mapBot4xConfig(data) : null;
    } catch {
      return null;
    }
  },
  async updateConfig(_userId: string | undefined, patch: Partial<BackendBot4xConfig>): Promise<Bot4xConfigUI | null> {
    try {
      const data = await api.patch<BackendBot4xConfig>(endpoints.bot4x.updateConfig, patch);
      return mapBot4xConfig(data);
    } catch {
      return null;
    }
  },
  async verifiedHistory(limit = 500): Promise<BackendBot4xVerifiedHistory[]> {
    return api.get<BackendBot4xVerifiedHistory[]>(
      `${endpoints.bot4x.executions}?source=verified&limit=${encodeURIComponent(String(limit))}`,
    );
  },
  async executions(): Promise<BackendBot4xExecution[]> {
    try {
      return (await api.get<BackendBot4xExecution[]>(endpoints.bot4x.executions)) ?? [];
    } catch {
      return [];
    }
  },
  /** Página de execuções com filtros — erros são propagados para a UI tratar. */
  async executionsPage(params: {
    limit: number;
    offset: number;
    result?: string;
    pair?: string;
    side?: string;
    profile?: string;
    from?: string;
    to?: string;
  }): Promise<ExecutionsPage> {
    const qs = new URLSearchParams();
    qs.set("limit", String(params.limit));
    qs.set("offset", String(params.offset));
    if (params.result && params.result !== "all") qs.set("result", params.result);
    if (params.pair && params.pair !== "all") qs.set("pair", params.pair);
    if (params.side && params.side !== "all") qs.set("side", params.side);
    if (params.profile && params.profile !== "all") qs.set("profile", params.profile);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    return api.get<ExecutionsPage>(`${endpoints.bot4x.executions}?${qs.toString()}`);
  },
  /** Baixa o histórico filtrado em CSV (autenticado via apiClient). */
  async exportCsv(params: {
    result?: string;
    pair?: string;
    side?: string;
    profile?: string;
    from?: string;
    to?: string;
  }): Promise<{ filename: string; csv: string }> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && v !== "all") qs.set(k, v);
    }
    const res = await apiClient.get<string>(
      `${endpoints.bot4x.executions}/export?${qs.toString()}`,
      { responseType: "text", headers: { Accept: "text/csv" } },
    );
    return {
      filename: `bot4x-execucoes-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: typeof res.data === "string" ? res.data : String(res.data),
    };
  },
  async telemetry(): Promise<Bot4xTelemetry> {
    return api.get<Bot4xTelemetry>(endpoints.bot4x.telemetry);
  },
  async cycle(): Promise<BackendBot4xCycle> {
    return api.get<BackendBot4xCycle>(endpoints.bot4x.cycle);
  },
  async balance(): Promise<Bot4xUsdtBalance> {
    return api.get<Bot4xUsdtBalance>(endpoints.bot4x.balance);
  },
  async start(userId: string) {
    return api.post(endpoints.bot4x.start, { userId });
  },
  async stop(userId: string) {
    return api.post(endpoints.bot4x.stop, { userId });
  },
};
