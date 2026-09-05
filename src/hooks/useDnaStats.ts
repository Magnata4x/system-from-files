import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface DnaStats {
  hasData: boolean;
  totalTrades: number;
  winRate: number;
  avgPnlPct: number;
  bestPair: string | null;
  worstPair: string | null;
  bestHour: number | null;
  worstHour: number | null;
  maxDrawdownPct: number;
  totalPnl: number;
  radar: { axis: string; you: number; bench: number }[];
  gauges: { label: string; value: number }[];
  heatmap: { date: string; value: number }[];
  evolution: { month: string; overall: number; emotional: number; note?: string }[];
  insights: { tone: "good" | "bad" | "warn"; icon: string; title: string; desc: string; action: string }[];
}

export function useDnaStats() {
  return useQuery({
    queryKey: ["dna", "stats"],
    queryFn: () => api.get<DnaStats>("/dna/stats"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
