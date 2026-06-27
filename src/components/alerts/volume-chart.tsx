import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const KINDS = [
  { key: "signal", label: "Signals", color: "#3B82F6" },
  { key: "manipulation", label: "Manipulation", color: "#E24B4A" },
  { key: "volatility", label: "Volatility", color: "#F59E0B" },
  { key: "profit", label: "Profit", color: "#10B981" },
] as const;

// Deterministic pseudo-random so values are stable per render
function seeded(i: number, salt: number) {
  const x = Math.sin(i * 9301 + salt * 49297) * 233280;
  return Math.abs(x - Math.floor(x));
}

export function VolumeChart() {
  const data = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const day = d.toLocaleDateString(undefined, { weekday: "short" });
      const row: Record<string, string | number> = { day };
      KINDS.forEach((k, idx) => {
        row[k.key] = Math.round(4 + seeded(i + 1, idx + 1) * 18);
      });
      return row;
    });
  }, []);

  const total = data.reduce(
    (acc, r) => acc + KINDS.reduce((s, k) => s + (r[k.key] as number), 0),
    0,
  );

  return (
    <section className="rounded-xl border border-border bg-card/40 p-5">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-sm font-medium">Alert volume</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Last 7 days, grouped by type.</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums">{total}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">total alerts</div>
        </div>
      </header>

      <div className="h-[200px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--secondary))", opacity: 0.4 }}
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(v) => <span className="text-muted-foreground">{v}</span>}
            />
            {KINDS.map((k) => (
              <Bar
                key={k.key}
                dataKey={k.key}
                name={k.label}
                stackId="a"
                fill={k.color}
                radius={k.key === "profit" ? [3, 3, 0, 0] : 0}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
