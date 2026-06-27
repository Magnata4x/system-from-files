import { STATS } from "@/lib/dna-data";
import { Target, Clock, Sparkles, Hourglass, Shield, TrendingDown, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

const ICONS = { Target, Clock, Sparkles, Hourglass, Shield, TrendingDown, TrendingUp } as const;

export function StatsGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {STATS.map((s) => {
        const Icon = ICONS[s.icon as keyof typeof ICONS] ?? Target;
        return (
          <div key={s.label} className="rounded-xl border border-border bg-card/40 p-4">
            <div className="flex items-start justify-between">
              <div className="size-9 rounded-lg bg-[var(--brand-blue-deep)]/50 flex items-center justify-center">
                <Icon className="size-4 text-[var(--brand-cyan)]" />
              </div>
              {s.trend && (
                <span className={`flex items-center gap-0.5 text-[11px] font-medium ${s.trendUp ? "text-emerald-400" : "text-red-400"}`}>
                  {s.trendUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {s.trend}
                </span>
              )}
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}
