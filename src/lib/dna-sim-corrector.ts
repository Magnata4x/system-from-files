// DNA Sim Corrector — analyses a calibrator simulation (SimulationResultUI)
// and proposes concrete parameter changes the user can apply with one click.
// Scope: profile (degrade or upgrade), leverage, allocation, SL%, TP%, signal filters.
//
// Triggered manually from the simulation modal ("Aplicar correções").
import { toast } from "sonner";
import { useBot4xStore } from "./bot4x-store";
import { useSignalsStore } from "./signals-store";
import { PROFILE_RISK_LADDER, type CalibProfile } from "./bot4x-data";
import type { SimulationResultUI } from "@/adapters/backend/calibrator.adapter";

export type SimProposal =
  | { kind: "profile"; from: CalibProfile; to: CalibProfile; reason: string }
  | { kind: "leverage"; from: number; to: number; reason: string }
  | { kind: "allocation"; from: number; to: number; reason: string }
  | { kind: "sl"; from: number; to: number; reason: string }
  | { kind: "tp"; from: number; to: number; reason: string }
  | { kind: "scoreMin"; from: 0 | 60 | 75 | 90; to: 0 | 60 | 75 | 90; reason: string }
  | { kind: "bot4xOnly"; from: boolean; to: boolean; reason: string };

// LADDER local removida — usar PROFILE_RISK_LADDER (bot4x-data.ts), a mesma
// fonte de verdade usada pelo dna-auto-corrector.ts.

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Build proposals from a simulation result vs current settings.
 * Heuristics target capital protection first, then performance.
 */
export function proposeSimCorrections(sim: SimulationResultUI, simProfile: CalibProfile): SimProposal[] {
  const s = useBot4xStore.getState();
  const sig = useSignalsStore.getState();
  const out: SimProposal[] = [];

  const wr = (sim.winRate ?? 0) * 100; // 0..100
  const pnlPct = sim.pnlPct ?? 0;
  const dd = sim.maxDrawdown ?? 0; // positive number

  // 1) Profile
  const idx = PROFILE_RISK_LADDER.indexOf(simProfile);
  if (pnlPct <= -2 || dd >= 15 || wr < 40) {
    if (idx > 0) {
      const to = PROFILE_RISK_LADDER[idx - 1];
      out.push({
        kind: "profile",
        from: s.profile,
        to,
        reason: `Resultado fraco (PnL ${pnlPct.toFixed(1)}%, DD ${dd.toFixed(1)}%, WR ${wr.toFixed(0)}%) — degradar para perfil mais seguro`,
      });
    }
  } else if (pnlPct >= 8 && dd <= 5 && wr >= 60 && idx < PROFILE_RISK_LADDER.length - 1) {
    const to = PROFILE_RISK_LADDER[idx + 1];
    out.push({
      kind: "profile",
      from: s.profile,
      to,
      reason: `Performance forte (PnL +${pnlPct.toFixed(1)}%, DD ${dd.toFixed(1)}%) — pode subir um nível`,
    });
  } else if (s.profile !== simProfile) {
    out.push({ kind: "profile", from: s.profile, to: simProfile, reason: "Adotar perfil simulado" });
  }

  // 2) Leverage
  if (dd >= 12 || pnlPct <= -1.5) {
    const to = clamp(s.leverage - 2, 1, 10);
    if (to !== s.leverage)
      out.push({ kind: "leverage", from: s.leverage, to, reason: `Drawdown ${dd.toFixed(1)}% — reduzir alavancagem` });
  } else if (dd < 4 && pnlPct >= 6 && s.leverage < 5) {
    const to = clamp(s.leverage + 1, 1, 10);
    out.push({ kind: "leverage", from: s.leverage, to, reason: "Risco controlado — pode subir alavancagem" });
  }

  // 3) Allocation
  if (pnlPct <= -2 || dd >= 15) {
    const to = clamp(s.allocationPct - 10, 10, 100);
    if (to !== s.allocationPct)
      out.push({ kind: "allocation", from: s.allocationPct, to, reason: "Reduzir exposição até recuperar" });
  }

  // 4) Stop loss — if drawdown too wide, tighten; if WR muito baixo, alargar para evitar SL prematuro
  if (dd >= 12 && s.slPct > 0.3) {
    const to = +clamp(s.slPct - 0.2, 0.2, 10).toFixed(2);
    if (to !== s.slPct)
      out.push({
        kind: "sl",
        from: s.slPct,
        to,
        reason: `Apertar stop (DD ${dd.toFixed(1)}%) para limitar perda por trade`,
      });
  } else if (wr < 45 && s.slPct < 1.0) {
    const to = +clamp(s.slPct + 0.2, 0.2, 10).toFixed(2);
    out.push({
      kind: "sl",
      from: s.slPct,
      to,
      reason: `WR ${wr.toFixed(0)}% — afrouxar stop para evitar saídas prematuras`,
    });
  }

  // 5) Take profit — se WR alto e PnL fraco, alvo provavelmente curto; se PnL bom mas WR baixo, encurtar alvo
  if (wr >= 60 && pnlPct < 3 && s.tpPct < 2.0) {
    const to = +clamp(s.tpPct + 0.3, 0.2, 20).toFixed(2);
    out.push({ kind: "tp", from: s.tpPct, to, reason: `WR alto (${wr.toFixed(0)}%) com PnL baixo — esticar alvo` });
  } else if (wr < 45 && s.tpPct > 0.6) {
    const to = +clamp(s.tpPct - 0.2, 0.2, 20).toFixed(2);
    if (to !== s.tpPct)
      out.push({ kind: "tp", from: s.tpPct, to, reason: `WR baixo — encurtar alvo para travar lucro mais cedo` });
  }

  // 6) Signal filters — sob estresse, exigir score maior e priorizar Bot4x
  if (pnlPct <= -1 || dd >= 10) {
    const tiers: Array<0 | 60 | 75 | 90> = [0, 60, 75, 90];
    const curIdx = tiers.indexOf(sig.filters.scoreMin);
    if (curIdx < tiers.length - 1) {
      const to = tiers[curIdx + 1];
      out.push({ kind: "scoreMin", from: sig.filters.scoreMin, to, reason: "Subir score mínimo dos sinais" });
    }
    if (!sig.filters.bot4xOnly) {
      out.push({ kind: "bot4xOnly", from: false, to: true, reason: "Restringir a sinais validados pelo Bot4x" });
    }
  }

  return out;
}

