import { useDashboardStore } from "@/lib/dashboard-store";
import { ScoreBadge } from "./score-badge";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function LiveToasts() {
  const toasts = useDashboardStore((s) => s.toasts);
  const dismiss = useDashboardStore((s) => s.dismissToast);
  const setSelected = useDashboardStore((s) => s.setSelectedSignal);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[300px]">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = t.signal;
          const up = s.direction === "BUY";
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="relative rounded-xl border border-border bg-card shadow-xl overflow-hidden"
            >
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ScoreBadge score={s.score} size="sm" />
                  <span className="text-[13px] font-semibold text-foreground">{s.asset}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    style={{
                      background: up ? "color-mix(in oklab, #1D9E75 18%, transparent)" : "color-mix(in oklab, #E24B4A 18%, transparent)",
                      color: up ? "#1D9E75" : "#E24B4A",
                    }}
                  >
                    {s.direction}
                  </span>
                  <button
                    onClick={() => dismiss(t.id)}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="text-[11px] text-muted-foreground mb-2">
                  Entry <span className="text-foreground tabular-nums">${s.entry}</span> · TF {s.tf}
                </div>
                <button
                  onClick={() => { setSelected(s); dismiss(t.id); }}
                  className="w-full text-[12px] font-medium py-1.5 rounded-md text-[var(--brand-cyan)] bg-secondary hover:bg-secondary/70"
                >
                  View signal
                </button>
              </div>
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 bg-[var(--brand-cyan)]"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 8, ease: "linear" }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
