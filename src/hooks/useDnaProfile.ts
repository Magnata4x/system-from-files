import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface DnaProfile {
  userId: string;
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
