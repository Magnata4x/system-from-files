import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface SentimentAsset {
  asset: string;
  overall: number;
  trend: "up" | "upup" | "flat" | "down";
  signal: "BULLISH" | "NEUTRAL" | "BEARISH";
  spark: number[];
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentimentScore: number | null;
  tone: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  assets: string[];
}

export interface NewsSentiment {
  status: "ok" | "stale" | "unavailable";
  score: number | null;
  articleCount: number;
  updatedAt: string | null;
  source: "Marketaux" | null;
  articles: NewsItem[];
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
  news: NewsSentiment;
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

export interface SentimentAssetDetail {
  asset: string;
  pair: string;
  price: number;
  changePct: number;
  high: number;
  low: number;
  quoteVolume: number;
  series: { t: number; close: number }[];
  updatedAt: string;
}

export function useSentimentAsset(symbol: string | null) {
  return useQuery({
    queryKey: ["sentiment", "asset", symbol],
    queryFn: () => api.get<SentimentAssetDetail>(`/sentiment/asset/${encodeURIComponent(symbol ?? "")}`),
    enabled: !!symbol,
    staleTime: 30_000,
    retry: 1,
  });
}
