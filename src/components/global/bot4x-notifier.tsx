import { useEffect, useRef } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useBot4xStore } from "@/lib/bot4x-store";
import { useNotificationsStore } from "@/lib/notifications-store";
import { useBot4xPrefs } from "@/lib/bot4x-prefs-store";

function burstProfitConfetti() {
  const end = Date.now() + 2000;
  const colors = ["#1D9E75", "#5CE1A6", "#0C9A6A", "#E6F1FB"];
  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.85 },
      colors,
      scalar: 0.7,
      ticks: 120,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.85 },
      colors,
      scalar: 0.7,
      ticks: 120,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/**
 * Watches bot4x state and emits global notifications + sonner toasts.
 * Mount once at root layout. Stateless wrt UI.
 */
export function Bot4xGlobalNotifier() {
  const dailyPnl = useBot4xStore((s) => s.dailyPnlPct);
  const trailingPeak = useBot4xStore((s) => s.trailingPeakPct);
  const orders = useBot4xStore((s) => s.orders);
  const history = useBot4xStore((s) => s.history);
  const status = useBot4xStore((s) => s.status);
  const profile = useBot4xStore((s) => s.profile);
  const leverage = useBot4xStore((s) => s.leverage);
  const slPct = useBot4xStore((s) => s.slPct);
  const tpPct = useBot4xStore((s) => s.tpPct);
  const allocationPct = useBot4xStore((s) => s.allocationPct);
  const push = useNotificationsStore((s) => s.push);
  const alerts = useBot4xPrefs((s) => s.bot4xAlerts);
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  const lastBreaker = useRef(false);
  const lastLock = useRef(false);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const firstRun = useRef(true);
  const knownTradeIds = useRef<Set<string>>(new Set());
  const tradesFirstRun = useRef(true);
  const lastConfig = useRef<string | null>(null);
  const lastStatus = useRef(status);

  // Emergency shutdown when dailyPnl <= -1.5
  useEffect(() => {
    const breaker = dailyPnl <= -1.5;
    if (breaker && !lastBreaker.current && alertsRef.current.circuitBreaker) {
      push({
        type: "EMERGENCY_SHUTDOWN",
        title: "DISJUNTOR ATIVADO",
        body: `Drawdown diário em ${dailyPnl.toFixed(2)}%. Execução pausada até reset manual.`,
        persistent: true,
      });
      toast.error("Bot4x — DISJUNTOR ATIVADO", {
        description: `Drawdown diário ${dailyPnl.toFixed(2)}%`,
        duration: 3500,
        dismissible: true,
      });
    }
    lastBreaker.current = breaker;
  }, [dailyPnl, push]);

  // Profit lock when peak >= 3%
  useEffect(() => {
    const lock = trailingPeak >= 3.0;
    if (lock && !lastLock.current && alertsRef.current.circuitBreaker) {
      push({
        type: "PROFIT_LOCK",
        title: "Lucro preservado",
        body: `Trailing stop ativado em +${trailingPeak.toFixed(1)}%.`,
        persistent: true,
      });
      toast.success("Bot4x — Lucro preservado", {
        description: `+${trailingPeak.toFixed(1)}% travados`,
        duration: 3500,
        dismissible: true,
      });
      burstProfitConfetti();
    }
    lastLock.current = lock;
  }, [trailingPeak, push]);

  // Config alterada (perfil, alavancagem, SL/TP, alocação)
  useEffect(() => {
    const snapshot = JSON.stringify({ profile, leverage, slPct, tpPct, allocationPct });
    if (lastConfig.current === null) {
      lastConfig.current = snapshot;
      return;
    }
    if (lastConfig.current === snapshot) return;
    lastConfig.current = snapshot;
    if (!alertsRef.current.configChanged) return;
    const body = `Perfil ${profile} · ${leverage}x · SL ${slPct}% / TP ${tpPct}% · alocação ${allocationPct}%`;
    push({ type: "INFO", title: "Configuração do Bot4x alterada", body });
    toast("Bot4x — configuração alterada", {
      description: body,
      duration: 3000,
      dismissible: true,
    });
  }, [profile, leverage, slPct, tpPct, allocationPct, push]);

  // SL / TP atingidos (trades fechados)
  useEffect(() => {
    if (tradesFirstRun.current) {
      history.forEach((t) => knownTradeIds.current.add(t.id));
      tradesFirstRun.current = false;
      return;
    }
    for (const t of history) {
      if (knownTradeIds.current.has(t.id)) continue;
      knownTradeIds.current.add(t.id);
      const hitTp = t.result === "WIN";
      if (!alertsRef.current.slTpHit) continue;
      const body = `${t.side} · ${t.motivo || (hitTp ? "TP atingido" : "SL atingido")} · ${t.pnlPct >= 0 ? "+" : ""}${t.pnlPct.toFixed(2)}%`;
      push({ type: "ALERT", title: `${t.pair} — ${hitTp ? "TP atingido" : "SL atingido"}`, body });
      (hitTp ? toast.success : toast.error)(`Bot4x · ${t.pair}`, {
        description: body,
        duration: 3000,
        dismissible: true,
      });
    }
  }, [history, push]);

  // Execuções falhas / motor em erro
  useEffect(() => {
    const prev = lastStatus.current;
    lastStatus.current = status;
    if (status !== "ERROR" || prev === "ERROR") return;
    if (!alertsRef.current.executionFailed) return;
    push({
      type: "ALERT",
      title: "Falha na execução do Bot4x",
      body: "O motor não conseguiu sincronizar/executar. Verifique a aba Execuções.",
    });
    toast.error("Bot4x — falha na execução", {
      description: "Verifique a aba Execuções para detalhes.",
      duration: 4000,
      dismissible: true,
    });
  }, [status, push]);

  // New order = EXECUTE event
  useEffect(() => {
    if (firstRun.current) {
      orders.forEach((o) => knownOrderIds.current.add(o.id));
      firstRun.current = false;
      return;
    }
    for (const o of orders) {
      if (!knownOrderIds.current.has(o.id)) {
        knownOrderIds.current.add(o.id);
        push({
          type: "EXECUTE",
          title: `Bot4x executou ${o.pair}`,
          body: `${o.side} @ ${o.entry}`,
        });
        const isBuy = o.side === "LONG";
        const accent = isBuy ? "#1D9E75" : "#E24B4A";
        toast(`Bot4x · ${o.pair}`, {
          description: `${o.side} @ ${o.entry}`,
          duration: 2500,
          dismissible: true,
          style: {
            background: "#111318",
            border: `1px solid ${accent}66`,
            borderLeft: `3px solid ${accent}`,
            color: "#E6F1FB",
          },
        });
      }
    }
  }, [orders, push]);

  return null;
}
