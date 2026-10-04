export const MARKET_EXCHANGE = "binance" as const;
export const MARKET_INSTRUMENT = "spot" as const;
export const MARKET_QUOTE = "USDT" as const;

/**
 * Single operational universe shared by the engine and Dashboard.
 * These are Binance spot symbols; no stablecoins or derivatives are tracked.
 */
export const MARKET_PAIRS = [
  "BTC/USDT",
  "ETH/USDT",
  "BNB/USDT",
  "SOL/USDT",
  "XRP/USDT",
  "ADA/USDT",
  "AVAX/USDT",
  "DOT/USDT",
  "LINK/USDT",
  "LTC/USDT",
] as const;

export type MarketPair = (typeof MARKET_PAIRS)[number];

export interface MarketAsset {
  pair: MarketPair;
  symbol: string;
  name: string;
  binanceSymbol: string;
}

export const MARKET_ASSETS: readonly MarketAsset[] = [
  { pair: "BTC/USDT", symbol: "BTC", name: "Bitcoin", binanceSymbol: "BTCUSDT" },
  { pair: "ETH/USDT", symbol: "ETH", name: "Ethereum", binanceSymbol: "ETHUSDT" },
  { pair: "BNB/USDT", symbol: "BNB", name: "BNB", binanceSymbol: "BNBUSDT" },
  { pair: "SOL/USDT", symbol: "SOL", name: "Solana", binanceSymbol: "SOLUSDT" },
  { pair: "XRP/USDT", symbol: "XRP", name: "XRP", binanceSymbol: "XRPUSDT" },
  { pair: "ADA/USDT", symbol: "ADA", name: "Cardano", binanceSymbol: "ADAUSDT" },
  { pair: "AVAX/USDT", symbol: "AVAX", name: "Avalanche", binanceSymbol: "AVAXUSDT" },
  { pair: "DOT/USDT", symbol: "DOT", name: "Polkadot", binanceSymbol: "DOTUSDT" },
  { pair: "LINK/USDT", symbol: "LINK", name: "Chainlink", binanceSymbol: "LINKUSDT" },
  { pair: "LTC/USDT", symbol: "LTC", name: "Litecoin", binanceSymbol: "LTCUSDT" },
];

const VALID_SYMBOL = /^[A-Z0-9]{2,20}$/;

export function isValidBinanceSymbol(symbol: string): boolean {
  return VALID_SYMBOL.test(symbol) && symbol.endsWith(MARKET_QUOTE);
}

export function toBinanceSymbol(pair: string): string {
  return pair.replace("/", "").replace("-", "").toUpperCase();
}

export function toMarketPair(symbol: string): string {
  const normalized = symbol.toUpperCase();
  if (normalized.includes("/")) return normalized;
  if (normalized.endsWith(MARKET_QUOTE))
    return `${normalized.slice(0, -MARKET_QUOTE.length)}/${MARKET_QUOTE}`;
  return normalized;
}

export const MARKET_BINANCE_SYMBOLS = MARKET_ASSETS.map((asset) => asset.binanceSymbol);
