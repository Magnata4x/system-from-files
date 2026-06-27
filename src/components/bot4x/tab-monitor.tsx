import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Copy, Check, Pause, Play, Trash2, Zap, Rewind,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from "recharts";
import { useBot4xStore } from "@/lib/bot4x-store";
import { FILTER_NAMES, type FilterKey, type Tick, type Verdict } from "@/lib/bot4x-data";

const FILTER_ORDER: FilterKey[] = ["F1", "F2", "F3", "F4", "F5", "F6"];

const VERDICT_STYLE: Record<Verdict, { bg: string; color: string; label: string; pulse?: boolean }> = {
  EXECUTE: { bg: "color-mix(in oklab,#1D9E75 22%,transparent)", color: "#7AD9B4", label: "EXECUTE", pulse: true },
  IGNORE: { bg: "color-mix(in oklab,#888780 22%,transparent)", color: "#B5B4AD", label: "IGNORE" },
  FOMO_BLOCKED: { bg: "color-mix(in oklab,#EF9F27 22%,transparent)", color: "#F2C46B", label: "FOMO_BLOCKED" },
  GRID_SATURATED: { bg: "color-mix(in oklab,#378ADD 22%,transparent)", color: "#9CC6F0", label: "GRID_SATURATED" },
  EMERGENCY_SHUTDOWN: { bg: "color-mix(in oklab,#E24B4A 28%,transparent)", color: "#FF9B9A", label: "EMERGENCY_SHUTDOWN" },
};

const PAIR_COLORS: Record<string, string> = {
  "BTC/USDT": "#F7931A", "ETH/USDT": "#627EEA", "SOL/USDT": "#9945FF",
  "BNB/USDT": "#F0B90B", "XRP/USDT": "#23292F", "ARB/USDT": "#28A0F0",
  "AVAX/USDT": "#E84142", "LINK/USDT": "#2A5ADA", "DOGE/USDT": "#C2A633", "MATIC/USDT": "#8247E5",
};

export function TabMonitor() {
  return (
    <div className="space-y-5">
      <FilterPipeline />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3"><TickFeed /></div>
        <div className="lg:col-span-2"><JsonViewer /></div>
      </div>
      <FilterStats />
    </div>
  );
}

// ============= PIPELINE =============
function FilterPipeline() {
  const liveLast = useBot4xStore((s) => s.ticks[0]);
  const ticks = useBot4xStore((s) => s.ticks);

  const [replayTick, setReplayTick] = useState<Tick | null>(null);
  const [replayActive, setReplayActive] = useState(false);
  const replayRef = useRef<{ cancel: boolean }>({ cancel: false });

  const last = replayTick ?? liveLast;

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0, F6: 0 };
    for (const t of ticks) if (t.blockedAt) c[t.blockedAt]++;
    return c;
  }, [ticks]);

  const runReplay = async () => {
    if (replayActive) return;
    const sample = ticks.slice(0, 10).reverse();
    if (sample.length === 0) return;
    setReplayActive(true);
    replayRef.current = { cancel: false };
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    for (const t of sample) {
      if (replayRef.current.cancel) break;
      // Step through filters one per second
      const progressiveFilters: Record<FilterKey, boolean> = { F1: false, F2: false, F3: false, F4: false, F5: false, F6: false };
      for (const k of FILTER_ORDER) {
        if (replayRef.current.cancel) break;
        const passed = t.filters[k] && t.blockedAt !== k;
        progressiveFilters[k] = passed;
        const blockedHere = t.blockedAt === k;
        setReplayTick({
          ...t,
          id: `replay-${t.id}-${k}`,
          filters: { ...progressiveFilters },
          blockedAt: blockedHere ? k : undefined,
          verdict: blockedHere ? t.verdict : "IGNORE",
        });
        await wait(1000);
        if (blockedHere) break;
      }
      if (replayRef.current.cancel) break;
      // Show final verdict (execute node lights up if applicable)
      setReplayTick({ ...t, id: `replay-${t.id}-final` });
      await wait(700);
    }
    setReplayTick(null);
    setReplayActive(false);
  };

  const stopReplay = () => {
    replayRef.current.cancel = true;
    setReplayTick(null);
    setReplayActive(false);
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Pipeline de filtros
          {replayActive && <span className="ml-2 text-[#EF9F27] normal-case">· REPLAY em curso</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={replayActive ? stopReplay : runReplay}
            disabled={!replayActive && ticks.length === 0}
            className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-border"
          >
            <Rewind className="size-3.5" />
            {replayActive ? "Parar replay" : "Replay últimos 10"}
          </button>
          <div className="text-[10px] text-muted-foreground">tick a cada 8s</div>
        </div>
      </div>
      <div className="flex items-start justify-between gap-1 overflow-x-auto pb-1">
        {FILTER_ORDER.map((k, i) => {
          const passed = last ? last.filters[k] && last.blockedAt !== k : false;
          const blocked = last?.blockedAt === k;
          const notReached = last ? !last.filters[k] && !blocked : true;
          const color = blocked ? "#E24B4A" : passed ? "#1D9E75" : notReached ? "#3a3b40" : "#888780";
          const pulse = blocked;
          return (
            <PipelineNode
              key={k}
              k={k}
              label={FILTER_NAMES[k]}
              color={color}
              passed={passed}
              count={counts[k]}
              pulse={pulse}
              tickId={last?.id}
              showArrow={i < FILTER_ORDER.length - 1 || true}
              arrowActive={last ? last.filters[k] && !blocked : false}
              executeAfter={false}
            />
          );
        })}
        <ExecuteNode last={last} />
      </div>
    </section>
  );
}

