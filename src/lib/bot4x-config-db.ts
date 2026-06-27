// Leitura e escrita da configuração Bot4x por usuário no Supabase.
// A tabela bot4x_configs já existe com RLS por user_id.
//
// ARCH-02 (migração 2026-06): agora usamos colunas com nomes semânticos
// corretos (sl_pct, tp_pct, allocation_pct, total_capital, preferred_pairs,
// avoid_pairs). As colunas antigas reaproveitadas (rsi_threshold_low/high,
// ai_score_min, fomo_limit, exchange) permanecem por compatibilidade e
// serão dropadas em migração futura. A leitura faz fallback para elas
// caso uma linha legada não tenha sido alcançada pelo backfill.
import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";

export interface Bot4xConfigRow {
  userId: string;
  active: boolean;
  profile: string;
  leverage: number;
  activeCapital: number;
  slPct: number;
  tpPct: number;
  allocationPct: number;
  totalCapital: number;
  preferredPairs: string[];
  avoidPairs: string[];
  circuitBreaker: string;
  dailyPnl: number;
  openSlots: number;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

// Fallback legado: a coluna `exchange` (text) costumava serializar
// {preferred, avoid} ou um array puro.
function parseLegacyPairs(value: unknown): { preferred: string[]; avoid: string[] } {
  if (typeof value !== "string" || !value) return { preferred: [], avoid: [] };
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return { preferred: asStringArray(parsed), avoid: [] };
    }
    if (parsed && typeof parsed === "object") {
      return {
        preferred: asStringArray((parsed as Record<string, unknown>).preferred),
        avoid: asStringArray((parsed as Record<string, unknown>).avoid),
      };
    }
  } catch {
    /* fallthrough */
  }
  return { preferred: [], avoid: [] };
}

export async function loadConfig(userId: string): Promise<Bot4xConfigRow | null> {
  const { data, error } = await supabase
    .from("bot4x_configs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("[bot4x-config-db] loadConfig error", { error: error, message: error.message });
    return null;
  }
  if (!data) return null;

  // Pares: novo formato primeiro, legado como fallback.
  const newPreferred = asStringArray(data.preferred_pairs);
  const newAvoid = asStringArray(data.avoid_pairs);
  const usingLegacyPairs = newPreferred.length === 0 && newAvoid.length === 0 && !!data.exchange;
  const legacy = usingLegacyPairs
    ? parseLegacyPairs(data.exchange)
    : { preferred: newPreferred, avoid: newAvoid };

  // DEPRECATION (v2.0): avisar quando ainda dependemos de colunas legadas.
  // Ver supabase/migrations/20260625140000_deprecate_legacy_bot4x_columns.sql
  const usingLegacySl = data.sl_pct == null && data.rsi_threshold_low != null;
  const usingLegacyTp = data.tp_pct == null && data.rsi_threshold_high != null;
  const usingLegacyAlloc = data.allocation_pct == null && data.ai_score_min != null;
  const usingLegacyTotal = data.total_capital == null && data.fomo_limit != null;
  if (usingLegacySl || usingLegacyTp || usingLegacyAlloc || usingLegacyTotal || usingLegacyPairs) {
    logger.warn("[bot4x-config-db][deprecated] legacy column fallback", {
      userId,
      rsi_threshold_low: usingLegacySl,
      rsi_threshold_high: usingLegacyTp,
      ai_score_min: usingLegacyAlloc,
      fomo_limit: usingLegacyTotal,
      exchange: usingLegacyPairs,
    });
  }

  return {
    userId: data.user_id,
    active: data.active,
    profile: data.profile,
    leverage: data.leverage ?? 3,
    activeCapital: Number(data.active_capital ?? 0),
    slPct: data.sl_pct != null
      ? Number(data.sl_pct)
      : data.rsi_threshold_low != null ? Number(data.rsi_threshold_low) : 0.5,
    tpPct: data.tp_pct != null
      ? Number(data.tp_pct)
      : data.rsi_threshold_high != null ? Number(data.rsi_threshold_high) : 1.0,
    allocationPct: data.allocation_pct ?? data.ai_score_min ?? 30,
    totalCapital: data.total_capital != null
      ? Number(data.total_capital)
      : data.fomo_limit != null ? Number(data.fomo_limit) : 1000,
    preferredPairs: legacy.preferred,
    avoidPairs: legacy.avoid,
    circuitBreaker: data.circuit_breaker ?? "none",
    dailyPnl: Number(data.daily_pnl ?? 0),
    openSlots: data.open_slots ?? 0,
  };
}

export async function saveConfig(userId: string, config: Partial<Bot4xConfigRow>): Promise<void> {
  const row = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    ...(config.active !== undefined && { active: config.active }),
    ...(config.profile !== undefined && { profile: config.profile }),
    ...(config.leverage !== undefined && { leverage: config.leverage }),
    ...(config.activeCapital !== undefined && { active_capital: config.activeCapital }),
    ...(config.circuitBreaker !== undefined && { circuit_breaker: config.circuitBreaker }),
    ...(config.dailyPnl !== undefined && { daily_pnl: config.dailyPnl }),
    ...(config.openSlots !== undefined && { open_slots: config.openSlots }),
    // Novas colunas com nomes corretos (ARCH-02).
    ...(config.slPct !== undefined && { sl_pct: config.slPct }),
    ...(config.tpPct !== undefined && { tp_pct: config.tpPct }),
    ...(config.allocationPct !== undefined && { allocation_pct: config.allocationPct }),
    ...(config.totalCapital !== undefined && { total_capital: config.totalCapital }),
    ...(config.preferredPairs !== undefined && { preferred_pairs: config.preferredPairs }),
    ...(config.avoidPairs !== undefined && { avoid_pairs: config.avoidPairs }),
  };

  const { error } = await supabase
    .from("bot4x_configs")
    .upsert(row, { onConflict: "user_id" });
  if (error) logger.error("[bot4x-config-db] saveConfig error", { error: error, message: error.message });
}
