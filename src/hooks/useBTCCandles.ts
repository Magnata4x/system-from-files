// src/hooks/useBTCCandles.ts
// Busca candles OHLCV reais do BTCUSDT via Binance para popular btcCandles
// no engine Position (calcBTCCorrelation requer mín. 10 candles).
import { useQuery } from "@tanstack/react-query";
import { fetchKlines } from "@/lib/market-data";
import type { OHLCV } from "@/lib/engine-scoring";

export function useBTCCandles(limit = 35): OHLCV[] {
  const { data } = useQuery({
    queryKey: ["btc-candles-position", limit],
    queryFn: async () => {
      const candles = await fetchKlines("BTCUSDT", "1d", limit);
      return candles.map<OHLCV>((c) => ({
        time: c.openTime ?? 0,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));
    },
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
  return data ?? [];
}
