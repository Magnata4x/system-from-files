// DNA Auto-Corrector — frontend rule engine que observa o estado do Bot4x
// e aplica ações corretivas automaticamente quando a performance fica negativa
// ou há perda de capital. Dispara a cada 30s e em todo fechamento de ordem.
//
// Scope:
//  1) Bot4x active profile (degrada para perfil mais seguro sob estresse)
//  2) Calibrador (leverage, allocation %)
//  3) Filtros de sinais (eleva scoreMin, ativa bot4xOnly)
//
// CORREÇÃO: as métricas diárias agora são persistidas em `profiles` no
// Supabase. Antes o DNA operava 100% em memória Zustand — um reload zerava
// tudo e o corrector perdia contexto de perda já acumulada na sessão.

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBot4xStore } from "./bot4x-store";
import { useSignalsStore } from "./signals-store";
import { PROFILE_RISK_LADDER, type CalibProfile } from "./bot4x-data";
import { logger } from "./logger";

// ─── Cooldown por eixo ──────────────────────────────────────────────────────
const COOLDOWN_MS = 60_000;

const lastApplied: Record<string, number> = {
  profile: 0,
  calib: 0,
  filters: 0,
  persist: 0, // throttle de escrita no banco (mínimo 30s entre writes)
};

function canApply(axis: keyof typeof lastApplied): boolean {
  return Date.now() - lastApplied[axis] >= COOLDOWN_MS;
}

function markApplied(axis: keyof typeof lastApplied) {
  lastApplied[axis] = Date.now();
}

// ─── Risk ladder ────────────────────────────────────────────────────────────
function saferProfile(p: CalibProfile): CalibProfile | null {
  const idx = PROFILE_RISK_LADDER.indexOf(p);
  if (idx <= 0) return null;
  return PROFILE_RISK_LADDER[idx - 1];
}

// ─── Snapshot do estado atual do Bot4x ─────────────────────────────────────
type Snapshot = {
  dailyPnlPct: number;
  recentLosses: number;
  openLossPct: number;
  operationsToday: number;
};

function readSnapshot(): Snapshot {
  const s = useBot4xStore.getState();
  const last5 = s.history.slice(0, 5);
  const recentLosses = last5.filter((t) => (t.pnlPct ?? 0) < 0).length;
  const openLossPct = s.orders
    .filter((o) => o.pnlPct < 0)
    .reduce((acc, o) => acc + o.pnlPct, 0);
  return {
    dailyPnlPct: s.dailyPnlPct,
    recentLosses,
    openLossPct,
    operationsToday: s.history.filter((t) => t.day === new Date().toISOString().slice(0, 10)).length,
  };
}

// ─── Persistência das métricas DNA no Supabase ─────────────────────────────
// Throttle de 30s para não spammar o banco a cada ciclo de 30s.
const PERSIST_THROTTLE_MS = 30_000;

async function persistDnaMetrics(
  userId: string,
  snap: Snapshot,
  dnaValues?: {
    consistency?: number;
    discipline?: number;
    riskControl?: number;
    timing?: number;
    emotionalControl?: number;
  },
): Promise<void> {
  if (Date.now() - lastApplied.persist < PERSIST_THROTTLE_MS) return;
  lastApplied.persist = Date.now();

  const row = {
    operations_today: snap.operationsToday,
    drawdown_today: snap.dailyPnlPct,
    recent_losses: snap.recentLosses,
    open_loss_pct: snap.openLossPct,
    dna_updated_at: new Date().toISOString(),
    ...(dnaValues?.consistency !== undefined && { dna_consistency: dnaValues.consistency }),
    ...(dnaValues?.discipline !== undefined && { dna_discipline: dnaValues.discipline }),
    ...(dnaValues?.riskControl !== undefined && { dna_risk_control: dnaValues.riskControl }),
    ...(dnaValues?.timing !== undefined && { dna_timing: dnaValues.timing }),
    ...(dnaValues?.emotionalControl !== undefined && {
      dna_emotional_control: dnaValues.emotionalControl,
    }),
  };

  const { error } = await supabase.from("profiles").update(row).eq("id", userId);

  if (error) {
    logger.error("[dna-auto-corrector] persistDnaMetrics error", {
      userId,
      error: error.message,
    });
  }
}

// ─── Log de correções em memória ────────────────────────────────────────────
type CorrectionLog = {
  ts: number;
  reason: string;
  changes: string[];
};

const recentCorrections: CorrectionLog[] = [];

