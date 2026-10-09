import { api, apiClient, endpoints } from "./api.adapter";

export interface BackendSignal {
  id: string;
  pair: string;
  side: "BUY" | "SELL" | "LONG" | "SHORT";
  score: number;
  aiScore?: number | null;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit1?: number | null;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  status?: "active" | "closed" | "pending" | string | null;
  tf?: string | null;
  exchange?: string | null;
  createdAt?: string | null;
  type?: string | null;
  setup?: string | null;
  confluences?: string[] | null;
  dnaMatch?: number | null;
  manipRisk?: "low" | "medium" | "high" | null;
  session?: string | null;
  riskPct?: number | null;
  volDelta?: number | null;
  rr?: number | null;
  confirms?: { rsi: boolean | null; macd: boolean | null; volume: boolean | null; structure: boolean | null; vwap: boolean | null } | null;
}

export interface SignalUI {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  confidence: number;
  entry: number | null;
  sl: number | null;
  tp: number | null;
  tp2?: number | null;
  tp3?: number | null;
  state: "active" | "closed" | "pending" | null;
  tf?: string | null;
  exchange?: string | null;
  createdAt?: string | null;
  type?: string | null;
  setup?: string | null;
  confluences?: string[] | null;
  dnaMatch?: number | null;
  manipRisk?: "low" | "medium" | "high" | null;
  session?: string | null;
  riskPct?: number | null;
  volDelta?: number | null;
  rr?: number | null;
  confirms?: BackendSignal["confirms"];
  raw?: BackendSignal;
}

export function normalizeExchange(exchange: string | null | undefined): string | null {
  if (!exchange) return null;
  const normalized = exchange.trim().toLowerCase();
  return normalized === "binance" ? "binance" : normalized || null;
}

export function deriveRiskReward(entry: number | null | undefined, stop: number | null | undefined, target: number | null | undefined): number | null {
  if (![entry, stop, target].every((value) => typeof value === "number" && Number.isFinite(value) && value > 0)) return null;
  const risk = Math.abs(entry! - stop!);
  const reward = Math.abs(target! - entry!);
  return risk > 0 && reward > 0 ? Number((reward / risk).toFixed(4)) : null;
}

export function mapSignal(s: BackendSignal): SignalUI {
  if (s.side !== "BUY" && s.side !== "SELL" && s.side !== "LONG" && s.side !== "SHORT") {
    throw new Error(`Sinal ${s.id} possui side inválido`);
  }
  if (!s.id || !s.pair || !Number.isFinite(s.score) || !Number.isFinite(s.entryPrice ?? NaN)) {
    throw new Error(`Sinal ${s.id || "desconhecido"} possui campos obrigatórios inválidos`);
  }

  const side = s.side === "LONG" || s.side === "BUY" ? "BUY" : "SELL";
  const state = s.status === "closed" || s.status === "pending" || s.status === "active" ? s.status : null;
  return {
    id: s.id,
    symbol: s.pair,
    direction: side,
    confidence: s.score,
    entry: s.entryPrice ?? null,
    sl: s.stopLoss ?? null,
    tp: s.takeProfit1 ?? null,
    tp2: s.takeProfit2 ?? null,
    tp3: s.takeProfit3 ?? null,
    state,
    tf: s.tf ?? null,
    exchange: normalizeExchange(s.exchange),
    createdAt: s.createdAt ?? null,
    type: s.type ?? null,
    setup: s.setup ?? null,
    confluences: s.confluences ?? null,
    dnaMatch: s.dnaMatch ?? null,
    manipRisk: s.manipRisk ?? null,
    session: s.session ?? null,
    riskPct: s.riskPct ?? null,
    volDelta: s.volDelta ?? null,
    rr: deriveRiskReward(s.entryPrice, s.stopLoss, s.takeProfit1),
    confirms: s.confirms ?? null,
    raw: s,
  };
}

export function mapSignalList(data: BackendSignal[]): { signals: SignalUI[]; discardedCount: number } {
  const signals: SignalUI[] = [];
  let discardedCount = 0;
  for (const item of data) {
    try { signals.push(mapSignal(item)); }
    catch { discardedCount++; }
  }
  return { signals, discardedCount };
}

let lastDiscardedCount = 0;
let lastFailedPairs: string[] = [];
export const signalAdapter = {
  getLastDiscardedCount: () => lastDiscardedCount,
  getLastFailedPairs: () => [...lastFailedPairs],
  async list(): Promise<SignalUI[]> {
    try {
      const response = await apiClient.get<BackendSignal[]>(endpoints.signals.list);
      lastFailedPairs = String(response.headers["x-signals-failed-pairs"] ?? "").split(",").filter(Boolean);
      const mapped = mapSignalList(response.data ?? []);
      lastDiscardedCount = mapped.discardedCount;
      return mapped.signals;
    } catch (error) {
      const response = (error as { response?: { headers?: Record<string, unknown> } }).response;
      lastFailedPairs = String(response?.headers?.["x-signals-failed-pairs"] ?? "").split(",").filter(Boolean);
      throw error;
    }
  },
  async byId(id: string): Promise<SignalUI | null> {
    const data = await api.get<BackendSignal | null>(endpoints.signals.byId(id));
    return data ? mapSignal(data) : null;
  },
};
