import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from "recharts";
import { type Signal, formatPrice } from "@/lib/signals-data";

const QUADRANTS = [
  { key: "best", label: "Best opportunities", desc: "High score · High R/R", color: "#1D9E75", x1: 2.5, x2: 6, y1: 75, y2: 100 },
  { key: "lowrr", label: "High score, low R/R", desc: "Confident but small reward", color: "#378ADD", x1: 0, x2: 2.5, y1: 75, y2: 100 },
  { key: "highrr", label: "High R/R, lower confidence", desc: "Big reward, weaker signal", color: "#EF9F27", x1: 2.5, x2: 6, y1: 40, y2: 75 },
  { key: "avoid", label: "Avoid", desc: "Low score · Low R/R", color: "#E24B4A", x1: 0, x2: 2.5, y1: 40, y2: 75 },
];

export function RadarMap({ signals }: { signals: Signal[] }) {
  const buys = signals.filter((s) => s.direction === "BUY").map((s) => ({ ...s, x: s.rr, y: s.score, z: s.volDelta }));
  const sells = signals.filter((s) => s.direction === "SELL").map((s) => ({ ...s, x: s.rr, y: s.score, z: s.volDelta }));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[14px] font-medium text-foreground">Radar Map</h3>
        <span className="text-[11px] text-muted-foreground">R/R × Score · bubble = volume</span>
      </div>
      <div className="h-[460px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid stroke="#1E2028" strokeDasharray="3 3" />
            {QUADRANTS.map((q) => (
              <ReferenceArea
                key={q.key}
                x1={q.x1}
                x2={q.x2}
                y1={q.y1}
                y2={q.y2}
                fill={q.color}
                fillOpacity={0.08}
                stroke={q.color}
                strokeOpacity={0.25}
                strokeDasharray="3 3"
                ifOverflow="hidden"
              />
            ))}
            <XAxis
              type="number"
              dataKey="x"
              name="R/R"
              domain={[0, 6]}
              tick={{ fill: "#888780", fontSize: 11 }}
              label={{ value: "R/R ratio", position: "insideBottom", offset: -10, fill: "#888780", fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Score"
              domain={[40, 100]}
              tick={{ fill: "#888780", fontSize: 11 }}
              label={{ value: "Score", angle: -90, position: "insideLeft", fill: "#888780", fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <ReferenceLine x={2.5} stroke="#2A2D36" strokeDasharray="4 4" />
            <ReferenceLine y={75} stroke="#2A2D36" strokeDasharray="4 4" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#378ADD" }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const s = payload[0].payload as Signal;
                return (
                  <div className="rounded-lg border border-border bg-card p-2.5 text-[11px]">
                    <div className="font-semibold text-foreground">{s.asset} · {s.direction}</div>
                    <div className="text-muted-foreground">Score <span className="text-foreground tabular-nums">{s.score}</span></div>
                    <div className="text-muted-foreground">R/R <span className="text-foreground tabular-nums">{s.rr.toFixed(1)}</span></div>
                    <div className="text-muted-foreground">Entry <span className="text-foreground tabular-nums">{formatPrice(s.entry)}</span></div>
                    <div className="text-muted-foreground">Vol <span className="text-[#1D9E75] tabular-nums">↑{s.volDelta}%</span></div>
                  </div>
                );
              }}
            />
            <Scatter name="BUY" data={buys} fill="#1D9E75" fillOpacity={0.85} />
            <Scatter name="SELL" data={sells} fill="#E24B4A" fillOpacity={0.85} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4 pt-4 border-t border-border">
        {QUADRANTS.map((q) => (
          <div
            key={q.key}
            className="rounded-lg p-2.5 border"
            style={{
              background: `color-mix(in oklab, ${q.color} 10%, transparent)`,
              borderColor: `color-mix(in oklab, ${q.color} 35%, transparent)`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: q.color }} />
              <span className="text-[12px] font-semibold" style={{ color: q.color }}>{q.label}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{q.desc}</div>
          </div>
        ))}
      </div>

      {/* Series legend */}
      <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#1D9E75]" />BUY</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#E24B4A]" />SELL</span>
        <span className="ml-auto">Bubble size = relative volume</span>
      </div>
    </div>
  );
}
