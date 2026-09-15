import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Product } from "@/lib/marketplace-data";

/** Catálogo do Marketplace vindo do backend interno (/api/marketplace/products). */
export function useMarketplaceProducts() {
  return useQuery({
    queryKey: ["marketplace", "products"],
    queryFn: () => api.get<Product[]>("/marketplace/products"),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
