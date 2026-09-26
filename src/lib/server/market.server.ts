// Camada de mercado do backend interno: dados públicos da Binance + indicadores.
// Substitui o serviço BinanceService/MarketRegime do backend NestJS externo.

export const TARGET_PAIRS = [
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

const BINANCE = "https://api.binance.com";

export function toBinanceSymbol(pair: string): string {
  return pair.replace("/", "").replace("-", "").toUpperCase();
}

export function toPair(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.includes("/")) return s;
  if (s.endsWith("USDT")) return `${s.slice(0, -4)}/USDT`;
  return s;
}

interface CacheEntry {
  expires: number;
  value: unknown;
}
const cache = new Map<string, CacheEntry>();

async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await loader();
  cache.set(key, { expires: Date.now() + ttlMs, value });
  return value;
}

export interface Ticker {
  pair: string;
  symbol: string;
  price: number;
  changePct: number;
  volume: number;
  quoteVolume: number;
  high: number;
  low: number;
}

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function binanceFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BINANCE}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Binance ${res.status} em ${path}`);
  return (await res.json()) as T;
}

export async function getTickers(pairs: readonly string[] = TARGET_PAIRS): Promise<Ticker[]> {
  const symbols = pairs.map(toBinanceSymbol);
  return cached(`tickers:${symbols.join(",")}`, 15_000, async () => {
    const query = encodeURIComponent(JSON.stringify(symbols));
    const raw = await binanceFetch<Array<Record<string, string>>>(
      `/api/v3/ticker/24hr?symbols=${query}`,
    );
    return raw.map((t) => ({
      pair: toPair(t["symbol"] ?? ""),
      symbol: t["symbol"] ?? "",
      price: Number(t["lastPrice"] ?? 0),
      changePct: Number(t["priceChangePercent"] ?? 0),
      volume: Number(t["volume"] ?? 0),
      quoteVolume: Number(t["quoteVolume"] ?? 0),
      high: Number(t["highPrice"] ?? 0),
      low: Number(t["lowPrice"] ?? 0),
    }));
  });
}

export async function getTicker(pair: string): Promise<Ticker | null> {
  const [t] = await getTickers([pair]);
  return t ?? null;
}

export async function getKlines(pair: string, interval = "4h", limit = 200): Promise<Kline[]> {
  const symbol = toBinanceSymbol(pair);
  return cached(`klines:${symbol}:${interval}:${limit}`, 60_000, async () => {
    const raw = await binanceFetch<Array<Array<string | number>>>(
      `/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    );
    return raw.map((k) => ({
      openTime: Number(k[0]),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }));
  });
}

// ── Indicadores ────────────────────────────────────────────────────────────

export function rsi(closes: number[], period = 14): number {
  if (closes.length <= period) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return Math.round(100 - 100 / (1 + rs));
}

export function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  return values.reduce((acc, v, i) => (i === 0 ? v : v * k + acc * (1 - k)), 0);
}

export function atr(candles: Kline[], period = 14): number {
  if (candles.length < 2) return 0;
  const slice = candles.slice(-period - 1);
  let sum = 0;
  for (let i = 1; i < slice.length; i++) {
    const c = slice[i]!;
    const prev = slice[i - 1]!;
    sum += Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
  }
  return sum / (slice.length - 1);
}

export type Regime = "BULLISH" | "BEARISH" | "SIDEWAYS";

export interface MarketRegime {
  pair: string;
  regime: Regime;
  strength: number;
  rsi: number;
  volatility: number;
  price: number;
  emaFast: number;
  emaSlow: number;
  updatedAt: string;
}

export async function getMarketRegime(pair: string): Promise<MarketRegime> {
  const candles = await getKlines(pair, "4h", 200);
  const closes = candles.map((c) => c.close);
  const price = closes.at(-1) ?? 0;
  const fast = ema(closes.slice(-40), 20);
  const slow = ema(closes.slice(-100), 50);
  const r = rsi(closes);
  const volatility = price > 0 ? (atr(candles) / price) * 100 : 0;
  const spread = slow > 0 ? ((fast - slow) / slow) * 100 : 0;

  let regime: Regime = "SIDEWAYS";
  if (spread > 0.6 && r > 50) regime = "BULLISH";
  else if (spread < -0.6 && r < 50) regime = "BEARISH";

  return {
    pair: toPair(pair),
    regime,
    strength: Math.min(100, Math.round(Math.abs(spread) * 25)),
    rsi: r,
    volatility: Number(volatility.toFixed(2)),
    price,
    emaFast: fast,
    emaSlow: slow,
    updatedAt: new Date().toISOString(),
  };
}
