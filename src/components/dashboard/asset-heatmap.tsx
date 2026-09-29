import { useEffect, useState } from "react";
import { useLivePrices } from "@/hooks/useLivePrices";
import { Skeleton } from "@/components/ui/skeleton";

function colorFor(change: number): { bg: string; text: string } {
  if (change >= 5) return { bg: "#0F3020", text: "#1D9E75" };
  if (change >= 2) return { bg: "#1A4A2A", text: "#2EBD88" };
  if (change >= 0.5) return { bg: "#1D3320", text: "#3CCF8E" };
  if (change >= -0.5) return { bg: "#1E2028", text: "#888780" };
  if (change >= -2) return { bg: "#3B1212", text: "#E24B4A" };
  if (change >= -5) return { bg: "#4A1515", text: "#F06060" };
  return { bg: "#5A1818", text: "#FF8080" };
}

function fmtPrice(price: number): string {
  if (price >= 1000) return "$" + price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 1) return "$" + price.toFixed(2);
  return "$" + price.toFixed(5);
}

const HEATMAP_SYMBOLS = [
  "BTC", "ETH", "SOL", "BNB", "XRP", "AVAX",
  "LINK", "MATIC", "DOT", "UNI", "ADA", "NEAR",
];

export function AssetHeatmap() {
  const { prices, loading } = useLivePrices();
  const [pulseTick, setPulseTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPulseTick((t) => t + 1), 8000);
    return () => clearInterval(id);
  }, []);

  const assets = HEATMAP_SYMBOLS.map((sym) => {
    const p = prices[sym];
    return {
      symbol: sym,
      name: p?.name ?? sym,
      price: p?.price ?? 0,
      change: p?.change24h ?? 0,
      volume: p?.volume24h ?? 0,
      loaded: !!p,
    };
  });

  return (
    <div data-tour="heatmap" className="rounded-xl border border-border bg-card p-4 h-full">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[15px] font-medium text-foreground">Asset Heatmap</h3>
        <span className="text-[11px] text-muted-foreground">24h change</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {assets.map((a, i) => (
          <Cell key={a.symbol} asset={a} pulseTick={pulseTick} index={i} loading={loading && !a.loaded} />
        ))}
      </div>
    </div>
  );
}

function Cell({
  asset,
  pulseTick,
  index,
  loading,
}: {
  asset: { symbol: string; name: string; price: number; change: number; volume: number; loaded: boolean };
  pulseTick: number;
  index: number;
  loading: boolean;
}) {
  const { bg, text } = colorFor(asset.change);
  const up = asset.change >= 0;
  const [bright, setBright] = useState(false);

  useEffect(() => {
    if (pulseTick === 0) return;
    const delay = (index % 4) * 120 + Math.random() * 200;
    const onT = setTimeout(() => setBright(true), delay);
    const offT = setTimeout(() => setBright(false), delay + 600);
    return () => {
      clearTimeout(onT);
      clearTimeout(offT);
    };
  }, [pulseTick, index]);

  const volFormatted = asset.volume >= 1e9
    ? `$${(asset.volume / 1e9).toFixed(1)}B`
    : asset.volume >= 1e6
      ? `$${(asset.volume / 1e6).toFixed(1)}M`
      : `$${asset.volume.toLocaleString()}`;

  if (loading) {
    return (
      <div className="relative rounded-lg p-2.5 bg-muted/40 animate-pulse">
        <Skeleton className="h-4 w-10 mb-1" />
        <Skeleton className="h-3 w-14 mb-1" />
        <Skeleton className="h-3 w-12" />
      </div>
    );
  }

  return (
    <div
      className="relative group rounded-lg p-2.5 transition-all duration-500 hover:scale-[1.03] cursor-pointer"
      style={{
        background: `color-mix(in oklab, ${bg} ${bright ? 85 : 50}%, var(--card))`,
        border: `1px solid color-mix(in oklab, ${bg} ${bright ? 100 : 60}%, transparent)`,
        boxShadow: bright ? `0 0 16px color-mix(in oklab, ${bg} 70%, transparent)` : "none",
      }}
    >
      <div className="text-[13px] font-semibold" style={{ color: text }}>{asset.symbol}</div>
      <div className="text-[11px] tabular-nums mt-0.5" style={{ color: text }}>
        {up ? "+" : ""}{asset.change.toFixed(2)}%
      </div>
      <div className="text-[10px] text-foreground/60 tabular-nums mt-0.5">
        {fmtPrice(asset.price)}
      </div>
      <div className="absolute z-20 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 rounded-lg border border-border bg-card p-2.5 shadow-xl text-left">
        <div className="text-[12px] font-medium text-foreground">{asset.name}</div>
        <div className="text-[11px] text-muted-foreground">Price <span className="text-foreground tabular-nums">{fmtPrice(asset.price)}</span></div>
        <div className="text-[11px] text-muted-foreground">24h Vol <span className="text-foreground">{volFormatted}</span></div>
      </div>
    </div>
  );
}
