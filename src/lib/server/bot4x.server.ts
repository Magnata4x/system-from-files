// Config e execuções do Bot4x sobre o banco interno.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ApiError } from "./api-auth.server";
import { CIRCUIT_BREAKER_LOSS_PCT, PROFIT_LOCK_TARGET_PCT } from "./engine.server";

type Client = SupabaseClient<Database>;
type ConfigRow = Database["public"]["Tables"]["bot4x_configs"]["Row"];

export function mapConfig(row: ConfigRow) {
  return {
    userId: row.user_id,
    active: row.active,
    profile: row.profile,
    dailyPnl: Number(row.daily_pnl ?? 0),
    openSlots: row.open_slots ?? 0,
    circuitBreaker: row.circuit_breaker ?? "none",
    rsiThresholdLow: Number(row.rsi_threshold_low ?? 35),
    rsiThresholdHigh: Number(row.rsi_threshold_high ?? 65),
    aiScoreMin: row.ai_score_min ?? 85,
    fomoLimit: Number(row.fomo_limit ?? 15),
    leverage: row.leverage ?? 5,
    activeCapital: Number(row.active_capital ?? 0),
    totalCapital: Number(row.total_capital ?? 1000),
    allocationPct: row.allocation_pct ?? 30,
    slPct: Number(row.sl_pct ?? 0.5),
    tpPct: Number(row.tp_pct ?? 1),
    exchange: row.exchange ?? "binance",
    apiKeySet: row.api_key_set ?? false,
    totalTradesToday: row.total_trades_today ?? 0,
    preferredPairs: row.preferred_pairs,
    avoidPairs: row.avoid_pairs,
    updatedAt: row.updated_at,
  };
}

export async function getOrCreateConfig(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("bot4x_configs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  if (data) return applyCircuitBreaker(supabase, data);

  const { data: created, error: insertError } = await supabase
    .from("bot4x_configs")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (insertError) throw new ApiError(insertError.message, 500);
  return mapConfig(created);
}

/** Circuit breaker / profit lock — portado do Bot4xService (cron a cada 10s). */
async function applyCircuitBreaker(supabase: Client, row: ConfigRow) {
  const pnl = Number(row.daily_pnl ?? 0);
  let next: Partial<ConfigRow> | null = null;
  if (row.active && pnl <= CIRCUIT_BREAKER_LOSS_PCT && row.circuit_breaker !== "emergency") {
    next = {
      circuit_breaker: "emergency",
      active: false,
      emergency_triggered_at: new Date().toISOString(),
    };
  } else if (row.active && pnl >= PROFIT_LOCK_TARGET_PCT && row.circuit_breaker !== "profitLock") {
    next = { circuit_breaker: "profitLock", profit_lock_triggered_at: new Date().toISOString() };
  }
  if (!next) return mapConfig(row);

  const { data, error } = await supabase
    .from("bot4x_configs")
    .update(next)
    .eq("user_id", row.user_id)
    .select("*")
    .single();
  if (error) return mapConfig(row);
  return mapConfig(data);
}

const PATCHABLE: Record<string, keyof ConfigRow> = {
  active: "active",
  profile: "profile",
  rsiThresholdLow: "rsi_threshold_low",
  rsiThresholdHigh: "rsi_threshold_high",
  aiScoreMin: "ai_score_min",
  fomoLimit: "fomo_limit",
  leverage: "leverage",
  slPct: "sl_pct",
  tpPct: "tp_pct",
  allocationPct: "allocation_pct",
  totalCapital: "total_capital",
  activeCapital: "active_capital",
  exchange: "exchange",
  preferredPairs: "preferred_pairs",
  avoidPairs: "avoid_pairs",
  circuitBreaker: "circuit_breaker",
};

export async function updateConfig(
  supabase: Client,
  userId: string,
  patch: Record<string, unknown>,
) {
  await getOrCreateConfig(supabase, userId);
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    const column = PATCHABLE[key] ?? (key in PATCHABLE ? undefined : undefined);
    if (column) update[column] = value;
    else if (Object.values(PATCHABLE).includes(key as keyof ConfigRow)) update[key] = value;
  }
  if (Object.keys(update).length === 0) return getOrCreateConfig(supabase, userId);

  const { data, error } = await supabase
    .from("bot4x_configs")
    .update(update as Database["public"]["Tables"]["bot4x_configs"]["Update"])
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new ApiError(error.message, 400);
  return mapConfig(data);
}

export async function listExecutions(supabase: Client, userId: string, limit = 50) {
  const { data, error } = await supabase
    .from("bot4x_trades")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new ApiError(error.message, 500);
  return (data ?? []).map((t) => ({
    id: t.id,
    pair: t.pair,
    side: t.side as "LONG" | "SHORT",
    entryPrice: Number(t.entry),
    stopLoss: t.stop === null ? undefined : Number(t.stop),
    takeProfit: t.target === null ? undefined : Number(t.target),
    pnl: Number(t.pnl ?? 0),
    pnlPct: Number(t.pnl_pct ?? 0),
    status: t.result === "open" ? "open" : "closed",
    result: t.result,
    createdAt: t.created_at,
  }));
}

