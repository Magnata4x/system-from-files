import { useDashboardStore } from "@/lib/dashboard-store";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ScoreBadge } from "./score-badge";

export function SignalDrawer() {
  const s = useDashboardStore((st) => st.selectedSignal);
  const setSelected = useDashboardStore((st) => st.setSelectedSignal);
  const open = !!s;

  return (
    <AnimatePresence>
      {open && s && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          />
          <motion.aside
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border overflow-y-auto"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Signal detail</div>
                  <div className="text-[22px] font-medium text-foreground mt-1">{s.asset}</div>
                </div>
                <button onClick={() => setSelected(null)} className="size-8 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground">
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-5">
                <ScoreBadge score={s.score} size="lg" />
                <span
                  className="px-2.5 py-1 rounded text-[12px] font-semibold"
                  style={{
                    background: s.direction === "BUY" ? "color-mix(in oklab, #1D9E75 18%, transparent)" : "color-mix(in oklab, #E24B4A 18%, transparent)",
                    color: s.direction === "BUY" ? "#1D9E75" : "#E24B4A",
                  }}
                >
                  {s.direction}
                </span>
                <span className="text-[12px] text-muted-foreground">· {s.tf} · {s.time}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <Stat label="Entry" value={`$${s.entry}`} />
                <Stat label="Stop" value={`$${s.stop}`} color="#E24B4A" />
                <Stat label="Target" value={`$${s.target}`} color="#1D9E75" />
                <Stat label="R/R" value={s.rr.toFixed(1)} />
                <Stat label="Timeframe" value={s.tf} />
                <Stat label="Type" value="Premium" color="#7F77DD" />
              </div>

              <Section title="Setup">
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Break of structure on the {s.tf} confirmed by institutional order block on the previous swing. Liquidity sweep on the prior session high adds confluence.
                </p>
              </Section>

              <Section title="Confluences">
                <div className="flex flex-wrap gap-1.5">
                  {["BOS", "Order Block", "Liquidity sweep", "Fair Value Gap", "Premium / Discount"].map((c) => (
                    <span key={c} className="px-2 py-1 rounded-md bg-secondary text-[12px] text-foreground border border-border">{c}</span>
                  ))}
                </div>
              </Section>

              <button className="w-full h-11 rounded-lg text-sm font-medium text-primary-foreground mt-2" style={{ background: "var(--brand-blue)" }}>
                Set alert for this signal
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[15px] font-semibold tabular-nums mt-0.5" style={{ color: color ?? "var(--foreground)" }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}
