import { useEffect, useRef, useState } from "react";
import { Bell, Bookmark, Download, EyeOff, Pin, PinOff, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import { type Signal, formatPrice, formatAge } from "@/lib/signals-data";
import { useSignalsStore } from "@/lib/signals-store";
import { useBot4xStore } from "@/lib/bot4x-store";
import { bot4xEligibility, ELIGIBILITY_META } from "@/lib/bot4x-eligibility";
import { useLivePrices } from "@/hooks/useLivePrices";

const PAGE = 20;

type ColKey =
  | "select" | "num" | "asset" | "price" | "dir" | "score" | "entry" | "stop" | "target"
  | "rr" | "risk" | "tf" | "exchange" | "setup" | "confirms" | "dna" | "manip" | "bot4x" | "age" | "actions";

type ColDef = {
  key: ColKey;
  label: string;
  fixed?: boolean; // can't hide / reorder
  render: (s: Signal, ctx: { idx: number; checked: boolean; toggle: () => void }) => React.ReactNode;
};

const COLUMNS: Record<ColKey, ColDef> = {
  select: {
    key: "select", label: "", fixed: true,
    render: (_s, { checked, toggle }) => (
      <input type="checkbox" checked={checked}
        onChange={(e) => { e.stopPropagation(); toggle(); }}
        onClick={(e) => e.stopPropagation()}
        className="accent-[var(--brand-cyan)]" />
    ),
  },
  num: { key: "num", label: "#", render: (_s, { idx }) => <span className="text-muted-foreground tabular-nums">{idx + 1}</span> },
  asset: { key: "asset", label: "Asset", render: (s) => <span className="font-semibold text-foreground">{s.asset}</span> },
  price: { key: "price", label: "Price", render: (s) => <LivePriceCell asset={s.asset} /> },
  dir: {
    key: "dir", label: "Dir",
    render: (s) => {
      const c = s.direction === "BUY" ? "#1D9E75" : "#E24B4A";
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `color-mix(in oklab, ${c} 22%, transparent)`, color: c }}>{s.direction}</span>;
    },
  },
  score: { key: "score", label: "Score", render: (s) => <ScoreBadge score={s.score} size="sm" /> },
  entry: { key: "entry", label: "Entry", render: (s) => <span className="tabular-nums">{formatPrice(s.entry)}</span> },
  stop: { key: "stop", label: "Stop", render: (s) => <span className="tabular-nums text-[#E24B4A]">{formatPrice(s.stop)}</span> },
  target: { key: "target", label: "Target", render: (s) => <span className="tabular-nums text-[#1D9E75]">{formatPrice(s.target)}</span> },
  rr: { key: "rr", label: "R/R", render: (s) => <span className="tabular-nums font-medium">{s.rr.toFixed(1)}</span> },
  risk: { key: "risk", label: "Risk%", render: (s) => <span className="tabular-nums">{s.riskPct}%</span> },
  tf: { key: "tf", label: "TF", render: (s) => s.tf },
  exchange: { key: "exchange", label: "Exchange", render: (s) => <span className="text-muted-foreground">{s.exchange}</span> },
  setup: { key: "setup", label: "Setup", render: (s) => <span className="text-muted-foreground">{s.setup}</span> },
  confirms: { key: "confirms", label: "Confirms", render: (s) => <span className="tabular-nums">{Object.values(s.confirms).filter(Boolean).length}/5</span> },
  dna: { key: "dna", label: "DNA%", render: (s) => <span className="tabular-nums">{s.dnaMatch}%</span> },
  manip: {
    key: "manip", label: "Manip",
    render: (s) =>
      s.manipRisk === "low" ? <ShieldCheck className="size-3.5 text-[#1D9E75]" /> :
        s.manipRisk === "medium" ? <Shield className="size-3.5 text-[#EF9F27]" /> :
          <ShieldAlert className="size-3.5 text-[#E24B4A]" />,
  },
  bot4x: { key: "bot4x", label: "Bot4x", render: (s) => <Bot4xCell signal={s} /> },
  age: { key: "age", label: "Age", render: (s) => <span className="text-muted-foreground">{formatAge(s.ageMin)}</span> },
  actions: {
    key: "actions", label: "Actions",
    render: (s) => <ViewLink id={s.id} />,
  },
};

