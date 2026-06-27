import { STATS } from "@/lib/copy-trading-data";

export function StatsRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {STATS.map((s) => (
        <div key={s.label} className="rounded-lg border border-border bg-card/40 p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">{s.value}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{s.delta}</div>
        </div>
      ))}
    </div>
  );
}
