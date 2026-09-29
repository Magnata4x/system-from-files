import { useMemo, useRef, useState, type CSSProperties } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot, Cell,
} from "recharts";
import { Download, Search, Flag, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBot4xStore } from "@/lib/bot4x-store";
import { PROFILES, type CalibProfile, type Trade, fmt } from "@/lib/bot4x-data";
import { useCountUp } from "@/lib/use-count-up";

type RangeKey = "7d" | "30d" | "90d" | "custom";
type Filters = {
  pair: string; result: string; profile: string; lev: string; side: string; search: string;
};
const DEFAULT_FILTERS: Filters = { pair: "all", result: "all", profile: "all", lev: "all", side: "all", search: "" };

export function TabHistorico() {
  const history = useBot4xStore((s) => s.history);
  const [range, setRange] = useState<RangeKey>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Apply date range
  const dateFiltered = useMemo(() => {
    if (range === "custom") {
      return history.filter((t) => (!from || t.day >= from) && (!to || t.day <= to));
    }
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return history.filter((t) => t.day >= cutoffStr);
  }, [history, range, from, to]);

  // Apply table filters
  const filtered = useMemo(() => {
    return dateFiltered
      .filter((t) => filters.pair === "all" || t.pair === filters.pair)
      .filter((t) => filters.result === "all" || t.result === filters.result)
      .filter((t) => filters.profile === "all" || t.profile === filters.profile)
      .filter((t) => filters.lev === "all" || String(t.leverage) === filters.lev)
      .filter((t) => filters.side === "all" || t.side === filters.side)
      .filter((t) => !filters.search ||
        t.pair.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.motivo.toLowerCase().includes(filters.search.toLowerCase()));
  }, [dateFiltered, filters]);

  return (
    <div className="space-y-5">
      <HeaderRow
        range={range} setRange={setRange}
        from={from} setFrom={setFrom} to={to} setTo={setTo}
        filtered={filtered}
      />
      <ActiveFiltersSummary count={filtered.length} filters={filters} />
      <Metrics history={filtered} />
      <EquityCurve history={dateFiltered} />
      <TradeSection history={filtered} all={dateFiltered} filters={filters} setFilters={setFilters} />
      <DailySummaryAccordion history={filtered} />
      <PerformanceTabs history={filtered} />
    </div>
  );
}

