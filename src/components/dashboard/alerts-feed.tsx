import { alerts, type Alert } from "@/lib/dashboard-data";

const colors: Record<Alert["color"], string> = {
  red: "#E24B4A",
  blue: "#378ADD",
  amber: "#EF9F27",
  purple: "#7F77DD",
  green: "#1D9E75",
};

const dots: Record<Alert["color"], string> = {
  red: "🔴", blue: "🔵", amber: "🟡", purple: "🟣", green: "🟢",
};

export function AlertsFeed() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[15px] font-medium text-foreground">Recent alerts</h3>
        <button className="text-[12px] text-[var(--brand-cyan)] hover:underline">View all</button>
      </div>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary transition-colors cursor-pointer"
            style={{ borderLeft: `3px solid ${colors[a.color]}` }}
          >
            <span className="text-base">{dots[a.color]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: colors[a.color] }}>{a.type}</span>
                <span className="text-[13px] text-foreground">·</span>
                <span className="text-[13px] font-medium text-foreground">{a.asset}</span>
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
