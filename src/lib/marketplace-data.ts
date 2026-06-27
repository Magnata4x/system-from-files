export type Category = "Strategies" | "Indicators" | "Alerts" | "Bots" | "Education";

export type Product = {
  id: string;
  name: string;
  category: Category;
  creator: { handle: string; verified: boolean };
  description: string;
  rating: number;
  reviews: number;
  price: number; // 0 = free
  featured?: boolean;
  performance?: { day: string; value: number }[];
};

const CREATORS = [
  { handle: "InstitutionalFlow", verified: true },
  { handle: "SmartMoneyX", verified: true },
  { handle: "LondonScalper", verified: true },
  { handle: "WhaleHunter", verified: true },
  { handle: "DrTrading", verified: false },
  { handle: "AlertsLab", verified: true },
  { handle: "OnChainPro", verified: true },
  { handle: "MindsetFX", verified: false },
];

function makePerf(seed: number, trend: number) {
  const arr: { day: string; value: number }[] = [];
  let v = 0;
  for (let i = 0; i < 30; i++) {
    v += trend / 30 + Math.sin(seed + i * 0.7) * 0.6 + (Math.cos(i * 0.4 + seed) * 0.3);
    arr.push({ day: `D${i + 1}`, value: +v.toFixed(2) });
  }
  return arr;
}

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Institutional Flow Strategy", category: "Strategies", creator: CREATORS[0], description: "Order flow + volume profile strategy used by prop desks. Includes setup guide and TradingView template.", rating: 4.9, reviews: 234, price: 49, featured: true, performance: makePerf(1, 32) },
  { id: "p2", name: "Smart Money Concepts Pack", category: "Indicators", creator: CREATORS[1], description: "Liquidity sweeps, order blocks, BOS/CHoCH and fair value gaps in a single overlay.", rating: 4.8, reviews: 189, price: 29, featured: true },
  { id: "p3", name: "London Session Scalper", category: "Strategies", creator: CREATORS[2], description: "Mean-reversion scalping for the London open, 5m timeframe. Backtested over 3 years.", rating: 4.7, reviews: 156, price: 39, featured: true, performance: makePerf(3, 18) },
  { id: "p4", name: "Whale Alert Bot", category: "Bots", creator: CREATORS[3], description: "Real-time alerts on >$1M on-chain transfers, with Telegram + webhook delivery.", rating: 4.9, reviews: 312, price: 59, featured: true, performance: makePerf(4, 28) },
  { id: "p5", name: "Risk Management Masterclass", category: "Education", creator: CREATORS[4], description: "6 hours of video on position sizing, max drawdown control and psychology under pressure.", rating: 4.6, reviews: 445, price: 0 },
  { id: "p6", name: "Multi-TF Confluence Alerts", category: "Alerts", creator: CREATORS[5], description: "Alerts firing only when 4h + 1h + 15m align. Reduce noise by ~80%.", rating: 4.8, reviews: 201, price: 19 },
  { id: "p7", name: "BTC Dominance Strategy", category: "Strategies", creator: CREATORS[0], description: "Rotation framework based on BTC dominance shifts. Long alt season / defensive in BTC season.", rating: 4.7, reviews: 178, price: 44, performance: makePerf(7, 22) },
  { id: "p8", name: "On-Chain Signals Pack", category: "Indicators", creator: CREATORS[6], description: "MVRV, SOPR, exchange netflow and whale wallets — all in TradingView-ready format.", rating: 4.9, reviews: 267, price: 34 },
  { id: "p9", name: "News Impact Filter Bot", category: "Bots", creator: CREATORS[5], description: "Pauses bot execution around high-impact news. Custom keyword + source whitelist.", rating: 4.5, reviews: 134, price: 49, performance: makePerf(9, 14) },
  { id: "p10", name: "Psychology of Trading", category: "Education", creator: CREATORS[7], description: "Mental models, cognitive biases and journaling templates from a former hedge-fund coach.", rating: 4.8, reviews: 523, price: 29 },
  { id: "p11", name: "SMC Order Block Detector", category: "Indicators", creator: CREATORS[1], description: "Lightweight order-block detector with mitigation tracking and alerts.", rating: 4.7, reviews: 198, price: 24 },
  { id: "p12", name: "Scalping Volatility Bot", category: "Bots", creator: CREATORS[2], description: "Scalps high-volatility regimes with adaptive position sizing. Binance + Bybit.", rating: 4.6, reviews: 143, price: 69, performance: makePerf(12, 20) },
];

export const CATEGORIES = ["All", "Strategies", "Indicators", "Alerts", "Bots", "Education"] as const;
export type CategoryFilter = (typeof CATEGORIES)[number];

export const CATEGORY_GRADIENTS: Record<Category, string> = {
  Strategies: "from-[#378ADD]/40 to-violet-500/20",
  Indicators: "from-emerald-500/40 to-teal-500/20",
  Alerts: "from-amber-500/40 to-orange-500/20",
  Bots: "from-violet-500/40 to-fuchsia-500/20",
  Education: "from-pink-500/40 to-rose-500/20",
};

export const CATEGORY_BADGES: Record<Category, string> = {
  Strategies: "bg-[#378ADD]/15 text-[#5fa8ff] border-[#378ADD]/30",
  Indicators: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Alerts: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Bots: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Education: "bg-pink-500/15 text-pink-300 border-pink-500/30",
};

export const SAMPLE_REVIEWS = [
  { user: "@trader_lu", rating: 5, text: "Mudou meu approach completamente. Setup limpo e bem documentado." },
  { user: "@quantmike", rating: 5, text: "Backtest bate com forward test. Suporte do criador é excelente." },
  { user: "@ricardo_fx", rating: 4, text: "Bom material, faltou apenas um exemplo de aplicação em ouro." },
];
