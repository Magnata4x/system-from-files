
import { useLivePrices } from "@/hooks/useLivePrices";
import { DataStatusBadge } from "./data-status";

export function BtcDominance() {
  const { global, loading, error, lastUpdate } = useLivePrices();
  const dom = global?.btcDominance;
  const change = global?.marketCapChange24h;
  const status = loading && !global ? "loading" : !global || dom == null ? "unavailable" : error ? "stale" : "ok";
  const up = change >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full flex flex-col">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-[15px] font-medium text-foreground">BTC Dominance</h3>
          <DataStatusBadge source="CoinGecko" updatedAt={lastUpdate} status={status} />
        </div>
        <div className="text-right">
          <div className="text-[22px] font-semibold tabular-nums text-foreground">{dom != null ? dom.toFixed(1) + "%" : "—"}</div>
          <div className="text-[11px] font-medium" style={{ color: up ? "#1D9E75" : "#E24B4A" }}>
            {change != null ? (up ? "↑" : "↓") + " " + Math.abs(change).toFixed(2) + "% market cap 24h" : "Indisponível"}
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-[180px] mt-2 rounded-lg border border-border bg-secondary/20 flex items-center justify-center text-[11px] text-muted-foreground">Histórico de 30 dias indisponível nesta fase. Nenhum valor simulado é exibido.</div>
      {/* Histórico real será ligado na Fase 3. */}
      <div className="hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={btcDomSeries}>
            <defs>
              <linearGradient id="dom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#378ADD" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#378ADD" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
            <Tooltip
              contentStyle={{ background: "#111318", border: "1px solid #1E2028", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(l) => `Day ${l}`}
              formatter={(v: number) => [`${v.toFixed(2)}%`, "BTC Dom"]}
            />
            <Area type="monotone" dataKey="value" stroke="#378ADD" strokeWidth={2} fill="url(#dom)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
