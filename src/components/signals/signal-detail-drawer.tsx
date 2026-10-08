import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Bookmark, LineChart, Share2, TrendingUp, TrendingDown, ShieldAlert, ShieldCheck, Shield } from "lucide-react";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import { DataStatusBadge } from "@/components/dashboard/data-status";
import { useSignalsStore } from "@/lib/signals-store";
import { formatPrice, formatAge, type Signal } from "@/lib/signals-data";
import { MiniChart } from "./mini-chart";
import { bot4xEligibility, ELIGIBILITY_META } from "@/lib/bot4x-eligibility";
import { useBot4xStore } from "@/lib/bot4x-store";

export function SignalDetailDrawer() {
  const detailId = useSignalsStore((s) => s.detailId);
  const close = useSignalsStore((s) => s.closeDetail);
  const signal = useSignalsStore((s) => s.signals.find((x) => x.id === s.detailId) ?? null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!detailId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId, close]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>{detailId && signal && <DrawerBody key={signal.id} signal={signal} onClose={close} />}</AnimatePresence>,
    document.body,
  );
}

function DrawerBody({ signal, onClose }: { signal: Signal; onClose: () => void }) {
  const isBuy = signal.direction === "BUY";
  const accent = isBuy ? "#1D9E75" : "#E24B4A";
  const mode = useBot4xStore((s) => s.mode);
  const profile = useBot4xStore((s) => s.profile);
  const dailyPnlPct = useBot4xStore((s) => s.dailyPnlPct);
  const eligibility = bot4xEligibility(signal, { mode, profile, dailyPnlPct });
  const meta = ELIGIBILITY_META[eligibility];

  return <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-[60]" />
    <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed top-0 right-0 bottom-0 z-[61] w-full md:w-[480px] bg-[#0A0B0E] border-l border-border flex flex-col">
      <header className="px-5 pt-4 pb-3 border-b border-border">
        <button onClick={onClose} className="absolute top-3 right-3 size-8 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground" aria-label="Close"><X className="size-4" /></button>
        <div className="flex items-center gap-2 pr-10">
          <span className="text-[18px] font-medium">{signal.asset}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] border border-border">{signal.exchange === "binance" ? "Binance" : "—"}</span>
          <span className="text-[14px] font-semibold tabular-nums">{signal.entry == null ? "—" : "$" + formatPrice(signal.entry)}</span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="px-3 py-1.5 rounded-md text-[13px] font-bold" style={{ background: `color-mix(in oklab, ${accent} 22%, transparent)`, color: accent }}>
            {signal.direction} {isBuy ? <TrendingUp className="inline size-3.5" /> : <TrendingDown className="inline size-3.5" />}
          </span>
          <span className="px-2 py-1 rounded text-[11px] bg-[var(--brand-blue-deep)]">{signal.tf}</span>
          <span className="text-[11px] text-muted-foreground">{formatAge(signal.ageMin)}</span>
          <ScoreBadge score={signal.score} size="lg" />
        </div>
        <div className="mt-2"><DataStatusBadge source="Signals · backend" updatedAt={signal.createdAt} status={signal.createdAt ? "ok" : "unavailable"} /></div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <Section title="Trade Setup">
          <div className="grid grid-cols-3 gap-2">
            <Value label="Entrada" value={signal.entry == null ? "—" : "$" + formatPrice(signal.entry)} />
            <Value label="Stop" value={signal.stop == null ? "—" : "$" + formatPrice(signal.stop)} />
            <Value label="Target" value={signal.target == null ? "—" : "$" + formatPrice(signal.target)} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Entrada, SL e TP são referência no momento da análise.</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Value label="R/R" value={signal.rr == null ? "—" : signal.rr.toFixed(2)} />
            <Value label="Risco" value={signal.riskPct == null ? "—" : signal.riskPct + "%"} />
          </div>
        </Section>

        <Section title="Price levels">
          <MiniChart signal={signal} />
        </Section>

        <Section title="Motor">
          <div className="grid grid-cols-2 gap-2">
            <Value label="Score" value={String(signal.score)} />
            <Value label="Setup" value={signal.setup ?? "—"} />
            <Value label="Sessão" value={signal.session ?? "—"} />
            <Value label="Volume Δ" value={signal.volDelta == null ? "—" : signal.volDelta + "%"} />
            <Value label="DNA" value={signal.dnaMatch == null ? "—" : signal.dnaMatch + "%"} />
            <Value label="Manipulação" value={signal.manipRisk ?? "—"} />
          </div>
          <div className="mt-3 rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Confirmações fornecidas</div>
            {signal.confirms ? <div className="flex flex-wrap gap-1.5">{Object.entries(signal.confirms).map(([k, v]) =>
              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded border border-border">{k}: {v == null ? "—" : v ? "sim" : "não"}</span>
            )}</div> : <span className="text-[11px] text-muted-foreground">—</span>}
          </div>
        </Section>

        <Section title="Elegibilidade">
          <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
            <span className="text-[12px]">Bot4x</span>
            <span className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
          </div>
          {eligibility === "INDISPONIVEL" && <p className="text-[11px] text-muted-foreground mt-2">EXECUTAR indisponível enquanto status ou manipulação forem desconhecidos.</p>}
        </Section>
      </div>

      <footer className="sticky bottom-0 bg-[#0A0B0E] border-t border-border p-3">
        <div className="flex items-center gap-2">
          <FooterBtn icon={<Bell className="size-3.5" />} label="Set Alert" />
          <FooterBtn icon={<Bookmark className="size-3.5" />} label="Save" />
          <FooterBtn icon={<Share2 className="size-3.5" />} label="Share" />
          <button className="ml-auto h-9 px-4 rounded-md bg-[var(--brand-blue)] text-[12px] font-medium inline-flex items-center gap-1.5"><LineChart className="size-3.5" /> Open Chart</button>
        </div>
      </footer>
    </motion.aside>
  </>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="px-5 py-4 border-b border-border"><h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">{title}</h3>{children}</section>;
}
function Value({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-card border border-border px-2.5 py-1.5"><div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-[12px] font-semibold tabular-nums mt-0.5">{value}</div></div>;
}
function FooterBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <button className="h-9 px-3 rounded-md border border-border bg-card text-foreground text-[12px] inline-flex items-center gap-1.5">{icon}{label}</button>;
}
