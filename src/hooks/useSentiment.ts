import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { SentimentOverview } from "@/lib/server/sentiment.server";

export type { SentimentOverview };

export function useSentiment() {
  return useQuery({
    queryKey: ["sentiment", "overview"],
    queryFn: () => api.get<SentimentOverview>("/sentiment/overview"),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
