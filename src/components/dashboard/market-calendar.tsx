import { calendarEvents } from "@/lib/dashboard-data";
import { Calendar } from "lucide-react";

export function MarketCalendar() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[15px] font-medium text-foreground">Market calendar</h3>
        <span className="text-[11px] text-muted-foreground">High impact</span>
      </div>
      <div className="space-y-2">
        {calendarEvents.map((e) => (
          <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary transition-colors">
            <div className="size-8 rounded-md flex items-center justify-center" style={{ background: "color-mix(in oklab, #E24B4A 18%, transparent)", color: "#E24B4A" }}>
              <Calendar className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-foreground truncate">{e.title}</div>
              <div className="text-[11px] text-muted-foreground tabular-nums">{e.date}</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase" style={{ background: "color-mix(in oklab, #E24B4A 18%, transparent)", color: "#E24B4A" }}>High</span>
          </div>
        ))}
      </div>
    </div>
  );
}
