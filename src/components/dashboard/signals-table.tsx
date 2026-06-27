import { useState } from "react";
import { useDashboardStore } from "@/lib/dashboard-store";
import { ScoreBadge } from "./score-badge";
import { ChevronRight } from "lucide-react";

type Filter = "ALL" | "BUY" | "SELL" | "HIGH";

export function SignalsTable() {
  const signals = useDashboardStore((s) => s.signals);
  const setSelected = useDashboardStore((s) => s.setSelectedSignal);
  const [filter, setFilter] = useState<Filter>("ALL");

  const filtered = signals.filter((s) => {
    if (filter === "ALL") return true;
    if (filter === "HIGH") return s.score >= 80;
    return s.direction === filter;
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-4 pb-3">
        <div>
          <h3 className="text-[15px] font-medium text-foreground">Top signals right now</h3>
          <p className="text-[12px] text-muted-foreground">Live institutional-grade setups</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-full bg-secondary">
          {(["ALL", "BUY", "SELL", "HIGH"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                filter === f ? "bg-card text-foreground border border-border" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "HIGH" ? "≥80" : f}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-medium py-2 px-4">Asset</th>
              <th className="text-left font-medium py-2 px-2">Dir</th>
              <th className="text-left font-medium py-2 px-2">Score</th>
              <th className="text-right font-medium py-2 px-2">Entry</th>
              <th className="text-right font-medium py-2 px-2">Stop</th>
              <th className="text-right font-medium py-2 px-2">Target</th>
              <th className="text-right font-medium py-2 px-2">R/R</th>
              <th className="text-left font-medium py-2 px-2">TF</th>
              <th className="text-left font-medium py-2 px-2">Time</th>
              <th className="py-2 px-4"></th>
            </tr>
          </thead>
          <tbody className="text-foreground tabular-nums">
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-border hover:bg-secondary/40 transition-colors">
                <td className="py-3 px-4 font-medium">{s.asset}</td>
                <td className="py-3 px-2">
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-semibold"
                    style={{
                      background: s.direction === "BUY"
                        ? "color-mix(in oklab, #1D9E75 18%, transparent)"
                        : "color-mix(in oklab, #E24B4A 18%, transparent)",
                      color: s.direction === "BUY" ? "#1D9E75" : "#E24B4A",
                    }}
                  >
                    {s.direction}
                  </span>
                </td>
                <td className="py-3 px-2"><ScoreBadge score={s.score} size="sm" /></td>
                <td className="py-3 px-2 text-right">{fmt(s.entry)}</td>
                <td className="py-3 px-2 text-right text-muted-foreground">{fmt(s.stop)}</td>
                <td className="py-3 px-2 text-right">{fmt(s.target)}</td>
                <td className="py-3 px-2 text-right">{s.rr.toFixed(1)}</td>
                <td className="py-3 px-2 text-muted-foreground">{s.tf}</td>
                <td className="py-3 px-2 text-muted-foreground">{s.time}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => setSelected(s)}
                    className="inline-flex items-center gap-1 text-[12px] text-[var(--brand-cyan)] hover:underline"
                  >
                    View <ChevronRight className="size-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return n >= 100 ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : n.toFixed(2);
}
