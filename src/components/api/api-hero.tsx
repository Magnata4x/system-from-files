import { KeyRound, BookOpen, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATS = [
  { label: "Uptime", value: "99.9%" },
  { label: "Latency", value: "<50ms" },
  { label: "Signals/day", value: "200+" },
  { label: "Exchanges", value: "5" },
];

export function ApiHero() {
  return (
    <section className="rounded-xl border border-border bg-gradient-to-br from-card/60 via-card/40 to-transparent p-6 md:p-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          All systems operational
        </span>
        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
          <Activity className="size-3" /> v1.4.2
        </span>
      </div>
      <h1 className="text-[26px] md:text-[32px] font-semibold tracking-tight max-w-2xl">
        Integrate AISignalRadar signals into your own systems
      </h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-xl">
        REST + WebSocket access to live signals, AI scores, sentiment, and manipulation alerts across 5 major exchanges.
      </p>
      <div className="flex flex-wrap gap-2 mt-5">
        <Button className="bg-[#378ADD] hover:bg-[#2d74bd] text-white">
          <KeyRound className="size-4 mr-1.5" /> Get API key
        </Button>
        <Button variant="outline">
          <BookOpen className="size-4 mr-1.5" /> View documentation
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border/60">
        {STATS.map((s) => (
          <div key={s.label}>
            <div className="text-xl font-semibold tabular-nums">{s.value}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