function ViewLink({ id }: { id: string }) {
  const openDetail = useSignalsStore((st) => st.openDetail);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); openDetail(id); }}
      className="text-[var(--brand-cyan)] hover:underline"
    >
      View →
    </button>
  );
}

function LivePriceCell({ asset }: { asset: string }) {
  const { prices } = useLivePrices();
  const base = asset.split("/")[0];
  const price = prices[base]?.price;
  if (!price) return <span className="text-muted-foreground tabular-nums">—</span>;
  return (
    <span className="tabular-nums text-foreground">
      ${price.toLocaleString(undefined, { maximumFractionDigits: price > 100 ? 1 : 3 })}
    </span>
  );
}

function Bot4xCell({ signal }: { signal: Signal }) {
  const mode = useBot4xStore((s) => s.mode);
  const profile = useBot4xStore((s) => s.profile);
  const dailyPnlPct = useBot4xStore((s) => s.dailyPnlPct);
  const elig = bot4xEligibility(signal, { mode, profile, dailyPnlPct });
  const m = ELIGIBILITY_META[elig];
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide"
      style={{ background: m.bg, color: m.color }}
    >
      {m.label}
    </span>
  );
}

const DEFAULT_ORDER: ColKey[] = ["select", "num", "asset", "price", "dir", "score", "entry", "stop", "target", "rr", "risk", "tf", "exchange", "setup", "confirms", "dna", "manip", "bot4x", "age", "actions"];
const STORAGE_KEY = "signals.table.cols.v1";

type ColState = { order: ColKey[]; hidden: ColKey[]; pinned: ColKey[] };

function loadColState(): ColState {
  if (typeof window === "undefined") return { order: DEFAULT_ORDER, hidden: [], pinned: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { order: DEFAULT_ORDER, hidden: [], pinned: [] };
    const p = JSON.parse(raw);
    const valid = (k: string): k is ColKey => k in COLUMNS;
    const order = (Array.isArray(p.order) ? p.order : DEFAULT_ORDER).filter(valid) as ColKey[];
    for (const k of DEFAULT_ORDER) if (!order.includes(k)) order.push(k);
    return {
      order,
      hidden: (p.hidden ?? []).filter(valid),
      pinned: (p.pinned ?? []).filter(valid),
    };
  } catch {
    return { order: DEFAULT_ORDER, hidden: [], pinned: [] };
  }
}

