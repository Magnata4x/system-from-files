import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface MarketHistoryPoint {
  capturedAt: string;
  totalMarketCap: number | null;
  totalVolume: number | null;
  btcDominance: number | null;
  marketCapChange24h: number | null;
}

export interface MarketHistory {
  periodStart: string;
  generatedAt: string;
  source: string;
  points: MarketHistoryPoint[];
}

export function useMarketHistory(days = 30) {
  return useQuery({
    queryKey: ["market", "history", days],
    queryFn: () => api.get<MarketHistory>(`/market/history?days=${days}`),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
