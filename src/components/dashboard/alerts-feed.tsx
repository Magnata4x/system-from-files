import { Link } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useDashboardStore } from "@/lib/dashboard-store";
import type { Severity } from "@/lib/manipulation-data";

const colors: Record<Severity, string> = {
  HIGH: "#E24B4A",
  MEDIUM: "#EF9F27",
  LOW: "#378ADD",
};

const dots: Record<Severity, string> = {
  HIGH: "🔴",
  MEDIUM: "🟡",
  LOW: "🔵",
};

/** Alertas reais de manipulação vindos do backend interno (/api/manipulation/alerts). */
export function AlertsFeed() {
  const alerts = useDashboardStore((s) => s.manipAlerts);
  const loading = useDashboardStore((s) => s.manipLoading);
  const error = useDashboardStore((s) => s.manipError);

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[15px] font-medium text-foreground">Recent alerts</h3>
        <Link to="/manipulation" className="text-[12px] text-[var(--brand-cyan)] hover:underline">
          View all
        </Link>
      </div>

      {loading && alerts.length === 0 ? (
        <p className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> carregando alertas…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 text-[12px] text-[#E24B4A]">
          <AlertTriangle className="size-3.5" /> {error}
        </p>
      ) : alerts.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">Nenhum alerta de manipulação no momento.</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const sev = (colors[a.severity] ? a.severity : "MEDIUM") as Severity;
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary transition-colors"
                style={{ borderLeft: `3px solid ${colors[sev]}` }}
              >
                <span className="text-base">{dots[sev]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[12px] font-semibold uppercase tracking-wider"
                      style={{ color: colors[sev] }}
                    >
                      {a.type}
                    </span>
                    <span className="text-[13px] text-foreground">·</span>
                    <span className="text-[13px] font-medium text-foreground">{a.asset}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{a.desc}</div>
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">{a.ago}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
