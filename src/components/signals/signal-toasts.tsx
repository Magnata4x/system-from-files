import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import { useSignalsStore } from "@/lib/signals-store";
import { formatPrice } from "@/lib/signals-data";
import { useEffect } from "react";

export function SignalToasts() {
  const toasts = useSignalsStore((s) => s.toasts);
  const dismiss = useSignalsStore((s) => s.dismissToast);
  const openDetail = useSignalsStore((s) => s.openDetail);

  useEffect(() => {
    const timers = toasts.map((t) =>
      setTimeout(() => dismiss(t.id), 8000 - (Date.now() - t.createdAt))
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[300px]">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = t.signal;
          const accent = s.direction === "BUY" ? "#1D9E75" : "#E24B4A";
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              className="relative rounded-lg border border-border bg-card overflow-hidden shadow-xl"
            >
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <ScoreBadge score={s.score} size="sm" />
                  <span className="text-[13px] font-semibold text-foreground">{s.asset}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: `color-mix(in oklab, ${accent} 22%, transparent)`, color: accent }}
                  >
                    {s.direction}
                  </span>
                  <button onClick={() => dismiss(t.id)} className="ml-auto text-muted-foreground hover:text-foreground">
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Entry <span className="text-foreground tabular-nums">{formatPrice(s.entry)}</span> · {s.tf} · {s.exchange}
                </div>
                <button onClick={() => { openDetail(s.id); dismiss(t.id); }} className="mt-2 text-[11px] text-[var(--brand-cyan)] hover:underline">View signal →</button>
              </div>
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 8, ease: "linear" }}
                className="h-0.5"
                style={{ background: accent }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
