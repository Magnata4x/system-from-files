import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface ScoreDistributionBucket {
  from: number;
  to: number;
  n: number;
}

export interface ScoreDistributionGroup {
  asset: string;
  timeframe: string;
  buckets: ScoreDistributionBucket[];
  n: number;
}

export interface ScoreDistribution {
  periodStart: string;
  generatedAt: string;
  latestDataAt: string | null;
  truncated: boolean;
  groups: ScoreDistributionGroup[];
  total: number;
}

export function useScoreDistribution() {
  return useQuery({
    queryKey: ["market", "score-distribution", "7d"],
    queryFn: () => api.get<ScoreDistribution>("/market/score-distribution"),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
