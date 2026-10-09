import { AnimatePresence } from "framer-motion";
import { type Signal } from "@/lib/signals-data";
import { type SignalSourceStatus } from "@/lib/signals-store";
import { SignalCard } from "./signal-card";

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
