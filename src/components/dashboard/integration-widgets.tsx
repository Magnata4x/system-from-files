import { Link } from "@tanstack/react-router";
import { Brain, Shield, Cpu, Sparkles, ArrowRight, Activity } from "lucide-react";
import { getEffectiveMode, isBot4xCircuitBreakerTriggered, useBot4xStore } from "@/lib/bot4x-store";
import { useDashboardStore } from "@/lib/dashboard-store";
import { useDnaProfile } from "@/hooks/useDnaProfile";
import { useDnaStats } from "@/hooks/useDnaStats";
import { useSentiment } from "@/hooks/useSentiment";
import { useBackendAuth } from "@/hooks/useBackendAuth";
import { DataStatusBadge } from "./data-status";

function Card(p: {
  title: string;
  icon: typeof Brain;
  accent: string;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="size-7 rounded-md flex items-center justify-center"
            style={{ color: p.accent }}
          >
            <p.icon className="size-4" />
          </div>
          <h3 className="text-[13px] font-medium">{p.title}</h3>
        </div>
        <Link to={p.to} className="text-[11px] text-[var(--brand-cyan)]">
          Ver mais <ArrowRight className="size-3 inline" />
        </Link>
      </div>
      <div className="min-h-[68px]">{p.children}</div>
    </div>
  );
}
function Status({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: boolean;
  children: React.ReactNode;
}) {
  if (loading)
    return (
      <div className="rounded-lg border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">
        Carregando dados reais…
      </div>
    );
  if (error)
    return (
      <div className="rounded-lg border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">
        Fonte real indisponível no momento.
      </div>
    );
  return <>{children}</>;
}
export function DnaTraderWidget() {
  const { userId } = useBackendAuth();
  const { data, isLoading, isError, isStale, dataUpdatedAt } = useDnaProfile(userId);
  const { data: stats, isLoading: statsLoading, isError: statsError, isStale: statsStale, dataUpdatedAt: statsUpdatedAt } = useDnaStats();
  const hasProfile = data?.hasProfile === true;
  const status = isLoading || statsLoading ? "loading" : isError || statsError ? "unavailable" : isStale || statsStale ? "stale" : "ok";
  const updatedAt = Math.max(dataUpdatedAt || 0, statsUpdatedAt || 0) || null;
  return (
    <Card title="DNA Trader" icon={Brain} accent="#378ADD" to="/dna-trader">
      <Status loading={isLoading || statsLoading} error={isError || statsError}>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">
              {hasProfile
                ? String(data?.tradingStyle ?? "—") + " · win rate " + (data?.avgWinRate == null ? "—" : data.avgWinRate.toFixed(1) + "%")
                : "Perfil DNA indisponível."}
            </div>
            <DataStatusBadge source="DNA · backend" updatedAt={updatedAt} status={status} />
          </div>
          {hasProfile ? (
            <>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <MiniMetric label="Consist." value={data?.consistency} />
                <MiniMetric label="Discipl." value={data?.discipline} />
                <MiniMetric label="Risco" value={data?.riskControl} />
              </div>
              {stats?.hasData ? (
                <div className="text-[10px] text-muted-foreground">
                  {stats.totalTrades} operações · {stats.bestPair ?? "—"}
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground">Sem histórico de operações suficiente.</div>
              )}
            </>
          ) : (
            <div className="text-[11px] text-muted-foreground">Nenhum perfil calculado. Nenhum dado fictício é exibido.</div>
          )}
        </div>
      </Status>
    </Card>
  );
}
export function ManipulationWidget() {
  const alerts = useDashboardStore((s) => s.manipAlerts);
  const loading = useDashboardStore((s) => s.manipLoading);
  const error = useDashboardStore((s) => s.manipError);
  const stale = useDashboardStore((s) => s.manipStale);
  const updatedAt = useDashboardStore((s) => s.manipUpdatedAt);
  const high = alerts.filter((a) => a.severity === "HIGH").length;
  return (
    <Card title="Manipulation" icon={Shield} accent="#E24B4A" to="/manipulation">
      <Status loading={loading} error={!!error && alerts.length === 0}>
        <DataStatusBadge
          source="Manipulation · backend"
          updatedAt={updatedAt}
          status={loading && alerts.length === 0 ? "loading" : error && alerts.length === 0 ? "unavailable" : stale ? "stale" : "ok"}
        />
        <div className="space-y-2">
          <div className="text-[11px] text-muted-foreground">
            {alerts.length ? `${alerts.length} alertas ativos` : "Nenhum alerta ativo"}
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-[#E24B4A]">{high} HIGH</span>
            {alerts[0] && (
              <span className="text-muted-foreground truncate">
                {alerts[0].asset} · {alerts[0].type}
              </span>
            )}
          </div>
        </div>
      </Status>
    </Card>
  );
}
export function SentimentWidget() {
  const { data, isLoading, isError, isStale, dataUpdatedAt } = useSentiment();
  const sentimentStatus = isLoading ? "loading" : isError ? "unavailable" : isStale ? "stale" : "ok";
  return (
    <Card title="Sentiment" icon={Sparkles} accent="#7F77DD" to="/sentiment">
      <Status loading={isLoading} error={isError}>
        <DataStatusBadge
          source="Sentiment · mercado"
          updatedAt={data?.updatedAt ? new Date(data.updatedAt) : dataUpdatedAt || null}
          status={sentimentStatus}
        />
        {data ? (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-semibold tabular-nums">{data.overall}</span>
              <span className="text-[11px] text-muted-foreground">/ 100</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {data.bullBear.bull.toFixed(0)}% bullish · {data.bullBear.bear.toFixed(0)}% bearish ·{" "}
              {data.advancers} em alta
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">Sem leitura de sentimento.</div>
        )}
      </Status>
    </Card>
  );
}
export function Bot4xSummaryWidget() {
  const mode = useBot4xStore((s) => s.mode);
  const profile = useBot4xStore((s) => s.profile);
  const leverage = useBot4xStore((s) => s.leverage);
  const pnl = useDashboardStore((s) => s.risk?.dailyPnlPct);
  const riskAvailable = pnl != null;
  const breaker = pnl != null ? isBot4xCircuitBreakerTriggered(pnl) : false;
  const effectiveMode = getEffectiveMode(mode);
  const realMode = effectiveMode === "REAL";
  return (
    <Card title="Bot4x" icon={Cpu} accent="#1D9E75" to="/bot4x">
      <div className="flex items-center gap-3">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">{profile}</div>
          <div className="font-semibold">{effectiveMode}</div>
          <div className="text-[11px] text-muted-foreground">{leverage}×</div>
        </div>
        <div>
          <div
            className="text-[18px] font-semibold"
            style={{ color: breaker ? "#E24B4A" : pnl >= 0 ? "#1D9E75" : "#EF9F27" }}
          >
            {riskAvailable ? (pnl >= 0 ? "+" : "") + pnl.toFixed(2) + "%" : "—"}
          </div>
          <div className={`mt-1 flex items-center gap-1.5 text-[10.5px] ${breaker ? "text-[#E24B4A] font-medium" : realMode ? "text-[#1D9E75] font-medium" : "text-muted-foreground"}`}>
            <Activity className="size-3" />
            {breaker ? "Disjuntor ativo" : !riskAvailable ? "Risco indisponível" : realMode ? "Execução REAL" : "Circuit OK"}
          </div>
        </div>
      </div>
    </Card>
  );
}
export function RiskRegimeWidget() {
  const risk = useDashboardStore((s) => s.risk);
  const regime = useDashboardStore((s) => s.regime);
  const riskError = useDashboardStore((s) => s.riskError);
  const regimeError = useDashboardStore((s) => s.regimeError);
  const riskStale = useDashboardStore((s) => s.riskStale);
  const regimeStale = useDashboardStore((s) => s.regimeStale);
  const riskUpdatedAt = useDashboardStore((s) => s.riskUpdatedAt);
  const regimeUpdatedAt = useDashboardStore((s) => s.regimeUpdatedAt);
  const loading = !risk && !riskError && !regime && !regimeError;
  const status = loading ? "loading" : riskError || regimeError ? "unavailable" : riskStale || regimeStale ? "stale" : "ok";
  const updatedAt = Math.max(riskUpdatedAt || 0, regimeUpdatedAt || 0) || null;
  return (
    <Card title="Risk & Regime" icon={Activity} accent="#EF9F27" to="/bot4x">
      <div className="space-y-2">
        <DataStatusBadge source="Backend · risk/regime" updatedAt={updatedAt} status={status} />
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Risk</span>
          <span className="font-medium">{risk?.level ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">{regime?.pair ?? "BTC/USDT"} regime</span>
          <span className="font-medium">{regime?.regime ?? "—"}</span>
        </div>
      </div>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 px-2 py-1">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="text-[11px] font-medium tabular-nums">{value == null ? "—" : value.toFixed(0)}</div>
    </div>
  );
}
export function IntegrationWidgets() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <DnaTraderWidget />
      <ManipulationWidget />
      <SentimentWidget />
      <Bot4xSummaryWidget />
      <RiskRegimeWidget />
    </div>
  );
}
