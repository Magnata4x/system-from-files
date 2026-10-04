import { useMarketData } from "@/lib/market-data-store";
import { MARKET_ASSETS } from "@/lib/market-symbols";
function colorFor(c: number) {
  if (c >= 5) return { bg: "#0F3020", text: "#1D9E75" };
  if (c >= 2) return { bg: "#1A4A2A", text: "#2EBD88" };
  if (c >= 0.5) return { bg: "#1D3320", text: "#3CCF8E" };
  if (c >= -0.5) return { bg: "#1E2028", text: "#888780" };
  if (c >= -2) return { bg: "#3B1212", text: "#E24B4A" };
  if (c >= -5) return { bg: "#4A1515", text: "#F06060" };
  return { bg: "#5A1818", text: "#FF8080" };
}
function fmt(p: number) {
  if (!(p > 0) || !Number.isFinite(p)) return "sem dado";
  if (p >= 1000) return "$" + p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return "$" + p.toFixed(2);
  return "$" + p.toFixed(5);
}
export function AssetHeatmap() {
  const { prices, loading, error, status } = useMarketData();
  return (
    <div data-tour="heatmap" className="rounded-xl border border-border bg-card p-4 h-full">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[15px] font-medium">Asset Heatmap</h3>
        <span className="text-[11px] text-muted-foreground">
          {status === "stale" || error ? "desatualizado" : "24h change · Binance spot"}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {MARKET_ASSETS.map((asset) => {
          const p = prices[asset.symbol];
          if (!p)
            return (
              <div key={asset.symbol} className="rounded-lg p-2.5 bg-muted/40">
                <div className="text-[11px] text-muted-foreground">
                  {loading ? "carregando…" : "sem dado"}
                </div>
              </div>
            );
          if (p.change24h == null)
            return (
              <div key={asset.symbol} className="rounded-lg p-2.5 bg-muted/40">
                <div className="text-[11px] text-muted-foreground">{fmt(p.price)}</div>
                <div className="text-[10px] text-muted-foreground">sem dado · 24h</div>
              </div>
            );
          const c = colorFor(p.change24h);
          return (
            <div
              key={asset.symbol}
              className="rounded-lg p-2.5"
              style={{ background: c.bg, border: "1px solid " + c.bg }}
            >
              <div className="text-[13px] font-semibold" style={{ color: c.text }}>
                {asset.symbol}
              </div>
              <div className="text-[11px]" style={{ color: c.text }}>
                {p.change24h >= 0 ? "+" : ""}
                {p.change24h.toFixed(2)}%
              </div>
              <div className="text-[10px] text-foreground/60 tabular-nums">{fmt(p.price)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
