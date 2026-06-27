// Server function que proxia o listing de sinais do backend NestJS e cacheia
// a resposta. Como a lista é por usuário (RLS no backend usa o bearer), a key
// de cache inclui o userId — sem isso, dois usuários veriam a lista um do
// outro. TTL curto (10s) para refletir novos sinais rapidamente.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader } from "@tanstack/react-start/server";
import { cachedJson } from "./cache";

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

const SIGNALS_TTL = Number(process.env.CACHE_TTL_SIGNALS_SECONDS ?? 10);

function resolveApiBase(): string {
  return (
    process.env.API_BASE_URL ??
    process.env.VITE_API_BASE_URL ??
    ""
  );
}

function normalizeSide(side: string): "BUY" | "SELL" {
  return side === "LONG" || side === "BUY" ? "BUY" : "SELL";
}

export const getSignalsList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SignalListItemDTO[]> => {
    const base = resolveApiBase();
    if (!base) return [];

    // Forward do bearer original — o backend valida o mesmo token.
    const authHeader = getRequestHeader("authorization");
    if (!authHeader) return [];

    return cachedJson(`signals:list:${context.userId}`, SIGNALS_TTL, async () => {
      const res = await fetch(`${base.replace(/\/+$/, "")}/signals`, {
        headers: { authorization: authHeader, accept: "application/json" },
      });
      if (!res.ok) return [];
      const raw = (await res.json()) as Array<Record<string, unknown>>;
      return raw.map((s) => ({
        id: String(s.id),
        symbol: String(s.pair ?? ""),
        direction: normalizeSide(String(s.side ?? "BUY")),
        confidence: Number(s.aiScore ?? s.score ?? 0),
        entry: Number(s.entryPrice ?? 0),
        sl: s.stopLoss != null ? Number(s.stopLoss) : undefined,
        tp: s.takeProfit1 != null ? Number(s.takeProfit1) : undefined,
        state: ((s.status as string) ?? "active") as SignalListItemDTO["state"],
        tf: s.tf as string | undefined,
        exchange: s.exchange as string | undefined,
        createdAt: s.createdAt as string | undefined,
      }));
    });
  });
