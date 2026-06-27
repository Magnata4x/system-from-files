import { Bell, Activity, Brain, AlertTriangle } from "lucide-react";

const actions = [
  { icon: Bell, label: "New Alert", color: "#378ADD" },
  { icon: Activity, label: "All Signals", color: "#1D9E75" },
  { icon: Brain, label: "DNA Report", color: "#7F77DD" },
  { icon: AlertTriangle, label: "Manipulation", color: "#E24B4A" },
];

export function QuickActions() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full">
      <h3 className="text-[15px] font-medium text-foreground mb-3">Quick actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            className="flex flex-col items-start gap-2 p-3 rounded-lg bg-secondary/40 hover:bg-secondary transition-all hover:scale-[1.02] text-left"
          >
            <div
              className="size-8 rounded-lg flex items-center justify-center"
              style={{ background: `color-mix(in oklab, ${a.color} 18%, transparent)`, color: a.color }}
            >
              <a.icon className="size-4" />
            </div>
            <span className="text-[13px] font-medium text-foreground">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
