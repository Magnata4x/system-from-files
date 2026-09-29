import { HISTORY } from "@/lib/manipulation-data";
import { Check, HelpCircle, X } from "lucide-react";

function outcomeBadge(o: string) {
  if (o === "Confirmed") return <span className="inline-flex items-center gap-1 text-emerald-400"><Check className="size-3" />Confirmed</span>;
  if (o === "Unconfirmed") return <span className="inline-flex items-center gap-1 text-amber-400"><HelpCircle className="size-3" />Unconfirmed</span>;
  return <span className="inline-flex items-center gap-1 text-red-400"><X className="size-3" />False positive</span>;
}

const sev: Record<string, string> = {
  HIGH: "text-red-300",
  MEDIUM: "text-amber-300",
  LOW: "text-zinc-300",
};

export function HistoricalLog() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">Historical log</h2>
          <p className="text-xs text-muted-foreground">Past manipulation alerts and post-event outcomes</p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
          Historical accuracy: 84.2%
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-3 font-medium">Date</th>
              <th className="text-left py-2 pr-3 font-medium">Asset</th>
              <th className="text-left py-2 pr-3 font-medium">TF</th>
              <th className="text-left py-2 pr-3 font-medium">Type</th>
              <th className="text-left py-2 pr-3 font-medium">Severity</th>
              <th className="text-left py-2 pr-3 font-medium">Confidence</th>
              <th className="text-left py-2 pr-3 font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {HISTORY.map((h, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-white/[0.02]">
                <td className="py-2.5 pr-3 text-muted-foreground">{h.date}</td>
                <td className="py-2.5 pr-3 font-medium">{h.asset}</td>
                <td className="py-2.5 pr-3 text-muted-foreground">{h.tf}</td>
                <td className="py-2.5 pr-3">
                  <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-foreground/10">{h.type}</span>
                </td>
                <td className={`py-2.5 pr-3 font-semibold ${sev[h.severity]}`}>{h.severity}</td>
                <td className="py-2.5 pr-3 tabular-nums">{h.confidence}%</td>
                <td className="py-2.5 pr-3">{outcomeBadge(h.outcome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
