import { AGGRESSION } from "@/lib/manipulation-data";
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, Cell } from "recharts";

export function AggressionAnalysis() {
  const anomalies = AGGRESSION.filter((d) => d.anomaly).map((d) => d.t);
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">Aggression analysis</h2>
          <p className="text-xs text-muted-foreground">Market aggression score + delta volume</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-amber-300">
          {anomalies.length} anomal{anomalies.length === 1 ? "y" : "ies"} today
        </span>
      </div>

      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={AGGRESSION} margin={{ left: 0, right: 12, top: 4 }}>
            <defs>
              <linearGradient id="aggFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            {anomalies.map((t) => (
              <ReferenceArea
                key={t}
                x1={t}
                x2={t}
                strokeOpacity={0}
                fill="#f59e0b"
                fillOpacity={0.18}
                label={{ value: "⚡ Anomaly", fill: "#fbbf24", fontSize: 9, position: "insideTop" }}
              />
            ))}
            <Area type="monotone" dataKey="aggression" stroke="#22d3ee" strokeWidth={2} fill="url(#aggFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="h-[100px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={AGGRESSION} margin={{ left: 0, right: 12 }}>
            <XAxis dataKey="t" tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="delta" radius={[2, 2, 0, 0]}>
              {AGGRESSION.map((d, i) => (
                <Cell key={i} fill={d.delta >= 0 ? "#10b981" : "#ef4444"} fillOpacity={d.anomaly ? 1 : 0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
