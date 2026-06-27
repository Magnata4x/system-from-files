import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { scoreDistribution } from "@/lib/dashboard-data";
import { scoreColor } from "./score-badge";

export function PerformanceChart() {
  const [mode, setMode] = useState<"asset" | "tf">("asset");
  const data = mode === "asset" ? scoreDistribution.byAsset : scoreDistribution.byTimeframe;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[15px] font-medium text-foreground">Average score distribution</h3>
          <p className="text-[11px] text-muted-foreground">Last 7 days</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-full bg-secondary">
          <button
            onClick={() => setMode("asset")}
            className={`px-3 py-1 rounded-full text-[12px] font-medium ${mode === "asset" ? "bg-card text-foreground border border-border" : "text-muted-foreground"}`}
          >By Asset</button>
          <button
            onClick={() => setMode("tf")}
            className={`px-3 py-1 rounded-full text-[12px] font-medium ${mode === "tf" ? "bg-card text-foreground border border-border" : "text-muted-foreground"}`}
          >By Timeframe</button>
        </div>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="#1E2028" vertical={false} />
            <XAxis dataKey="name" stroke="#888780" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis stroke="#888780" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip
              cursor={{ fill: "rgba(55,138,221,0.06)" }}
              contentStyle={{ background: "#111318", border: "1px solid #1E2028", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={scoreColor(d.avg)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
