import { STATS } from "@/lib/dna-data";
import { useDnaStats } from "@/hooks/useDnaStats";
import {
  Target,
  Clock,
  Sparkles,
  Hourglass,
  Shield,
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const ICONS = { Target, Clock, Sparkles, Hourglass, Shield, TrendingDown, TrendingUp } as const;

export function StatsGrid() {
  const { data } = useDnaStats();
  const live = !!data?.hasData;

  const stats = live
    ? [
        {
          icon: "Target",
          value: `${data!.winRate.toFixed(1)}%`,
          label: "Win Rate",
          trend: `${data!.totalTrades} operações`,
          trendUp: data!.winRate >= 50,
        },
        {
          icon: "Sparkles",
          value: data!.bestPair ?? "—",
          label: "Melhor par",
          trend: data!.worstPair ? `pior: ${data!.worstPair}` : undefined,
          trendUp: true,
        },
        {
          icon: "Clock",
          value: data!.bestHour !== null ? `${String(data!.bestHour).padStart(2, "0")}h` : "—",
          label: "Melhor horário",
          trend:
            data!.worstHour !== null
              ? `pior: ${String(data!.worstHour).padStart(2, "0")}h`
              : undefined,
          trendUp: true,
        },
        {
          icon: "Hourglass",
          value: `${data!.avgPnlPct >= 0 ? "+" : ""}${data!.avgPnlPct.toFixed(2)}%`,
          label: "Resultado médio por trade",
          trend: undefined,
          trendUp: data!.avgPnlPct >= 0,
        },
        {
          icon: "Shield",
          value: `${data!.totalPnl >= 0 ? "+" : ""}${data!.totalPnl.toFixed(2)}`,
          label: "PnL acumulado",
          trend: undefined,
          trendUp: data!.totalPnl >= 0,
        },
        {
          icon: "TrendingDown",
          value: `−${data!.maxDrawdownPct.toFixed(1)}%`,
          label: "Drawdown máximo",
          trend: undefined,
          trendUp: data!.maxDrawdownPct < 15,
        },
      ]
    : STATS;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {stats.map((s) => {
        const Icon = ICONS[s.icon as keyof typeof ICONS] ?? Target;
        return (
          <div key={s.label} className="rounded-xl border border-border bg-card/40 p-4">
            <div className="flex items-start justify-between">
              <div className="size-9 rounded-lg bg-[var(--brand-blue-deep)]/50 flex items-center justify-center">
                <Icon className="size-4 text-[var(--brand-cyan)]" />
              </div>
              {s.trend && (
                <span
                  className={`flex items-center gap-0.5 text-[11px] font-medium ${s.trendUp ? "text-emerald-400" : "text-red-400"}`}
                >
                  {s.trendUp ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
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
