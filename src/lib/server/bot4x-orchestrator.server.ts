import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateSignals, type BackendSignal } from "./engine.server";
import { CIRCUIT_BREAKER_LOSS_PCT, PROFIT_LOCK_TARGET_PCT } from "./engine.server";
import { mapConfig } from "./bot4x.server";

type Bot4xMode = "DEMO" | "REAL";

export type Bot4xCycleDecision =
  | "EXECUTION_CANDIDATE"
  | "IGNORED"
  | "BLOCKED"
  | "INACTIVE";

export interface Bot4xCycleResult {
  startedAt: string;
  finishedAt: string;
  usersScanned: number;
  activeUsers: number;
  signalsScanned: number;
  candidates: number;
  blocked: number;
  ignored: number;
  decisions: Array<{
    userId: string;
    pair: string;
    side: "BUY" | "SELL";
    score: number;
    decision: Bot4xCycleDecision;
    reason: string;
    mode: Bot4xMode;
    executionSubmitted: false;
  }>;
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function effectiveScore(signal: BackendSignal): number {
  return signal.score;
}

function minimumScore(config: ReturnType<typeof mapConfig>): number {
  if (config.profile === "conservador") return Math.max(88, Number(config.aiScoreMin));
  if (config.profile === "agressivo") return Math.min(75, Number(config.aiScoreMin));
  return Number(config.aiScoreMin);
}

/**
 * Orquestrador do ciclo Bot4x.
 *
 * Esta primeira integração é deliberadamente OBSERVAÇÃO-ONLY:
 * - usa o motor real de mercado/sinais já existente;
 * - aplica as regras de perfil, pares, slots e circuit breakers já existentes;
 * - não cria execution_intents;
 * - não chama nenhum endpoint de escrita da Binance.
 *
 * O objetivo é restaurar o ciclo operacional sem alterar a segurança
 * construída nas Fases 18–27. A submissão de ordens será uma etapa posterior,
 * explicitamente autorizada, depois que este ciclo estiver validado.
 */
export async function runBot4xOrchestratorCycle(userId?: string): Promise<Bot4xCycleResult> {
  const startedAt = new Date().toISOString();
  let configQuery = supabaseAdmin.from("bot4x_configs").select("*").eq("active", true);
  if (userId) configQuery = configQuery.eq("user_id", userId);
  const { data: configRows, error: configError } = await configQuery;

  if (configError) throw new Error(`Bot4x config scan failed: ${configError.message}`);

  const signals = await generateSignals();
  const decisions: Bot4xCycleResult["decisions"] = [];

  for (const row of configRows ?? []) {
    const config = mapConfig(row);
    const preferredPairs = jsonStringArray(config.preferredPairs).map((p) => p.replace("/", "").toUpperCase());
    const avoidPairs = new Set(jsonStringArray(config.avoidPairs).map((p) => p.replace("/", "").toUpperCase()));

    const { count: activeIntentCount, error: intentError } = await supabaseAdmin
      .from("bot4x_execution_intents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", config.userId)
      .in("status", ["pending", "submitted"]);

    if (intentError) {
      console.error("[Bot4x orchestrator] active intent scan failed", {
        userId: config.userId,
        error: intentError.message,
      });
      continue;
    }

    const openSlots = activeIntentCount ?? 0;
    const slotLimit = 10;
    const circuitBlocked =
      config.circuitBreaker === "emergency" ||
      Number(config.dailyPnl) <= CIRCUIT_BREAKER_LOSS_PCT;
    const profitLocked =
      config.circuitBreaker === "profitLock" ||
      Number(config.dailyPnl) >= PROFIT_LOCK_TARGET_PCT;

    const userSignals = signals.filter((signal) => {
      const pair = signal.pair.replace("/", "").toUpperCase();
      return (
        (preferredPairs.length === 0 || preferredPairs.includes(pair)) &&
        !avoidPairs.has(pair)
      );
    });

    if (circuitBlocked || profitLocked || openSlots >= slotLimit) {
      for (const signal of userSignals) {
        decisions.push({
          userId: config.userId,
          pair: signal.pair,
          side: signal.side,
          score: effectiveScore(signal),
          decision: "BLOCKED",
          reason: circuitBlocked
            ? "circuit_breaker"
            : profitLocked
              ? "profit_lock"
              : "open_slots_limit",
          mode: config.executionMode as Bot4xMode,
          profile: config.profile,
          circuitBreaker: config.circuitBreaker,
          openSlots,
          executionSubmitted: false,
        });
      }
      continue;
    }

    const minScore = minimumScore(config);
    for (const signal of userSignals) {
      const score = effectiveScore(signal);
      const decision: Bot4xCycleDecision = score >= minScore ? "EXECUTION_CANDIDATE" : "IGNORED";
      decisions.push({
        userId: config.userId,
        pair: signal.pair,
        side: signal.side,
        score,
        decision,
        reason: decision === "EXECUTION_CANDIDATE"
          ? "signal_passed_bot4x_gates"
          : `score_below_profile_minimum_${minScore}`,
        mode: config.executionMode as Bot4xMode,
        profile: config.profile,
        circuitBreaker: config.circuitBreaker,
        openSlots,
        executionSubmitted: false,
      });
    }

    await supabaseAdmin
      .from("bot4x_configs")
      .update({ open_slots: openSlots })
      .eq("user_id", config.userId);
  }

  const finishedAt = new Date().toISOString();
  const candidates = decisions.filter((d) => d.decision === "EXECUTION_CANDIDATE").length;
  const blocked = decisions.filter((d) => d.decision === "BLOCKED").length;
  const ignored = decisions.filter((d) => d.decision === "IGNORED").length;

  const result: Bot4xCycleResult = {
    startedAt,
    finishedAt,
    usersScanned: configRows?.length ?? 0,
    activeUsers: configRows?.length ?? 0,
    signalsScanned: signals.length,
    candidates,
    blocked,
    ignored,
    decisions,
  };

  console.log("[Bot4x orchestrator] observation cycle complete", {
    usersScanned: result.usersScanned,
    signalsScanned: result.signalsScanned,
    candidates,
    blocked,
    ignored,
    executionSubmitted: false,
  });

  return result;
}
