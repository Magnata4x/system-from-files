import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

export function usePrices(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPrice = async () => {
      try {
        const response = await apiClient.get<{ price: number }>(`/prices/${symbol}`);
        if (!cancelled) setPrice(response.data.price);
      } catch (error) {
        console.error("Erro ao buscar preço:", error);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbol]);

  return price;
}
