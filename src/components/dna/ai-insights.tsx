import { INSIGHTS } from "@/lib/dna-data";
import { useDnaStats } from "@/hooks/useDnaStats";
import {
  TrendingUp,
  TrendingDown,
  Scissors,
  Flame,
  CalendarClock,
  ShieldCheck,
  Newspaper,
  Sparkles,
  Target,
} from "lucide-react";

const ICONS = {
  TrendingUp,
  TrendingDown,
  Scissors,
  Flame,
  CalendarClock,
  ShieldCheck,
  Newspaper,
  Sparkles,
  Target,
} as const;

const TONE = {
  good: { border: "border-l-emerald-500", icon: "text-emerald-400", bg: "bg-emerald-500/5" },
  bad: { border: "border-l-red-500", icon: "text-red-400", bg: "bg-red-500/5" },
  warn: { border: "border-l-amber-500", icon: "text-amber-400", bg: "bg-amber-500/5" },
};

export function AiInsights() {
  const { data, isLoading } = useDnaStats();
  const live = data?.hasData && data.insights.length > 0;
  const items = live ? data!.insights : INSIGHTS;

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">AI behavioral insights</h2>
          <p className="text-xs text-muted-foreground">
            {live
              ? `Padrões detectados em ${data!.totalTrades} operações reais.`
              : isLoading
                ? "Analisando seu histórico…"
                : "Sem histórico suficiente — exemplo demonstrativo."}
          </p>
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
            live
              ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
              : "border-border text-muted-foreground bg-muted/20"
          }`}
        >
          {live ? "ao vivo" : "demo"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((ins) => {
          const Icon = ICONS[ins.icon as keyof typeof ICONS] ?? TrendingUp;
          const t = TONE[ins.tone];
          return (
            <div key={ins.title} className={`rounded-lg border border-border border-l-4 ${t.border} ${t.bg} p-3.5`}>
              <div className="flex items-start gap-3">
                <Icon className={`size-4 mt-0.5 shrink-0 ${t.icon}`} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{ins.title}</div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ins.desc}</p>
                  <p className="text-xs italic text-foreground/80 mt-2">→ {ins.action}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
