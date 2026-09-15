import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface SentimentAsset {
  asset: string;
  social: number;
  news: number;
  onchain: number;
  overall: number;
  trend: "up" | "upup" | "flat" | "down";
  signal: "BULLISH" | "NEUTRAL" | "BEARISH";
  spark: number[];
}

export interface SentimentOverview {
  overall: number;
  bullBear: { bull: number; bear: number };
  advancers: number;
  decliners: number;
  topGainer: { asset: string; changePct: number } | null;
  topLoser: { asset: string; changePct: number } | null;
  quoteVolume24h: number;
  assets: SentimentAsset[];
  updatedAt: string;
}

export function useSentiment() {
  return useQuery({
    queryKey: ["sentiment", "overview"],
    queryFn: () => api.get<SentimentOverview>("/sentiment/overview"),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