function PipelineNode({
  k, label, color, count, pulse, tickId, showArrow, arrowActive,
}: {
  k: FilterKey; label: string; color: string; passed: boolean; count: number;
  pulse: boolean; tickId?: string; showArrow: boolean; arrowActive: boolean; executeAfter: boolean;
}) {
  return (
    <>
      <div className="flex flex-col items-center gap-1.5 shrink-0 min-w-[64px]">
        <motion.div
          key={`${tickId}-${k}`}
          initial={{ scale: 0.9 }}
          animate={{
            scale: 1,
            backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
            borderColor: color,
            boxShadow: pulse ? `0 0 0 0px ${color}66` : `0 0 0 0px transparent`,
          }}
          transition={{ duration: 0.35 }}
          className="relative size-8 rounded-full border-2 flex items-center justify-center text-[11px] font-bold tabular-nums"
          style={{ color }}
        >
          {k.slice(1)}
          {pulse && (
            <motion.span
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: color }}
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}
        </motion.div>
        <div className="text-[10px] text-muted-foreground leading-tight text-center max-w-[70px] truncate">{label}</div>
        <div className="text-[9px] tabular-nums" style={{ color: count > 0 ? "#E24B4A" : "#666560" }}>
          {count} hoje
        </div>
      </div>
      {showArrow && <ArrowConnector active={arrowActive} tickId={tickId} />}
    </>
  );
}

function ExecuteNode({ last }: { last?: Tick }) {
  const isExec = last?.verdict === "EXECUTE";
  const color = isExec ? "#1D9E75" : "#3a3b40";
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0 min-w-[64px]">
      <motion.div
        key={`${last?.id}-exec`}
        initial={{ scale: 0.9 }}
        animate={{
          scale: isExec ? 1.08 : 1,
          backgroundColor: `color-mix(in oklab, ${color} 22%, transparent)`,
          borderColor: color,
        }}
        transition={{ duration: 0.35 }}
        className="relative size-8 rounded-full border-2 flex items-center justify-center"
        style={{ color }}
      >
        <Zap className="size-4" fill={isExec ? color : "transparent"} />
        {isExec && (
          <motion.span
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: color }}
            animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </motion.div>
      <div className="text-[10px] font-semibold leading-tight text-center" style={{ color: isExec ? "#7AD9B4" : "#888780" }}>
        EXECUTAR
      </div>
      <div className="text-[9px] text-muted-foreground tabular-nums">—</div>
    </div>
  );
}

function ArrowConnector({ active, tickId }: { active: boolean; tickId?: string }) {
  return (
    <div className="relative h-8 flex-1 min-w-[14px] mt-0 flex items-center">
      <div className="w-full h-px bg-border" />
      {active && (
        <motion.div
          key={`${tickId}-arrow`}
          className="absolute inset-y-0 -top-px h-px"
          style={{ background: "linear-gradient(90deg, transparent, #1D9E75, transparent)", width: "60%" }}
          initial={{ x: "-60%", opacity: 0 }}
          animate={{ x: "120%", opacity: [0, 1, 0] }}
          transition={{ duration: 0.9 }}
        />
      )}
    </div>
  );
}

