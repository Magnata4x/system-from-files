import { LIQUIDITY_MAP, CURRENT_PRICE_LEVEL } from "@/lib/manipulation-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

export function LiquidityMap() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Liquidity map</h2>
        <p className="text-xs text-muted-foreground">Estimated resting liquidity by price level (USD millions)</p>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={LIQUIDITY_MAP} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="level" type="category" width={70} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "var(--secondary)", opacity: 0.3 }}
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(value: number, name) => [`Estimated $${value}M resting`, name === "buy" ? "Buy-side" : "Sell-side"]}
            />
            <ReferenceLine y={CURRENT_PRICE_LEVEL} stroke="#ffffff" strokeDasharray="4 3" label={{ value: `Now ${CURRENT_PRICE_LEVEL}`, fill: "#fff", fontSize: 10, position: "right" }} />
            <Bar dataKey="buy" stackId="x" radius={[3, 3, 3, 3]}>
              {LIQUIDITY_MAP.map((_, i) => <Cell key={i} fill="#22d3ee" fillOpacity={0.75} />)}
            </Bar>
            <Bar dataKey="sell" stackId="x" radius={[3, 3, 3, 3]}>
              {LIQUIDITY_MAP.map((_, i) => <Cell key={i} fill="#ef4444" fillOpacity={0.75} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
