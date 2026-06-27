import { INSIGHTS } from "@/lib/dna-data";
import { TrendingUp, Scissors, Flame, CalendarClock, ShieldCheck, Newspaper } from "lucide-react";

const ICONS = { TrendingUp, Scissors, Flame, CalendarClock, ShieldCheck, Newspaper } as const;

const TONE = {
  good: { border: "border-l-emerald-500", icon: "text-emerald-400", bg: "bg-emerald-500/5" },
  bad: { border: "border-l-red-500", icon: "text-red-400", bg: "bg-red-500/5" },
  warn: { border: "border-l-amber-500", icon: "text-amber-400", bg: "bg-amber-500/5" },
};

export function AiInsights() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">AI behavioral insights</h2>
        <p className="text-xs text-muted-foreground">Patterns detected across your last 90 days of activity.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INSIGHTS.map((ins) => {
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
