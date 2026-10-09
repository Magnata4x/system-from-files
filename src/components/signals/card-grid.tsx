import { AnimatePresence } from "framer-motion";
import { type Signal } from "@/lib/signals-data";
import { type SignalSourceStatus } from "@/lib/signals-store";
import { SignalCard } from "./signal-card";


export function formatDiscardedReasons(
  counts: { sideways: number; below_min_score: number; source_error: number } | null,
): string | null {
  if (!counts) return null;
  const parts: string[] = [];
  if (counts.sideways > 0) parts.push(`${counts.sideways} ${counts.sideways === 1 ? "par lateral" : "pares laterais"}`);
  if (counts.below_min_score > 0) parts.push(`${counts.below_min_score} abaixo de 60`);
  if (counts.source_error > 0) parts.push(`${counts.source_error} com falha na fonte`);
  return parts.length ? parts.join(", ") + "." : null;
}

export function signalEmptyMessage(status: SignalSourceStatus, totalSignals: number): string | null {
  if (status === "loading") return "Carregando sinais da fonte de mercado…";
  if (status === "unavailable") return "Fonte de sinais indisponível. Tente novamente quando o serviço voltar."; 
  if (status === "stale") return "Fonte de sinais desatualizada. Os dados exibidos podem não refletir o mercado atual.";
  if (totalSignals === 0) return "Nenhum sinal válido foi retornado pela fonte."; 
  return "Os filtros atuais excluíram todos os sinais. Ajuste os filtros para ver resultados.";
}

export function CardGrid({ signals, sourceStatus, totalSignals }: { signals: Signal[]; sourceStatus: SignalSourceStatus; totalSignals: number }) {
  const emptyMessage = signals.length ? null : signalEmptyMessage(sourceStatus, totalSignals);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {signals.map((s) => <SignalCard key={s.id} signal={s} />)}
      </AnimatePresence>
      {emptyMessage && <div role="status" className="col-span-full text-center py-16 text-muted-foreground text-sm">{emptyMessage}</div>}
    </div>
  );
}
