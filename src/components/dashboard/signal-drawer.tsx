import { useDashboardStore } from "@/lib/dashboard-store";
import { AnimatePresence, motion } from "framer-motion";
import { X, Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ScoreBadge } from "./score-badge";
import { relativeTime } from "@/lib/data-status";

export function SignalDrawer() {
  const s = useDashboardStore((st) => st.selectedSignal);
  const close = useDashboardStore((st) => st.setSelectedSignal);
  return (
    <AnimatePresence>
      {s && (
        <>
          <motion.div className="fixed inset-0 bg-black/60 z-50" onClick={() => close(null)} aria-hidden="true" />
          <motion.aside
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            aria-label={`Detalhes do sinal ${s.asset}`}
          >
            <div className="p-6">
              <div className="flex justify-between">
                <div>
                  <div className="text-[11px] uppercase text-muted-foreground">Detalhes do sinal</div>
                  <div className="text-[22px] mt-1">{s.asset}</div>
                </div>
                <button onClick={() => close(null)} aria-label="Fechar detalhes">
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex gap-2 my-5">
                <ScoreBadge score={s.score} size="lg" />
                <span>{s.direction}</span>
                <span className="text-muted-foreground">
                  · {s.tf || "—"} · {relativeTime(s.time)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Entrada" value={money(s.entry)} />
                <Stat label="Stop" value={money(s.stop)} />
                <Stat label="Alvo" value={money(s.target)} />
                <Stat label="R/R" value={s.rr == null ? "—" : s.rr.toFixed(1)} />
                <Stat label="Período" value={s.tf || "—"} />
                <Stat label="Tipo" value={s.type ?? "—"} />
              </div>
              <Section title="Setup">{s.setup ?? "—"}</Section>
              <Section title="Confluências">
                {s.confluences?.length ? s.confluences.join(" · ") : "—"}
              </Section>
              <Link
                to="/alerts"
                className="w-full mt-4 h-11 rounded-lg border border-border flex items-center justify-center gap-2 text-[13px] hover:bg-secondary transition-colors"
              >
                <Bell className="size-4" />
                Configurar alerta para este sinal
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
function money(n: number | null) {
  return n == null ? "—" : "$" + n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}
function Stat(p: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 border border-border p-3">
      <div className="text-[10px] uppercase text-muted-foreground">{p.label}</div>
      <div className="text-[15px] font-semibold mt-1">{p.value}</div>
    </div>
  );
}
function Section(p: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-[11px] uppercase text-muted-foreground mb-2">{p.title}</div>
      <div className="text-[13px] text-muted-foreground">{p.children}</div>
    </div>
  );
}
