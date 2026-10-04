import { useQuery } from "@tanstack/react-query";
import { dnaAdapter, type DnaProfileUI } from "@/adapters/backend/dna.adapter";

export function useDnaProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["dna", "profile", userId],
    queryFn: () => dnaAdapter.profile(userId ?? "me"),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export type DnaProfile = DnaProfileUI;
