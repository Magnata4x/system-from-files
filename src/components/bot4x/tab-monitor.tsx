import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useBot4xStore } from "@/lib/bot4x-store";
import { bot4xAdapter, type BackendBot4xCycle } from "@/adapters/backend/bot4x.adapter";

const DECISION_LABELS = {
  EXECUTION_CANDIDATE: "CANDIDATO",
  BLOCKED: "BLOQUEADO",
  IGNORED: "IGNORADO",
  INACTIVE: "INATIVO",
} as const;

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
}

export function TabMonitor() {
  const mode = useBot4xStore((s) => s.mode);
  const [cycle, setCycle] = useState<BackendBot4xCycle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (mode !== "REAL") {
      setCycle(null);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const next = await bot4xAdapter.cycle();
      setCycle(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telemetria operacional indisponível");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    if (mode !== "REAL") return;
    const id = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(id);
  }, [mode]);

  if (mode !== "REAL") {
    return (
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold">Monitor operacional</h2>
            <p className="text-xs text-muted-foreground mt-1">
              O monitor operacional não usa ticks, replay, ordens ou métricas sintéticas.
              Em DEMO, os dados sintéticos permanecem isolados e não são apresentados como operação.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold">Monitor operacional · REAL</h2>
            <p className="text-[11px] text-muted-foreground mt-1">
              Fonte: ciclo Bot4x observação-only · nenhuma ordem é enviada por este monitor.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar ciclo
          </button>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            {error}
          </div>
        ) : !cycle ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {loading ? "Executando leitura operacional…" : "Sem ciclo operacional disponível."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              <Metric label="Último ciclo" value={formatTime(cycle.finishedAt)} />
              <Metric label="Usuários" value={String(cycle.usersScanned)} />
              <Metric label="Sinais" value={String(cycle.signalsScanned)} />
              <Metric label="Candidatos" value={String(cycle.candidates)} />
              <Metric label="Bloqueados" value={String(cycle.blocked)} />
              <Metric label="Ignorados" value={String(cycle.ignored)} />
              <Metric label="Envio" value="false" danger={cycle.decisions.some((d) => d.executionSubmitted)} />
            </div>

            <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock3 className="size-3.5" />
              Início: {formatTime(cycle.startedAt)}
              <span>·</span>
              Fim: {formatTime(cycle.finishedAt)}
              <span>·</span>
              execução submetida: <strong className="text-foreground">false</strong>
            </div>
          </>
        )}
      </section>

      {cycle && <DecisionTable cycle={cycle} />}
    </div>
  );
}

function DecisionTable({ cycle }: { cycle: BackendBot4xCycle }) {
  const rows = useMemo(
    () => cycle.decisions.slice().sort((a, b) => {
      const rank = { BLOCKED: 0, EXECUTION_CANDIDATE: 1, IGNORED: 2, INACTIVE: 3 } as const;
      return rank[a.decision] - rank[b.decision];
    }),
    [cycle],
  );

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider">Decisões do ciclo</h3>
        <p className="text-[10px] text-muted-foreground mt-1">
          Candidato ≠ ordem executada. O ciclo atual é explicitamente observation-only.
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">Nenhum sinal elegível neste ciclo.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-secondary/30">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">Decisão</th>
                <th className="px-3 py-2">Par</th>
                <th className="px-3 py-2">Lado</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Perfil</th>
                <th className="px-3 py-2">Slots</th>
                <th className="px-3 py-2">Circuit breaker</th>
                <th className="px-3 py-2">Motivo</th>
                <th className="px-3 py-2">Envio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.userId}-${row.pair}-${row.side}-${index}`} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2">
                    <DecisionBadge decision={row.decision} />
                  </td>
                  <td className="px-3 py-2 font-medium">{row.pair}</td>
                  <td className={`px-3 py-2 font-semibold ${row.side === "BUY" ? "text-emerald-500" : "text-red-400"}`}>{row.side}</td>
                  <td className="px-3 py-2 tabular-nums">{row.score.toFixed(1)}</td>
                  <td className="px-3 py-2">{row.profile}</td>
                  <td className="px-3 py-2 tabular-nums">{row.openSlots}/10</td>
                  <td className="px-3 py-2">{row.circuitBreaker}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.reason}</td>
                  <td className="px-3 py-2 font-semibold">false</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DecisionBadge({ decision }: { decision: keyof typeof DECISION_LABELS }) {
  const candidate = decision === "EXECUTION_CANDIDATE";
  const blocked = decision === "BLOCKED";
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold">
      {candidate ? <CheckCircle2 className="size-3 text-emerald-500" /> : blocked ? <XCircle className="size-3 text-red-400" /> : <AlertTriangle className="size-3 text-muted-foreground" />}
      {DECISION_LABELS[decision]}
    </span>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-secondary/20 p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-semibold tabular-nums ${danger ? "text-red-400" : ""}`}>{value}</div>
    </div>
  );
}
