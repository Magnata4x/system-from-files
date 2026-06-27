import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Switch } from "@/components/ui/switch";
import { PERFORMANCE_SERIES } from "@/lib/copy-trading-data";

export function PerformanceChart() {
  const [showManual, setShowManual] = useState(true);
  const [showCopy, setShowCopy] = useState(true);

  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Performance comparison</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manual trading vs copy trading — cumulative return (last 30 days)</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={showManual} onCheckedChange={setShowManual} />
            <span className="flex items-center gap-1.5"><span className="inline-block size-2 rounded-full bg-muted-foreground" />Manual</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={showCopy} onCheckedChange={setShowCopy} />
            <span className="flex items-center gap-1.5"><span className="inline-block size-2 rounded-full bg-[#22d3ee]" />Copy</span>
          </label>
        </div>
      </header>
      <div className="rounded-lg border border-border bg-card/40 p-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={PERFORMANCE_SERIES} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="copyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="manualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                formatter={(value: number, name) => [`${value.toFixed(2)}%`, name === "copy" ? "Copy" : "Manual"]}
              />
              {showManual && (
                <Area type="monotone" dataKey="manual" stroke="#94a3b8" strokeWidth={1.5} fill="url(#manualGrad)" />
              )}
              {showCopy && (
                <Area type="monotone" dataKey="copy" stroke="#22d3ee" strokeWidth={2} fill="url(#copyGrad)" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
