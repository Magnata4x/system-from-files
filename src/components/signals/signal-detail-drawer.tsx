import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bell, Bookmark, LineChart, Share2, ChevronDown, AlertTriangle, Check,
  TrendingUp, TrendingDown, Globe, Activity, ShieldCheck, Shield, ShieldAlert, Sparkles, GripVertical,
} from "lucide-react";
import { ScoreBadge, scoreColor } from "@/components/dashboard/score-badge";
import { useSignalsStore } from "@/lib/signals-store";
import { formatPrice, formatAge, type Signal } from "@/lib/signals-data";
import { MiniChart } from "./mini-chart";

function tierLabel(score: number) {
  if (score >= 90) return "Institutional Premium";
  if (score >= 75) return "High Probability";
  if (score >= 60) return "Standard";
  return "Speculative";
}

function pct(from: number, to: number) {
  return ((to - from) / from) * 100;
}

export function SignalDetailDrawer() {
  const detailId = useSignalsStore((s) => s.detailId);
  const close = useSignalsStore((s) => s.closeDetail);
  const signal = useSignalsStore((s) => s.signals.find((x) => x.id === s.detailId) ?? null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!detailId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId, close]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {detailId && signal && <DrawerBody key={signal.id} signal={signal} onClose={close} />}
    </AnimatePresence>,
    document.body,
  );
}

function DrawerBody({ signal, onClose }: { signal: Signal; onClose: () => void }) {
  const isBuy = signal.direction === "BUY";
  const accent = isBuy ? "#1D9E75" : "#E24B4A";
  const isPremium = signal.score >= 90;
  const isExpired = signal.status === "expired";
  const isInvalid = signal.status === "invalidated";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-[60]"
      />
      <motion.aside
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        className="fixed top-0 right-0 bottom-0 z-[61] w-full md:w-[480px] bg-[#0A0B0E] border-l border-border flex flex-col"
        style={{
          boxShadow: isPremium
            ? "inset 0 0 0 1px #7F77DD, -10px 0 40px color-mix(in oklab, #7F77DD 30%, transparent)"
            : undefined,
        }}
      >
        <Header signal={signal} accent={accent} isBuy={isBuy} onClose={onClose} />

        {(isExpired || isInvalid) && (
          <div
            className="px-5 py-2 text-[12px] font-medium border-b"
            style={{
              background: isInvalid ? "color-mix(in oklab, #E24B4A 22%, var(--background))" : "color-mix(in oklab, #EF9F27 22%, var(--background))",
              borderColor: isInvalid ? "#E24B4A" : "#EF9F27",
              color: isInvalid ? "#FF9B9A" : "#F4C57A",
            }}
          >
            {isInvalid ? "✕ Signal invalidated — stop loss hit" : "⏱ Signal expired — no longer actionable"}
          </div>
        )}

        {isPremium && (
          <div className="px-5 py-2 text-[12px] font-semibold inline-flex items-center gap-2 border-b border-border bg-[color-mix(in_oklab,#7F77DD_18%,transparent)] text-[#B5AEFF]">
            <Sparkles className="size-3.5" /> Institutional Premium signal
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <SectionTradeSetup signal={signal} isBuy={isBuy} accent={accent} />
          <SectionChart signal={signal} />
          <SectionAnalysis signal={signal} />
          <SectionInvalidation signal={signal} />
          <SectionMarketContext signal={signal} />
          <SectionSentiment />
          <SectionHistorical />
          <SectionDNA signal={signal} />
        </div>

        <Footer signal={signal} />
      </motion.aside>
    </>
  );
}

// ---------- Header ----------
function Header({ signal, accent, isBuy, onClose }: { signal: Signal; accent: string; isBuy: boolean; onClose: () => void }) {
  const [base, quote] = signal.asset.split("/");
  const mockChange = ((signal.id.charCodeAt(signal.id.length - 1) % 50) - 20) / 10;
  const changeColor = mockChange >= 0 ? "#1D9E75" : "#E24B4A";

  return (
    <header className="sticky top-0 z-10 px-5 pt-4 pb-3 bg-[#0A0B0E] border-b border-border">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 size-8 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label="Close"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-center gap-2 flex-wrap pr-10">
        <span className="text-[18px] font-medium text-foreground">{base} / {quote ?? "USD"}</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-secondary text-foreground border border-border">{signal.exchange}</span>
        <span className="text-[14px] font-semibold tabular-nums text-foreground">${formatPrice(signal.entry)}</span>
        <span className="text-[12px] font-medium tabular-nums" style={{ color: changeColor }}>
          {mockChange >= 0 ? "+" : ""}{mockChange.toFixed(1)}%
        </span>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span
          className="px-3 py-1.5 rounded-md text-[13px] font-bold tracking-wide inline-flex items-center gap-1"
          style={{ background: `color-mix(in oklab, ${accent} 22%, transparent)`, color: accent }}
        >
          {signal.direction} {isBuy ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
        </span>
        <span className="px-2 py-1 rounded text-[11px] font-semibold bg-[var(--brand-blue-deep)] text-foreground">{signal.tf}</span>
        <span className="text-[11px] text-muted-foreground">Generated {formatAge(signal.ageMin)}</span>
        <StatusBadge status={signal.status} />
        <div className="ml-auto flex items-center gap-1.5">
          <ScoreRing score={signal.score}>
            <ScoreBadge score={signal.score} size="lg" />
          </ScoreRing>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wider mt-1.5 text-right font-medium" style={{ color: scoreColor(signal.score) }}>
        {tierLabel(signal.score)}
      </div>
    </header>
  );
}

function StatusBadge({ status }: { status: Signal["status"] }) {
  if (status === "expired") return <span className="text-[10px] font-bold uppercase tracking-wider text-[#888780]">EXPIRED</span>;
  if (status === "invalidated") return <span className="text-[10px] font-bold uppercase tracking-wider text-[#E24B4A]">INVALIDATED</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#1D9E75]">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75 animate-ping" />
        <span className="relative inline-flex size-1.5 rounded-full bg-[#1D9E75]" />
      </span>
      ACTIVE
    </span>
  );
}

// ---------- Score Ring ----------
function ScoreRing({ score, children }: { score: number; children: React.ReactNode }) {
  const color = scoreColor(score);
  const size = 64;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1E2028" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
          style={{ filter: `drop-shadow(0 0 4px color-mix(in oklab, ${color} 60%, transparent))` }}
        />
      </svg>
      {children}
    </div>
  );
}

