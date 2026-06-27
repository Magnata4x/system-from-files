import { useLivePrices, type CoinPrice } from "./useLivePrices";

export function usePrice(symbol: string): CoinPrice | null {
  const { prices } = useLivePrices();
  return prices[symbol] ?? null;
}