// ============= TICK FEED =============
function TickFeed() {
  const ticks = useBot4xStore((s) => s.ticks);
  const processed = useBot4xStore((s) => s.ticksProcessed);
  const paused = useBot4xStore((s) => s.feedPaused);
  const toggle = useBot4xStore((s) => s.toggleFeedPaused);

  return (
    <section className="rounded-lg border border-border bg-card flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex size-2 shrink-0">
            {!paused && <span className="absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75 animate-ping" />}
            <span className="relative inline-flex size-2 rounded-full" style={{ background: paused ? "#888780" : "#1D9E75" }} />
          </span>
          <span className="text-[12px] font-semibold text-foreground truncate">Feed de Ticks</span>
          <span className="text-[10px] text-muted-foreground tabular-nums hidden sm:inline">
            {processed === 0 ? "· Aguardando primeiro tick..." : `· ${processed.toLocaleString()} processados`}
          </span>
        </div>
        <button
          onClick={toggle}
          className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] text-foreground hover:bg-secondary transition-colors"
        >
          {paused ? <><Play className="size-3.5" /> Resumir</> : <><Pause className="size-3.5" /> Pausar</>}
        </button>
      </div>
      <div className="max-h-[520px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {ticks.slice(0, 20).map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <TickRow tick={t} />
            </motion.div>
          ))}
          {ticks.length === 0 && (
            <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">Aguardando ticks…</div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function TickRow({ tick }: { tick: Tick }) {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const ago = Math.max(0, Math.floor((Date.now() - tick.ts) / 1000));
  const v = VERDICT_STYLE[tick.verdict];
  const pairColor = PAIR_COLORS[tick.pair] ?? "#888780";

  // Build line list from filter detail map up to blockedAt
  const lines: { ok: boolean; label: string }[] = [];
  for (const k of FILTER_ORDER) {
    const ok = tick.filters[k];
    const reached = !tick.blockedAt || FILTER_ORDER.indexOf(k) <= FILTER_ORDER.indexOf(tick.blockedAt);
    if (!reached) continue;
    const text = `${k}: ${tick.detail[k]}${tick.blockedAt === k ? " → BLOQUEADO" : ""}`;
    lines.push({ ok, label: text });
    if (tick.blockedAt === k) break;
  }
  const exec = tick.verdict === "EXECUTE";

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2.5 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums"
            style={{ background: `color-mix(in oklab, ${pairColor} 28%, transparent)`, color: pairColor === "#23292F" ? "#B5B4AD" : pairColor }}
          >
            {tick.pair}
          </span>
          <span
            className="text-[10px] font-bold"
            style={{ color: tick.side === "BUY" ? "#1D9E75" : tick.side === "SELL" ? "#E24B4A" : "#888780" }}
          >
            {tick.side ?? "—"}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums">{ago}s atrás</span>
          <motion.span
            className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold ${v.pulse ? "animate-pulse" : ""}`}
            style={{ background: v.bg, color: v.color }}
          >
            {v.label}
          </motion.span>
          <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
        <div className="mt-2 space-y-0.5 font-mono text-[11px] leading-relaxed">
          {lines.map((l, i) => (
            <div key={i} style={{ color: l.ok ? "#7AD9B4" : "#FF9B9A", fontWeight: l.ok ? 400 : 600 }}>
              {l.ok ? "✓ " : "✗ "}{l.label}
            </div>
          ))}
          {exec && (
            <div className="text-[#7AD9B4] font-bold animate-pulse">⚡ EXECUTAR {tick.side}</div>
          )}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <pre className="font-mono text-[10.5px] leading-relaxed mx-4 mb-3 bg-[#0A0B0E] border border-border rounded-md p-2 overflow-x-auto text-foreground/85">
              {JSON.stringify(tickToJson(tick), null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function tickToJson(t: Tick) {
  return {
    id: t.id,
    ts: t.ts,
    pair: t.pair,
    side: t.side,
    channelZone: t.channelZone,
    rsi: t.rsi,
    aiScore: t.aiScore,
    liquidityGrab: t.liquidityGrab,
    fomoDisplacement: t.fomoDisplacement,
    profile: t.profileId,
    thresholds: { rsiBuy: t.rsiBuy, rsiSell: t.rsiSell, aiScoreMin: t.aiScoreMin, fomoLimit: t.fomoLimit },
    slotsUsed: t.slotsUsed,
    filters: t.filters,
    blockedAt: t.blockedAt ?? null,
    f5Sub: t.f5Sub ?? null,
    verdict: t.verdict,
    action: t.verdict === "EXECUTE" ? `EXECUTE_${t.side}` : "SKIP",
  };
}

// ============= JSON VIEWER =============
function JsonViewer() {
  const tab = useBot4xStore((s) => s.monitorTab);
  const setTab = useBot4xStore((s) => s.setMonitorTab);
  const lastTick = useBot4xStore((s) => s.ticks[0]);
  const lastOrder = useBot4xStore((s) => s.orders[0]);
  const dailyPnl = useBot4xStore((s) => s.dailyPnlPct);
  const [copied, setCopied] = useState(false);
  const [cleared, setCleared] = useState(false);

  const data = useMemo(() => {
    if (cleared) return { info: "viewer limpo" };
    if (tab === "tick") return lastTick ? tickToJson(lastTick) : { info: "sem ticks ainda" };
    if (tab === "order") return lastOrder
      ? { ...lastOrder, leverage: 3, profile: "conservador", mode: "DEMO" }
      : { info: "sem ordens ativas" };
    return {
      reason: dailyPnl <= -1.5 ? "circuit_breaker_-1.5%" : "no_shutdown",
      ts: Date.now(),
      dailyPnlPct: dailyPnl,
      circuitBreaker: { armed: true, triggered: dailyPnl <= -1.5, limit: -1.5 },
      trailingLock: { peak: 0, state: "INACTIVE" },
      action: dailyPnl <= -1.5 ? "EMERGENCY_SHUTDOWN" : "MONITOR",
    };
  }, [tab, lastTick, lastOrder, dailyPnl, cleared]);

  const actionColor =
    "action" in (data as Record<string, unknown>)
      ? (data as { action?: string }).action?.startsWith("EXECUTE") ? "#1D9E75"
        : (data as { action?: string }).action === "EMERGENCY_SHUTDOWN" ? "#E24B4A"
        : (data as { action?: string }).action === "SKIP" ? "#888780" : "#378ADD"
      : undefined;

  const json = JSON.stringify(data, null, 2);
  const copy = async () => {
    try { await navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const [glow, setGlow] = useState(false);
  useEffect(() => {
    if (lastTick?.verdict === "EXECUTE") {
      setGlow(true);
      const id = setTimeout(() => setGlow(false), 3000);
      return () => clearTimeout(id);
    }
  }, [lastTick?.id, lastTick?.verdict]);

  const tabs = [
    { id: "tick" as const, label: "Último tick" },
    { id: "order" as const, label: "Última ordem" },
    { id: "shutdown" as const, label: "Último shutdown" },
  ];

  return (
    <motion.section
      animate={{
        borderColor: glow ? "#1D9E75" : "hsl(var(--border))",
        boxShadow: glow
          ? "0 0 0 1px #1D9E75, 0 0 24px color-mix(in oklab, #1D9E75 45%, transparent)"
          : "0 0 0 0px transparent",
      }}
      transition={{ duration: 0.4 }}
      className="rounded-lg border bg-card h-full flex flex-col"
    >
      <div className="px-3 py-2 border-b border-border flex items-center gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setCleared(false); }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              tab === t.id && !cleared ? "bg-[var(--brand-blue-deep)] text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => setCleared(true)}
          className="ml-auto inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Trash2 className="size-3.5" /> Limpar
        </button>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] text-foreground hover:bg-secondary transition-colors"
        >
          {copied ? <Check className="size-3.5 text-[#1D9E75]" /> : <Copy className="size-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre
        className="font-mono text-[11px] leading-relaxed p-3 overflow-auto flex-1 bg-[#0A0B0E]"
        style={actionColor ? { boxShadow: `inset 4px 0 0 ${actionColor}` } : undefined}
      >
        {json.split("\n").map((line, i) => (
          <div key={i}>
            {colorize(line)}
          </div>
        ))}
      </pre>
    </motion.section>
  );
}

function colorize(line: string) {
  // tokens: keys "x":, strings, numbers, booleans, null
  const parts: { t: string; c?: string }[] = [];
  const regex = /("[^"]*"\s*:)|("[^"]*")|(-?\d+\.?\d*)|(true|false)|(null)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) parts.push({ t: line.slice(last, m.index) });
    if (m[1]) parts.push({ t: m[1], c: "#378ADD" });           // key
    else if (m[2]) parts.push({ t: m[2], c: "#1D9E75" });      // string
    else if (m[3]) parts.push({ t: m[3], c: "#EF9F27" });      // number
    else if (m[4]) parts.push({ t: m[4], c: m[4] === "true" ? "#1D9E75" : "#E24B4A" });
    else if (m[5]) parts.push({ t: m[5], c: "#888780" });
    last = regex.lastIndex;
  }
  if (last < line.length) parts.push({ t: line.slice(last) });
  return parts.map((p, i) => p.c ? <span key={i} style={{ color: p.c }}>{p.t}</span> : <span key={i}>{p.t}</span>);
}

// ============= FILTER STATS =============
function FilterStats() {
  const ticks = useBot4xStore((s) => s.ticks);
  const processed = useBot4xStore((s) => s.ticksProcessed);

  const stats = useMemo(() => {
    let exec = 0, blockedCount = 0, ignore = 0;
    const cat: Record<string, number> = {
      "F4 Zona central": 0,
      "F5 RSI": 0,
      "F5 liqGrab": 0,
      "F5 aiScore": 0,
      "F6 FOMO": 0,
    };
    for (const t of ticks) {
      if (t.verdict === "EXECUTE") exec++;
      else if (t.verdict === "IGNORE") ignore++;
      else blockedCount++;
      if (t.blockedAt === "F4") cat["F4 Zona central"]++;
      else if (t.blockedAt === "F5") {
        if (t.f5Sub === "RSI") cat["F5 RSI"]++;
        else if (t.f5Sub === "LIQGRAB") cat["F5 liqGrab"]++;
        else if (t.f5Sub === "AISCORE") cat["F5 aiScore"]++;
      } else if (t.blockedAt === "F6") cat["F6 FOMO"]++;
    }
    const colors: Record<string, string> = {
      "F4 Zona central": "#EF9F27",
      "F5 RSI": "#378ADD",
      "F5 liqGrab": "#7F77DD",
      "F5 aiScore": "#534AB7",
      "F6 FOMO": "#E24B4A",
    };
    const bars = Object.entries(cat).map(([name, blocks]) => ({ name, blocks, fill: colors[name] }));
    const total = ticks.length;
    const donut = [
      { name: "EXECUTE", value: exec, fill: "#1D9E75" },
      { name: "IGNORE", value: ignore, fill: "#888780" },
      { name: "BLOCKED", value: blockedCount, fill: "#E24B4A" },
    ];
    return {
      bars, donut, exec, ignore, blocked: blockedCount, total, processed,
      blockedPct: total ? Math.round((blockedCount / total) * 100) : 0,
      execPct: total ? Math.round((exec / total) * 100) : 0,
      ignorePct: total ? Math.round((ignore / total) * 100) : 0,
    };
  }, [ticks, processed]);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Bloqueios por filtro (sessão)</div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.bars} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#111318", border: "1px solid #1E2028", borderRadius: 6, fontSize: 12 }}
                cursor={{ fill: "color-mix(in oklab, #378ADD 8%, transparent)" }}
              />
              <Bar dataKey="blocks" radius={[4, 4, 0, 0]}>
                {stats.bars.map((b) => (<Cell key={b.name} fill={b.fill} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 flex flex-col">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Distribuição hoje</div>
        <div className="relative h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.donut.every((d) => d.value === 0) ? [{ name: "—", value: 1, fill: "#2a2b30" }] : stats.donut}
                dataKey="value"
                nameKey="name"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
                stroke="none"
                isAnimationActive
              >
                {stats.donut.map((d) => (<Cell key={d.name} fill={d.fill} />))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#111318", border: "1px solid #1E2028", borderRadius: 6, fontSize: 12 }}
                formatter={(v: number, n: string) => [`${v} (${stats.total ? Math.round((v / stats.total) * 100) : 0}%)`, n]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[18px] font-semibold tabular-nums text-foreground">{stats.total}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">ticks</div>
          </div>
        </div>
        <div className="mt-2 space-y-1 text-[10.5px]">
          <LegendRow color="#1D9E75" label="EXECUTE" value={stats.exec} pct={stats.execPct} />
          <LegendRow color="#888780" label="IGNORE" value={stats.ignore} pct={stats.ignorePct} />
          <LegendRow color="#E24B4A" label="BLOCKED" value={stats.blocked} pct={stats.blockedPct} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 content-start">
        <SummaryCard label="Total ticks" value={`${stats.processed.toLocaleString()}`} />
        <SummaryCard label="Bloqueados" value={`${stats.blocked} · ${stats.blockedPct}%`} color="#E24B4A" />
        <SummaryCard label="Executados" value={`${stats.exec}`} color="#1D9E75" />
        <SummaryCard label="Win rate (exec)" value={`~62%`} color="#7AD9B4" />
      </div>
    </section>
  );
}

function LegendRow({ color, label, value, pct }: { color: string; label: string; value: number; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block size-2 rounded-sm" style={{ background: color }} />
      <span className="text-muted-foreground flex-1">{label}</span>
      <span className="tabular-nums font-semibold" style={{ color }}>{value}</span>
      <span className="tabular-nums text-muted-foreground w-9 text-right">{pct}%</span>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[18px] font-semibold tabular-nums mt-1" style={{ color: color ?? undefined }}>{value}</div>
    </div>
  );
}
