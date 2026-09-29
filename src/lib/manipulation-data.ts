export type Severity = "HIGH" | "MEDIUM" | "LOW";
export type AlertType =
  | "STOP HUNT"
  | "LIQUIDITY GRAB"
  | "FAKE BREAKOUT"
  | "SPOOFING"
  | "ABSORPTION"
  | "PUMP&DUMP";

export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1D"] as const;

export const HEATMAP: { asset: string; values: number[] }[] = [
  { asset: "BTC", values: [12, 18, 45, 78, 32, 15] },
  { asset: "ETH", values: [8, 22, 91, 67, 28, 11] },
  { asset: "SOL", values: [34, 88, 72, 41, 19, 8] },
  { asset: "BNB", values: [5, 11, 23, 19, 8, 4] },
  { asset: "LINK", values: [15, 28, 34, 22, 17, 9] },
  { asset: "AVAX", values: [9, 19, 27, 31, 14, 7] },
];

export type Alert = {
  id: string;
  severity: Severity;
  type: AlertType;
  asset: string;
  tf: string;
  confidence: number;
  ago: string;
  desc: string;
  action: string;
  detail: string;
};

export const ALERTS: Alert[] = [
  {
    id: "a1",
    severity: "HIGH",
    type: "STOP HUNT",
    asset: "BTC/USDT",
    tf: "1H",
    confidence: 91,
    ago: "2m ago",
    desc: "Coordinated sweep of $42,800 liquidity. 847 BTC absorbed below support.",
    action: "Avoid longs until $43,100 reclaim",
    detail:
      "Sweep occurred in 3 sequential 1m candles with 4.2x avg volume. Delta turned positive 18s after the wick, consistent with iceberg accumulation. CVD divergence on 15m supports stop hunt thesis.",
  },
  {
    id: "a2",
    severity: "HIGH",
    type: "LIQUIDITY GRAB",
    asset: "ETH/USDT",
    tf: "15m",
    confidence: 88,
    ago: "6m ago",
    desc: "Aggressive bid absorption at $2,240 OB zone. Delta divergence detected.",
    action: "Monitor for reversal",
    detail:
      "Order book showed 14,200 ETH stacked between $2,238–$2,242, filled within 90s while price held. Spot-perp basis flipped from −0.04% to +0.02%.",
  },
  {
    id: "a3",
    severity: "MEDIUM",
    type: "FAKE BREAKOUT",
    asset: "SOL/USDT",
    tf: "5m",
    confidence: 74,
    ago: "11m ago",
    desc: "Failed breakout above $98.40 with declining volume.",
    action: "Short bias below $98.40",
    detail:
      "Breakout candle printed 38% below 20-bar volume MA. No follow-through, perp funding remained flat — classic exhaustion print.",
  },
];

export const ORDER_FLOW = [
  { asset: "BTC", buy: 68 },
  { asset: "ETH", buy: 41 },
  { asset: "SOL", buy: 55 },
];

export const WHALE_ORDERS = [
  { side: "BUY", size: "847 BTC", price: "$43,240", ago: "1m ago" },
  { side: "SELL", size: "1,240 ETH", price: "$2,251", ago: "3m ago" },
  { side: "BUY", size: "12,400 SOL", price: "$98.20", ago: "4m ago" },
  { side: "SELL", size: "320 BTC", price: "$43,180", ago: "7m ago" },
  { side: "BUY", size: "5,600 ETH", price: "$2,244", ago: "9m ago" },
];

export const FUNDING = [
  { asset: "BTC", rate: 0.021, dir: "up", note: "Slightly longs-heavy" },
  { asset: "ETH", rate: -0.008, dir: "down", note: "Shorts building" },
  { asset: "SOL", rate: 0.041, dir: "up2", note: "Overleveraged longs — caution" },
];

export const LIQUIDITY_MAP = [
  { level: "$44,200", buy: 0, sell: 38 },
  { level: "$43,800", buy: 0, sell: 52 },
  { level: "$43,400", buy: 0, sell: 41 },
  { level: "$43,200", buy: 0, sell: 28 },
  { level: "$43,000", buy: 22, sell: 0 },
  { level: "$42,800", buy: 47, sell: 0 },
  { level: "$42,400", buy: 35, sell: 0 },
  { level: "$42,000", buy: 58, sell: 0 },
];
export const CURRENT_PRICE_LEVEL = "$43,200";

export const AGGRESSION = Array.from({ length: 48 }, (_, i) => {
  const base = 50 + Math.sin(i / 4) * 18 + ((i * 53) % 17);
  const delta = Math.sin(i / 3 + 1) * 22 + (((i * 31) % 19) - 9);
  const anomaly = i === 14 || i === 32;
  return {
    t: `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
    aggression: Math.round(base + (anomaly ? 40 : 0)),
    delta: Math.round(delta + (anomaly ? 35 : 0)),
    anomaly,
  };
});

export const HISTORY = [
  { date: "May 23", asset: "BTC", tf: "1H", type: "STOP HUNT", severity: "HIGH", confidence: 91, outcome: "Confirmed" },
  { date: "May 22", asset: "ETH", tf: "15m", type: "LIQUIDITY GRAB", severity: "HIGH", confidence: 88, outcome: "Confirmed" },
  { date: "May 22", asset: "SOL", tf: "5m", type: "FAKE BREAKOUT", severity: "MEDIUM", confidence: 74, outcome: "Unconfirmed" },
  { date: "May 21", asset: "BTC", tf: "4H", type: "ABSORPTION", severity: "MEDIUM", confidence: 69, outcome: "Confirmed" },
  { date: "May 20", asset: "LINK", tf: "1H", type: "SPOOFING", severity: "LOW", confidence: 58, outcome: "False positive" },
  { date: "May 20", asset: "AVAX", tf: "15m", type: "PUMP&DUMP", severity: "HIGH", confidence: 84, outcome: "Confirmed" },
  { date: "May 19", asset: "ETH", tf: "1H", type: "STOP HUNT", severity: "HIGH", confidence: 90, outcome: "Confirmed" },
  { date: "May 18", asset: "BNB", tf: "5m", type: "FAKE BREAKOUT", severity: "LOW", confidence: 61, outcome: "Unconfirmed" },
] as const;
