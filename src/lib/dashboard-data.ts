// Mock data for the AISignalRadar dashboard

export type Signal = {
  id: string;
  asset: string;
  direction: "BUY" | "SELL";
  score: number;
  entry: number;
  stop: number;
  target: number;
  rr: number;
  tf: string;
  time: string;
};

export const initialSignals: Signal[] = [
  { id: "s1", asset: "BTC/USDT", direction: "BUY", score: 94, entry: 43240, stop: 42800, target: 44600, rr: 3.1, tf: "4H", time: "2m ago" },
  { id: "s2", asset: "ETH/USDT", direction: "SELL", score: 88, entry: 2251, stop: 2295, target: 2150, rr: 2.3, tf: "1H", time: "8m ago" },
  { id: "s3", asset: "SOL/USDT", direction: "BUY", score: 82, entry: 102.4, stop: 99.8, target: 110.5, rr: 3.1, tf: "4H", time: "14m ago" },
  { id: "s4", asset: "BNB/USDT", direction: "BUY", score: 77, entry: 308, stop: 302, target: 322, rr: 2.3, tf: "1H", time: "22m ago" },
  { id: "s5", asset: "LINK/USDT", direction: "BUY", score: 71, entry: 14.62, stop: 14.20, target: 15.80, rr: 2.8, tf: "1D", time: "35m ago" },
  { id: "s6", asset: "AVAX/USDT", direction: "SELL", score: 68, entry: 36.1, stop: 37.0, target: 33.8, rr: 2.5, tf: "4H", time: "48m ago" },
];

export type HeatmapAsset = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: string;
};

export const heatmap: HeatmapAsset[] = [
  { symbol: "BTC", name: "Bitcoin", price: 43240, change: 1.8, volume: "$28.4B" },
  { symbol: "ETH", name: "Ethereum", price: 2251, change: -0.4, volume: "$14.2B" },
  { symbol: "SOL", name: "Solana", price: 102.4, change: 4.2, volume: "$3.8B" },
  { symbol: "BNB", name: "BNB", price: 308, change: 0.8, volume: "$1.2B" },
  { symbol: "LINK", name: "Chainlink", price: 14.62, change: 2.1, volume: "$680M" },
  { symbol: "AVAX", name: "Avalanche", price: 36.1, change: -1.2, volume: "$540M" },
  { symbol: "MATIC", name: "Polygon", price: 0.82, change: 3.4, volume: "$420M" },
  { symbol: "ARB", name: "Arbitrum", price: 1.78, change: 5.1, volume: "$380M" },
  { symbol: "DOT", name: "Polkadot", price: 6.84, change: -0.6, volume: "$210M" },
  { symbol: "UNI", name: "Uniswap", price: 6.21, change: 1.4, volume: "$180M" },
  { symbol: "ATOM", name: "Cosmos", price: 9.12, change: -2.1, volume: "$155M" },
  { symbol: "INJ", name: "Injective", price: 28.4, change: 6.8, volume: "$420M" },
];

export const btcDomSeries = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  value: 50.8 + Math.sin(i / 4) * 1.2 + i * 0.04,
}));

export const fearGreed7d = [54, 58, 62, 60, 65, 66, 68];

export type Alert = {
  id: string;
  type: "STOP HUNT" | "NEW SIGNAL" | "VOLATILITY" | "MANIPULATION" | "BREAKOUT" | "REVERSAL";
  asset: string;
  time: string;
  color: "red" | "blue" | "amber" | "purple" | "green";
};

export const alerts: Alert[] = [
  { id: "a1", type: "STOP HUNT", asset: "BTC", time: "2m ago", color: "red" },
  { id: "a2", type: "NEW SIGNAL", asset: "ETH", time: "12m ago", color: "blue" },
  { id: "a3", type: "VOLATILITY", asset: "SOL", time: "28m ago", color: "amber" },
  { id: "a4", type: "MANIPULATION", asset: "AVAX", time: "44m ago", color: "purple" },
  { id: "a5", type: "BREAKOUT", asset: "INJ", time: "1h ago", color: "green" },
  { id: "a6", type: "REVERSAL", asset: "BNB", time: "1h ago", color: "blue" },
];

export const sentiment = [
  { asset: "BTC", bull: 68, bear: 32 },
  { asset: "ETH", bull: 54, bear: 46 },
  { asset: "SOL", bull: 72, bear: 28 },
];

export const trendingTags = ["#BTCETF", "#Halving", "#L2Season", "#AIcoins", "#Restaking"];

export const scoreDistribution = {
  byAsset: [
    { name: "BTC", avg: 84 },
    { name: "ETH", avg: 78 },
    { name: "SOL", avg: 72 },
    { name: "BNB", avg: 68 },
    { name: "LINK", avg: 64 },
    { name: "AVAX", avg: 60 },
    { name: "INJ", avg: 76 },
  ],
  byTimeframe: [
    { name: "15m", avg: 58 },
    { name: "1H", avg: 71 },
    { name: "4H", avg: 82 },
    { name: "1D", avg: 76 },
    { name: "1W", avg: 68 },
  ],
};

export const calendarEvents = [
  { id: "e1", title: "FOMC Rate Decision", date: "Wed · 14:00 UTC", impact: "high" },
  { id: "e2", title: "US CPI Release", date: "Thu · 12:30 UTC", impact: "high" },
  { id: "e3", title: "BTC Options Expiry", date: "Fri · 08:00 UTC", impact: "high" },
  { id: "e4", title: "ETH Dencun Upgrade", date: "Mon · 06:00 UTC", impact: "high" },
];

export const dna = {
  consistency: 78,
  winRate: 67,
  winRateDelta: 4,
  bestSetup: "BOS + OB",
  recommendation: "Reduce position size on Mondays — your win rate drops 18% on that day.",
  insights: [
    { id: "i1", color: "green" as const, label: "Strong timing on 4H setups" },
    { id: "i2", color: "red" as const, label: "Closing winners too early" },
    { id: "i3", color: "amber" as const, label: "Avoid trading on Mondays" },
  ],
};

export const upcomingSignals: Signal[] = [
  { id: "s7", asset: "ARB/USDT", direction: "BUY", score: 91, entry: 1.78, stop: 1.71, target: 1.94, rr: 2.3, tf: "1H", time: "just now" },
  { id: "s8", asset: "INJ/USDT", direction: "BUY", score: 86, entry: 28.4, stop: 27.5, target: 30.8, rr: 2.7, tf: "4H", time: "just now" },
  { id: "s9", asset: "MATIC/USDT", direction: "SELL", score: 79, entry: 0.82, stop: 0.85, target: 0.76, rr: 2.0, tf: "1H", time: "just now" },
];