export function describeProposal(p: SimProposal): string {
  switch (p.kind) {
    case "profile":
      return `Perfil: ${p.from} → ${p.to}`;
    case "leverage":
      return `Alavancagem: ${p.from}× → ${p.to}×`;
    case "allocation":
      return `Alocação: ${p.from}% → ${p.to}%`;
    case "sl":
      return `Stop Loss: ${p.from}% → ${p.to}%`;
    case "tp":
      return `Take Profit: ${p.from}% → ${p.to}%`;
    case "scoreMin":
      return `Score min: ${p.from} → ${p.to}`;
    case "bot4xOnly":
      return `Filtro "Apenas Bot4x": ${p.from ? "on" : "off"} → ${p.to ? "on" : "off"}`;
  }
}

export function applySimCorrections(proposals: SimProposal[]) {
  if (proposals.length === 0) return;
  const b = useBot4xStore.getState();
  const sig = useSignalsStore.getState();
  for (const p of proposals) {
    switch (p.kind) {
      case "profile":
        b.setProfile(p.to);
        break;
      case "leverage":
        b.setLeverage(p.to);
        break;
      case "allocation":
        b.setAllocationPct(p.to);
        break;
      case "sl":
        b.setSlPct(p.to);
        break;
      case "tp":
        b.setTpPct(p.to);
        break;
      case "scoreMin":
        sig.setFilter("scoreMin", p.to);
        break;
      case "bot4xOnly":
        sig.setFilter("bot4xOnly", p.to);
        break;
    }
  }
  toast.success(`DNA aplicou ${proposals.length} correção(ões)`, {
    description: proposals.map(describeProposal).join(" · "),
    duration: 6000,
  });
}
