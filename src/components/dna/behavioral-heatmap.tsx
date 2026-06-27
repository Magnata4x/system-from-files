import { buildHeatmap } from "@/lib/dna-data";
import { useMemo, useState } from "react";

function colorFor(v: number) {
  if (v === 0) return "var(--secondary)";
  if (v === -1) return "oklch(0.52 0.20 25)";
  const shades = ["oklch(0.45 0.13 145)", "oklch(0.55 0.16 145)", "oklch(0.65 0.18 145)", "oklch(0.75 0.20 145)"];
  return shades[Math.min(v, 4) - 1];
}

type Cell = { date: Date; value: number };
type CellStats = { trades: number; pnl: number; winRate: number };

function statsFor(cell: Cell): CellStats {
  // deterministic pseudo-stats from value + date
  const seed = cell.date.getDate() + cell.date.getMonth() * 31;
  const rnd = (n: number) => ((seed * (n + 7)) % 100) / 100;
  if (cell.value === 0) return { trades: 0, pnl: 0, winRate: 0 };
  if (cell.value === -1) {
    const trades = 2 + Math.floor(rnd(1) * 4);
    return { trades, pnl: -(50 + Math.floor(rnd(2) * 280)), winRate: Math.floor(rnd(3) * 35) };
  }
  const trades = cell.value + 1 + Math.floor(rnd(1) * 3);
  const pnl = cell.value * (80 + Math.floor(rnd(2) * 220));
  const winRate = 55 + cell.value * 6 + Math.floor(rnd(3) * 10);
  return { trades, pnl, winRate: Math.min(98, winRate) };
}

export function BehavioralHeatmap() {
  const data = useMemo(() => buildHeatmap(), []);
  const [hover, setHover] = useState<{ cell: Cell; x: number; y: number } | null>(null);

  const weeks: (Cell | null)[][] = [];
  let current: (Cell | null)[] = [];
  const first = data[0].date.getDay();
  for (let i = 0; i < first; i++) current.push(null);
  for (const d of data) {
    current.push(d);
    if (current.length === 7) { weeks.push(current); current = []; }
  }
  if (current.length) { while (current.length < 7) current.push(null); weeks.push(current); }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const stats = hover ? statsFor(hover.cell) : null;

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">Behavioral heatmap</h2>
          <p className="text-xs text-muted-foreground">Last 90 days — green: profit · red: loss · gray: no trades</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[-1, 0, 1, 2, 3, 4].map((v) => (
            <span key={v} className="size-3 rounded-sm" style={{ background: colorFor(v) }} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-1.5 min-w-fit relative">
          <div className="flex flex-col gap-1 mr-1 text-[10px] text-muted-foreground pt-0.5">
            {dayLabels.map((d, i) => (
              <span key={i} className="h-3 leading-3" style={{ visibility: i % 2 ? "visible" : "hidden" }}>{d}</span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((d, di) => (
                <div
                  key={di}
                  className="size-3 rounded-sm transition-transform hover:scale-150 cursor-pointer"
                  style={{ background: d ? colorFor(d.value) : "transparent" }}
                  onMouseEnter={(e) => {
                    if (!d) return;
                    const rect = (e.currentTarget.closest(".relative") as HTMLElement).getBoundingClientRect();
                    const r = e.currentTarget.getBoundingClientRect();
                    setHover({ cell: d, x: r.left - rect.left + 16, y: r.top - rect.top + 16 });
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </div>
          ))}

          {hover && stats && (
            <div
              className="pointer-events-none absolute z-20 rounded-md border border-border bg-popover/95 backdrop-blur p-2.5 text-[11px] shadow-lg min-w-[160px]"
              style={{ left: hover.x, top: hover.y }}
            >
              <div className="font-medium text-foreground">
                {hover.cell.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </div>
              {stats.trades === 0 ? (
                <div className="text-muted-foreground mt-1">No trades</div>
              ) : (
                <div className="mt-1.5 space-y-0.5">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Trades</span>
                    <span className="font-medium">{stats.trades}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">PnL</span>
                    <span className={`font-medium ${stats.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {stats.pnl >= 0 ? "+" : ""}{stats.pnl}u
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Win rate</span>
                    <span className="font-medium">{stats.winRate}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-4 border-t border-border">
        {[
          { l: "Best day", v: "Tuesday" },
          { l: "Worst day", v: "Monday" },
          { l: "Most active", v: "Wednesday" },
          { l: "Best session", v: "London Open" },
          { l: "Avg trades / day", v: "3.2" },
        ].map((s) => (
          <div key={s.l}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
            <div className="text-sm font-medium mt-0.5">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
