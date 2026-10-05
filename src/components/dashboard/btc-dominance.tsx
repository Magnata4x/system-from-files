import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { useMarketData } from "@/lib/market-data-store";
import { useMarketHistory } from "@/hooks/useMarketHistory";
import { DataStatusBadge } from "./data-status";

export function BtcDominance() {
  const { global, loading, metadataStatus } = useMarketData();
  const history = useMarketHistory(30);
  const dom = global?.btcDominance;
  const change = global?.marketCapChange24h;
  const dataStatus =
    loading && !global
      ? "loading"
      : !global || dom == null
        ? "unavailable"
        : metadataStatus === "stale"
          ? "stale"
          : "ok";

  const points = history.data?.points.filter((point) => point.btcDominance != null) ?? [];
  const chartData = points.map((point) => ({
    time: new Date(point.capturedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    dominance: point.btcDominance,
  }));
  const historyStatus =
    history.isLoading && !history.data
      ? "loading"
      : history.isError || !points.length
        ? "unavailable"
        : "ok";

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-medium">BTC Dominance</h3>
          <DataStatusBadge source="CoinGecko global" updatedAt={global?.updatedAt} status={dataStatus} />
        </div>
        <div className="text-right">
          <div className="text-[22px] font-semibold tabular-nums">
            {dom == null ? "Indisponível" : dom.toFixed(1) + "%"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {change == null
              ? "Indisponível"
              : (change >= 0 ? "↑" : "↓") + " " + Math.abs(change).toFixed(2) + "% market cap 24h"}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[180px] mt-2">
        {historyStatus === "loading" ? (
          <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">
            Carregando histórico real…
          </div>
        ) : historyStatus !== "ok" ? (
          <div className="h-full rounded-lg border border-border bg-secondary/20 flex items-center justify-center text-[11px] text-muted-foreground">
            Histórico de 30 dias indisponível.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
              <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
              <YAxis
                domain={["dataMin - 1", "dataMax + 1"]}
                tick={{ fontSize: 9 }}
                tickFormatter={(value) => `${value}%`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [typeof value === "number" ? `${value.toFixed(2)}%` : "Indisponível", "BTC Dominance"]}
              />
              <Line type="monotone" dataKey="dominance" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <DataStatusBadge
        source="Histórico persistido · CoinGecko"
        updatedAt={history.data?.generatedAt ? new Date(history.data.generatedAt) : null}
        status={historyStatus}
      />
    </div>
  );
}
