import { useMarketData } from "@/lib/market-data-store";
import { DataStatusBadge } from "./data-status";
export function BtcDominance() {
  const { global, loading, error, lastUpdate, status } = useMarketData();
  const dom = global?.btcDominance;
  const change = global?.marketCapChange24h;
  const dataStatus =
    loading && !global
      ? "loading"
      : !global || dom == null
        ? "unavailable"
        : status === "stale" || error
          ? "stale"
          : "ok";
  const up = (change ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-medium">BTC Dominance</h3>
          <DataStatusBadge source="CoinGecko global" updatedAt={lastUpdate} status={dataStatus} />
        </div>
        <div className="text-right">
          <div className="text-[22px] font-semibold tabular-nums">
            {dom == null ? "Indisponível" : dom.toFixed(1) + "%"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {change == null
              ? "Indisponível"
              : (up ? "↑" : "↓") + " " + Math.abs(change).toFixed(2) + "% market cap 24h"}
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-[180px] mt-2 rounded-lg border border-border bg-secondary/20 flex items-center justify-center text-[11px] text-muted-foreground">
        Histórico de 30 dias disponível somente quando houver série real acumulada.
      </div>
    </div>
  );
}
