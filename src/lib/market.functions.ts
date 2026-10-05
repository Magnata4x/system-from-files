// Server functions para metadados globais de mercado (CoinGecko) e Fear & Greed.
// Preços operacionais ficam exclusivamente no MarketDataStore via Binance spot.
// Cache compartilhado via Cloudflare `caches.default` — ver `src/lib/cache.ts`.
import { createServerFn } from "@tanstack/react-start";
import { cachedJson } from "./cache";
import { MARKET_BINANCE_SYMBOLS } from "./market-symbols";

export interface CoinPriceDTO {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number | null;
  marketCap: number | null;
  volume24h: number | null;
  high24h: number | null;
  low24h: number | null;
}

export interface GlobalMetricsDTO {
  totalMarketCap: number | null;
  totalVolume: number | null;
  btcDominance: number | null;
  marketCapChange24h: number | null;
  updatedAt: number | null;
}

export interface FearGreedDTO {
  value: number;
  label: string;
  updatedAt: number | null;
  history: { value: number; label: string; timestamp: number }[];
}

export interface MarketSnapshotDTO {
  prices: Record<string, CoinPriceDTO>;
  global: GlobalMetricsDTO | null;
  fearGreed: FearGreedDTO | null;
  fetchedAt: number;
  metadataUpdatedAt: number | null;
}

function finiteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const PRICES_TTL = Number(process.env.CACHE_TTL_PRICES_SECONDS ?? 5);
const SENTIMENT_TTL = Number(process.env.CACHE_TTL_SENTIMENT_SECONDS ?? 60);

async function loadPricesAndGlobal(): Promise<{
  prices: Record<string, CoinPriceDTO>;
  global: GlobalMetricsDTO | null;
}> {
  // Binance é a única fonte de preços do universo operacional.
  // CoinGecko fica restrito aos metadados globais.
  const [binanceRes, globalRes] = await Promise.allSettled([
    fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(MARKET_BINANCE_SYMBOLS))}`,
    ),
    fetch("https://api.coingecko.com/api/v3/global"),
  ]);

  const prices: Record<string, CoinPriceDTO> = {};
  if (binanceRes.status === "fulfilled" && binanceRes.value.ok) {
    const data = (await binanceRes.value.json()) as Array<Record<string, unknown>>;
    for (const ticker of data) {
      const binanceSymbol = String(ticker.symbol ?? "").toUpperCase();
      const asset = MARKET_BINANCE_SYMBOLS.includes(
        binanceSymbol as (typeof MARKET_BINANCE_SYMBOLS)[number],
      );
      if (!asset) continue;

      const price = finiteNumber(ticker.lastPrice);
      if (price == null || !(price > 0)) continue;

      const symbol = binanceSymbol.replace(/USDT$/, "");
      prices[symbol] = {
        id: symbol.toLowerCase(),
        symbol,
        name: symbol,
        price,
        change24h: finiteNumber(ticker.priceChangePercent),
        marketCap: null,
        volume24h: finiteNumber(ticker.quoteVolume),
        high24h: finiteNumber(ticker.highPrice),
        low24h: finiteNumber(ticker.lowPrice),
      };
    }
  } else if (binanceRes.status === "fulfilled") {
    console.warn(`[market] Binance prices HTTP ${binanceRes.value.status}`);
  } else {
    console.warn("[market] Binance prices failed:", binanceRes.reason);
  }

  let global: GlobalMetricsDTO | null = null;
  if (globalRes.status === "fulfilled" && globalRes.value.ok) {
    const g = ((await globalRes.value.json()) as { data?: Record<string, unknown> }).data ?? {};
    const totalMarketCap = finiteNumber(
      (g.total_market_cap as Record<string, unknown> | undefined)?.usd,
    );
    const totalVolume = finiteNumber((g.total_volume as Record<string, unknown> | undefined)?.usd);
    const btcDominance = finiteNumber(
      (g.market_cap_percentage as Record<string, unknown> | undefined)?.btc,
    );
    const dateHeader = globalRes.value.headers.get("date");
    const headerTime = dateHeader ? Date.parse(dateHeader) : NaN;
    global = {
      totalMarketCap,
      totalVolume,
      btcDominance,
      marketCapChange24h: finiteNumber(g.market_cap_change_percentage_24h_usd),
      updatedAt: Number.isFinite(headerTime) ? headerTime : Date.now(),
    };
  } else if (globalRes.status === "fulfilled") {
    console.warn(`[market] CoinGecko global HTTP ${globalRes.value.status}`);
  } else {
    console.warn("[market] CoinGecko global failed:", globalRes.reason);
  }

  return { prices, global };
}

async function loadFearGreed(): Promise<FearGreedDTO | null> {
  const res = await fetch("https://api.alternative.me/fng/?limit=7");
  if (!res.ok) return null;
  const payload = (await res.json()) as {
    data?: Array<{ value: string; value_classification: string; timestamp?: string }>;
  };
  const history = (payload.data ?? [])
    .map((item) => ({
      value: Number.parseInt(item.value, 10),
      label: item.value_classification,
      timestamp: Number(item.timestamp) * 1000,
    }))
    .filter((item) => Number.isFinite(item.value) && item.value >= 0 && item.value <= 100);
  const fg = history[0];
  if (!fg) return null;
  return {
    value: fg.value,
    label: fg.label,
    updatedAt: Number.isFinite(fg.timestamp) && fg.timestamp > 0 ? fg.timestamp : null,
    history,
  };
}

export const getMarketSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketSnapshotDTO> => {
    const [pricesAndGlobal, fearGreed] = await Promise.all([
      cachedJson("market:prices+global", PRICES_TTL, loadPricesAndGlobal),
      cachedJson("market:feargreed", SENTIMENT_TTL, loadFearGreed),
    ]);
    const metadataUpdatedAt = Math.max(
      pricesAndGlobal.global?.updatedAt ?? 0,
      fearGreed?.updatedAt ?? 0,
    );
    return {
      prices: pricesAndGlobal.prices,
      global: pricesAndGlobal.global,
      fearGreed,
      fetchedAt: Date.now(),
      metadataUpdatedAt: metadataUpdatedAt > 0 ? metadataUpdatedAt : null,
    };
  },
);
