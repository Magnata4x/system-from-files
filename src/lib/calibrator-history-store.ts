// Histórico de simulações do Calibrador — persistido no Supabase por usuário.
// API: list/add/get/remove/clear são async e exigem userId.
// `subscribe` é preservado para invalidação em consumidores reativos.
import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";
import type { SimulationProfile, SimulationResultUI } from "@/adapters/backend/calibrator.adapter";

export interface CalibratorHistoryEntry {
  id: string;
  createdAt: string;
  userId?: string;
  params: {
    profile: SimulationProfile;
    symbol: string;
    periodDays: number;
    initialBalance: number;
    leverage?: number;
  };
  result: {
    trades: number;
    wins?: number;
    losses?: number;
    winRate: number;
    pnl: number;
    pnlPct: number;
    maxDrawdown: number;
    sharpe: number;
  };
  fullResult?: SimulationResultUI;
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}

function rowToEntry(r: Record<string, unknown>): CalibratorHistoryEntry {
  return {
    id: String(r.id),
    createdAt: String(r.created_at),
    userId: r.user_id ? String(r.user_id) : undefined,
    params: {
      profile: r.profile as SimulationProfile,
      symbol: String(r.symbol),
      periodDays: Number(r.period_days),
      initialBalance: Number(r.initial_balance),
      leverage: r.leverage != null ? Number(r.leverage) : undefined,
    },
    result: {
      trades: Number(r.trades),
      wins: r.wins != null ? Number(r.wins) : undefined,
      losses: r.losses != null ? Number(r.losses) : undefined,
      winRate: Number(r.win_rate),
      pnl: Number(r.pnl),
      pnlPct: Number(r.pnl_pct),
      maxDrawdown: Number(r.max_drawdown),
      sharpe: Number(r.sharpe),
    },
    fullResult: (r.full_result as SimulationResultUI | null) ?? undefined,
  };
}

export const calibratorHistoryStore = {
  async list(userId: string): Promise<CalibratorHistoryEntry[]> {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("calibrator_runs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      logger.error("[calibrator-history] list", { error: error, message: error.message });
      return [];
    }
    return (data ?? []).map(rowToEntry);
  },

  async add(
    userId: string,
    entry: Omit<CalibratorHistoryEntry, "id" | "createdAt">,
  ): Promise<CalibratorHistoryEntry> {
    const { data, error } = await supabase
      .from("calibrator_runs")
      .insert({
        user_id: userId,
        profile: entry.params.profile,
        symbol: entry.params.symbol,
        period_days: entry.params.periodDays,
        initial_balance: entry.params.initialBalance,
        leverage: entry.params.leverage ?? 1,
        trades: entry.result.trades,
        wins: entry.result.wins ?? 0,
        losses: entry.result.losses ?? 0,
        win_rate: entry.result.winRate,
        pnl: entry.result.pnl,
        pnl_pct: entry.result.pnlPct,
        max_drawdown: entry.result.maxDrawdown,
        sharpe: entry.result.sharpe,
        full_result: (entry.fullResult ?? null) as never,
      })
      .select()
      .single();
    if (error || !data) {
      logger.error("[calibrator-history] add() falhou ao inserir em calibrator_runs", {
        userId,
        profile: entry.params.profile,
        symbol: entry.params.symbol,
        periodDays: entry.params.periodDays,
        supabaseError: error
          ? { message: error.message, code: error.code, details: error.details, hint: error.hint }
          : "sem linha retornada",
      });
      return {
        id: `local_${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...entry,
      };
    }
    const full = rowToEntry(data);
    notify();
    return full;
  },

  async get(userId: string, id: string): Promise<CalibratorHistoryEntry | undefined> {
    if (!userId) return undefined;
    const { data, error } = await supabase
      .from("calibrator_runs")
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      logger.error("[calibrator-history] get", { error: error, message: error.message });
      return undefined;
    }
    return data ? rowToEntry(data) : undefined;
  },

  async remove(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from("calibrator_runs")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
    if (error)
      logger.error("[calibrator-history] remove", { error: error, message: error.message });
    notify();
  },

  async clear(userId: string): Promise<void> {
    const { error } = await supabase.from("calibrator_runs").delete().eq("user_id", userId);
    if (error) logger.error("[calibrator-history] clear", { error: error, message: error.message });
    notify();
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export async function recordSimulation(
  userId: string | undefined,
  params: CalibratorHistoryEntry["params"],
  result: SimulationResultUI,
): Promise<CalibratorHistoryEntry> {
  const entry: Omit<CalibratorHistoryEntry, "id" | "createdAt"> = {
    userId,
    params,
    result: {
      trades: result.trades,
      wins: result.wins,
      losses: result.losses,
      winRate: result.winRate,
      pnl: result.pnl,
      pnlPct: result.pnlPct,
      maxDrawdown: result.maxDrawdown,
      sharpe: result.sharpe,
    },
    fullResult: result,
  };
  if (!userId) {
    console.warn("[calibrator-history] recordSimulation ignorado: usuário não autenticado", {
      profile: params.profile,
      symbol: params.symbol,
      periodDays: params.periodDays,
    });
    return { id: `anon_${Date.now()}`, createdAt: new Date().toISOString(), ...entry };
  }
  try {
    return await calibratorHistoryStore.add(userId, entry);
  } catch (err) {
    logger.error("[calibrator-history] recordSimulation falhou ao persistir no Supabase", {
      userId,
      profile: params.profile,
      symbol: params.symbol,
      periodDays: params.periodDays,
      initialBalance: params.initialBalance,
      leverage: params.leverage,
      error:
        err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
    });
    return { id: `local_${Date.now()}`, createdAt: new Date().toISOString(), ...entry };
  }
}
