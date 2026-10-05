import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useScoreDistribution } from "@/hooks/useScoreDistribution";
import { DataStatusBadge } from "./data-status";

export interface ScoreDistributionChartPoint {
  label: string;
  n: number;
}

export function buildScoreDistributionChartData(
  buckets: readonly { from: number; to: number; n: number }[],
): ScoreDistributionChartPoint[] {
  return buckets.map((bucket) => ({
    label: `${bucket.from}–${bucket.to === 101 ? 100 : bucket.to - 1}`,
    n: bucket.n,
  }));
}

export function PerformanceChart() {
  const query = useScoreDistribution();
  const group = query.data?.groups[0] ?? null;
  const status =
    query.isLoading && !query.data
      ? "loading"
      : query.isError || !group
        ? "unavailable"
        : "ok";

  const chartData = group ? buildScoreDistributionChartData(group.buckets) : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-medium">Score distribution</h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            Últimos 7 dias · somente sinais persistidos
          </p>
        </div>
        <DataStatusBadge
          source="Signals · banco"
          updatedAt={query.data?.latestDataAt ? new Date(query.data.latestDataAt) : null}
          status={status}
        />
      </div>

      {status === "loading" ? (
        <div className="h-[220px] mt-3 rounded-lg border border-border bg-secondary/20 flex items-center justify-center text-[12px] text-muted-foreground">
          Carregando distribuição real…
        </div>
      ) : status !== "ok" ? (
        <div className="h-[220px] mt-3 rounded-lg border border-border bg-secondary/20 flex flex-col items-center justify-center text-[12px] text-muted-foreground">
          <span>Distribuição de scores indisponível.</span>
          <span className="mt-1 text-[10px]">Nenhum sinal persistido no período ou fonte indisponível.</span>
        </div>
      ) : group ? (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
            <span>{group.asset} · {group.timeframe}</span>
            <span>n = {group.n}</span>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value, _name, item) => [
                    typeof value === "number" ? `${value} sinais · faixa ${item?.payload?.label ?? "indisponível"}` : "Indisponível",
                    "",
                  ]}
                  labelFormatter={() => ""}
                />
                <Bar dataKey="n" name="n" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {query.data?.truncated && (
            <div className="mt-3 text-[10px] text-amber-600">
              Exibição limitada aos 10.000 sinais mais recentes; existem mais sinais no período.
            </div>
          )}
          {query.data && query.data.groups.length > 1 && (
            <div className="mt-3 text-[10px] text-muted-foreground">
              Exibindo o grupo com maior número de sinais. Outros grupos: {query.data.groups.length - 1}.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
