export const MACRO = {
  overall: 68,
  socialVolume: { value: "2.4M", change: 18 },
  bullBear: { bull: 62, bear: 38 },
  trending: "#BTCHalving",
  newsImpact: 74,
};

export const SOURCES = {
  twitter: {
    score: 71,
    label: "Bullish",
    bull: 67,
    bear: 33,
    volume: "847K tweets",
    tags: ["#Bitcoin", "#ETF", "#Altseason", "#Halving", "#SOL"],
  },
  reddit: {
    score: 64,
    label: "Bullish",
    bull: 61,
    bear: 39,
    subs: [
      { name: "r/CryptoCurrency", pct: 68 },
      { name: "r/Bitcoin", pct: 74 },
      { name: "r/ethereum", pct: 59 },
    ],
    hotPost: "Why this halving cycle feels different — accumulation data inside",
  },
  news: {
    score: 78,
    label: "Strong Positive",
    headlines: [
      { text: "BlackRock ETF $420M inflow", tone: "POSITIVE" as const, stars: 5 },
      { text: "Fed signals rate pause Q3", tone: "POSITIVE" as const, stars: 4 },
      { text: "EU regulatory scrutiny intensifies", tone: "NEGATIVE" as const, stars: 3 },
    ],
  },
  onchain: {
    score: 72,
    label: "Accumulation",
    metrics: [
      { k: "Exchange outflows", v: "-12,400 BTC", tone: "pos" as const, note: "Accumulation" },
      { k: "Whale wallets", v: "+8.4%", tone: "pos" as const },
      { k: "MVRV", v: "1.84", tone: "neutral" as const, note: "Fair value" },
      { k: "L/S ratio", v: "1.32", tone: "neutral" as const },
    ],
  },
};

export type Narrative = { tag: string; weight: number; tone: "bull" | "bear" | "neutral"; keywords: string[] };
export const NARRATIVES: Narrative[] = [
  { tag: "BTC Halving", weight: 100, tone: "bull", keywords: ["halving", "btc", "bitcoin"] },
  { tag: "ETF Inflows", weight: 95, tone: "bull", keywords: ["etf", "blackrock", "inflow"] },
  { tag: "Fed Pivot", weight: 88, tone: "bull", keywords: ["fed", "rate", "treasury", "cpi"] },
  { tag: "Layer 2", weight: 64, tone: "bull", keywords: ["l2", "layer", "tvl", "ethereum"] },
  { tag: "DeFi Revival", weight: 58, tone: "bull", keywords: ["defi", "tvl"] },
  { tag: "Regulatory Risk", weight: 54, tone: "bear", keywords: ["regulator", "scrutiny", "probe", "eu"] },
  { tag: "Altseason", weight: 42, tone: "bull", keywords: ["altcoin", "solana", "sol", "chainlink", "link"] },
  { tag: "CBDC", weight: 36, tone: "bear", keywords: ["cbdc", "central bank"] },
  { tag: "Mining Difficulty", weight: 30, tone: "neutral", keywords: ["mining", "hashrate"] },
  { tag: "RWA", weight: 48, tone: "bull", keywords: ["rwa", "tokenization", "real-world"] },
  { tag: "Memecoins", weight: 40, tone: "neutral", keywords: ["meme", "doge"] },
  { tag: "Liquidations", weight: 33, tone: "bear", keywords: ["liquidation", "liquidated"] },
];

export type AssetSent = {
  asset: string;
  social: number;
  news: number;
  onchain: number;
  overall: number;
  trend: "up" | "upup" | "flat" | "down";
  signal: "BULLISH" | "NEUTRAL" | "BEARISH";
  spark: number[];
};

const spark = (seed: number, dir: number) =>
  Array.from({ length: 14 }, (_, i) => {
    const x = Math.sin((seed + i) * 0.7) * 6 + dir * i * 0.8 + 40;
    return Math.max(10, Math.min(90, x));
  });

