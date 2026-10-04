import {
  useMarketData,
  type CoinPrice,
  type GlobalMetrics,
  type FearGreed,
} from "@/lib/market-data-store";

export type { CoinPrice, GlobalMetrics, FearGreed };

export interface LivePricesState {
  prices: Record<string, CoinPrice>;
  global: GlobalMetrics | null;
  fearGreed: FearGreed | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
}

/**
 * Compatibility hook. The actual market connection lives in one provider/store,
 * so legacy consumers cannot create independent polling loops.
 */
export function useLivePrices(): LivePricesState {
  return useMarketData();
}
