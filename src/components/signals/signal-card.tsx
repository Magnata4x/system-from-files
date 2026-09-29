import { motion } from "framer-motion";
import { Shield, ShieldAlert, ShieldCheck, Bell, Bookmark, ArrowRight } from "lucide-react";
import { ScoreBadge, scoreColor } from "@/components/dashboard/score-badge";
import { type Signal, formatPrice, formatAge } from "@/lib/signals-data";
import { useSignalsStore } from "@/lib/signals-store";

export function SignalCard({ signal }: { signal: Signal }) {
  const isBuy = signal.direction === "BUY";
  const accent = isBuy ? "#1D9E75" : "#E24B4A";
  const flashIds = useSignalsStore((s) => s.flashIds);
  const setHover = useSignalsStore((s) => s.setHover);
  const pin = useSignalsStore((s) => s.pin);
  const openDetail = useSignalsStore((s) => s.openDetail);
  const flashing = flashIds.includes(signal.id);

  const ringByStatus: Record<string, string> = {
    new: "0 0 0 1px #378ADD, 0 0 22px color-mix(in oklab, #378ADD 35%, transparent)",
    premium: "0 0 0 1px #7F77DD, 0 0 26px color-mix(in oklab, #7F77DD 40%, transparent)",
    expiring: "0 0 0 1px #EF9F27",
    invalidated: "",
    expired: "",
    active: "",
  };
  const opacity = signal.status === "expired" ? 0.45 : 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity, y: 0, scale: 1 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.25 }}
      onMouseEnter={() => setHover(signal.id)}
      onMouseLeave={() => setHover(null)}
      onClick={() => pin(signal.id)}
      className="relative rounded-xl border border-border bg-card overflow-hidden cursor-pointer"
      style={{ boxShadow: ringByStatus[signal.status] || undefined }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />

      {/* Status badges */}
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        {signal.isMock && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-dashed border-muted-foreground/60 text-muted-foreground tracking-wider bg-background/40"
            title="Sinal de demonstração — não use para trading real"
          >
            DEMO
          </span>
        )}
        {signal.status === "new" && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#378ADD] text-white tracking-wider">NEW</span>
        )}
        {signal.status === "premium" && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#7F77DD] text-white tracking-wider">PREMIUM</span>
        )}
        {signal.status === "invalidated" && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E24B4A] text-white tracking-wider">STOP HIT</span>
        )}
        {signal.status === "expiring" && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EF9F27] text-black tracking-wider">EXPIRING</span>
        )}
      </div>

      <div className="p-4 pl-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div
            className="size-7 rounded-md flex items-center justify-center text-[10px] font-bold"
            style={{ background: "color-mix(in oklab, var(--brand-blue) 22%, transparent)", color: "var(--brand-cyan)" }}
          >
            {signal.asset.split("/")[0].slice(0, 3)}
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-foreground leading-tight">{signal.asset}</span>
            <span className="text-[10px] text-muted-foreground">{signal.exchange} · {signal.tf} · {formatAge(signal.ageMin)}</span>
          </div>
        </div>

        {/* Direction + Score */}
        <div className="flex items-center gap-2 mt-3">
          <span
            className="px-2.5 py-1 rounded-md text-[12px] font-bold tracking-wide"
            style={{ background: `color-mix(in oklab, ${accent} 22%, transparent)`, color: accent }}
          >
            {signal.direction}
          </span>
          <motion.div animate={flashing ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 0.6 }}>
            <ScoreBadge score={signal.score} />
          </motion.div>
          <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wide">{signal.setup}</span>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <PriceCell label="Entry" value={formatPrice(signal.entry)} />
          <PriceCell label="Stop" value={formatPrice(signal.stop)} color="#E24B4A" />
          <PriceCell label="Target" value={formatPrice(signal.target)} color="#1D9E75" />
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mt-3 text-[11px] tabular-nums">
          <span className="text-muted-foreground">R/R <span className="text-foreground font-semibold">{signal.rr.toFixed(1)}</span></span>
          <span className="text-muted-foreground">Risk <span className="text-foreground font-semibold">{signal.riskPct}%</span></span>
          <span className="text-muted-foreground">Vol <span className="text-[#1D9E75] font-semibold">↑{signal.volDelta}%</span></span>
        </div>

        {/* Confirmations */}
        <div className="flex flex-wrap gap-1 mt-3">
          {(["rsi", "macd", "volume", "structure", "vwap"] as const).map((k) => {
            const ok = signal.confirms[k];
            return (
              <span
                key={k}
                className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
                style={{
                  background: ok ? "color-mix(in oklab, #1D9E75 18%, transparent)" : "color-mix(in oklab, var(--muted-foreground) 14%, transparent)",
                  color: ok ? "#1D9E75" : "var(--muted-foreground)",
                }}
              >
                {k} {ok ? "✓" : "·"}
              </span>
            );
          })}
        </div>

        {/* DNA + Manipulation */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>DNA match</span>
              <span className="tabular-nums text-foreground">{signal.dnaMatch}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${signal.dnaMatch}%`,
                  background: `linear-gradient(90deg, var(--brand-blue), ${scoreColor(signal.dnaMatch)})`,
                }}
              />
            </div>
          </div>
          <ManipIcon risk={signal.manipRisk} />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1 mt-4">
          <FooterBtn icon={<Bell className="size-3" />} label="Alert" />
          <FooterBtn icon={<Bookmark className="size-3" />} label="Save" />
          <button
            onClick={(e) => { e.stopPropagation(); openDetail(signal.id); }}
            className="ml-auto h-7 px-3 rounded-md bg-[var(--brand-blue-deep)] hover:bg-[var(--brand-blue)] text-foreground text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
          >
            View Analysis <ArrowRight className="size-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PriceCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md bg-background/40 border border-border px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className="text-[12px] font-semibold tabular-nums" style={{ color: color ?? "var(--foreground)" }}>{value}</div>
    </div>
  );
}

function FooterBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={(e) => e.stopPropagation()}
      className="h-7 px-2 rounded-md border border-border bg-background/40 text-muted-foreground hover:text-foreground hover:border-[var(--brand-cyan)] text-[11px] inline-flex items-center gap-1 transition-colors"
    >
      {icon} {label}
    </button>
  );
}

function ManipIcon({ risk }: { risk: "low" | "medium" | "high" }) {
  if (risk === "low") return <ShieldCheck className="size-4 text-[#1D9E75]" />;
  if (risk === "medium") return <Shield className="size-4 text-[#EF9F27]" />;
  return <ShieldAlert className="size-4 text-[#E24B4A]" />;
}
