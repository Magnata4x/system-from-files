// src/hooks/useMarketSnapshot.ts
// Produz um MarketSnapshot com dados reais de Fear&Greed e BTC Dominance
// (e candles D1 do BTC) para consumo pelos engines.
import { useLivePrices } from "./useLivePrices";
import { useBTCCandles } from "./useBTCCandles";
import { mockBTCSnapshot, calcRSI, type MarketSnapshot } from "@/lib/engine-scoring";

// CORREÇÃO: snapshot degradado é explicitamente marcado como isLive: false
// para que consumidores (DNA Auto-corrector, Bot4x store) possam recusar
// operar sobre dados mock em vez de agir silenciosamente sobre valores fixos.
export type SnapshotSource = "mock" | "live";

export function useMarketSnapshot(symbol?: string): {
  snapshot: MarketSnapshot;
  isLive: boolean;
  source: SnapshotSource;
} {
  const { prices, global, fearGreed, loading } = useLivePrices();
  const btcCandles = useBTCCandles(35);

  // CORREÇÃO: RSI calculado a partir dos candles reais quando disponíveis.
  // Antes, snapshot.rsi era sempre o valor fixo do mockBTCSnapshot (64),
  // mesmo no path "isLive: true", porque ...mockBTCSnapshot sobrescrevia com 64.
  const liveRsi = btcCandles.length >= 15 ? calcRSI(btcCandles, 14) : mockBTCSnapshot.rsi;

  if (loading || !global || !fearGreed) {
    return {
      snapshot: {
        ...mockBTCSnapshot,
        rsi: liveRsi,
        btcCandles: btcCandles.length ? btcCandles : mockBTCSnapshot.btcCandles,
      },
      isLive: false,
      source: "mock",
    };
  }

  const price = symbol && prices[symbol]?.price ? prices[symbol].price : mockBTCSnapshot.price;

  const snapshot: MarketSnapshot = {
    ...mockBTCSnapshot,
    price,
    triggerPrice: price,
    rsi: liveRsi,
    fearGreedIndex: fearGreed.value,
    btcDominance: global.btcDominance,
    btcCandles: btcCandles.length ? btcCandles : mockBTCSnapshot.btcCandles,
  };

  return { snapshot, isLive: true, source: "live" };
}
