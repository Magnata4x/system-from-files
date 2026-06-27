// Persistência do histórico de trades no Supabase.
// Chamado pelo bot4x-store ao fechar uma ordem (SL/TP atingido).
// Separado do store para manter o store simples e testável.
import { supabase } from "@/integrations/supabase/client";
import type { Trade } from "./bot4x-data";
import { logger } from "./logger";

export async function saveTrade(userId: string, trade: Trade): Promise<void> {
  const { error } = await supabase.from("bot4x_trades").upsert(
    {
      id: trade.id,
      user_id: userId,
      day: trade.day,
      pair: trade.pair,
      side: trade.side,
      entry: trade.entry,
      stop: trade.stop ?? null,
      target: trade.target ?? null,
      result: trade.result,
      pnl: trade.pnl,
      pnl_pct: trade.pnlPct,
      accumulated: trade.accumulated ?? 0,
      profile: trade.profile ?? null,
      leverage: trade.leverage ?? null,
      motivo: trade.motivo ?? null,
      hour: trade.hour ?? null,
    },
    { onConflict: "id" },
  );
  if (error) {
    // DB-02: parar de engolir silenciosamente. Trade não persistido é
    // dado financeiro perdido — o caller é responsável por notificar o
    // usuário/observabilidade.
    logger.error("[bot4x-trades-db] saveTrade error", {
      tradeId: trade.id,
      userId,
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });
    throw new Error(`Falha ao salvar trade ${trade.id}: ${error.message}`);
  }
}

/**
 * Outbox Pattern: garante que o trade nunca se perca mesmo se o write
 * direto em `bot4x_trades` falhar. Insere no outbox como fonte de verdade
 * e tenta o write direto como otimização — um worker server-side
 * reconcilia rows com status='pending'.
 */
export async function saveTradeWithOutbox(userId: string, trade: Trade): Promise<void> {
  const { data: outboxRow, error: outboxError } = await supabase
    .from("trade_outbox")
    .insert({
      user_id: userId,
      trade_data: trade as unknown as import("@/integrations/supabase/types").Json,
      status: "pending",
    })
    .select("id")
    .single();

  if (outboxError || !outboxRow) {
    logger.error("[bot4x-trades-db] outbox insert error", {
      error: outboxError,
      message: outboxError?.message,
    });
    throw outboxError ?? new Error("outbox insert returned no row");
  }

  try {
    await saveTrade(userId, trade);
    // Filtra pelo PK da linha recém-inserida — nunca por JSONB — para
    // evitar race condition com workers concorrentes ou trades duplicados.
    const { error: updateError } = await supabase
      .from("trade_outbox")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", outboxRow.id);
    if (updateError) {
      logger.error("[bot4x-trades-db] outbox mark-processed error", {
        error: updateError,
        message: updateError.message,
        outboxId: outboxRow.id,
      });
    }
  } catch (err) {
    // Falhou — o worker de reconciliação processará depois via status='pending'.
    console.warn("[bot4x-trades-db] direct save failed, outbox will reconcile:", err);
  }
}

export async function loadTrades(userId: string, limitDays = 90): Promise<Trade[]> {
  const since = new Date();
  since.setDate(since.getDate() - limitDays);

  const { data, error } = await supabase
    .from("bot4x_trades")
    .select("*")
    .eq("user_id", userId)
    .gte("day", since.toISOString().slice(0, 10))
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    logger.error("[bot4x-trades-db] loadTrades error", { error, message: error.message });
    return [];
  }

  return (data ?? []).map((r): Trade => ({
    id: r.id,
    day: r.day,
    pair: r.pair,
    side: r.side as Trade["side"],
    entry: Number(r.entry),
    stop: r.stop != null ? Number(r.stop) : 0,
    target: r.target != null ? Number(r.target) : 0,
    result: r.result as Trade["result"],
    pnl: Number(r.pnl),
    pnlPct: Number(r.pnl_pct),
    accumulated: Number(r.accumulated),
    profile: (r.profile ?? "conservador") as Trade["profile"],
    leverage: r.leverage ?? 1,
    motivo: r.motivo ?? "",
    hour: r.hour ?? 0,
  }));
}

export async function deleteTrade(userId: string, tradeId: string): Promise<void> {
  const { error } = await supabase
    .from("bot4x_trades")
    .delete()
    .eq("id", tradeId)
    .eq("user_id", userId);
  if (error) logger.error("[bot4x-trades-db] deleteTrade error", { error, message: error.message, tradeId });
}
