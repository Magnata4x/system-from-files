import { ALERTS, type Alert, type Severity } from "@/lib/manipulation-data";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ScoreRing } from "./score-ring";

const sevStyle: Record<Severity, string> = {
  HIGH: "bg-red-500/15 text-red-300 border-red-500/40",
  MEDIUM: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  LOW: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
};

export function AlertsFeed({ alerts }: { alerts?: Alert[] } = {}) {
  const list = alerts && alerts.length ? alerts : ALERTS;
  const [open, setOpen] = useState<string | null>(list[0]?.id ?? null);
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">Active alerts</h2>
          <p className="text-xs text-muted-foreground">Live institutional manipulation events</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{list.length} active</span>
      </div>

      <div className="space-y-2.5">
        {list.map((a) => {
          const isOpen = open === a.id;
          return (
            <div key={a.id} className={`rounded-lg border ${sevStyle[a.severity]} bg-card/60 overflow-hidden`}>
              <button
                onClick={() => setOpen(isOpen ? null : a.id)}
                className="w-full text-left p-3.5 flex items-start gap-3 hover:bg-white/[0.02]"
              >
                <ScoreRing score={a.confidence} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sevStyle[a.severity]}`}>
                      {a.severity}
                    </span>
                    <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-foreground/10">
                      {a.type}
                    </span>
                    <span className="text-sm font-medium">{a.asset}</span>
                    <span className="text-xs text-muted-foreground">{a.tf}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{a.ago}</span>
                  </div>
                  <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">{a.desc}</p>
                  <p className="text-[11px] italic text-muted-foreground mt-1">→ {a.action}</p>
                </div>
                <ChevronDown
                  className={`size-4 text-muted-foreground mt-1 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="px-3.5 pb-3.5 pt-1 text-xs text-muted-foreground border-t border-border/50 leading-relaxed">
                  {a.detail}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