// =========== HEADER ===========
function HeaderRow({
  range, setRange, from, setFrom, to, setTo, filtered,
}: {
  range: RangeKey; setRange: (r: RangeKey) => void;
  from: string; setFrom: (s: string) => void; to: string; setTo: (s: string) => void;
  filtered: Trade[];
}) {
  const exportCSV = () => {
    const head = ["#", "day", "pair", "side", "entry", "stop", "target", "result", "pnl", "pnlPct", "accumulated", "profile", "leverage", "motivo"];
    const rows = filtered.map((t, i) =>
      [i + 1, t.day, t.pair, t.side, t.entry, t.stop, t.target, t.result, t.pnl, t.pnlPct, t.accumulated, t.profile, t.leverage, `"${t.motivo}"`].join(",")
    );
    const csv = [head.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bot4x-history-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const pills: { id: RangeKey; label: string }[] = [
    { id: "7d", label: "Últimos 7d" },
    { id: "30d", label: "30d" },
    { id: "90d", label: "90d" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <section className="flex items-center gap-3 flex-wrap">
      <div className="inline-flex rounded-md border border-border bg-card p-0.5">
        {pills.map((p) => (
          <button
            key={p.id}
            onClick={() => setRange(p.id)}
            className={`px-3 h-8 rounded text-[12px] font-medium transition-colors ${
              range === p.id ? "bg-[var(--brand-blue-deep)] text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div className="flex items-center gap-2 rounded-md bg-card border border-border px-3 h-9">
          <span className="text-[11px] text-muted-foreground">De</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent text-[12px] text-foreground outline-none" />
          <span className="text-[11px] text-muted-foreground">até</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent text-[12px] text-foreground outline-none" />
        </div>
      )}
      <button
        onClick={exportCSV}
        className="ml-auto inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-card text-foreground text-[12px] font-medium hover:bg-secondary"
      >
        <Download className="size-3.5" /> Export CSV
      </button>
    </section>
  );
}

function ActiveFiltersSummary({ count, filters }: { count: number; filters: Filters }) {
  const parts: string[] = [];
  if (filters.profile !== "all") parts.push(`Perfil: ${PROFILES[filters.profile as CalibProfile]?.name ?? filters.profile}`);
  if (filters.lev !== "all") parts.push(`Lev: 1:${filters.lev}`);
  if (filters.pair !== "all") parts.push(`Par: ${filters.pair}`);
  if (filters.result !== "all") parts.push(`Resultado: ${filters.result}`);
  if (filters.side !== "all") parts.push(`Lado: ${filters.side}`);
  if (filters.search) parts.push(`Busca: "${filters.search}"`);
  return (
    <div className="text-[11px] text-muted-foreground">
      Mostrando <span className="text-foreground font-semibold tabular-nums">{count}</span> trades
      {parts.length > 0 && <> · {parts.join(" · ")}</>}
    </div>
  );
}

// =========== METRICS ===========
function Metrics({ history }: { history: Trade[] }) {
  const m = useMemo(() => {
    const total = history.length;
    const wins = history.filter((t) => t.result === "WIN").length;
    const losses = history.filter((t) => t.result === "LOSS").length;
    const pnl = history.reduce((a, t) => a + t.pnl, 0);
    const start = history[0]?.accumulated ? history[0].accumulated - history[0].pnl : 1000;
    const pnlPct = start ? (pnl / start) * 100 : 0;
    const wr = wins + losses ? (wins / (wins + losses)) * 100 : 0;
    let peak = -Infinity, maxDD = 0;
    for (const t of history) {
      peak = Math.max(peak, t.accumulated);
      if (peak > 0) maxDD = Math.min(maxDD, (t.accumulated - peak) / peak * 100);
    }
    return { total, wins, losses, pnl, pnlPct, wr, maxDD };
  }, [history]);

  const wrColor = m.wr >= 60 ? "#1D9E75" : m.wr >= 50 ? "#EF9F27" : "#E24B4A";

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card
        label="Total PnL"
        n={m.pnl}
        format={(v) => `${v >= 0 ? "+" : ""}$${fmt(v)} (${m.pnlPct >= 0 ? "+" : ""}${m.pnlPct.toFixed(2)}%)`}
        color={m.pnl >= 0 ? "#1D9E75" : "#E24B4A"}
        decimals={2}
      />
      <Card label="Win rate" n={m.wr} format={(v) => `${v.toFixed(1)}%`} color={wrColor} decimals={1} />
      <Card label="Total trades" n={m.total} format={(v) => `${Math.round(v)}`} sub={`${m.wins}W / ${m.losses}L`} />
      <Card label="Maior drawdown" n={m.maxDD} format={(v) => `${v.toFixed(2)}%`} color="#E24B4A" decimals={2} />
    </section>
  );
}

function Card({
  label, n, format, color, sub, decimals = 0,
}: {
  label: string;
  n: number;
  format: (v: number) => string;
  color?: string;
  sub?: string;
  decimals?: number;
}) {
  const counted = useCountUp(n, 900, decimals);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-lg border border-border bg-card px-4 py-3"
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[18px] font-semibold tabular-nums mt-1" style={{ color: color ?? undefined }}>{format(counted)}</div>
      {sub && <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{sub}</div>}
    </motion.div>
  );
}

// =========== EQUITY CURVE ===========
type EqView = "capital" | "pnl" | "wr";

function EquityCurve({ history }: { history: Trade[] }) {
  const [view, setView] = useState<EqView>("capital");

  // Group by day for daily PnL + cumulative WR
  const dailyData = useMemo(() => {
    const map = new Map<string, { day: string; pnl: number; wins: number; losses: number; lastAcc: number; trades: Trade[] }>();
    for (const t of history) {
      const cur = map.get(t.day) ?? { day: t.day, pnl: 0, wins: 0, losses: 0, lastAcc: t.accumulated, trades: [] };
      cur.pnl += t.pnl;
      if (t.result === "WIN") cur.wins++;
      else if (t.result === "LOSS") cur.losses++;
      cur.lastAcc = t.accumulated;
      cur.trades.push(t);
      map.set(t.day, cur);
    }
    const days = Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
    let cumW = 0, cumL = 0;
    // Multi-leverage simulation: scale each trade's pnl by (targetLev / actualLev)
    const startCap = days[0] ? (days[0].lastAcc - days[0].pnl) : 1000;
    const caps: Record<number, number> = { 1: startCap, 3: startCap, 6: startCap, 10: startCap };
    return days.map((d) => {
      cumW += d.wins; cumL += d.losses;
      const wr = cumW + cumL ? (cumW / (cumW + cumL)) * 100 : 0;
      for (const lev of [1, 3, 6, 10] as const) {
        for (const t of d.trades) {
          const ratio = t.leverage > 0 ? lev / t.leverage : 1;
          caps[lev] += t.pnl * ratio;
        }
      }
      return {
        day: d.day, capital: d.lastAcc,
        cap1: +caps[1].toFixed(2), cap3: +caps[3].toFixed(2),
        cap6: +caps[6].toFixed(2), cap10: +caps[10].toFixed(2),
        pnlPct: d.lastAcc ? (d.pnl / (d.lastAcc - d.pnl || 1)) * 100 : 0,
        dailyPnl: d.pnl, wr: +wr.toFixed(2),
      };
    });
  }, [history]);

  const start = history[0]?.accumulated ? history[0].accumulated - history[0].pnl : 1000;
  const breakerEvents = useMemo(() => history.filter((t) => t.result === "SHUTDOWN"), [history]);

  const views: { id: EqView; label: string }[] = [
    { id: "capital", label: "Capital" },
    { id: "pnl", label: "PnL Diário" },
    { id: "wr", label: "Win Rate acumulado" },
  ];

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Equity curve</span>
        <div className="flex items-center gap-3">
          {breakerEvents.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#E24B4A]">
              <Flag className="size-3" /> {breakerEvents.length} circuit breaker{breakerEvents.length > 1 ? "s" : ""}
            </span>
          )}
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            {views.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-2.5 h-7 rounded text-[11px] font-medium transition-colors ${
                  view === v.id ? "bg-[var(--brand-blue-deep)] text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          {view === "capital" ? (
            <AreaChart data={dailyData} margin={{ top: 24, right: 56, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#378ADD" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#378ADD" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={32} />
              <YAxis stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={["dataMin - 5", "dataMax + 5"]} />
              <Tooltip
                cursor={{ stroke: "#378ADD", strokeWidth: 1, strokeDasharray: "3 3" }}
                content={<LeverageCrosshairTooltip />}
              />
              <ReferenceLine y={start * (1 - 0.015)} stroke="#E24B4A" strokeDasharray="3 3" label={{ value: "Disjuntor -1.5%", fill: "#E24B4A", fontSize: 10, position: "right" }} />
              <ReferenceLine y={start * (1 + 0.03)} stroke="#EF9F27" strokeDasharray="3 3" label={{ value: "Piso +3.0%", fill: "#EF9F27", fontSize: 10, position: "right" }} />
              <ReferenceLine y={start * (1 + 0.04)} stroke="#1D9E75" strokeDasharray="3 3" label={{ value: "Profit lock +4.0%", fill: "#1D9E75", fontSize: 10, position: "right" }} />
              <Area type="monotone" dataKey="capital" stroke="#378ADD" strokeWidth={2} fill="url(#eq)" />
              <Line type="monotone" dataKey="cap1" stroke="#1D9E75" strokeWidth={1} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="cap3" stroke="#7AD9B4" strokeWidth={1} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="cap6" stroke="#EF9F27" strokeWidth={1} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="cap10" stroke="#E24B4A" strokeWidth={1} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
              {breakerEvents.map((ev) => (
                <ReferenceDot
                  key={ev.id}
                  x={ev.day}
                  y={ev.accumulated}
                  r={0}
                  ifOverflow="extendDomain"
                  shape={(props: unknown) => {
                    const p = props as { cx?: number; cy?: number };
                    return <BreakerFlag cx={p.cx ?? 0} cy={p.cy ?? 0} day={ev.day} pnl={ev.pnl} />;
                  }}
                />
              ))}
            </AreaChart>
          ) : view === "pnl" ? (
            <BarChart data={dailyData} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={32} />
              <YAxis stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#111318", border: "1px solid #1E2028", borderRadius: 6, fontSize: 12 }}
                formatter={(v: number) => [`${v >= 0 ? "+" : ""}$${fmt(v)}`, "PnL diário"]}
              />
              <ReferenceLine y={0} stroke="#3a3b40" />
              <Bar dataKey="dailyPnl" radius={[3, 3, 0, 0]}>
                {dailyData.map((d) => (
                  <Cell key={d.day} fill={d.dailyPnl >= 0 ? "#1D9E75" : "#E24B4A"} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={dailyData} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={32} />
              <YAxis stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "#111318", border: "1px solid #1E2028", borderRadius: 6, fontSize: 12 }}
                formatter={(v: number) => [`${v.toFixed(1)}%`, "Win rate"]}
              />
              <ReferenceLine y={50} stroke="#3a3b40" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="wr" stroke="#7AD9B4" strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      {view === "capital" && (
        <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-[#378ADD]" /> Capital real</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 border-t border-dashed border-[#1D9E75]" /> 1:1</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 border-t border-dashed border-[#7AD9B4]" /> 1:3</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 border-t border-dashed border-[#EF9F27]" /> 1:6</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 border-t border-dashed border-[#E24B4A]" /> 1:10</span>
          <span className="ml-auto">Passe o mouse para ver os 4 cenários de alavancagem</span>
        </div>
      )}
    </section>
  );
}

function BreakerFlag({ cx, cy, day, pnl }: { cx: number; cy: number; day: string; pnl: number }) {
  return (
    <g transform={`translate(${cx}, ${cy})`} style={{ pointerEvents: "auto" }}>
      <title>{`Circuit breaker · ${day} · ${pnl.toFixed(2)} USDT`}</title>
      <line x1={0} y1={0} x2={0} y2={-22} stroke="#E24B4A" strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />
      <circle r={4} fill="#E24B4A" stroke="#0A0B0E" strokeWidth={1.5} />
      <g transform="translate(0, -28)">
        <rect x={-1} y={-2} width={1.5} height={14} fill="#E24B4A" />
        <path d="M0.5 -2 L11 -2 L8 2 L11 6 L0.5 6 Z" fill="#E24B4A" stroke="#0A0B0E" strokeWidth={0.5} />
      </g>
    </g>
  );
}

// =========== TRADE TABLE ===========
type SortKey = "day" | "pair" | "result" | "pnl" | "pnlPct" | "accumulated" | "leverage";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 20;

function TradeSection({
  history, all, filters, setFilters,
}: {
  history: Trade[]; all: Trade[]; filters: Filters; setFilters: (f: Filters) => void;
}) {
  const pairs = useMemo(() => Array.from(new Set(all.map((t) => t.pair))).sort(), [all]);
  const [sortKey, setSortKey] = useState<SortKey>("day");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const arr = history.slice();
    arr.sort((a, b) => {
      const va = a[sortKey] as unknown as number | string;
      const vb = b[sortKey] as unknown as number | string;
      if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [history, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const setF = (patch: Partial<Filters>) => { setFilters({ ...filters, ...patch }); setPage(1); };

  const rowStyle = (r: Trade["result"]): CSSProperties =>
    r === "WIN" ? { borderLeftColor: "#1D9E75" }
      : r === "LOSS" ? { borderLeftColor: "#E24B4A" }
      : r === "BLOCKED" ? { borderLeftColor: "transparent", opacity: 0.6 }
      : { borderLeftColor: "#E24B4A", background: "color-mix(in oklab,#E24B4A 6%,transparent)" };

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  // Virtualização: usamos `sorted` inteiro (não o slice paginado) e
  // renderizamos apenas as linhas visíveis + overscan. A paginação vira um
  // controle de "scroll-to-page" sobre o mesmo viewport, mantendo a UX
  // existente sem inflar o DOM com centenas de <tr>.
  const parentRef = useRef<HTMLDivElement | null>(null);
  const ROW_HEIGHT = 36;
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Layout em CSS grid (mesma string de colunas no header e em cada linha)
  // garante alinhamento visual perfeito sem depender de <table>.
  const GRID_COLS =
    "44px 92px 96px 64px 92px 88px 88px 84px 96px 84px 100px 120px 64px minmax(180px,1fr)";

  const SortHead = ({ k, label, align = "left" }: { k?: SortKey; label: string; align?: "left" | "right" }) => (
    <div className={`px-2 py-2 font-medium whitespace-nowrap text-${align}`}>
      {k ? (
        <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          {label}
          {sortKey === k
            ? (sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)
            : <ArrowUpDown className="size-3 opacity-40" />}
        </button>
      ) : label}
    </div>
  );

  // Página efetiva (apenas para o label/UX da paginação).
  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(pageCount, p));
    setPage(next);
    virtualizer.scrollToIndex((next - 1) * PAGE_SIZE, { align: "start" });
  };

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
        <Select value={filters.pair} onChange={(v) => setF({ pair: v })} options={[{ v: "all", l: "Todos pares" }, ...pairs.map((p) => ({ v: p, l: p }))]} />
        <Select value={filters.result} onChange={(v) => setF({ result: v })} options={[
          { v: "all", l: "Resultado" }, { v: "WIN", l: "WIN" }, { v: "LOSS", l: "LOSS" }, { v: "BLOCKED", l: "BLOCKED" }, { v: "SHUTDOWN", l: "SHUTDOWN" },
        ]} />
        <Select value={filters.profile} onChange={(v) => setF({ profile: v })} options={[{ v: "all", l: "Perfil" }, ...Object.values(PROFILES).map((p) => ({ v: p.id, l: p.name }))]} />
        <Select value={filters.lev} onChange={(v) => setF({ lev: v })} options={[{ v: "all", l: "Lev" }, ...["1", "3", "6", "10"].map((n) => ({ v: n, l: `1:${n}` }))]} />
        <Select value={filters.side} onChange={(v) => setF({ side: v })} options={[{ v: "all", l: "Lado" }, { v: "LONG", l: "LONG" }, { v: "SHORT", l: "SHORT" }]} />
        <div className="ml-auto relative">
          <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.search}
            onChange={(e) => setF({ search: e.target.value })}
            placeholder="Buscar par ou motivo..."
            className="h-8 pl-7 pr-2 rounded-md bg-background border border-border text-[12px] text-foreground focus:outline-none focus:border-[var(--brand-cyan)] w-52"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1280px] text-[12px]" data-testid="trade-list-root">
          {/* Header */}
          <div
            className="grid bg-card text-muted-foreground border-b border-border"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <div className="px-2 py-2 text-left font-medium">#</div>
            <SortHead k="day" label="Dia" />
            <SortHead k="pair" label="Par" />
            <div className="px-2 py-2 text-left font-medium">Lado</div>
            <div className="px-2 py-2 text-left font-medium">Entrada</div>
            <div className="px-2 py-2 text-left font-medium">Stop</div>
            <div className="px-2 py-2 text-left font-medium">Alvo</div>
            <SortHead k="result" label="Result" />
            <SortHead k="pnl" label="PnL USDT" align="right" />
            <SortHead k="pnlPct" label="PnL %" align="right" />
            <SortHead k="accumulated" label="Acumulado" align="right" />
            <div className="px-2 py-2 text-left font-medium">Perfil</div>
            <SortHead k="leverage" label="Lev" align="right" />
            <div className="px-2 py-2 text-left font-medium">Motivo</div>
          </div>

          {/* Scrollable virtualized body */}
          <div
            ref={parentRef}
            className="max-h-[600px] overflow-auto"
            data-testid="trade-list-scroll"
          >
            {sorted.length === 0 ? (
              <div className="px-4 py-10 text-center text-muted-foreground text-[12px]">
                Nenhum trade no filtro.
              </div>
            ) : (
              <div
                style={{ height: totalSize, position: "relative", width: "100%" }}
                data-testid="trade-list-inner"
              >
                {virtualItems.map((vItem) => {
                  const t = sorted[vItem.index];
                  const p = PROFILES[t.profile];
                  const sideColor = t.side === "LONG" ? "#378ADD" : "#EF9F27";
                  const pnlColor = t.pnl >= 0 ? "#1D9E75" : t.pnl < 0 ? "#E24B4A" : "#888780";
                  const levColor = t.leverage <= 1 ? "#1D9E75" : t.leverage <= 3 ? "#7AD9B4" : t.leverage <= 6 ? "#EF9F27" : "#E24B4A";
                  return (
                    <div
                      key={t.id}
                      data-testid="trade-row"
                      className="grid items-center border-b border-border/60 hover:bg-secondary/30 transition-colors"
                      style={{
                        gridTemplateColumns: GRID_COLS,
                        borderLeft: "3px solid",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${vItem.size}px`,
                        transform: `translateY(${vItem.start}px)`,
                        ...rowStyle(t.result),
                      }}
                    >
                      <div className="px-2 py-2 tabular-nums text-muted-foreground">{vItem.index + 1}</div>
                      <div className="px-2 py-2 tabular-nums">{t.day}</div>
                      <div className="px-2 py-2 font-semibold text-foreground">{t.pair}</div>
                      <div className="px-2 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `color-mix(in oklab, ${sideColor} 22%, transparent)`, color: sideColor }}>{t.side}</span>
                      </div>
                      <div className="px-2 py-2 tabular-nums">{fmt(t.entry)}</div>
                      <div className="px-2 py-2 tabular-nums text-[#E24B4A]">{fmt(t.stop)}</div>
                      <div className="px-2 py-2 tabular-nums text-[#1D9E75]">{fmt(t.target)}</div>
                      <div className="px-2 py-2"><ResultBadge r={t.result} /></div>
                      <div className="px-2 py-2 text-right tabular-nums font-semibold" style={{ color: pnlColor }}>{t.pnl >= 0 ? "+" : ""}{fmt(t.pnl)}</div>
                      <div className="px-2 py-2 text-right tabular-nums" style={{ color: pnlColor }}>{t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%</div>
                      <div className="px-2 py-2 text-right tabular-nums">{fmt(t.accumulated)}</div>
                      <div className="px-2 py-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px]">
                          <span className="size-1.5 rounded-full" style={{ background: p.color }} />
                          {p.name}
                        </span>
                      </div>
                      <div className="px-2 py-2 text-right">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums" style={{ background: `color-mix(in oklab, ${levColor} 22%, transparent)`, color: levColor }}>
                          1:{t.leverage}
                        </span>
                      </div>
                      <div className="px-2 py-2 text-muted-foreground truncate">{t.motivo}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Pagination */}
      <div className="px-4 py-2 border-t border-border flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground tabular-nums">
          Página {safePage} de {pageCount} · {sorted.length} trades
        </div>
        <div className="inline-flex items-center gap-1">
          <button
            onClick={() => goToPage(safePage - 1)}
            disabled={safePage <= 1}
            className="inline-flex items-center justify-center size-7 rounded border border-border text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="text-[11px] text-foreground tabular-nums px-2">{safePage}/{pageCount}</span>
          <button
            onClick={() => goToPage(safePage + 1)}
            disabled={safePage >= pageCount}
            className="inline-flex items-center justify-center size-7 rounded border border-border text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function ResultBadge({ r }: { r: Trade["result"] }) {
  const map: Record<Trade["result"], { c: string; l: string }> = {
    WIN: { c: "#1D9E75", l: "Win" },
    LOSS: { c: "#E24B4A", l: "Loss" },
    BLOCKED: { c: "#888780", l: "Bloq." },
    SHUTDOWN: { c: "#E24B4A", l: "Shut." },
  };
  const { c, l } = map[r];
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `color-mix(in oklab, ${c} 22%, transparent)`, color: c }}>{l}</span>;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 px-2 rounded-md bg-background border border-border text-[12px] text-foreground focus:outline-none focus:border-[var(--brand-cyan)]"
    >
      {options.map((o) => (<option key={o.v} value={o.v}>{o.l}</option>))}
    </select>
  );
}

// =========== PERFORMANCE TABS ===========
function PerformanceTabs({ history }: { history: Trade[] }) {
  const [tab, setTab] = useState<"profile" | "leverage" | "pair" | "hour">("profile");

  const tabs = [
    { id: "profile" as const, label: "Por Perfil" },
    { id: "leverage" as const, label: "Por Leverage" },
    { id: "pair" as const, label: "Por Par" },
    { id: "hour" as const, label: "Por Hora" },
  ];

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="px-4 py-2 border-b border-border flex items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              tab === t.id ? "bg-[var(--brand-blue-deep)] text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "profile" && <GroupedBars history={history} keyFn={(t) => t.profile} labelFn={(k) => PROFILES[k as CalibProfile]?.name ?? k} colorFn={(k) => PROFILES[k as CalibProfile]?.color ?? "#378ADD"} />}
        {tab === "leverage" && <GroupedBars history={history} keyFn={(t) => `1:${t.leverage}`} sortFn={(a, b) => parseInt(a.k.slice(2)) - parseInt(b.k.slice(2))} colorFn={(k) => {
          const lev = parseInt(k.slice(2));
          return lev <= 1 ? "#1D9E75" : lev <= 3 ? "#7AD9B4" : lev <= 6 ? "#EF9F27" : "#E24B4A";
        }} />}
        {tab === "pair" && <PairHorizontal history={history} />}
        {tab === "hour" && <HourHeatmap history={history} />}
      </div>
    </section>
  );
}

type GroupRow = { k: string; label: string; trades: number; wins: number; losses: number; pnl: number; wr: number; fill: string };

function aggregate(
  history: Trade[],
  keyFn: (t: Trade) => string,
  labelFn?: (k: string) => string,
  colorFn?: (k: string) => string,
): GroupRow[] {
  const map = new Map<string, Omit<GroupRow, "wr" | "label" | "fill">>();
  for (const t of history) {
    const k = keyFn(t);
    const cur = map.get(k) ?? { k, trades: 0, wins: 0, losses: 0, pnl: 0 };
    cur.trades++;
    if (t.result === "WIN") cur.wins++;
    else if (t.result === "LOSS") cur.losses++;
    cur.pnl += t.pnl;
    map.set(k, cur);
  }
  return Array.from(map.values()).map((v) => ({
    ...v,
    label: labelFn ? labelFn(v.k) : v.k,
    fill: colorFn ? colorFn(v.k) : "#378ADD",
    wr: v.wins + v.losses ? +(v.wins / (v.wins + v.losses) * 100).toFixed(1) : 0,
  }));
}

function GroupedBars({
  history, keyFn, labelFn, colorFn, sortFn,
}: {
  history: Trade[];
  keyFn: (t: Trade) => string;
  labelFn?: (k: string) => string;
  colorFn?: (k: string) => string;
  sortFn?: (a: GroupRow, b: GroupRow) => number;
}) {
  const rows = useMemo(() => {
    const r = aggregate(history, keyFn, labelFn, colorFn);
    return sortFn ? r.sort(sortFn) : r.sort((a, b) => b.pnl - a.pnl);
  }, [history, keyFn, labelFn, colorFn, sortFn]);

  if (!rows.length) return <div className="text-center text-[12px] text-muted-foreground py-6">Sem dados</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Win rate (%)</div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="label" stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid #1E2028", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => [`${v}%`, "WR"]} />
              <Bar dataKey="wr" radius={[4, 4, 0, 0]}>
                {rows.map((r) => (<Cell key={`wr-${r.k}`} fill={r.fill} fillOpacity={0.7} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">PnL (USDT)</div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="label" stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid #1E2028", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => [`${v >= 0 ? "+" : ""}$${fmt(v)}`, "PnL"]} />
              <ReferenceLine y={0} stroke="#3a3b40" />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {rows.map((r) => (<Cell key={`pnl-${r.k}`} fill={r.pnl >= 0 ? "#1D9E75" : "#E24B4A"} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="md:col-span-2 overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead className="text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-2 py-1">Grupo</th>
              <th className="px-2 py-1 text-right">Trades</th>
              <th className="px-2 py-1 text-right">W/L</th>
              <th className="px-2 py-1 text-right">WR</th>
              <th className="px-2 py-1 text-right">PnL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className="border-t border-border">
                <td className="px-2 py-1.5"><span className="inline-flex items-center gap-2"><span className="size-1.5 rounded-full" style={{ background: r.fill }} />{r.label}</span></td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.trades}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.wins}/{r.losses}</td>
                <td className="px-2 py-1.5 text-right tabular-nums" style={{ color: r.wr >= 55 ? "#1D9E75" : r.wr >= 45 ? "#EF9F27" : "#E24B4A" }}>{r.wr}%</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-semibold" style={{ color: r.pnl >= 0 ? "#1D9E75" : "#E24B4A" }}>{r.pnl >= 0 ? "+" : ""}{fmt(r.pnl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PairHorizontal({ history }: { history: Trade[] }) {
  const rows = useMemo(() => aggregate(history, (t) => t.pair, undefined, () => "#378ADD").sort((a, b) => b.trades - a.trades), [history]);
  if (!rows.length) return <div className="text-center text-[12px] text-muted-foreground py-6">Sem dados</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Volume (trades)</div>
        <div style={{ height: Math.max(180, rows.length * 22) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <XAxis type="number" stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid #1E2028", borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="trades" fill="#378ADD" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Win rate (%)</div>
        <div style={{ height: Math.max(180, rows.length * 22) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <XAxis type="number" stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <YAxis type="category" dataKey="label" stroke="#888780" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid #1E2028", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => [`${v}%`, "WR"]} />
              <Bar dataKey="wr" radius={[0, 3, 3, 0]}>
                {rows.map((r) => (<Cell key={r.k} fill={r.wr >= 55 ? "#1D9E75" : r.wr >= 45 ? "#EF9F27" : "#E24B4A"} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function HourHeatmap({ history }: { history: Trade[] }) {
  const cells = useMemo(() => {
    const arr = Array.from({ length: 24 }, () => ({ trades: 0, wins: 0, pnl: 0 }));
    for (const t of history) {
      arr[t.hour].trades++;
      if (t.result === "WIN") arr[t.hour].wins++;
      arr[t.hour].pnl += t.pnl;
    }
    return arr.map((c, h) => ({ h, ...c, wr: c.trades ? (c.wins / c.trades) * 100 : 0 }));
  }, [history]);

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Win rate por hora do dia</div>
      <div className="grid grid-cols-12 gap-1">
        {cells.map((c) => {
          const intensity = Math.min(1, c.trades / Math.max(1, ...cells.map((x) => x.trades)));
          const wrColor = c.trades === 0 ? "#2a2b30"
            : c.wr >= 60 ? `color-mix(in oklab, #1D9E75 ${Math.round(20 + intensity * 70)}%, transparent)`
            : c.wr >= 45 ? `color-mix(in oklab, #EF9F27 ${Math.round(20 + intensity * 70)}%, transparent)`
            : `color-mix(in oklab, #E24B4A ${Math.round(20 + intensity * 70)}%, transparent)`;
          return (
            <div
              key={c.h}
              className="aspect-square rounded-md border border-border flex flex-col items-center justify-center text-[10px] tabular-nums"
              style={{ background: wrColor }}
              title={`${c.h}:00 — ${c.trades} trades · WR ${c.wr.toFixed(0)}% · PnL ${c.pnl.toFixed(2)}`}
            >
              <span className="text-muted-foreground">{c.h}h</span>
              <span className="text-foreground font-semibold">{c.trades ? `${c.wr.toFixed(0)}%` : "—"}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm bg-[#E24B4A]" /> WR &lt; 45%</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm bg-[#EF9F27]" /> 45–60%</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm bg-[#1D9E75]" /> &gt; 60%</span>
        <span>· intensidade = volume</span>
      </div>
    </div>
  );
}

// =========== LEVERAGE CROSSHAIR TOOLTIP ===========
type CrosshairPayloadItem = { dataKey?: string; value?: number; payload?: Record<string, number | string> };
function LeverageCrosshairTooltip({ active, payload, label }: { active?: boolean; payload?: CrosshairPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as Record<string, number> | undefined;
  if (!row) return null;
  const items: { key: string; label: string; color: string; v: number }[] = [
    { key: "capital", label: "Capital real", color: "#378ADD", v: row.capital },
    { key: "cap1", label: "1:1", color: "#1D9E75", v: row.cap1 },
    { key: "cap3", label: "1:3", color: "#7AD9B4", v: row.cap3 },
    { key: "cap6", label: "1:6", color: "#EF9F27", v: row.cap6 },
    { key: "cap10", label: "1:10", color: "#E24B4A", v: row.cap10 },
  ];
  return (
    <div className="rounded-md border border-border bg-[#0F1116] px-3 py-2 shadow-xl">
      <div className="text-[10px] text-muted-foreground tabular-nums mb-1.5">{label}</div>
      <div className="grid gap-1">
        {items.map((it) => (
          <div key={it.key} className="flex items-center gap-3 text-[11px]">
            <span className="size-2 rounded-sm" style={{ background: it.color }} />
            <span className="text-muted-foreground w-16">{it.label}</span>
            <span className="ml-auto tabular-nums font-semibold text-foreground">${fmt(it.v ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========== DAILY SUMMARY ACCORDION ===========
function DailySummaryAccordion({ history }: { history: Trade[] }) {
  const days = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const t of history) {
      const arr = map.get(t.day) ?? [];
      arr.push(t);
      map.set(t.day, arr);
    }
    return Array.from(map.entries())
      .map(([day, trades]) => {
        const wins = trades.filter((t) => t.result === "WIN").length;
        const losses = trades.filter((t) => t.result === "LOSS").length;
        const pnl = trades.reduce((a, t) => a + t.pnl, 0);
        const wr = wins + losses ? (wins / (wins + losses)) * 100 : 0;
        return { day, trades, wins, losses, pnl, wr };
      })
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [history]);

  const [open, setOpen] = useState<Set<string>>(() => new Set(days[0] ? [days[0].day] : []));
  const toggle = (d: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  };

  if (!days.length) return null;

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">Resumo diário</h3>
          <p className="text-[11px] text-muted-foreground">Expanda um dia para ver todos os trades</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(new Set(days.map((d) => d.day)))}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Expandir tudo
          </button>
          <span className="text-border">·</span>
          <button
            onClick={() => setOpen(new Set())}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Recolher
          </button>
        </div>
      </div>
      <div className="divide-y divide-border">
        {days.map((d) => {
          const isOpen = open.has(d.day);
          const pnlColor = d.pnl >= 0 ? "#1D9E75" : "#E24B4A";
          const wrColor = d.wr >= 60 ? "#1D9E75" : d.wr >= 45 ? "#EF9F27" : "#E24B4A";
          return (
            <div key={d.day}>
              <button
                onClick={() => toggle(d.day)}
                className="w-full px-4 py-2.5 flex items-center gap-4 hover:bg-secondary/30 transition-colors text-left"
              >
                <motion.span
                  animate={{ rotate: isOpen ? 0 : -90 }}
                  transition={{ duration: 0.2 }}
                  className="text-muted-foreground"
                >
                  <ChevronDown className="size-4" />
                </motion.span>
                <span className="text-[12px] font-semibold tabular-nums text-foreground w-24">{d.day}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {d.trades.length} trade{d.trades.length > 1 ? "s" : ""}
                </span>
                <span className="text-[11px] tabular-nums">
                  <span className="text-[#1D9E75]">{d.wins}W</span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="text-[#E24B4A]">{d.losses}L</span>
                </span>
                <span className="text-[11px] tabular-nums font-semibold" style={{ color: wrColor }}>
                  WR {d.wr.toFixed(0)}%
                </span>
                <span className="ml-auto text-[12px] tabular-nums font-semibold" style={{ color: pnlColor }}>
                  {d.pnl >= 0 ? "+" : ""}${fmt(d.pnl)}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden bg-background/40"
                  >
                    <div className="px-4 py-2 overflow-x-auto">
                      <table className="w-full text-[11.5px]">
                        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="text-left font-medium px-2 py-1">Par</th>
                            <th className="text-left font-medium px-2 py-1">Lado</th>
                            <th className="text-left font-medium px-2 py-1">Entrada</th>
                            <th className="text-left font-medium px-2 py-1">Result</th>
                            <th className="text-right font-medium px-2 py-1">PnL</th>
                            <th className="text-right font-medium px-2 py-1">PnL %</th>
                            <th className="text-left font-medium px-2 py-1">Perfil</th>
                            <th className="text-right font-medium px-2 py-1">Lev</th>
                            <th className="text-left font-medium px-2 py-1">Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.trades.map((t) => {
                            const p = PROFILES[t.profile];
                            const sideColor = t.side === "LONG" ? "#378ADD" : "#EF9F27";
                            const tPnlColor = t.pnl >= 0 ? "#1D9E75" : t.pnl < 0 ? "#E24B4A" : "#888780";
                            return (
                              <tr key={t.id} className="border-t border-border/40">
                                <td className="px-2 py-1.5 font-semibold">{t.pair}</td>
                                <td className="px-2 py-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `color-mix(in oklab, ${sideColor} 22%, transparent)`, color: sideColor }}>{t.side}</span>
                                </td>
                                <td className="px-2 py-1.5 tabular-nums">{fmt(t.entry)}</td>
                                <td className="px-2 py-1.5"><ResultBadge r={t.result} /></td>
                                <td className="px-2 py-1.5 text-right tabular-nums font-semibold" style={{ color: tPnlColor }}>{t.pnl >= 0 ? "+" : ""}{fmt(t.pnl)}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums" style={{ color: tPnlColor }}>{t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%</td>
                                <td className="px-2 py-1.5">
                                  <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full" style={{ background: p.color }} />{p.name}</span>
                                </td>
                                <td className="px-2 py-1.5 text-right tabular-nums">1:{t.leverage}</td>
                                <td className="px-2 py-1.5 text-muted-foreground">{t.motivo}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
