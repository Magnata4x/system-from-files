import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  AlertTriangle, Inbox, Loader2, Play, Square, RefreshCw, ChevronLeft, ChevronRight,
} from "lucide-react";
import { bot4xAdapter } from "@/adapters/backend/bot4x.adapter";
import { useBackendAuth } from "@/hooks/useBackendAuth";
import { fmt } from "@/lib/bot4x-data";

const PAGE_SIZES = [10, 20, 50];

export function TabExecucoes() {
  const { userId, ready } = useBackendAuth();
  const qc = useQueryClient();

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [result, setResult] = useState("all");
  const [side, setSide] = useState("all");
  const [pair, setPair] = useState("");

  const execQuery = useQuery({
    queryKey: ["bot4x", "executions", { page, limit, result, side, pair }],
    queryFn: () =>
      bot4xAdapter.executionsPage({
        limit,
        offset: page * limit,
        result,
        side,
        pair: pair.trim() ? pair.trim().toUpperCase() : "all",
      }),
    enabled: ready && !!userId,
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });

  const telemetry = useQuery({
    queryKey: ["bot4x", "telemetry"],
    queryFn: () => bot4xAdapter.telemetry(),
    enabled: ready && !!userId,
    refetchInterval: 10_000,
  });

  const toggle = useMutation({
    mutationFn: async (next: "start" | "stop") =>
      next === "start" ? bot4xAdapter.start(userId!) : bot4xAdapter.stop(userId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bot4x", "telemetry"] });
      void qc.invalidateQueries({ queryKey: ["bot4x", "executions"] });
    },
  });

  if (!ready) return <PanelSkeleton />;
  if (!userId) {
    return <ErrorPanel title="Sessão expirada" message="Faça login novamente para ver as execuções do Bot4x." />;
  }

  const data = execQuery.data;
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-5">
      <ControlBar
        telemetry={telemetry.data}
        loading={telemetry.isLoading}
        error={telemetry.isError ? (telemetry.error as Error).message : null}
        pending={toggle.isPending}
        toggleError={toggle.isError ? (toggle.error as Error).message : null}
        onToggle={(n) => toggle.mutate(n)}
        onRefresh={() => {
          void telemetry.refetch();
          void execQuery.refetch();
        }}
        refreshing={telemetry.isFetching || execQuery.isFetching}
      />

      <section className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Execuções</span>
          <Select
            value={result}
            onChange={(v) => { setResult(v); setPage(0); }}
            options={[["all", "Todos resultados"], ["WIN", "WIN"], ["LOSS", "LOSS"], ["open", "Abertas"]]}
          />
          <Select
            value={side}
            onChange={(v) => { setSide(v); setPage(0); }}
            options={[["all", "Long & Short"], ["LONG", "LONG"], ["SHORT", "SHORT"]]}
          />
          <input
            value={pair}
            onChange={(e) => { setPair(e.target.value); setPage(0); }}
            placeholder="Par (ex: BTC/USDT)"
            className="h-8 px-2 rounded-md bg-background border border-border text-[12px] text-foreground outline-none focus:border-[var(--brand-cyan)]"
          />
          <Select
            value={String(limit)}
            onChange={(v) => { setLimit(Number(v)); setPage(0); }}
            options={PAGE_SIZES.map((s) => [String(s), `${s} / página`] as [string, string])}
          />
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
            {total} {total === 1 ? "registro" : "registros"}
          </span>
        </div>

        {execQuery.isLoading ? (
          <TableSkeleton />
        ) : execQuery.isError ? (
          <ErrorPanel
            title="Não foi possível carregar as execuções"
            message={(execQuery.error as Error).message}
            onRetry={() => void execQuery.refetch()}
          />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyPanel
            title="Nenhuma execução encontrada"
            message={
              result !== "all" || side !== "all" || pair
                ? "Nenhum resultado para os filtros aplicados. Ajuste ou limpe os filtros."
                : "O Bot4x ainda não registrou execuções. Inicie o bot para começar a operar."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <Th>Data</Th><Th>Par</Th><Th>Lado</Th><Th right>Entrada</Th>
                  <Th right>SL</Th><Th right>TP</Th><Th>Status</Th><Th right>PnL</Th>
                </tr>
              </thead>
              <tbody>
                {data!.items.map((e) => {
                  const pnl = e.pnl ?? 0;
                  return (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/40">
                      <Td>{e.createdAt ? new Date(e.createdAt).toLocaleString("pt-BR") : "—"}</Td>
                      <Td className="font-medium text-foreground">{e.pair}</Td>
                      <Td>
                        <span style={{ color: e.side === "SHORT" ? "#E24B4A" : "#1D9E75" }}>{e.side}</span>
                      </Td>
                      <Td right>{fmt(e.entryPrice)}</Td>
                      <Td right>{e.stopLoss != null ? fmt(e.stopLoss) : "—"}</Td>
                      <Td right>{e.takeProfit != null ? fmt(e.takeProfit) : "—"}</Td>
                      <Td><StatusBadge status={e.status} result={e.result} /></Td>
                      <Td right>
                        <span
                          className="tabular-nums font-medium"
                          style={{ color: pnl > 0 ? "#1D9E75" : pnl < 0 ? "#E24B4A" : undefined }}
                        >
                          {pnl >= 0 ? "+" : ""}{fmt(pnl)}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            Página {page + 1} de {pages}
          </span>
          <div className="flex items-center gap-2">
            <PagerButton disabled={page === 0 || execQuery.isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft className="size-3.5" /> Anterior
            </PagerButton>
            <PagerButton
              disabled={page + 1 >= pages || execQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima <ChevronRight className="size-3.5" />
            </PagerButton>
          </div>
        </div>
      </section>

      <LogsPanel
        logs={telemetry.data?.logs ?? []}
        loading={telemetry.isLoading}
        error={telemetry.isError ? (telemetry.error as Error).message : null}
        serverTime={telemetry.data?.serverTime}
      />
    </div>
  );
}

// ---------- Control bar (start/stop + telemetria) ----------
function ControlBar({
  telemetry, loading, error, pending, toggleError, onToggle, onRefresh, refreshing,
}: {
  telemetry?: import("@/adapters/backend/bot4x.adapter").Bot4xTelemetry;
  loading: boolean;
  error: string | null;
  pending: boolean;
  toggleError: string | null;
  onToggle: (next: "start" | "stop") => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const active = telemetry?.active ?? false;
  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Motor</span>
        {loading ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> carregando estado…
          </span>
        ) : error ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#E24B4A]">
            <AlertTriangle className="size-3.5" /> telemetria indisponível
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{
              color: active ? "#7AD9B4" : "var(--muted-foreground)",
              border: `1px solid ${active ? "#1D9E75" : "var(--border)"}`,
            }}
          >
            <span className={`size-1.5 rounded-full ${active ? "bg-[#1D9E75] animate-pulse" : "bg-muted-foreground"}`} />
            {active ? "RUNNING" : "IDLE"}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-background text-[12px] text-foreground hover:bg-secondary"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
          </button>
          <button
            disabled={pending}
            onClick={() => onToggle(active ? "stop" : "start")}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold disabled:opacity-60"
            style={{
              background: active ? "color-mix(in oklab,#E24B4A 22%,transparent)" : "color-mix(in oklab,#1D9E75 22%,transparent)",
              border: `1px solid ${active ? "#E24B4A" : "#1D9E75"}`,
              color: active ? "#FF9B9A" : "#7AD9B4",
            }}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : active ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
            {active ? "Parar bot" : "Iniciar bot"}
          </button>
        </div>
      </div>

      {toggleError && (
        <div className="text-[11px] text-[#E24B4A]">Falha ao alterar o estado do bot: {toggleError}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Trades hoje" value={telemetry ? String(telemetry.today.trades) : "—"} />
        <Stat label="Wins" value={telemetry ? String(telemetry.today.wins) : "—"} color="#1D9E75" />
        <Stat label="Losses" value={telemetry ? String(telemetry.today.losses) : "—"} color="#E24B4A" />
        <Stat
          label="PnL do dia"
          value={telemetry ? `${telemetry.today.pnl >= 0 ? "+" : ""}${fmt(telemetry.today.pnl)}` : "—"}
          color={telemetry && telemetry.today.pnl < 0 ? "#E24B4A" : "#1D9E75"}
        />
        <Stat label="Circuit breaker" value={telemetry?.circuitBreaker ?? "—"} />
      </div>
    </section>
  );
}

function LogsPanel({
  logs, loading, error, serverTime,
}: {
  logs: Array<{ at: string; level: string; message: string; detail?: string }>;
  loading: boolean;
  error: string | null;
  serverTime?: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Logs & telemetria</span>
        {serverTime && (
          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
            servidor {new Date(serverTime).toLocaleTimeString("pt-BR")}
          </span>
        )}
      </div>
      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorPanel title="Telemetria indisponível" message={error} />
      ) : logs.length === 0 ? (
        <EmptyPanel title="Sem eventos hoje" message="Nenhum log registrado pelo motor nas últimas execuções." />
      ) : (
        <ul className="space-y-1.5 font-mono text-[11px]">
          {logs.map((l, i) => (
            <li key={`${l.at}-${i}`} className="flex items-start gap-2">
              <span className="text-muted-foreground tabular-nums shrink-0">
                {new Date(l.at).toLocaleTimeString("pt-BR")}
              </span>
              <span
                className="uppercase shrink-0"
                style={{ color: l.level === "warn" ? "#EF9F27" : "#7AD9B4" }}
              >
                {l.level}
              </span>
              <span className="text-foreground">{l.message}</span>
              {l.detail && <span className="text-muted-foreground truncate">· {l.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- primitives ----------
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[15px] font-semibold tabular-nums mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}

function Select({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 px-2 rounded-md bg-background border border-border text-[12px] text-foreground outline-none"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </select>
  );
}

function StatusBadge({ status, result }: { status: string; result?: string }) {
  const open = status === "open";
  const win = result === "WIN";
  const color = open ? "#EF9F27" : win ? "#1D9E75" : "#E24B4A";
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ color, border: `1px solid ${color}55` }}
    >
      {open ? "ABERTA" : (result ?? "FECHADA")}
    </span>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`py-2 px-2 font-medium ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`py-2 px-2 text-muted-foreground ${right ? "text-right tabular-nums" : ""} ${className}`}>{children}</td>;
}
function PagerButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-border bg-background text-[12px] text-foreground disabled:opacity-40 hover:bg-secondary"
    >
      {children}
    </button>
  );
}

export function ErrorPanel({ title, message, onRetry }: { title: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-md border border-[#E24B4A55] bg-[color-mix(in_oklab,#E24B4A_10%,transparent)] p-4">
      <div className="flex items-center gap-2 text-[13px] font-medium text-[#FF9B9A]">
        <AlertTriangle className="size-4" /> {title}
      </div>
      {message && <p className="text-[11px] text-muted-foreground mt-1 break-words">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 h-8 px-3 rounded-md border border-border bg-background text-[12px] text-foreground hover:bg-secondary"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-8 text-center">
      <Inbox className="size-6 mx-auto text-muted-foreground" />
      <div className="text-[13px] font-medium text-foreground mt-2">{title}</div>
      <p className="text-[11px] text-muted-foreground mt-1">{message}</p>
    </div>
  );
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 rounded bg-secondary/60 animate-pulse" />
      ))}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 rounded-lg bg-secondary/60 animate-pulse" />
      <div className="h-64 rounded-lg bg-secondary/60 animate-pulse" />
    </div>
  );
}
