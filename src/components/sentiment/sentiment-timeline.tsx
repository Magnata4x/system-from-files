import { useState } from "react";
import { TIMELINE, TIMELINE_EVENTS } from "@/lib/sentiment-data";
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from "recharts";

const ASSETS = [
  { key: "BTC", color: "#22d3ee" },
  { key: "ETH", color: "#a78bfa" },
  { key: "SOL", color: "#fbbf24" },
];

export function SentimentTimeline() {
  const [visible, setVisible] = useState<Record<string, boolean>>({ BTC: true, ETH: true, SOL: true });

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold">Sentiment Timeline</h3>
          <p className="text-[11px] text-muted-foreground">Last 7 days · with major event annotations</p>
        </div>
        <div className="flex gap-1.5">
          {ASSETS.map((a) => (
            <button
              key={a.key}
              onClick={() => setVisible((v) => ({ ...v, [a.key]: !v[a.key] }))}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                visible[a.key] ? "border-border text-foreground" : "border-border/40 text-muted-foreground/60 line-through"
              }`}
              style={{ borderColor: visible[a.key] ? a.color : undefined, color: visible[a.key] ? a.color : undefined }}
            >
              {a.key}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={TIMELINE} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="btcArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} interval={5} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "rgba(255,255,255,0.6)" }}
            />
            {visible.BTC && <Area type="monotone" dataKey="BTC" stroke="#22d3ee" strokeWidth={2} fill="url(#btcArea)" />}
            {visible.ETH && <Line type="monotone" dataKey="ETH" stroke="#a78bfa" strokeWidth={1.75} dot={false} />}
            {visible.SOL && <Line type="monotone" dataKey="SOL" stroke="#fbbf24" strokeWidth={1.75} dot={false} />}
            {TIMELINE_EVENTS.map((e) => (
              <ReferenceLine
                key={e.t} x={TIMELINE[e.t]?.label}
                stroke="rgba(251,191,36,0.5)" strokeDasharray="3 3"
                label={{ value: e.label, position: "top", fill: "#fbbf24", fontSize: 9 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
