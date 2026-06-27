import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Pin, X } from "lucide-react";
import { ScoreBadge, scoreColor } from "@/components/dashboard/score-badge";
import { useSignalsStore } from "@/lib/signals-store";
import { formatPrice } from "@/lib/signals-data";

const reasonsByDir: Record<string, string[]> = {
  BUY: [
    "Bullish BOS confirmed on 4H with strong volume",
    "Price reclaimed daily VWAP with rising momentum",
    "Liquidity sweep below prior low — institutional footprint",
  ],
  SELL: [
    "Bearish CHoCH printed at session high",
    "Volume divergence on last impulse leg",
    "Failed retest of broken support",
  ],
};

export function QuickViewPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const { signals, hoverId, pinnedId, pin } = useSignalsStore();
  const id = pinnedId ?? hoverId;
  const signal = signals.find((s) => s.id === id);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed right-3 top-1/2 -translate-y-1/2 z-30 size-8 rounded-l-md border border-border bg-card text-muted-foreground hover:text-foreground"
        title="Open quick view"
      >
        <ChevronLeft className="size-4 mx-auto" />
      </button>
    );
  }

  return (
    <aside className="w-[320px] shrink-0 border-l border-border bg-card/40 sticky top-[140px] self-start h-[calc(100vh-140px)] overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b border-border sticky top-0 bg-card/95 backdrop-blur">
        <span className="text-[12px] uppercase tracking-wide text-muted-foreground">Quick view</span>
        <div className="flex gap-1">
          {pinnedId && (
            <button onClick={() => pin(null)} className="size-6 rounded text-muted-foreground hover:text-foreground" title="Unpin">
              <X className="size-3.5 mx-auto" />
            </button>
          )}
          <button onClick={() => setCollapsed(true)} className="size-6 rounded text-muted-foreground hover:text-foreground">
            <ChevronRight className="size-3.5 mx-auto" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {signal ? (
          <motion.div
            key={signal.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="p-4 space-y-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-foreground">{signal.asset}</span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{
                  background: `color-mix(in oklab, ${signal.direction === "BUY" ? "#1D9E75" : "#E24B4A"} 22%, transparent)`,
                  color: signal.direction === "BUY" ? "#1D9E75" : "#E24B4A",
                }}
              >
                {signal.direction}
              </span>
              <div className="ml-auto"><ScoreBadge score={signal.score} /></div>
            </div>

            <div className="text-[11px] text-muted-foreground">
              {signal.exchange} · {signal.tf} · {signal.setup}
            </div>

            <div className="space-y-1">
              <Row label="Entry" value={formatPrice(signal.entry)} />
              <Row label="Stop" value={formatPrice(signal.stop)} color="#E24B4A" />
              <Row label="Target" value={formatPrice(signal.target)} color="#1D9E75" />
              <Row label="R/R" value={signal.rr.toFixed(1)} />
              <Row label="Risk" value={`${signal.riskPct}%`} />
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">AI Reasoning</div>
              <ul className="space-y-1.5">
                {reasonsByDir[signal.direction].map((r, i) => (
                  <li key={i} className="flex gap-2 text-[12px] text-foreground">
                    <span className="text-[var(--brand-cyan)] font-semibold">{i + 1}.</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>DNA match</span>
                <span className="tabular-nums text-foreground">{signal.dnaMatch}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${signal.dnaMatch}%`,
                    background: `linear-gradient(90deg, var(--brand-blue), ${scoreColor(signal.dnaMatch)})`,
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => useSignalsStore.getState().openDetail(signal.id)}
              className="w-full h-9 rounded-md bg-[var(--brand-blue-deep)] hover:bg-[var(--brand-blue)] text-foreground text-[12px] font-medium transition-colors"
            >
              Open full analysis →
            </button>

            {!pinnedId && hoverId && (
              <button
                onClick={() => pin(hoverId)}
                className="w-full h-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-[var(--brand-cyan)] text-[11px] inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Pin className="size-3" /> Pin this signal
              </button>
            )}
          </motion.div>
        ) : (
          <div className="p-6 text-center text-[12px] text-muted-foreground">
            Hover a signal or click to pin it here.
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium" style={{ color: color ?? "var(--foreground)" }}>{value}</span>
    </div>
  );
}
