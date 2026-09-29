import { Button } from "@/components/ui/button";
import { Sparkles, Target, Ban, Shield, Sunrise } from "lucide-react";

const RECS = [
  { icon: Target, label: "Focus on", value: "BOS + CHoCH on 4H during London/NY overlap" },
  { icon: Ban, label: "Avoid", value: "Scalping 1m/5m (win rate below 45%)" },
  { icon: Shield, label: "Risk rule", value: "Max 1.5% per trade until consistency > 80" },
  { icon: Sunrise, label: "Best window", value: "08:00–11:00 UTC" },
];

export function AiRecommendations() {
  return (
    <div className="relative rounded-xl border border-border bg-card/60 p-5 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--brand-cyan)] to-purple-500" />
      <div className="absolute -top-20 -right-20 size-64 rounded-full bg-[var(--brand-cyan)]/10 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-4 text-[var(--brand-cyan)]" />
          <h2 className="text-sm font-semibold">AI recommendations</h2>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RECS.map((r) => {
            const Icon = r.icon;
            return (
              <li key={r.label} className="flex items-start gap-3 rounded-lg border border-border bg-background/30 p-3">
                <div className="size-8 rounded-md bg-[var(--brand-blue-deep)]/50 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-[var(--brand-cyan)]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.label}</div>
                  <div className="text-sm mt-0.5">{r.value}</div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-muted-foreground">Personalised guidance updates weekly based on your trade log.</p>
          <Button variant="outline" size="sm" className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200">
            <Sparkles className="size-3.5 mr-1.5" /> Unlock AI coaching mode
          </Button>
        </div>
      </div>
    </div>
  );
}
