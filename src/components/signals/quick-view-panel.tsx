import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Fixar, X } from "lucide-react";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import { useSignalsStore } from "@/lib/signals-store";
import { formatPrice } from "@/lib/signals-data";

export function QuickViewPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const signals = useSignalsStore((state) => state.signals);
  const hoverId = useSignalsStore((state) => state.hoverId);
  const pinnedId = useSignalsStore((state) => state.pinnedId);
  const pin = useSignalsStore((state) => state.pin);
  const signal = signals.find((s) => s.id === (pinnedId ?? hoverId));

  if (collapsed) return <button onClick={() => setCollapsed(false)} className="fixed right-3 top-1/2 -translate-y-1/2 z-30 size-8 rounded-l-md border border-border bg-card"><ChevronLeft className="size-4 mx-auto" /></button>;

  return <aside className="w-[320px] shrink-0 border-l border-border bg-card/40 sticky top-[140px] self-start h-[calc(100vh-140px)] overflow-y-auto">
    <div className="flex items-center justify-between p-3 border-b border-border sticky top-0 bg-card/95">
      <span className="text-[12px] uppercase tracking-wide text-muted-foreground">Visualização rápida</span>
      <div className="flex gap-1">{pinnedId && <button onClick={() => pin(null)}><X className="size-3.5" /></button>}<button onClick={() => setCollapsed(true)}><ChevronRight className="size-3.5" /></button></div>
    </div>
    <AnimatePresence mode="wait">
      {signal ? <motion.div key={signal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-4">
        <div className="flex items-center gap-2"><span className="text-[15px] font-semibold">{signal.asset}</span><span className="text-[10px]">{signal.direction}</span><div className="ml-auto"><ScoreBadge score={signal.score} /></div></div>
        <div className="text-[11px] text-muted-foreground">{signal.exchange === "binance" ? "Binance" : "—"} · {signal.tf ?? "—"} · {signal.setup ?? "—"}</div>
        <div className="space-y-1">
          <Row label="Entrada" value={signal.entry == null ? "—" : "$" + formatPrice(signal.entry)} />
          <Row label="Stop" value={signal.stop == null ? "—" : "$" + formatPrice(signal.stop)} />
          <Row label="Target" value={signal.target == null ? "—" : "$" + formatPrice(signal.target)} />
          <Row label="R/R" value={signal.rr == null ? "—" : signal.rr.toFixed(2)} />
          <Row label="Risco" value={signal.riskPct == null ? "—" : signal.riskPct + "%"} />
        </div>
        <div className="rounded-md border border-border p-3 text-[11px] text-muted-foreground">Sem narrativa derivada: apenas campos fornecidos pelo motor.</div>
        <button onClick={() => useSignalsStore.getState().openDetail(signal.id)} className="w-full h-9 rounded-md bg-[var(--brand-blue-deep)] text-[12px]">Abrir detalhes →</button>
        {!pinnedId && hoverId && <button onClick={() => pin(hoverId)} className="w-full h-8 rounded-md border border-border text-[11px] inline-flex items-center justify-center gap-1.5"><Pin className="size-3" /> Fixar sinal</button>}
      </motion.div> : <div className="p-6 text-center text-[12px] text-muted-foreground">Passe o cursor sobre um sinal para visualizar os dados.</div>}
    </AnimatePresence>
  </aside>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between text-[12px]"><span className="text-muted-foreground">{label}</span><span className="tabular-nums font-medium">{value}</span></div>;
}
