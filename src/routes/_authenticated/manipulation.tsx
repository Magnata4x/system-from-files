import { createFileRoute, useNavigate, retainSearchParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { AlertBanner } from "@/components/manipulation/alert-banner";
import { InstitutionalHeatmap } from "@/components/manipulation/institutional-heatmap";
import { AlertsFeed } from "@/components/manipulation/alerts-feed";
import { SmartMoney } from "@/components/manipulation/smart-money";
import { LiquidityMap } from "@/components/manipulation/liquidity-map";
import { AggressionAnalysis } from "@/components/manipulation/aggression-analysis";
import { HistoricalLog } from "@/components/manipulation/historical-log";
import { ALERTS as MOCK_ALERTS, type Alert } from "@/lib/manipulation-data";
import {
  manipulationAdapter,
  mapAlert,
  type BackendManipulationAlert,
} from "@/adapters/backend/manipulation.adapter";
import { backendWs } from "@/adapters/backend/ws-client";

const PAGE_SIZES = [10, 20, 50, 100];

type ManipulationSearch = { symbol: string; riskLevel: string; limit: number };

export const Route = createFileRoute("/_authenticated/manipulation")({
  validateSearch: (search: Record<string, unknown>): ManipulationSearch => {
    const rawLimit = Number(search["limit"]);
    return {
      symbol: typeof search["symbol"] === "string" ? search["symbol"].toUpperCase() : "",
      riskLevel: typeof search["riskLevel"] === "string" ? search["riskLevel"].toUpperCase() : "",
      limit: Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 20,
    };
  },
  search: { middlewares: [retainSearchParams(["symbol", "riskLevel", "limit"])] },
  head: () => ({
    meta: [
      { title: "Manipulation Radar — AISignalRadar" },
      { name: "description", content: "Institutional surveillance: stop hunts, liquidity grabs, spoofing and smart-money order flow detection in real time." },
    ],
  }),
  component: ManipulationPage,
});

function ManipulationPage() {
  const [dismissed, setDismissed] = useState(false);
  const { symbol, riskLevel, limit } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const setFilters = (patch: Partial<ManipulationSearch>) =>
    navigate({
      search: (prev: ManipulationSearch): ManipulationSearch => ({ ...prev, ...patch }),
    });

  const alertsKey = useMemo(
    () => ["manipulation-alerts", symbol, riskLevel, limit] as const,
    [symbol, riskLevel, limit],
  );

  const {
    data: liveAlerts,
    isPending: alertsPending,
    isFetching: alertsFetching,
    error: alertsError,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: alertsKey,
    queryFn: () =>
      manipulationAdapter.getAlerts({
        symbol: symbol || undefined,
        riskLevel: riskLevel || undefined,
        limit,
      }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
    // Mantém a lista anterior enquanto novos filtros/limit carregam (sem "pular" o scroll).
    placeholderData: (prev: Alert[] | undefined) => prev,
  });

  const snapshotPair = symbol || "BTCUSDT";
  const {
    data: snapshot,
    error: snapshotError,
    isPending: snapshotPending,
    refetch: refetchSnapshot,
  } = useQuery({
    queryKey: ["manipulation-snapshot", snapshotPair],
    queryFn: () => manipulationAdapter.getSnapshot(snapshotPair),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  // Realtime: novos alertas chegam pelo mesmo socket dos sinais (namespace /signals).
  useEffect(() => {
    let active = true;
    void backendWs.connect("/signals");
    const off = backendWs.on("manipulation:alert", (payload) => {
      if (!active) return;
      const raw = payload as BackendManipulationAlert;
      if (!raw?.id) return;
      if (symbol && raw.symbol !== symbol) return;
      if (riskLevel && String(raw.riskLevel).toUpperCase() !== riskLevel) return;
      const mapped = mapAlert(raw);
      queryClient.setQueryData<Alert[]>(alertsKey, (prev) => {
        const list = prev ?? [];
        return [mapped, ...list.filter((a) => a.id !== mapped.id)].slice(0, limit);
      });
    });
    return () => {
      active = false;
      off();
    };
  }, [queryClient, alertsKey, symbol, riskLevel, limit]);

  const hasBackendAlerts = Boolean(liveAlerts && liveAlerts.length > 0);
  const isEmpty = Boolean(liveAlerts && liveAlerts.length === 0);
  const alerts = hasBackendAlerts ? liveAlerts! : alertsError || isEmpty ? [] : MOCK_ALERTS;
  const activeAssets = Array.from(new Set(alerts.map((a) => a.asset)));
  const canLoadMore = hasBackendAlerts && liveAlerts!.length >= limit && limit < 200;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5">
          <header>
            <h1 className="text-xl font-semibold tracking-tight">Manipulation Radar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time institutional surveillance — stop hunts, spoofing, liquidity sweeps, and smart-money flow.
            </p>
          </header>

          {!dismissed && alerts.length > 0 && (
            <AlertBanner count={alerts.length} assets={activeAssets} onDismiss={() => setDismissed(true)} />
          )}

          <div className="rounded-xl border border-border bg-card/40 p-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              Symbol
              <input
                value={symbol}
                onChange={(e) => setFilters({ symbol: e.target.value.toUpperCase() })}
                placeholder="BTCUSDT"
                className="h-9 w-40 rounded-md border border-border bg-background px-2 text-sm text-foreground normal-case tracking-normal"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              Risk level
              <select
                value={riskLevel}
                onChange={(e) => setFilters({ riskLevel: e.target.value })}
                className="h-9 w-36 rounded-md border border-border bg-background px-2 text-sm text-foreground normal-case tracking-normal"
              >
                <option value="">All</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              Limit
              <select
                value={String(limit)}
                onChange={(e) => setFilters({ limit: Number(e.target.value) })}
                className="h-9 w-28 rounded-md border border-border bg-background px-2 text-sm text-foreground normal-case tracking-normal"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            {(symbol || riskLevel || limit !== 20) && (
              <button
                onClick={() => setFilters({ symbol: "", riskLevel: "", limit: 20 })}
                className="h-9 rounded-md border border-border px-3 text-xs text-muted-foreground hover:bg-foreground/5"
              >
                Reset
              </button>
            )}
            {alertsFetching && !alertsPending && (
              <span className="text-[11px] text-muted-foreground">Atualizando…</span>
            )}
          </div>

          {snapshotError ? (
            <ErrorPanel
              title={`Não foi possível carregar o snapshot de ${snapshotPair}`}
              message={(snapshotError as Error).message}
              onRetry={() => void refetchSnapshot()}
            />
          ) : !snapshotPending && !snapshot ? (
            <EmptyPanel message={`Sem snapshot disponível para ${snapshotPair}.`} />
          ) : snapshot ? (
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold">Snapshot — {snapshot.symbol}</h2>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(snapshot.updatedAt).toLocaleTimeString()}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded border border-border">
                  RISK {String(snapshot.riskLevel).toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Alerts 24h" value={String(snapshot.last24h?.alertCount ?? 0)} />
                <Stat label="Avg score 24h" value={String(Math.round(snapshot.last24h?.avgScore ?? 0))} />
                <Stat label="Max score 24h" value={String(Math.round(snapshot.last24h?.maxScore ?? 0))} />
                <Stat
                  label="Latest alert"
                  value={
                    snapshot.latestAlert
                      ? `${snapshot.latestAlert.patterns?.[0] ?? "—"} · ${Math.round(snapshot.latestAlert.score)}`
                      : "—"
                  }
                />
              </div>
            </div>
          ) : null}

          <InstitutionalHeatmap />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 space-y-3">
              {alertsError ? (
                <ErrorPanel
                  title="Não foi possível carregar os alertas"
                  message={(alertsError as Error).message}
                  onRetry={() => void refetchAlerts()}
                />
              ) : isEmpty ? (
                <EmptyPanel
                  message={
                    symbol || riskLevel
                      ? "Nenhum alerta encontrado para os filtros aplicados."
                      : "Nenhum alerta de manipulação no momento."
                  }
                />
              ) : (
                <>
                  <AlertsFeed alerts={alerts} />
                  {canLoadMore && (
                    <button
                      onClick={() =>
                        setFilters({
                          limit: Math.min(
                            200,
                            PAGE_SIZES.find((n) => n > limit) ?? limit * 2,
                          ),
                        })
                      }
                      disabled={alertsFetching}
                      className="w-full h-10 rounded-lg border border-border text-xs text-muted-foreground hover:bg-foreground/5 disabled:opacity-50"
                    >
                      {alertsFetching ? "Carregando…" : "Carregar mais alertas"}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="lg:col-span-2">
              <SmartMoney />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <LiquidityMap />
            <AggressionAnalysis />
          </div>

          <HistoricalLog />
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-1 truncate">{value}</div>
    </div>
  );
}

function ErrorPanel({
  title,
  message,
  onRetry,
}: {
  title: string;
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
      <div className="text-sm font-semibold text-destructive">{title}</div>
      {message && <p className="text-xs text-muted-foreground mt-1 break-words">{message}</p>}
      <button
        onClick={onRetry}
        className="mt-3 h-8 rounded-md border border-border px-3 text-xs hover:bg-foreground/5"
      >
        Tentar novamente
      </button>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/20 p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
