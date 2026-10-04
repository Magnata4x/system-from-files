import { useDnaStats } from "@/hooks/useDnaStats";
import { useMemo, useState } from "react";

function colorFor(v: number) {
  if (v === 0) return "var(--secondary)";
  if (v === -1) return "oklch(0.52 0.20 25)";
  const shades = ["oklch(0.45 0.13 145)", "oklch(0.55 0.16 145)", "oklch(0.65 0.18 145)", "oklch(0.75 0.20 145)"];
  return shades[Math.min(v, 4) - 1];
}

type Cell = { date: Date; value: number; trades: number; pnl: number };

export function BehavioralHeatmap() {
  const { data: dna, isLoading, isError } = useDnaStats();
  const data = useMemo<Cell[]>(
    () => dna?.hasData ? dna.heatmap.map((h) => ({
      date: new Date(`${h.date}T00:00:00`),
      value: h.value,
      trades: h.trades,
      pnl: h.pnl,
    })) : [],
    [dna],
  );
  const [hover, setHover] = useState<{ cell: Cell; x: number; y: number } | null>(null);
  if (isLoading) return <div className="rounded-xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">carregando mapa comportamental real…</div>;
  if (isError || !data.length) return <div className="rounded-xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">Mapa comportamental indisponível — sem histórico real suficiente.</div>;
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

  const summary = useMemo(() => {
    const names = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const byWeekday = new Map<number, { pnl: number; trades: number }>();
    let activeDays = 0;
    let totalTrades = 0;
    for (const c of data) {
      if ((c.trades ?? 0) === 0) continue;
      activeDays += 1;
      totalTrades += c.trades ?? 0;
      const wd = c.date.getDay();
      const cur = byWeekday.get(wd) ?? { pnl: 0, trades: 0 };
      cur.pnl += c.pnl ?? 0;
      cur.trades += c.trades ?? 0;
      byWeekday.set(wd, cur);
    }
    const entries = [...byWeekday.entries()];
    const byPnl = [...entries].sort((a, b) => b[1].pnl - a[1].pnl);
    const byVol = [...entries].sort((a, b) => b[1].trades - a[1].trades);
    return [
      { l: "Melhor dia", v: byPnl.length ? names[byPnl[0][0]] : "indisponível" },
      { l: "Pior dia", v: byPnl.length ? names[byPnl[byPnl.length - 1][0]] : "indisponível" },
      { l: "Mais ativo", v: byVol.length ? names[byVol[0][0]] : "indisponível" },
      { l: "Dias operados", v: String(activeDays) },
      { l: "Média trades / dia", v: activeDays ? (totalTrades / activeDays).toFixed(1) : "0" },
    ];
  }, [data]);

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">Behavioral heatmap</h2>
          <p className="text-xs text-muted-foreground">
            Últimos 90 dias — dados reais das suas operações
          </p>
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

          {hover && (
            <div
              className="pointer-events-none absolute z-20 rounded-md border border-border bg-popover/95 backdrop-blur p-2.5 text-[11px] shadow-lg min-w-[160px]"
              style={{ left: hover.x, top: hover.y }}
            >
              <div className="font-medium text-foreground">
                {hover.cell.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </div>
              {hover.cell.trades === 0 ? (
                <div className="text-muted-foreground mt-1">No trades</div>
              ) : (
                <div className="mt-1.5 space-y-0.5">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Trades</span>
                    <span className="font-medium">{hover.cell.trades}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">PnL</span>
                    <span className={`font-medium ${hover.cell.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {hover.cell.pnl >= 0 ? "+" : ""}{Math.round(hover.cell.pnl)}u
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-4 border-t border-border">
        {summary.map((s) => (
          <div key={s.l}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
            <div className="text-sm font-medium mt-0.5">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
