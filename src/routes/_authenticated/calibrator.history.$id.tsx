import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  calibratorHistoryStore,
  type CalibratorHistoryEntry,
} from "@/lib/calibrator-history-store";
import {
  ArrowLeft,
  Play,
  Trash2,
  Activity,
  TrendingUp,
  TrendingDown,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/calibrator/history/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da simulação — Calibrator" },
      {
        name: "description",
        content:
          "Visualização detalhada de uma simulação do Calibrador, com parâmetros, métricas, equity curve e logs.",
      },
    ],
  }),
  component: CalibratorHistoryDetailPage,
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">
      Simulação não encontrada.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-destructive">
      Erro ao carregar simulação: {error.message}
    </div>
  ),
});

function CalibratorHistoryDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const [entry, setEntry] = useState<CalibratorHistoryEntry | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (!userId) {
        setEntry(undefined);
        return;
      }
      calibratorHistoryStore.get(userId, id).then((e) => {
        if (alive) setEntry(e);
      });
    };
    refresh();
    const unsub = calibratorHistoryStore.subscribe(refresh);
    return () => {
      alive = false;
      unsub();
    };
  }, [id, userId]);

  if (!entry) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <TopBar />
        <div className="flex">
          <LeftSidebar />
          <main className="flex-1 min-w-0 p-5">
            <Card className="p-10 text-center text-sm text-muted-foreground space-y-3">
              <p>Simulação não encontrada no histórico local.</p>
              <Link to="/calibrator/history">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="size-4 mr-2" /> Voltar ao histórico
                </Button>
              </Link>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const pos = entry.result.pnl >= 0;
  const full = entry.fullResult;

  function rerun() {
    navigate({
      to: "/calibrator",
      search: {
        profile: entry!.params.profile,
        symbol: entry!.params.symbol,
        period_days: entry!.params.periodDays,
        initial_balance: entry!.params.initialBalance,
        leverage: entry!.params.leverage,
        autorun: 1,
      },
    });
  }

  function remove() {
    if (!userId) return;
    if (!confirm("Remover esta simulação do histórico?")) return;
    calibratorHistoryStore.remove(userId, entry!.id);
    navigate({ to: "/calibrator/history" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to="/calibrator/history">
                <Button variant="ghost" size="icon" className="size-8">
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Simulação — {entry.params.symbol}{" "}
                  <span className="text-muted-foreground font-normal text-base capitalize">
                    · {entry.params.profile}
                  </span>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(entry.createdAt).toLocaleString()} · ID {entry.id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={rerun}>
                <Play className="size-4 mr-2" /> Reexecutar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={remove}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4 mr-2" /> Remover
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="p-5 lg:col-span-1 space-y-3">
              <h2 className="text-sm font-semibold">Parâmetros</h2>
              <KV k="Perfil" v={entry.params.profile} />
              <KV k="Símbolo" v={entry.params.symbol} />
              <KV k="Período" v={`${entry.params.periodDays} dias`} />
              <KV
                k="Saldo inicial"
                v={`${entry.params.initialBalance.toLocaleString()} USDT`}
              />
              {entry.userId && <KV k="User ID" v={entry.userId} />}
              <KV k="Executado em" v={new Date(entry.createdAt).toLocaleString()} />
            </Card>

            <div className="lg:col-span-2 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric
                  label="Trades"
                  value={String(entry.result.trades)}
                  icon={<Activity className="size-4" />}
                />
                <Metric
                  label="Win Rate"
                  value={`${(entry.result.winRate * 100).toFixed(1)}%`}
                  tone={entry.result.winRate >= 0.5 ? "pos" : "neg"}
                />
                <Metric
                  label="PnL"
                  value={`${pos ? "+" : ""}${entry.result.pnl.toFixed(2)} (${entry.result.pnlPct.toFixed(2)}%)`}
                  tone={pos ? "pos" : "neg"}
                  icon={
                    pos ? (
                      <TrendingUp className="size-4" />
                    ) : (
                      <TrendingDown className="size-4" />
                    )
                  }
                />
                <Metric
                  label="Max Drawdown"
                  value={`${(entry.result.maxDrawdown * 100).toFixed(2)}%`}
                  tone="neg"
                />
                <Metric label="Sharpe" value={entry.result.sharpe.toFixed(2)} />
                {typeof entry.result.wins === "number" && (
                  <Metric label="Wins" value={String(entry.result.wins)} tone="pos" />
                )}
                {typeof entry.result.losses === "number" && (
                  <Metric
                    label="Losses"
                    value={String(entry.result.losses)}
                    tone="neg"
                  />
                )}
              </div>

              {full?.equityCurve?.length ? (
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Equity curve</h3>
                    <span className="text-xs text-muted-foreground">
                      {full.equityCurve.length} pontos
                    </span>
                  </div>
                  <EquitySparkline points={full.equityCurve} />
                </Card>
              ) : (
                <Card className="p-5 text-xs text-muted-foreground">
                  Equity curve indisponível para esta simulação (registro antigo).
                  Reexecute para gerar novamente.
                </Card>
              )}

              {full && (full.commentary || full.dnaFeedback.patternDetected) && (
                <Card className="p-5 space-y-3">
                  <h3 className="text-sm font-semibold">DNA feedback</h3>
                  {full.dnaFeedback.patternDetected && (
                    <Row k="Padrão detectado" v={full.dnaFeedback.patternDetected} />
                  )}
                  {full.dnaFeedback.correction && (
                    <Row k="Correção sugerida" v={full.dnaFeedback.correction} />
                  )}
                  {full.dnaFeedback.expectedImprovement && (
                    <Row
                      k="Melhoria esperada"
                      v={full.dnaFeedback.expectedImprovement}
                    />
                  )}
                  {full.commentary && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-3">
                      {full.commentary}
                    </p>
                  )}
                </Card>
              )}

              <Card className="p-5 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Log bruto</h3>
                </div>
                <pre className="text-[11px] leading-relaxed bg-muted/40 rounded-md p-3 overflow-auto max-h-96 text-muted-foreground">
{JSON.stringify(full?.raw ?? { params: entry.params, result: entry.result }, null, 2)}
                </pre>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-xs gap-3 border-b border-border/50 last:border-0 pb-1.5 last:pb-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground truncate text-right">{v}</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-xs">
      <span className="text-muted-foreground">{k}: </span>
      <span className="text-foreground">{v}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  icon?: React.ReactNode;
}) {
  const color =
    tone === "pos"
      ? "text-emerald-500"
      : tone === "neg"
        ? "text-rose-500"
        : "text-foreground";
  return (
    <Card className="p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className={`text-lg font-semibold mt-1 ${color}`}>{value}</div>
    </Card>
  );
}

function EquitySparkline({ points }: { points: { t: string; equity: number }[] }) {
  if (!points.length) {
    return <div className="text-xs text-muted-foreground">Sem dados de equity.</div>;
  }
  const w = 600;
  const h = 160;
  const pad = 6;
  const values = points.map((p) => p.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(points.length - 1, 1);
  const path = points
    .map((p, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((p.equity - min) / range) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const positive = points[points.length - 1].equity >= points[0].equity;
  const stroke = positive ? "rgb(16 185 129)" : "rgb(244 63 94)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}