export function TableView({ signals }: { signals: Signal[] }) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cols, setCols] = useState<ColState>(loadColState);
  const [ctx, setCtx] = useState<{ x: number; y: number; col: ColKey } | null>(null);
  const dragKey = useRef<ColKey | null>(null);

  const setHover = useSignalsStore((s) => s.setHover);
  const pin = useSignalsStore((s) => s.pin);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
  }, [cols]);

  useEffect(() => {
    const close = () => setCtx(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(signals.length / PAGE));
  const slice = signals.slice(page * PAGE, page * PAGE + PAGE);
  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  const visibleKeys: ColKey[] = (() => {
    const hidden = new Set(cols.hidden);
    const pinned = cols.pinned.filter((k) => !hidden.has(k));
    const rest = cols.order.filter((k) => !hidden.has(k) && !cols.pinned.includes(k));
    return [...pinned, ...rest];
  })();

  const hideCol = (k: ColKey) => setCols((c) => ({ ...c, hidden: [...new Set([...c.hidden, k])] }));
  const showCol = (k: ColKey) => setCols((c) => ({ ...c, hidden: c.hidden.filter((x) => x !== k) }));
  const togglePin = (k: ColKey) => setCols((c) => ({
    ...c, pinned: c.pinned.includes(k) ? c.pinned.filter((x) => x !== k) : [...c.pinned, k],
  }));
  const resetCols = () => setCols({ order: DEFAULT_ORDER, hidden: [], pinned: [] });

  const onDragStart = (k: ColKey) => { dragKey.current = k; };
  const onDrop = (target: ColKey) => {
    const src = dragKey.current; dragKey.current = null;
    if (!src || src === target) return;
    setCols((c) => {
      const order = c.order.filter((x) => x !== src);
      const ti = order.indexOf(target);
      order.splice(ti, 0, src);
      return { ...c, order };
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {(selected.size > 0 || cols.hidden.length > 0) && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-[color-mix(in_oklab,var(--brand-blue)_15%,transparent)] text-[12px]">
          {selected.size > 0 && <span className="text-foreground font-medium">{selected.size} selected</span>}
          {cols.hidden.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Hidden:</span>
              {cols.hidden.map((k) => (
                <button key={k} onClick={() => showCol(k)}
                  className="px-1.5 py-0.5 rounded border border-border bg-card text-foreground hover:border-[var(--brand-cyan)] text-[11px]">
                  + {COLUMNS[k].label || k}
                </button>
              ))}
              <button onClick={resetCols} className="text-muted-foreground hover:text-foreground text-[11px] underline">reset</button>
            </div>
          )}
          {selected.size > 0 && (
            <div className="ml-auto flex gap-2">
              <ActionBtn icon={<Bell className="size-3" />} label="Set alerts" />
              <ActionBtn icon={<Bookmark className="size-3" />} label="Save all" />
              <ActionBtn icon={<Download className="size-3" />} label="Export CSV" />
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-background/40 text-muted-foreground select-none">
            <tr className="text-left">
              {visibleKeys.map((k) => {
                const col = COLUMNS[k];
                const pinned = cols.pinned.includes(k);
                const draggable = !col.fixed;
                return (
                  <th
                    key={k}
                    draggable={draggable}
                    onDragStart={() => draggable && onDragStart(k)}
                    onDragOver={(e) => { if (draggable) e.preventDefault(); }}
                    onDrop={() => draggable && onDrop(k)}
                    onContextMenu={(e) => {
                      if (col.fixed) return;
                      e.preventDefault();
                      setCtx({ x: e.clientX, y: e.clientY, col: k });
                    }}
                    className={`px-3 py-2 font-medium text-[11px] uppercase tracking-wide group relative ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${pinned ? "bg-[color-mix(in_oklab,var(--brand-cyan)_8%,transparent)]" : ""}`}
                    title={draggable ? "Drag to reorder · right-click for options" : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {pinned && <Pin className="size-2.5 text-[var(--brand-cyan)]" />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slice.map((s, i) => {
              const opacity = s.status === "expired" ? 0.45 : 1;
              const checked = selected.has(s.id);
              return (
                <tr
                  key={s.id}
                  onMouseEnter={() => setHover(s.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => pin(s.id)}
                  className={`border-t border-border hover:bg-secondary/40 transition-colors cursor-pointer ${i % 2 === 1 ? "bg-background/20" : ""}`}
                  style={{ opacity }}
                >
                  {visibleKeys.map((k) => {
                    const pinned = cols.pinned.includes(k);
                    return (
                      <td key={k} className={`px-3 py-2 text-foreground ${pinned ? "bg-[color-mix(in_oklab,var(--brand-cyan)_6%,transparent)]" : ""}`}>
                        {COLUMNS[k].render(s, { idx: page * PAGE + i, checked, toggle: () => toggle(s.id) })}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-border text-[12px] text-muted-foreground">
        <span>Page {page + 1} of {totalPages} · {signals.length} signals</span>
        <div className="flex gap-1">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="h-7 px-2.5 rounded-md border border-border hover:text-foreground disabled:opacity-30">Prev</button>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="h-7 px-2.5 rounded-md border border-border hover:text-foreground disabled:opacity-30">Next</button>
        </div>
      </div>

      {ctx && (
        <div
          className="fixed z-50 rounded-md border border-border bg-card shadow-xl py-1 text-[12px] min-w-[160px]"
          style={{ left: ctx.x, top: ctx.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem
            icon={cols.pinned.includes(ctx.col) ? <PinOff className="size-3" /> : <Pin className="size-3" />}
            label={cols.pinned.includes(ctx.col) ? "Unpin column" : "Pin column"}
            onClick={() => { togglePin(ctx.col); setCtx(null); }}
          />
          <MenuItem
            icon={<EyeOff className="size-3" />}
            label="Hide column"
            onClick={() => { hideCol(ctx.col); setCtx(null); }}
          />
          <div className="border-t border-border my-1" />
          <MenuItem label="Reset columns" onClick={() => { resetCols(); setCtx(null); }} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon?: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full px-3 py-1.5 text-left text-foreground hover:bg-secondary inline-flex items-center gap-2">
      {icon}{label}
    </button>
  );
}

function ActionBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="h-7 px-2.5 rounded-md border border-border bg-card text-foreground hover:border-[var(--brand-cyan)] inline-flex items-center gap-1 transition-colors">
      {icon} {label}
    </button>
  );
}