export const ASSETS: AssetSent[] = [
  { asset: "BTC", social: 82, news: 78, onchain: 72, overall: 77, trend: "up", signal: "BULLISH", spark: spark(1, 0.6) },
  { asset: "ETH", social: 71, news: 74, onchain: 68, overall: 71, trend: "flat", signal: "BULLISH", spark: spark(2, 0.1) },
  { asset: "SOL", social: 88, news: 71, onchain: 65, overall: 75, trend: "upup", signal: "BULLISH", spark: spark(3, 1.1) },
  { asset: "BNB", social: 54, news: 58, onchain: 61, overall: 58, trend: "flat", signal: "NEUTRAL", spark: spark(4, 0) },
  { asset: "LINK", social: 67, news: 62, onchain: 59, overall: 63, trend: "up", signal: "BULLISH", spark: spark(5, 0.4) },
  { asset: "AVAX", social: 49, news: 52, onchain: 55, overall: 52, trend: "down", signal: "NEUTRAL", spark: spark(6, -0.5) },
];

export const TIMELINE = Array.from({ length: 7 * 6 }, (_, i) => {
  const t = i / (7 * 6);
  return {
    t: i,
    label: `D${Math.floor(i / 6) + 1}`,
    BTC: Math.round(55 + Math.sin(t * 6) * 15 + t * 12),
    ETH: Math.round(50 + Math.cos(t * 5) * 12 + t * 8),
    SOL: Math.round(48 + Math.sin(t * 8 + 1) * 18 + t * 18),
  };
});

export const TIMELINE_EVENTS = [
  { t: 8, label: "ETF inflow $420M" },
  { t: 22, label: "Fed dovish" },
  { t: 32, label: "EU scrutiny" },
];

export const HEATMAP_ASSETS = ["BTC", "ETH", "SOL", "BNB", "LINK", "AVAX", "DOGE"];
export const HEATMAP = HEATMAP_ASSETS.map((a, ai) => ({
  asset: a,
  hours: Array.from({ length: 24 }, (_, h) => {
    const base = 30 + Math.sin((h - 6) / 3) * 30 + Math.cos(ai + h / 4) * 20;
    return Math.max(5, Math.min(100, Math.round(base + ai * 4)));
  }),
}));

export type NewsItem = {
  time: string;
  source: string;
  headline: string;
  tone: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  stars: number;
  category: "Macro" | "Crypto" | "Regulatory" | "Technical";
  assets: string[];
  highImpact?: boolean;
};

export const NEWS: NewsItem[] = [
  { time: "14:42", source: "Bloomberg", headline: "BlackRock spot ETF posts $420M daily inflow — record week", tone: "POSITIVE", stars: 5, category: "Crypto", assets: ["BTC"], highImpact: true },
  { time: "13:18", source: "Reuters", headline: "Fed minutes signal rate pause likely in Q3", tone: "POSITIVE", stars: 4, category: "Macro", assets: ["BTC", "ETH"], highImpact: true },
  { time: "12:05", source: "CoinDesk", headline: "Solana network records all-time-high active addresses", tone: "POSITIVE", stars: 4, category: "Technical", assets: ["SOL"] },
  { time: "11:30", source: "FT", headline: "EU regulator opens probe into stablecoin reserves", tone: "NEGATIVE", stars: 3, category: "Regulatory", assets: ["USDT"], highImpact: true },
  { time: "10:47", source: "The Block", headline: "Ethereum L2 TVL crosses $42B mark", tone: "POSITIVE", stars: 3, category: "Crypto", assets: ["ETH"] },
  { time: "09:22", source: "WSJ", headline: "US Treasury yields slip ahead of CPI print", tone: "NEUTRAL", stars: 2, category: "Macro", assets: ["BTC"] },
  { time: "08:10", source: "Decrypt", headline: "Chainlink CCIP integrates with major bank pilot", tone: "POSITIVE", stars: 3, category: "Crypto", assets: ["LINK"] },
  { time: "07:34", source: "Cointelegraph", headline: "BNB Chain hard fork scheduled for next week", tone: "NEUTRAL", stars: 2, category: "Technical", assets: ["BNB"] },
];
