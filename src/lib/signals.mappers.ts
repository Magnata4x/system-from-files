// Helpers do listing de sinais, isolados do arquivo de server functions
// (arquivos com createServerFn devem ser wrappers finos).
export interface SignalListItemDTO {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  confidence: number;
  entry: number;
  sl?: number;
  tp?: number;
  state: "active" | "closed" | "pending";
  tf?: string;
  exchange?: string;
  createdAt?: string;
}

export function normalizeSide(side: string): "BUY" | "SELL" {
  return side === "LONG" || side === "BUY" ? "BUY" : "SELL";
}

export function mapSignal(s: Record<string, unknown>): SignalListItemDTO {
  return {
    id: String(s.id),
    symbol: String(s.pair ?? s.symbol ?? ""),
    direction: normalizeSide(String(s.side ?? "BUY")),
    confidence: Number(s.aiScore ?? s.score ?? 0),
    entry: Number(s.entryPrice ?? 0),
    sl: s.stopLoss != null ? Number(s.stopLoss) : undefined,
    tp: s.takeProfit1 != null ? Number(s.takeProfit1) : undefined,
    state: ((s.status as string) ?? "active") as SignalListItemDTO["state"],
    tf: s.tf as string | undefined,
    exchange: s.exchange as string | undefined,
    createdAt: s.createdAt as string | undefined,
  };
}

export function resolveApiBase(): string {
  return process.env.API_BASE_URL ?? process.env.VITE_API_BASE_URL ?? "";
}

export const SIGNALS_TTL = Number(process.env.CACHE_TTL_SIGNALS_SECONDS ?? 10);
