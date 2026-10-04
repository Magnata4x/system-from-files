// Server functions para dados públicos de mercado (CoinGecko + Fear & Greed).
// Cache compartilhado via Cloudflare `caches.default` — ver `src/lib/cache.ts`.
// Sem credencial: endpoints públicos. Cache compartilhado entre TODOS os
// usuários no mesmo PoP, reduzindo dramaticamente as chamadas externas
// quando há concorrência.
import { createServerFn } from "@tanstack/react-start";
import { cachedJson } from "./cache";

const COIN_IDS = [
  "bitcoin", "ethereum", "tether", "binancecoin", "solana",
  "usd-coin", "ripple", "cardano", "avalanche-2", "dogecoin",
  "shiba-inu", "chainlink", "polkadot", "polygon", "bitcoin-cash",
  "near", "litecoin", "uniswap", "toncoin", "staked-ether",
].join(",");

const SYMBOL_MAP: Record<string, string> = {
  bitcoin: "BTC", ethereum: "ETH", tether: "USDT",
  binancecoin: "BNB", solana: "SOL", "usd-coin": "USDC",
  ripple: "XRP", cardano: "ADA", "avalanche-2": "AVAX",
  dogecoin: "DOGE", "shiba-inu": "SHIB", chainlink: "LINK",
  polkadot: "DOT", polygon: "MATIC", "bitcoin-cash": "BCH",
  near: "NEAR", litecoin: "LTC", uniswap: "UNI",
  toncoin: "TON", "staked-ether": "STETH",
};

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
  const [coinsRes, globalRes] = await Promise.allSettled([
    fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS}&order=market_cap_desc&per_page=20&sparkline=false&price_change_percentage=24h`,
    ),
    fetch("https://api.coingecko.com/api/v3/global"),
  ]);

  const prices: Record<string, CoinPriceDTO> = {};
  if (coinsRes.status === "fulfilled" && coinsRes.value.ok) {
    const data = (await coinsRes.value.json()) as Array<Record<string, unknown>>;
    for (const c of data) {
      const id = String(c.id);
      const sym = SYMBOL_MAP[id] ?? String(c.symbol ?? "").toUpperCase();
      prices[sym] = {
        id,
        symbol: sym,
        name: String(c.name ?? ""),
        price: finiteNumber(c.current_price) ?? 0,
        change24h: finiteNumber(c.price_change_percentage_24h),
        marketCap: finiteNumber(c.market_cap),
        volume24h: finiteNumber(c.total_volume),
        high24h: finiteNumber(c.high_24h),
        low24h: finiteNumber(c.low_24h),
      };
    }
  } else if (coinsRes.status === "fulfilled") {
    console.warn(`[market] CoinGecko coins HTTP ${coinsRes.value.status}`);
  } else {
    console.warn("[market] CoinGecko coins failed:", coinsRes.reason);
  }

  let global: GlobalMetricsDTO | null = null;
  if (globalRes.status === "fulfilled" && globalRes.value.ok) {
    const g = ((await globalRes.value.json()) as { data?: Record<string, unknown> }).data ?? {};
    const totalMarketCap = finiteNumber((g.total_market_cap as Record<string, unknown> | undefined)?.usd);
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
  }

  // Fallback Binance: preenche símbolos faltantes quando a CoinGecko falha
  // ou retorna parcial (típico em 429). Binance público não exige chave.
  // Pares USDT — pulamos stablecoins/derivados (USDT/USDC/STETH).
  const missing = Object.values(SYMBOL_MAP).filter(
    (sym) => !prices[sym] && !["USDT", "USDC", "STETH"].includes(sym),
  );
  if (missing.length > 0) {
    try {
      const symbolsParam = JSON.stringify(missing.map((s) => `${s}USDT`));
      const r = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`,
      );
      if (r.ok) {
        const arr = (await r.json()) as Array<Record<string, string>>;
        for (const t of arr) {
          const sym = String(t.symbol).replace(/USDT$/, "");
          if (prices[sym]) continue;
          prices[sym] = {
            id: sym.toLowerCase(),
            symbol: sym,
            name: sym,
            price: finiteNumber(t.lastPrice) ?? 0,
            change24h: finiteNumber(t.priceChangePercent),
            marketCap: null,
            volume24h: finiteNumber(t.quoteVolume),
            high24h: finiteNumber(t.highPrice),
            low24h: finiteNumber(t.lowPrice),
          };
        }
      } else {
        console.warn(`[market] Binance fallback HTTP ${r.status}`);
      }
    } catch (e) {
      console.warn("[market] Binance fallback failed:", e);
    }
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