// ---------- Section 1: Trade Setup ----------
function SectionTradeSetup({ signal, isBuy, accent }: { signal: Signal; isBuy: boolean; accent: string }) {
  const [stop, setStop] = useState(signal.stop);
  const [target, setTarget] = useState(signal.target);

  useEffect(() => {
    setStop(signal.stop);
    setTarget(signal.target);
  }, [signal.id, signal.stop, signal.target]);

  const t2 = target;
  const t1 = isBuy
    ? signal.entry + (target - signal.entry) * 0.6
    : signal.entry - (signal.entry - target) * 0.6;

  const rr = Math.abs(target - signal.entry) / Math.max(1e-9, Math.abs(signal.entry - stop));

  type Row = {
    key: string;
    label: string;
    price: number;
    color: string;
    change: number;
    highlight?: boolean;
    draggable?: "target" | "stop";
  };

  const ladder: Row[] = [
    { key: "tp2", label: "TARGET 2", price: t2, color: "#1D9E75", change: pct(signal.entry, t2), draggable: "target" },
    { key: "tp1", label: "TARGET 1", price: t1, color: "#1D9E75", change: pct(signal.entry, t1) },
    { key: "entry", label: "ENTRY", price: signal.entry, color: "#378ADD", change: 0, highlight: true },
    { key: "stop", label: "STOP LOSS", price: stop, color: "#E24B4A", change: pct(signal.entry, stop), draggable: "stop" },
  ];
  if (!isBuy) ladder.reverse();

  const rrColor = rr >= 2 ? "#1D9E75" : rr >= 1 ? "#EF9F27" : "#E24B4A";

  return (
    <Section title="Trade Setup">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {ladder.map((row, i) => {
          const dividerAfter = row.label === "ENTRY" || (i === 1 && !row.highlight);
          return (
            <motion.div
              key={row.key}
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.05 + i * 0.08, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <LadderRow
                row={row}
                entry={signal.entry}
                isBuy={isBuy}
                onChange={(next) => {
                  if (row.draggable === "stop") setStop(next);
                  else if (row.draggable === "target") setTarget(next);
                }}
              />
              {dividerAfter && <div className="border-t border-dashed border-border" />}
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="grid grid-cols-3 gap-2 mt-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.3 }}
      >
        <Stat label="R/R" value={`${rr.toFixed(2)}:1`} color={rrColor} bold />
        <Stat label="Risk" value={`${signal.riskPct}%`} />
        <Stat label="To TP1" value={`${Math.abs(pct(signal.entry, t1)).toFixed(1)}%`} color={accent} />
      </motion.div>

      <PositionCalculator signal={signal} stop={stop} t1={t1} t2={t2} />
    </Section>
  );
}

function LadderRow({
  row, entry, isBuy, onChange,
}: {
  row: { label: string; price: number; color: string; change: number; highlight?: boolean; draggable?: "target" | "stop" };
  entry: number;
  isBuy: boolean;
  onChange: (next: number) => void;
}) {
  const start = useRef<{ y: number; price: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, price: row.price };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!start.current || !row.draggable) return;
    const dy = e.clientY - start.current.y;
    const step = Math.max(entry * 0.0003, 1e-6);
    let next = start.current.price - dy * step;
    const minGap = entry * 0.001;
    if (row.draggable === "target") {
      next = isBuy ? Math.max(entry + minGap, next) : Math.min(entry - minGap, next);
    } else {
      next = isBuy ? Math.min(entry - minGap, next) : Math.max(entry + minGap, next);
    }
    onChange(next);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    start.current = null;
    setDragging(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div
      className="flex items-center justify-between px-3 py-2 text-[12px] gap-2"
      style={{
        background: row.highlight
          ? "color-mix(in oklab, #378ADD 14%, transparent)"
          : dragging
            ? `color-mix(in oklab, ${row.color} 12%, transparent)`
            : "transparent",
        borderLeft: `3px solid ${row.color}`,
        transition: "background 120ms ease",
      }}
    >
      <span className="uppercase tracking-wide text-[10px] font-semibold" style={{ color: row.color }}>
        {row.label}
      </span>
      <span className="font-semibold tabular-nums text-foreground ml-auto">${formatPrice(row.price)}</span>
      <span className="tabular-nums" style={{ color: row.color, minWidth: 56, textAlign: "right" }}>
        {row.change === 0 ? "—" : `${row.change > 0 ? "+" : ""}${row.change.toFixed(1)}%`}
      </span>
      {row.draggable ? (
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          title="Drag to adjust"
          className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary touch-none select-none"
          style={{ cursor: dragging ? "grabbing" : "ns-resize" }}
        >
          <GripVertical className="size-3.5" />
        </button>
      ) : (
        <span className="size-5" />
      )}
    </div>
  );
}

function PositionCalculator({ signal, stop, t1, t2 }: { signal: Signal; stop: number; t1: number; t2: number }) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(10000);
  const [risk, setRisk] = useState(1);

  const isBuy = signal.direction === "BUY";
  const riskPerUnit = Math.abs(signal.entry - stop);
  const dollarRisk = account * (risk / 100);
  const units = riskPerUnit > 0 ? dollarRisk / riskPerUnit : 0;
  const positionSize = units * signal.entry;
  const gain1 = units * Math.abs(t1 - signal.entry) * (isBuy ? 1 : 1);
  const gain2 = units * Math.abs(t2 - signal.entry);

  return (
    <div className="mt-3 rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[12px] font-medium text-foreground hover:bg-secondary/40"
      >
        <span>Calculate position</span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Account size ($)</label>
                <input
                  type="number"
                  value={account}
                  onChange={(e) => setAccount(Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full h-8 px-2 rounded-md bg-background border border-border text-[13px] text-foreground tabular-nums focus:outline-none focus:border-[var(--brand-cyan)]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span>Risk %</span>
                  <span className="tabular-nums text-foreground">{risk.toFixed(1)}%</span>
                </div>
                <input
                  type="range" min={0.5} max={3} step={0.1} value={risk}
                  onChange={(e) => setRisk(Number(e.target.value))}
                  className="w-full accent-[var(--brand-cyan)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Stat label="Position size" value={`$${positionSize.toFixed(0)}`} />
                <Stat label="Units" value={units.toFixed(4)} />
                <Stat label="Max loss" value={`-$${dollarRisk.toFixed(0)}`} color="#E24B4A" />
                <Stat label="Gain TP1 / TP2" value={`+$${gain1.toFixed(0)} / +$${gain2.toFixed(0)}`} color="#1D9E75" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Section 2: Chart ----------
function SectionChart({ signal }: { signal: Signal }) {
  return (
    <Section title="Price Action">
      <MiniChart signal={signal} />
    </Section>
  );
}

// ---------- Section 3: AI Analysis ----------
function SectionAnalysis({ signal }: { signal: Signal }) {
  const isBuy = signal.direction === "BUY";
  const reasoning = isBuy
    ? `Bullish break of structure on the ${signal.tf} confirmed by an unmitigated order block at the prior swing high. Volume printed +${signal.volDelta}% on the breakout candle, and price reclaimed the session VWAP with momentum. Setup aligns with the broader 4H trend.`
    : `Bearish change of character on the ${signal.tf} with rejection at the order block. Volume divergence on the last impulse leg and a failed retest of broken support increase downside conviction. Aligned with weakening sentiment indicators.`;

  const breakdown = useMemo(() => {
    const seed = signal.score;
    return [
      { label: "Price Action", value: Math.min(98, seed + 4) },
      { label: "Indicators", value: Math.max(40, seed - 8) },
      { label: "Volume", value: Math.min(99, seed + 12) },
      { label: "Sentiment", value: Math.max(40, seed - 11) },
      { label: "Macro", value: Math.max(40, seed - 18) },
    ];
  }, [signal.score]);

  const confirms = [
    { label: "BOS confirmed", ok: true },
    { label: "Order Block respected", ok: signal.confirms.structure },
    { label: "RSI > 50", ok: signal.confirms.rsi },
    { label: "VWAP reclaim", ok: signal.confirms.vwap },
    { label: `Volume +${signal.volDelta}%`, ok: signal.confirms.volume },
    { label: "Daily trend alignment", ok: false, no: true },
    { label: "High volatility window", ok: false, warn: true },
  ];

  return (
    <Section title="AI Analysis">
      <p className="text-[13px] text-foreground/85 leading-relaxed mb-4">{reasoning}</p>

      <div className="space-y-2">
        {breakdown.map((b, i) => (
          <ScoreBar key={b.label} label={b.label} value={b.value} delay={i * 0.08} />
        ))}
        <div className="flex items-center justify-between text-[12px] pt-1">
          <span className="text-muted-foreground">Manipulation Risk</span>
          <ManipChip risk={signal.manipRisk} />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Confirmations</div>
        <ul className="space-y-1">
          {confirms.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-[12px] text-foreground">
              {c.warn ? (
                <AlertTriangle className="size-3.5 text-[#EF9F27]" />
              ) : c.no ? (
                <X className="size-3.5 text-[#E24B4A]" />
              ) : c.ok ? (
                <Check className="size-3.5 text-[#1D9E75]" />
              ) : (
                <X className="size-3.5 text-[#E24B4A]" />
              )}
              {c.label}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function ScoreBar({ label, value, delay }: { label: string; value: number; delay: number }) {
  const color = scoreColor(value);
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium text-foreground">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, delay, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function ManipChip({ risk }: { risk: "low" | "medium" | "high" }) {
  if (risk === "low")
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#1D9E75]"><ShieldCheck className="size-3" /> LOW ✓</span>;
  if (risk === "medium")
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#EF9F27]"><Shield className="size-3" /> MEDIUM</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#E24B4A]"><ShieldAlert className="size-3" /> HIGH</span>;
}

// ---------- Section 4: Invalidation ----------
function SectionInvalidation({ signal }: { signal: Signal }) {
  const items = [
    `Price closes ${signal.direction === "BUY" ? "below" : "above"} $${formatPrice(signal.stop)} on ${signal.tf}`,
    `BTC dominance ${signal.direction === "BUY" ? "drops below 50%" : "spikes above 56%"}`,
    "Fed speech in 3h 20min — reduce size",
    `RSI crosses ${signal.direction === "BUY" ? "below 45" : "above 55"} before TP1`,
  ];
  return (
    <Section title="Invalidation Scenarios">
      <div
        className="rounded-lg border p-3 space-y-1.5"
        style={{
          background: "color-mix(in oklab, #E24B4A 8%, var(--card))",
          borderColor: "color-mix(in oklab, #E24B4A 35%, transparent)",
        }}
      >
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-2 text-[12px] text-foreground/90">
            <AlertTriangle className="size-3.5 text-[#E24B4A] mt-0.5 shrink-0" />
            <span>{it}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------- Section 5: Market Context ----------
function SectionMarketContext({ signal }: { signal: Signal }) {
  return (
    <Section title="Market Context">
      <div className="grid grid-cols-2 gap-2">
        <CtxCell icon={<TrendingUp className="size-3" />} label="Trend 4H" value="BULLISH ↑" color="#1D9E75" />
        <CtxCell icon={<TrendingUp className="size-3" />} label="Trend 1D" value="BULLISH ↑" color="#1D9E75" />
        <CtxCell icon={<Activity className="size-3" />} label="Volatility" value="MODERATE" color="#EF9F27" />
        <CtxCell icon={<Globe className="size-3" />} label="Session" value={`${signal.session} Open`} color="#378ADD" />
      </div>
      <div className="mt-2 space-y-1 text-[12px]">
        <Row label="DXY" value="Weakening ↓ (bullish BTC)" color="#1D9E75" />
        <Row label="Funding" value="+0.021%" />
        <Row label="OI" value="+4.2%" color="#1D9E75" />
      </div>
    </Section>
  );
}

function CtxCell({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-[12px] font-semibold mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium" style={{ color: color ?? "var(--foreground)" }}>{value}</span>
    </div>
  );
}

// ---------- Section 6: Sentiment ----------
function SectionSentiment() {
  return (
    <Section title="Asset Sentiment">
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground">Score</span>
          <span className="text-[14px] font-bold text-[#1D9E75]">77/100 · Bullish</span>
        </div>
        <Row label="Social" value="67% bull" color="#1D9E75" />
        <Row label="News" value="ETF inflows $420M" />
        <Row label="On-chain" value="Accumulation phase" color="#378ADD" />
      </div>
    </Section>
  );
}

// ---------- Section 7: Historical ----------
function SectionHistorical() {
  const rows = [
    { date: "Apr 14", setup: "BOS+OB", entry: 41200, exit: 43750, win: true, ret: 6.2 },
    { date: "Mar 28", setup: "BOS+OB", entry: 38400, exit: 40900, win: true, ret: 6.5 },
    { date: "Mar 12", setup: "BOS+OB", entry: 36800, exit: 35300, win: false, ret: -4.1 },
    { date: "Feb 26", setup: "BOS+OB", entry: 34500, exit: 36900, win: true, ret: 6.9 },
    { date: "Feb 09", setup: "BOS+OB", entry: 32100, exit: 34380, win: true, ret: 7.1 },
  ];
  return (
    <Section title="Similar Historical Signals">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-background/40 text-muted-foreground">
            <tr>
              {["Date", "Setup", "Entry", "Exit", "Result", "Return"].map((h) => (
                <th key={h} className="px-2.5 py-1.5 text-left font-medium uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-2.5 py-1.5">{r.date}</td>
                <td className="px-2.5 py-1.5 text-muted-foreground">{r.setup}</td>
                <td className="px-2.5 py-1.5 tabular-nums">{r.entry}</td>
                <td className="px-2.5 py-1.5 tabular-nums">{r.exit}</td>
                <td className="px-2.5 py-1.5">
                  <span className={`font-bold ${r.win ? "text-[#1D9E75]" : "text-[#E24B4A]"}`}>
                    {r.win ? "WIN" : "LOSS"}
                  </span>
                </td>
                <td className="px-2.5 py-1.5 tabular-nums font-medium" style={{ color: r.win ? "#1D9E75" : "#E24B4A" }}>
                  {r.ret > 0 ? "+" : ""}{r.ret.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-2 border-t border-border text-[11px] text-foreground bg-background/40">
          4W / 1L — <span className="font-bold text-[#1D9E75]">80% win rate</span>
          <span className="text-muted-foreground"> · Avg win <span className="text-[#1D9E75]">+6.8%</span> · Avg loss <span className="text-[#E24B4A]">-4.1%</span></span>
        </div>
      </div>
    </Section>
  );
}

// ---------- Section 8: DNA ----------
function SectionDNA({ signal }: { signal: Signal }) {
  const good = signal.dnaMatch >= 75;
  return (
    <Section title="DNA Compatibility">
      <div
        className="rounded-lg border p-3"
        style={{
          background: "var(--card)",
          borderColor: good ? "#1D9E75" : "var(--border)",
        }}
      >
        <div className="flex justify-between text-[12px] mb-2">
          <span className="text-muted-foreground">Match</span>
          <span className="font-bold tabular-nums" style={{ color: good ? "#1D9E75" : "var(--foreground)" }}>
            {signal.dnaMatch}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${signal.dnaMatch}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, var(--brand-blue), ${scoreColor(signal.dnaMatch)})` }}
          />
        </div>
        <ul className="space-y-1 text-[12px] text-foreground">
          <li className="flex items-center gap-2"><Check className="size-3.5 text-[#1D9E75]" /> Timeframe match: {signal.tf} (your best)</li>
          <li className="flex items-center gap-2"><Check className="size-3.5 text-[#1D9E75]" /> Setup match: {signal.setup} (#1 setup)</li>
          <li className="flex items-center gap-2"><Check className="size-3.5 text-[#1D9E75]" /> Session: {signal.session} Open (best session)</li>
          <li className="flex items-center gap-2"><AlertTriangle className="size-3.5 text-[#EF9F27]" /> Risk note: within your range</li>
        </ul>
      </div>
    </Section>
  );
}

// ---------- Footer ----------
function Footer({ signal }: { signal: Signal }) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <footer className="sticky bottom-0 z-10 bg-[#0A0B0E] border-t border-border p-3 relative">
      <AnimatePresence>
        {alertOpen && <AlertPopover signal={signal} onClose={() => setAlertOpen(false)} />}
        {shareOpen && <SharePopover signal={signal} onClose={() => setShareOpen(false)} />}
      </AnimatePresence>
      <div className="flex items-center gap-2">
        <FooterBtn icon={<Bell className="size-3.5" />} label="Set Alert" onClick={() => { setAlertOpen((o) => !o); setShareOpen(false); }} />
        <FooterBtn icon={<Bookmark className="size-3.5" />} label="Save" />
        <FooterBtn icon={<Share2 className="size-3.5" />} label="Share" onClick={() => { setShareOpen((o) => !o); setAlertOpen(false); }} />
        <button className="ml-auto h-9 px-4 rounded-md bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-deep)] text-foreground text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors">
          <LineChart className="size-3.5" /> Open Chart
        </button>
      </div>
    </footer>
  );
}

function FooterBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-9 px-3 rounded-md border border-border bg-card text-foreground hover:border-[var(--brand-cyan)] text-[12px] inline-flex items-center gap-1.5 transition-colors"
    >
      {icon} {label}
    </button>
  );
}

function AlertPopover({ signal, onClose }: { signal: Signal; onClose: () => void }) {
  const [trigger, setTrigger] = useState<"price" | "score" | "expiry">("price");
  const [channel, setChannel] = useState<"push" | "email" | "telegram">("push");
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full left-3 mb-2 w-[280px] rounded-lg border border-border bg-card shadow-xl p-3 z-20"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium text-foreground">Configure alert</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
      </div>
      <div className="space-y-2.5">
        <Field label="Trigger">
          <Tabs options={[{ v: "price", l: "Price" }, { v: "score", l: "Score" }, { v: "expiry", l: "Expiry" }]} value={trigger} onChange={setTrigger} />
        </Field>
        <Field label={trigger === "price" ? "Target price" : trigger === "score" ? "Score threshold" : "Minutes before expiry"}>
          <input
            type="number"
            defaultValue={trigger === "price" ? Math.round(signal.entry) : trigger === "score" ? 80 : 30}
            className="w-full h-8 px-2 rounded-md bg-background border border-border text-[12px] text-foreground tabular-nums focus:outline-none focus:border-[var(--brand-cyan)]"
          />
        </Field>
        <Field label="Channel">
          <Tabs options={[{ v: "push", l: "Push" }, { v: "email", l: "Email" }, { v: "telegram", l: "Telegram" }]} value={channel} onChange={setChannel} />
        </Field>
        <button className="w-full h-8 rounded-md bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-deep)] text-foreground text-[12px] font-medium">
          Create alert
        </button>
      </div>
    </motion.div>
  );
}

function SharePopover({ signal, onClose }: { signal: Signal; onClose: () => void }) {
  const isBuy = signal.direction === "BUY";
  const accent = isBuy ? "#1D9E75" : "#E24B4A";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full right-3 mb-2 w-[300px] rounded-lg border border-border bg-card shadow-xl p-3 z-20"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium text-foreground">Share signal</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
      </div>
      {/* Shareable card preview */}
      <div
        className="rounded-lg p-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, #0C447C, #0A0B0E)`,
          border: `1px solid color-mix(in oklab, ${accent} 40%, transparent)`,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[var(--brand-cyan)] font-semibold">AISignalRadar</span>
          <ScoreBadge score={signal.score} size="sm" />
        </div>
        <div className="mt-2 text-[18px] font-bold text-white">{signal.asset}</div>
        <div className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: `color-mix(in oklab, ${accent} 28%, transparent)`, color: accent }}>
          {signal.direction} · {signal.tf}
        </div>
        <div className="mt-3 space-y-0.5 text-[11px] text-white/90">
          <div className="flex justify-between"><span>Entry</span><span className="tabular-nums">${formatPrice(signal.entry)}</span></div>
          <div className="flex justify-between"><span>Stop</span><span className="tabular-nums text-[#FF9B9A]">${formatPrice(signal.stop)}</span></div>
          <div className="flex justify-between"><span>Target</span><span className="tabular-nums text-[#7EE3BC]">${formatPrice(signal.target)}</span></div>
        </div>
      </div>
      <button className="w-full mt-2 h-8 rounded-md bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-deep)] text-foreground text-[12px] font-medium">
        Download image
      </button>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

function Tabs<T extends string>({ options, value, onChange }: { options: { v: T; l: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 h-7 rounded text-[11px] border transition-colors ${
            value === o.v
              ? "border-[var(--brand-cyan)] bg-[color-mix(in_oklab,var(--brand-cyan)_15%,transparent)] text-foreground"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

// ---------- Shared atoms ----------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-4 border-b border-border">
      <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="rounded-md bg-card border border-border px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-[13px] tabular-nums mt-0.5 ${bold ? "font-bold" : "font-semibold"}`} style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </div>
    </div>
  );
}
