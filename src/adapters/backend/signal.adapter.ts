// Tradutor entre o shape do backend (Signal) e o shape esperado pela UI (SignalUI).
import { api, endpoints } from "./api.adapter";

export interface BackendSignal {
  id: string;
  pair: string;
  side: "BUY" | "SELL" | "LONG" | "SHORT";
  score: number;
  aiScore?: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  status?: "active" | "closed" | "pending" | string;
  tf?: string;
  exchange?: string;
  createdAt?: string;
}

export interface SignalUI {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  confidence: number;
  entry: number;
  sl?: number;
  tp?: number;
  tp2?: number;
  tp3?: number;
  state: "active" | "closed" | "pending";
  tf?: string;
  exchange?: string;
  createdAt?: string;
  // raw passthrough para componentes que precisem de campos extras
  raw?: BackendSignal;
}

export function mapSignal(s: BackendSignal): SignalUI {
  const side = s.side === "LONG" || s.side === "BUY" ? "BUY" : "SELL";
  const state = (s.status as SignalUI["state"]) ?? "active";
  return {
    id: s.id,
    symbol: s.pair,
    direction: side,
    confidence: s.aiScore ?? s.score ?? 0,
    entry: s.entryPrice,
    sl: s.stopLoss,
    tp: s.takeProfit1,
    tp2: s.takeProfit2,
    tp3: s.takeProfit3,
    state,
    tf: s.tf,
    exchange: s.exchange,
    createdAt: s.createdAt,
    raw: s,
  };
}

export const signalAdapter = {
  async list(): Promise<SignalUI[]> {
    try {
      const data = await api.get<BackendSignal[]>(endpoints.signals.list);
      return (data ?? []).map(mapSignal);
    } catch {
      return [];
    }
  },
  async byId(id: string): Promise<SignalUI | null> {
    try {
      const data = await api.get<BackendSignal | null>(endpoints.signals.byId(id));
      return data ? mapSignal(data) : null;
    } catch {
      return null;
    }
  },
};
