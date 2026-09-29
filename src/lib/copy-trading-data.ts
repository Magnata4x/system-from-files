export type Strategy = "Scalper" | "Swing" | "Position";

export type Trader = {
  id: string;
  handle: string;
  strategy: Strategy;
  winRate: number;
  rr: number;
  signals30d: number;
  followers: number;
  monthlyReturn: number;
  maxDrawdown: number;
  verified: boolean;
};

export const TRADERS: Trader[] = [
  { id: "t1", handle: "@InstitutionalFlow", strategy: "Swing", winRate: 74, rr: 2.1, signals30d: 42, followers: 2341, monthlyReturn: 23, maxDrawdown: 8.2, verified: true },
  { id: "t2", handle: "@SmartMoneyX", strategy: "Position", winRate: 71, rr: 2.4, signals30d: 18, followers: 1876, monthlyReturn: 18, maxDrawdown: 6.5, verified: true },
  { id: "t3", handle: "@LondonScalper", strategy: "Scalper", winRate: 68, rr: 1.8, signals30d: 124, followers: 1243, monthlyReturn: 15, maxDrawdown: 9.1, verified: true },
  { id: "t4", handle: "@BTCWhale", strategy: "Swing", winRate: 65, rr: 2.0, signals30d: 31, followers: 987, monthlyReturn: 12, maxDrawdown: 11.4, verified: false },
  { id: "t5", handle: "@AlgoTrader4H", strategy: "Position", winRate: 62, rr: 2.2, signals30d: 22, followers: 743, monthlyReturn: 9, maxDrawdown: 7.8, verified: true },
  { id: "t6", handle: "@NightScalper", strategy: "Scalper", winRate: 58, rr: 1.6, signals30d: 98, followers: 512, monthlyReturn: 8, maxDrawdown: 12.6, verified: false },
];

// Deterministic 30-day PnL sparkline for each trader
export const TRADER_SPARKS: Record<string, number[]> = Object.fromEntries(
  TRADERS.map((t) => {
    const seed = t.handle.length + t.monthlyReturn;
    const points: number[] = [];
    let v = 0;
    for (let i = 0; i < 30; i++) {
      const noise = Math.sin(seed + i * 0.9) * 1.4 + Math.cos(i * 0.4 + seed * 0.3) * 0.9;
      v += t.monthlyReturn / 30 + noise * 0.5;
      points.push(+v.toFixed(2));
    }
    return [t.id, points];
  })
);

export type TopCopier = {
  id: string;
  handle: string;
  followingCount: number;
  pnl30d: number;
  winRate: number;
  capital: string;
};

export const TOP_COPIERS: TopCopier[] = [
  { id: "c1", handle: "@diego_quant", followingCount: 5, pnl30d: 18.4, winRate: 68, capital: "$120k" },
  { id: "c2", handle: "@mariaFX", followingCount: 3, pnl30d: 14.2, winRate: 64, capital: "$45k" },
  { id: "c3", handle: "@whaleHunter", followingCount: 4, pnl30d: 12.8, winRate: 61, capital: "$210k" },
  { id: "c4", handle: "@nightTrader", followingCount: 2, pnl30d: 10.5, winRate: 59, capital: "$28k" },
  { id: "c5", handle: "@btc_max", followingCount: 6, pnl30d: 9.7, winRate: 57, capital: "$72k" },
];

export const STATS = [
  { label: "Active Copiers", value: "1,247", delta: "+38 today" },
  { label: "Signals Copied Today", value: "89", delta: "+12% vs yesterday" },
  { label: "Avg Return (copied)", value: "+4.2%", delta: "Last 30d" },
  { label: "Success Rate", value: "61%", delta: "All copiers" },
];

export type CopyConfig = {
  riskPerTrade: number;
  maxPositions: number;
  maxDailyLoss: number;
  assetFilter: "all" | "majors" | "alts";
  autoExecute: boolean;
};

export const DEFAULT_CONFIG: CopyConfig = {
  riskPerTrade: 1,
  maxPositions: 3,
  maxDailyLoss: 5,
  assetFilter: "all",
  autoExecute: false,
};

export type ActiveCopy = {
  traderId: string;
  config: CopyConfig;
  pnl: number;
  trades: number;
  winRate: number;
  since: string;
};

export const INITIAL_COPIES: ActiveCopy[] = [
  { traderId: "t1", config: { ...DEFAULT_CONFIG, riskPerTrade: 1.5 }, pnl: 8.4, trades: 14, winRate: 71, since: "2026-05-02" },
  { traderId: "t3", config: { ...DEFAULT_CONFIG, riskPerTrade: 0.75 }, pnl: -1.2, trades: 23, winRate: 56, since: "2026-05-10" },
];

// Performance comparison: last 30 days
export const PERFORMANCE_SERIES = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const manual = +(((Math.sin(i / 4) * 1.2) + i * 0.08 + (Math.random() - 0.5) * 0.6)).toFixed(2);
  const copy = +(((Math.sin(i / 5 + 1) * 0.8) + i * 0.18 + (Math.random() - 0.4) * 0.5)).toFixed(2);
  return { day: `D${day}`, manual, copy };
});
