import { Link } from "@tanstack/react-router";
import { Brain, Shield, Cpu, Sparkles, ArrowRight, Activity } from "lucide-react";
import { useBot4xStore } from "@/lib/bot4x-store";
import { useDashboardStore } from "@/lib/dashboard-store";
import { useDnaProfile } from "@/hooks/useDnaProfile";
import { useDnaStats } from "@/hooks/useDnaStats";
import { useSentiment } from "@/hooks/useSentiment";

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
  const { data, isLoading, isError } = useDnaProfile("me");
  const { data: stats } = useDnaStats();
  return (
    <Card title="DNA Trader" icon={Brain} accent="#378ADD" to="/dna-trader">
      <Status loading={isLoading} error={isError}>
        {data ? (
          <div className="space-y-2">
            <div className="text-[11px] text-muted-foreground">
              {String(data.tradingStyle ?? "moderate")} · win rate{" "}
              {Number(data.avgWinRate ?? 0).toFixed(1)}%
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              <MiniMetric label="Consist." value={Number(data.consistency ?? 0)} />
              <MiniMetric label="Discipl." value={Number(data.discipline ?? 0)} />
              <MiniMetric label="Risco" value={Number(data.riskControl ?? 0)} />
            </div>
            {stats?.hasData && (
              <div className="text-[10px] text-muted-foreground">
                {stats.totalTrades} operações · {stats.bestPair ?? "sem par destaque"}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">Sem perfil DNA disponível.</div>
        )}
      </Status>
    </Card>
  );
}
export function ManipulationWidget() {
  const alerts = useDashboardStore((s) => s.manipAlerts);
  const loading = useDashboardStore((s) => s.manipLoading);
  const error = useDashboardStore((s) => s.manipError);
  const high = alerts.filter((a) => a.severity === "HIGH").length;
  return (
    <Card title="Manipulation" icon={Shield} accent="#E24B4A" to="/manipulation">
      <Status loading={loading} error={!!error}>
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
  const { data, isLoading, isError } = useSentiment();
  return (
    <Card title="Sentiment" icon={Sparkles} accent="#7F77DD" to="/sentiment">
      <Status loading={isLoading} error={isError}>
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
  const pnl = useBot4xStore((s) => s.dailyPnlPct);
  return (
    <Card title="Bot4x" icon={Cpu} accent="#1D9E75" to="/bot4x">
      <div className="flex items-center gap-3">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">{profile}</div>
          <div className="font-semibold">{mode}</div>
          <div className="text-[11px] text-muted-foreground">{leverage}×</div>
        </div>
        <div>
          <div className="text-[18px] font-semibold">
            {pnl >= 0 ? "+" : ""}
            {pnl.toFixed(2)}%
          </div>
          <div className="text-[10px] text-muted-foreground">
            <Activity className="size-3 inline" /> Status real do Bot4x
          </div>
        </div>
      </div>
    </Card>
  );
}
function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 px-2 py-1">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="text-[11px] font-medium tabular-nums">{value.toFixed(0)}</div>
    </div>
  );
}
export function IntegrationWidgets() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <DnaTraderWidget />
      <ManipulationWidget />
      <SentimentWidget />
      <Bot4xSummaryWidget />
    </div>
  );
}
