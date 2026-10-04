import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface DnaProfile {
  userId: string;
  hasProfile: boolean;
  consistency: number | null;
  discipline: number | null;
  riskControl: number | null;
  timing: number | null;
  emotionalControl: number | null;
  avgWinRate: number | null;
  bestSession: string | null;
  worstSession: string | null;
  overtradingRisk: boolean | null;
  tradingStyle: "conservative" | "moderate" | "aggressive" | null;
  [key: string]: unknown;
}

export function useDnaProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["dna", "profile", userId],
    queryFn: () => api.get<DnaProfile>(`/dna/profile/${userId}`),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
