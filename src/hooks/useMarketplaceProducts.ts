import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Product } from "@/lib/marketplace-data";

export type MarketplaceProduct = Product & { assets?: string[] };

/** Catálogo do Marketplace vindo do backend interno (/api/marketplace/products). */
export function useMarketplaceProducts() {
  return useQuery({
    queryKey: ["marketplace", "products"],
    queryFn: () => api.get<MarketplaceProduct[]>("/marketplace/products"),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export interface MarketplaceViewEntry {
  productId: string;
  viewedAt: string;
}

/** Histórico de produtos abertos por este usuário. */
export function useMarketplaceHistory() {
  return useQuery({
    queryKey: ["marketplace", "history"],
    queryFn: () => api.get<MarketplaceViewEntry[]>("/marketplace/history"),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useTrackMarketplaceView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => api.post("/marketplace/history", { productId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace", "history"] }),
  });
}
