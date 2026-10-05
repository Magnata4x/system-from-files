import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useDashboardStore } from "@/lib/dashboard-store";

export function AnnouncementBanner() {
  const alerts = useDashboardStore((s) => s.manipAlerts);
  const loading = useDashboardStore((s) => s.manipLoading);
  const active = alerts.filter((a) => a.severity === "HIGH" || a.severity === "MEDIUM");

  if (loading && alerts.length === 0) return null;
  if (active.length === 0) return null;

  const high = active.filter((a) => a.severity === "HIGH");
  const alert = high[0] ?? active[0];

  return (
    <div className="border-b border-border bg-secondary/50 px-4 py-2">
      <div className="max-w-[1600px] mx-auto flex items-center gap-3 text-[11px]">
        <ShieldAlert className="size-4 text-[#E24B4A] shrink-0" />
        <div className="min-w-0 flex-1 truncate">
          <span className="font-semibold">
            {active.length} alerta{active.length === 1 ? "" : "s"} de manipulação ativo{active.length === 1 ? "" : "s"}
          </span>
          {alert && (
            <span className="text-muted-foreground">
              {" "}· {alert.type} · {alert.asset}
            </span>
          )}
        </div>
        <Link to="/manipulation" className="text-[var(--brand-cyan)] hover:underline shrink-0">
          Ver detalhes
        </Link>
      </div>
    </div>
  );
}