export interface ExecutionQuery {
  limit?: number;
  offset?: number;
  result?: string;
  pair?: string;
  side?: string;
  /** Data inicial (YYYY-MM-DD) — filtra pela coluna `day`. */
  from?: string;
  /** Data final (YYYY-MM-DD) — filtra pela coluna `day`. */
  to?: string;
  /** Perfil do bot no momento da execução. */
  profile?: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function applyFilters<
  T extends {
    eq: (c: string, v: string) => T;
    gte: (c: string, v: string) => T;
    lte: (c: string, v: string) => T;
  },
>(builder: T, query: ExecutionQuery): T {
  let b = builder;
  if (query.result && query.result !== "all") b = b.eq("result", query.result);
  if (query.pair && query.pair !== "all") b = b.eq("pair", query.pair);
  if (query.side && query.side !== "all") b = b.eq("side", query.side);
  if (query.profile && query.profile !== "all") b = b.eq("profile", query.profile);
  if (query.from && ISO_DAY.test(query.from)) b = b.gte("day", query.from);
  if (query.to && ISO_DAY.test(query.to)) b = b.lte("day", query.to);
  return b;
}

/** Lista paginada + filtrada de execuções, com total para a UI. */
export async function listExecutionsPaged(
  supabase: Client,
  userId: string,
  query: ExecutionQuery = {},
) {
  const limit = Math.min(Math.max(Number(query.limit ?? 20) || 20, 1), 100);
  const offset = Math.max(Number(query.offset ?? 0) || 0, 0);

  let builder = supabase.from("bot4x_trades").select("*", { count: "exact" }).eq("user_id", userId);

  builder = applyFilters(builder, query);

  const { data, error, count } = await builder
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new ApiError(error.message, 500);

  return {
    items: (data ?? []).map((t) => ({
      id: t.id,
      pair: t.pair,
      side: t.side as "LONG" | "SHORT",
      entryPrice: Number(t.entry),
      stopLoss: t.stop === null ? undefined : Number(t.stop),
      takeProfit: t.target === null ? undefined : Number(t.target),
      pnl: Number(t.pnl ?? 0),
      pnlPct: Number(t.pnl_pct ?? 0),
      status: t.result === "open" ? "open" : "closed",
      result: t.result,
      motivo: t.motivo ?? "",
      createdAt: t.created_at,
    })),
    total: count ?? 0,
    limit,
    offset,
  };
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_HEADERS = [
  "data",
  "par",
  "lado",
  "perfil",
  "alavancagem",
  "entrada",
  "stop",
  "alvo",
  "resultado",
  "pnl",
  "pnl_pct",
  "motivo",
] as const;

/** Exporta o histórico de execuções filtrado como CSV (máx. 5000 linhas). */
export async function exportExecutionsCsv(
  supabase: Client,
  userId: string,
  query: ExecutionQuery = {},
): Promise<string> {
  let builder = supabase.from("bot4x_trades").select("*").eq("user_id", userId);
  builder = applyFilters(builder, query);

  const { data, error } = await builder.order("created_at", { ascending: false }).limit(5000);
  if (error) throw new ApiError(error.message, 500);

  const lines = [CSV_HEADERS.join(",")];
  for (const t of data ?? []) {
    lines.push(
      [
        t.created_at,
        t.pair,
        t.side,
        t.profile ?? "",
        t.leverage ?? "",
        t.entry,
        t.stop ?? "",
        t.target ?? "",
        t.result,
        Number(t.pnl ?? 0),
        Number(t.pnl_pct ?? 0),
        t.motivo ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

/** Telemetria do bot: estado atual + agregados do dia, para polling da UI. */
export async function getTelemetry(supabase: Client, userId: string) {
  const config = await getOrCreateConfig(supabase, userId);
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("bot4x_trades")
    .select("result, pnl, pair, side, created_at, motivo")
    .eq("user_id", userId)
    .eq("day", today)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new ApiError(error.message, 500);

  const rows = data ?? [];
  const wins = rows.filter((r) => r.result === "WIN").length;
  const losses = rows.filter((r) => r.result === "LOSS").length;
  const open = rows.filter((r) => r.result === "open").length;
  const pnl = rows.reduce((acc, r) => acc + Number(r.pnl ?? 0), 0);

  return {
    serverTime: new Date().toISOString(),
    active: config.active,
    profile: config.profile,
    circuitBreaker: config.circuitBreaker,
    dailyPnl: config.dailyPnl,
    openSlots: config.openSlots,
    today: { trades: rows.length, wins, losses, open, pnl: Number(pnl.toFixed(2)) },
    logs: rows.slice(0, 20).map((r) => ({
      at: r.created_at,
      level: r.result === "LOSS" ? "warn" : "info",
      message: `${r.pair} ${r.side} · ${r.result} · ${Number(r.pnl ?? 0) >= 0 ? "+" : ""}${Number(r.pnl ?? 0).toFixed(2)}`,
      detail: r.motivo ?? "",
    })),
  };
}
