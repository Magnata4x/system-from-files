import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceDot, Tooltip, Legend } from "recharts";
import { EVOLUTION } from "@/lib/dna-data";
import { useDnaStats } from "@/hooks/useDnaStats";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

export function EvolutionTimeline() {
  const { data: stats } = useDnaStats();
  const live = !!stats?.hasData && stats.evolution.length >= 2;
  const series = live ? stats!.evolution : EVOLUTION;

  const back = Math.min(3, series.length - 1);
  const delta = series[series.length - 1].overall - series[series.length - 1 - back].overall;
  const up = delta >= 0;

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="text-sm font-semibold">Evolution timeline</h2>
          <p className="text-xs text-muted-foreground">
            {live ? "Últimos meses com operações reais" : "Exemplo demonstrativo — últimos 6 meses"}
          </p>
        </div>
        <Badge
          className={
            up
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/15 text-red-400 border border-red-500/30"
          }
        >
          {up ? <TrendingUp className="size-3 mr-1" /> : <TrendingDown className="size-3 mr-1" />}
          Score {up ? "+" : ""}{delta} pts
        </Badge>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--muted-foreground)" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
            <Line type="monotone" dataKey="overall" name="Overall score" stroke="#378ADD" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="emotional" name="Emotional control" stroke="#7F77DD" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
            {series.filter((p) => p.note).map((p) => (
              <ReferenceDot
                key={p.month}
                x={p.month}
                y={p.overall}
                r={5}
                fill="var(--brand-cyan)"
                stroke="var(--background)"
                strokeWidth={2}
                label={{ value: p.note, position: "top", fill: "var(--muted-foreground)", fontSize: 10 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
