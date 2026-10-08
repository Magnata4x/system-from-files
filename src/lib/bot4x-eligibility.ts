import type { Signal } from "./signals-data";

export type Bot4xEligibility = "EXECUTAR" | "IGNORAR" | "BLOQUEADO" | "INDISPONIVEL";

export type Bot4xLikeState = {
  dailyPnlPct: number;
  profile: "conservador" | "regular" | "agressivo" | "agressivo-galaxy" | string;
  mode: "DEMO" | "REAL" | string;
};

export function bot4xEligibility(signal: Signal, state: Bot4xLikeState): Bot4xEligibility {
  if (signal.manipRisk == null || signal.status == null) return "INDISPONIVEL";
  if (state.dailyPnlPct <= -1.5) return "BLOQUEADO";
  if (signal.status === "expired" || signal.status === "invalidated") return "BLOQUEADO";
  if (signal.manipRisk === "high") return "BLOQUEADO";

  let minScore = 80;
  if (state.profile === "conservador") minScore = 88;
  else if (state.profile === "regular") minScore = 82;
  else if (state.profile === "agressivo") minScore = 75;
  else if (state.profile === "agressivo-galaxy") minScore = 70;

  const effectiveScore = signal.manipRisk === "medium" ? signal.score - 8 : signal.score;
  return effectiveScore >= minScore ? "EXECUTAR" : "IGNORAR";
}

export const ELIGIBILITY_META: Record<Bot4xEligibility, { label: string; color: string; bg: string }> = {
  EXECUTAR: { label: "EXECUTAR", color: "#1D9E75", bg: "color-mix(in oklab, #1D9E75 18%, transparent)" },
  IGNORAR: { label: "IGNORAR", color: "var(--muted-foreground)", bg: "color-mix(in oklab, var(--muted-foreground) 14%, transparent)" },
  BLOQUEADO: { label: "BLOQUEADO", color: "#EF9F27", bg: "color-mix(in oklab, #EF9F27 18%, transparent)" },
  INDISPONIVEL: { label: "Elegibilidade indisponível", color: "#EF9F27", bg: "color-mix(in oklab, #EF9F27 18%, transparent)" },
};
