import { Link } from "@tanstack/react-router";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useDashboardStore } from "@/lib/dashboard-store";

export function AnnouncementBanner() {
  const alerts = useDashboardStore((s) => s.manipAlerts);
  const loading = useDashboardStore((s) => s.manipLoading);
  const risk = useDashboardStore((s) => s.risk);
  const regime = useDashboardStore((s) => s.regime);
  const high = alerts.filter((a) => a.severity === "HIGH");
  if (loading && alerts.length === 0) return null;
  if (!alerts.length && !risk && !regime) return null;
  const alert = high[0] ?? alerts[0];
  const riskLevel = risk?.level?.toUpperCase();
  const tone = alert?.severity === "HIGH" || riskLevel === "HIGH" ? "critical" : "normal";
  return (
    <div className="border-b border-border bg-secondary/50 px-4 py-2">
      <div className="max-w-[1600px] mx-auto flex items-center gap-3 text-[11px]">
        {tone === "critical" ? (
          <ShieldAlert className="size-4 text-[#E24B4A] shrink-0" />
        ) : (
          <AlertTriangle className="size-4 text-[#EF9F27] shrink-0" />
        )}
        <div className="min-w-0 flex-1 truncate">
          {alert ? (
            <>
              <span className="font-semibold">
                {alert.type} · {alert.asset}
              </span>
              <span className="text-muted-foreground"> · {alert.desc}</span>
            </>
          ) : (
            <>
              <span className="font-semibold">Risk {riskLevel ?? "UNKNOWN"}</span>
              {regime?.regime && (
                <span className="text-muted-foreground">
                  {" "}
                  · regime {regime.regime}
                  {regime.pair ? ` · ${regime.pair}` : ""}
                </span>
              )}
            </>
          )}
        </div>
        <Link
          to={alert ? "/manipulation" : "/bot4x"}
          className="text-[var(--brand-cyan)] hover:underline shrink-0"
        >
          {alert ? "Ver alerta" : "Ver risco"}
        </Link>
      </div>
    </div>
  );
}
