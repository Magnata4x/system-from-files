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
  change24h: number;
  marketCap: number | null;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export interface GlobalMetricsDTO {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  marketCapChange24h: number;
}

export interface FearGreedDTO {
  value: number;
  label: string;
}

export interface MarketSnapshotDTO {
  prices: Record<string, CoinPriceDTO>;
  global: GlobalMetricsDTO | null;
  fearGreed: FearGreedDTO | null;
  fetchedAt: number;
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
        price: Number(c.current_price ?? 0),
        change24h: Number(c.price_change_percentage_24h ?? 0),
        marketCap: Number(c.market_cap ?? 0),
        volume24h: Number(c.total_volume ?? 0),
        high24h: Number(c.high_24h ?? 0),
        low24h: Number(c.low_24h ?? 0),
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
    const totalMarketCap = (g.total_market_cap as Record<string, number> | undefined)?.usd ?? 0;
    const totalVolume = (g.total_volume as Record<string, number> | undefined)?.usd ?? 0;
    const btcDominance =
      (g.market_cap_percentage as Record<string, number> | undefined)?.btc ?? 0;
    global = {
      totalMarketCap,
      totalVolume,
      btcDominance,
      marketCapChange24h: Number(g.market_cap_change_percentage_24h_usd ?? 0),
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
            price: Number(t.lastPrice ?? 0),
            change24h: Number(t.priceChangePercent ?? 0),
            marketCap: null,
            volume24h: Number(t.quoteVolume ?? 0),
            high24h: Number(t.highPrice ?? 0),
            low24h: Number(t.lowPrice ?? 0),
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
  const res = await fetch("https://api.alternative.me/fng/?limit=1");
  if (!res.ok) return null;
  const fg = ((await res.json()) as { data?: Array<{ value: string; value_classification: string }> })
    .data?.[0];
  if (!fg) return null;
  return { value: parseInt(fg.value, 10), label: fg.value_classification };
}

export const getMarketSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketSnapshotDTO> => {
    const [pricesAndGlobal, fearGreed] = await Promise.all([
      cachedJson("market:prices+global", PRICES_TTL, loadPricesAndGlobal),
      cachedJson("market:feargreed", SENTIMENT_TTL, loadFearGreed),
    ]);
    return {
      prices: pricesAndGlobal.prices,
      global: pricesAndGlobal.global,
      fearGreed,
      fetchedAt: Date.now(),
    };
  },
);
