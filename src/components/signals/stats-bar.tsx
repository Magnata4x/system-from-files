import { selectStats, useFilteredSignals } from "@/lib/signals-store";

export function StatsBar() {
  const filtered = useFilteredSignals();
  const s = selectStats(filtered);
  const items = [
    { label: "Total", value: s.total },
    { label: "BUY", value: s.buy, color: "#1D9E75" },
    { label: "SELL", value: s.sell, color: "#E24B4A" },
    { label: "Avg score", value: s.avg },
    { label: "Institutional (≥90)", value: s.inst, color: "#7F77DD" },
    { label: "High prob", value: s.high, color: "#378ADD" },
    { label: "Expired", value: s.expired, color: "#888780" },
  ];
  return (
    <div className="flex items-center gap-5 px-5 py-2 border-b border-border bg-card/30 text-[12px] flex-wrap">
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{it.label}:</span>
          <span className="font-semibold tabular-nums" style={{ color: it.color ?? "var(--foreground)" }}>
            {it.value}
          </span>
          {i < items.length - 1 && <span className="h-3 w-px bg-border ml-3" />}
        </div>
      ))}
    </div>
  );
}