// ─── Core: executa correção e persiste ─────────────────────────────────────
export function runDnaAutoCorrection(userId?: string): CorrectionLog | null {
  const snap = readSnapshot();
  const bot4xState = useBot4xStore.getState();
  const signalsState = useSignalsStore.getState();

  // Severity tiers por critério de perda de capital.
  const tier =
    snap.dailyPnlPct <= -1.5
      ? 3
      : snap.dailyPnlPct <= -1.0 || snap.openLossPct <= -1.5
        ? 2
        : snap.dailyPnlPct <= -0.5 || snap.recentLosses >= 3
          ? 1
          : 0;

  // Sempre persistir métricas quando temos userId, mesmo sem correção ativa,
  // para que um reload não perca o contexto de drawdown do dia.
  if (userId) {
    void persistDnaMetrics(userId, snap);
  }

  if (tier === 0) return null;

  const changes: string[] = [];
  const reasonParts: string[] = [];
  if (snap.dailyPnlPct < 0) reasonParts.push(`PnL diário ${snap.dailyPnlPct.toFixed(2)}%`);
  if (snap.recentLosses >= 3) reasonParts.push(`${snap.recentLosses}/5 trades negativos`);
  if (snap.openLossPct < -0.5) reasonParts.push(`ordens abertas ${snap.openLossPct.toFixed(2)}%`);
  const reason = reasonParts.join(" · ") || "perda de capital detectada";

  // 1) Degradação de perfil (tier ≥ 2)
  if (tier >= 2 && canApply("profile")) {
    const next = saferProfile(bot4xState.profile);
    if (next && next !== bot4xState.profile) {
      const prev = bot4xState.profile;
      bot4xState.setProfile(next);
      changes.push(`Perfil: ${prev} → ${next}`);
      markApplied("profile");
    }
  }

  // 2) Parâmetros do calibrador
  if (canApply("calib")) {
    let touched = false;
    if (bot4xState.leverage > 1) {
      const nextLev = Math.max(1, bot4xState.leverage - 1);
      bot4xState.setLeverage(nextLev);
      changes.push(`Alavancagem: ${bot4xState.leverage}× → ${nextLev}×`);
      touched = true;
    }
    if (tier >= 2 && bot4xState.allocationPct > 10) {
      const nextAlloc = Math.max(10, bot4xState.allocationPct - 5);
      bot4xState.setAllocationPct(nextAlloc);
      changes.push(`Alocação: ${bot4xState.allocationPct}% → ${nextAlloc}%`);
      touched = true;
    }
    if (touched) markApplied("calib");
  }

  // 3) Filtros de sinais
  if (canApply("filters")) {
    let touched = false;
    const scoreTiers: Array<0 | 60 | 75 | 90> = [0, 60, 75, 90];
    const curIdx = scoreTiers.indexOf(signalsState.filters.scoreMin);
    if (curIdx < scoreTiers.length - 1) {
      const nextScore = scoreTiers[Math.min(scoreTiers.length - 1, curIdx + 1)];
      signalsState.setFilter("scoreMin", nextScore);
      changes.push(`Score min: ${signalsState.filters.scoreMin} → ${nextScore}`);
      touched = true;
    }
    if (tier >= 2 && !signalsState.filters.bot4xOnly) {
      signalsState.setFilter("bot4xOnly", true);
      changes.push("Filtro 'Apenas Bot4x' ativado");
      touched = true;
    }
    if (touched) markApplied("filters");
  }

  if (changes.length === 0) return null;

  const log: CorrectionLog = { ts: Date.now(), reason, changes };
  recentCorrections.unshift(log);
  if (recentCorrections.length > 20) recentCorrections.pop();

  // Persistir métricas imediatamente após uma correção (ignora throttle)
  if (userId) {
    lastApplied.persist = 0; // força write imediato
    void persistDnaMetrics(userId, snap);
  }

  const severity = tier === 3 ? "🚨 Crítico" : tier === 2 ? "⚠ Alto" : "Atenção";
  toast.warning(`DNA ajustou estratégia · ${severity}`, {
    description: `${reason}\n${changes.join(" · ")}`,
    duration: 7000,
  });

  return log;
}

export function getRecentDnaCorrections(): CorrectionLog[] {
  return [...recentCorrections];
}

// ─── React hook — montar uma vez no layout autenticado ─────────────────────
// CORREÇÃO: recebe userId para persistir métricas no banco após cada ciclo.
export function useDnaAutoCorrector(enabled = true, userId?: string) {
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHistoryLen = useRef<number>(-1);

  useEffect(() => {
    if (!enabled) return;

    runDnaAutoCorrection(userId);

    tickRef.current = setInterval(() => {
      runDnaAutoCorrection(userId);
    }, 30_000);

    const unsub = useBot4xStore.subscribe((s) => {
      if (s.history.length !== lastHistoryLen.current) {
        lastHistoryLen.current = s.history.length;
        runDnaAutoCorrection(userId);
      }
    });

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      unsub();
    };
  }, [enabled, userId]);
}
