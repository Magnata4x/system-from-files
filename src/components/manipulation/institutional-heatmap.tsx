import { HEATMAP, TIMEFRAMES } from "@/lib/manipulation-data";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

function bg(v: number) {
  if (v >= 85) return "oklch(0.55 0.24 27)";
  if (v >= 70) return "oklch(0.50 0.20 27)";
  if (v >= 40) return "oklch(0.72 0.17 70)";
  if (v >= 20) return "oklch(0.45 0.10 240)";
  return "oklch(0.32 0.08 250)";
}

function miniSeries(asset: string, tf: string, v: number) {
  const seed = (asset.charCodeAt(0) + tf.charCodeAt(0) + v) >>> 0;
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s % 1000) / 1000; };
  return Array.from({ length: 24 }, (_, i) => ({
    i,
    v: Math.max(0, Math.round(v * 0.5 + rnd() * v * 0.9 + Math.sin(i / 3) * 8)),
  }));
}

export function InstitutionalHeatmap() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">Institutional heatmap</h2>
          <p className="text-xs text-muted-foreground">Manipulation pressure score · click any cell</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Low</span>
          {[10, 30, 50, 75, 90].map((v) => (
            <span key={v} className="size-3 rounded-sm" style={{ background: bg(v) }} />
          ))}
          <span>Critical</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-[10px] uppercase tracking-wider text-muted-foreground text-left w-14"></th>
              {TIMEFRAMES.map((tf) => (
                <th key={tf} className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {tf}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEATMAP.map((row) => (
              <tr key={row.asset}>
                <td className="text-xs font-medium text-foreground/80 pr-2">{row.asset}</td>
                {row.values.map((v, i) => {
                  const tf = TIMEFRAMES[i];
                  const key = `${row.asset}-${tf}`;
                  const critical = v > 85;
                  const series = miniSeries(row.asset, tf, v);
                  const status =
                    v >= 85 ? { label: "Critical", color: "text-red-300" }
                    : v >= 70 ? { label: "Elevated", color: "text-red-300/80" }
                    : v >= 40 ? { label: "Watch", color: "text-amber-300" }
                    : { label: "Normal", color: "text-emerald-300" };
                  return (
                    <td key={i}>
                      <Popover open={openKey === key} onOpenChange={(o) => setOpenKey(o ? key : null)}>
                        <PopoverTrigger asChild>
                          <button
                            className={`relative w-full h-9 rounded-md text-[11px] font-medium text-foreground/90 transition-transform hover:scale-[1.04] ${
                              critical ? "manip-cell-pulse" : ""
                            }`}
                            style={{ background: bg(v) }}
                          >
                            {v}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="center"
                          className="w-[300px] bg-popover border-border p-0 overflow-hidden"
                        >
                          <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold">{row.asset} · {tf}</div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                                Manipulation pressure
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold tabular-nums" style={{ color: bg(v) }}>{v}</div>
                              <div className={`text-[10px] font-semibold uppercase tracking-wider ${status.color}`}>{status.label}</div>
                            </div>
                          </div>
                          <div className="h-[80px] px-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={series} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                                <defs>
                                  <linearGradient id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={v > 70 ? "#ef4444" : "#22d3ee"} stopOpacity={0.55} />
                                    <stop offset="100%" stopColor={v > 70 ? "#ef4444" : "#22d3ee"} stopOpacity={0.02} />
                                  </linearGradient>
                                </defs>
                                <YAxis hide domain={[0, "dataMax + 10"]} />
                                <Area
                                  type="monotone"
                                  dataKey="v"
                                  stroke={v > 70 ? "#ef4444" : "#22d3ee"}
                                  strokeWidth={1.75}
                                  fill={`url(#g-${key})`}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="px-3.5 py-2.5 border-t border-border space-y-1.5 text-xs">
                            <Row k="Order book imbalance" v={`${Math.round(v * 0.9)}%`} />
                            <Row k="Spoof attempts (1h)" v={`${Math.round(v / 4)}`} />
                            <Row k="CVD divergence" v={v > 60 ? "Strong" : "Mild"} />
                            <Row k="Cluster anomalies" v={v > 70 ? "3 detected" : "None"} />
                            <p className="pt-2 text-[11px] text-muted-foreground leading-relaxed">
                              {v > 85
                                ? "Critical: high probability of coordinated activity. Defensive posture recommended."
                                : v > 60
                                ? "Elevated: watch for traps around key liquidity zones."
                                : "Normal institutional flow within expected range."}
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes manipCellPulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(239,68,68,0.9), 0 0 12px rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 0 2px rgba(239,68,68,1), 0 0 22px rgba(239,68,68,0.7); }
        }
        .manip-cell-pulse { animation: manipCellPulse 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
