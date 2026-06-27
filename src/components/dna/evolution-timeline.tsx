import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceDot, Tooltip, Legend } from "recharts";
import { EVOLUTION } from "@/lib/dna-data";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

export function EvolutionTimeline() {
  const delta = EVOLUTION[EVOLUTION.length - 1].overall - EVOLUTION[EVOLUTION.length - 4].overall;
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="text-sm font-semibold">Evolution timeline</h2>
          <p className="text-xs text-muted-foreground">Last 6 months</p>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <TrendingUp className="size-3 mr-1" /> Score improved +{delta} pts in 90d
        </Badge>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={EVOLUTION} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
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
            {EVOLUTION.filter((p) => p.note).map((p) => (
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
