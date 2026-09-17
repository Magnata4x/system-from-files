import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { CopyConfig } from "@/lib/copy-trading-data";

export interface CopyFollow {
  traderId: string;
  traderHandle: string | null;
  config: Partial<CopyConfig>;
  pnl: number;
  trades: number;
  winRate: number;
  since: string;
}

const KEY = ["copy", "follows"];

export function useCopyFollows() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<CopyFollow[]>("/copy/follows"),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useFollowTrader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { traderId: string; traderHandle: string; config: CopyConfig }) =>
      api.post<CopyFollow[]>("/copy/follows", input),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
}

export function useUnfollowTrader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (traderId: string) =>
      api.delete<CopyFollow[]>(`/copy/follows?traderId=${encodeURIComponent(traderId)}`),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
}
