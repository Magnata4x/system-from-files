import { useState, useEffect, useCallback, useRef } from "react";
import { getMarketSnapshot } from "@/lib/market.functions";

export interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number | null;
  volume24h: number;
  high24h: number;
  low24h: number;
  lastUpdated: Date;
}

export interface GlobalMetrics {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  marketCapChange24h: number;
}

export interface FearGreed {
  value: number;
  label: string;
}

interface UseLivePricesReturn {
  prices: Record<string, CoinPrice>;
  global: GlobalMetrics | null;
  fearGreed: FearGreed | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => void;
}

const REFRESH_INTERVAL = 30_000; // 30 segundos
const SERVER_FN_RECOVERY_KEY = "market-server-fn-recovery";

export function useLivePrices(): UseLivePricesReturn {
  const [prices, setPrices] = useState<Record<string, CoinPrice>>({});
  const [global, setGlobal] = useState<GlobalMetrics | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const snap = await getMarketSnapshot();
      const now = new Date();
      const map: Record<string, CoinPrice> = {};
      for (const [sym, p] of Object.entries(snap.prices)) {
        map[sym] = { ...p, lastUpdated: now };
      }
      // Atualiza apenas o que veio com dados — preserva último valor bom
      // quando o upstream (CoinGecko) responde parcial/vazio (ex: 429).
      if (Object.keys(map).length > 0) setPrices(map);
      if (snap.global) setGlobal(snap.global);
      if (snap.fearGreed) setFearGreed(snap.fearGreed);
      sessionStorage.removeItem(SERVER_FN_RECOVERY_KEY);
      setError(null);
      setLastUpdate(now);
    } catch (err) {
      console.error("[useLivePrices] getMarketSnapshot falhou:", err);
      // Durante uma atualização do servidor, uma aba já aberta pode manter o
      // identificador anterior da server function. Uma única recarga recupera
      // o manifesto novo sem criar um ciclo caso a origem esteja indisponível.
      const message = err instanceof Error ? err.message : String(err);
      const staleServerFn = /Invalid server function ID|Server function info not found|returned 500/i.test(message);
      if (staleServerFn && sessionStorage.getItem(SERVER_FN_RECOVERY_KEY) !== "1") {
        sessionStorage.setItem(SERVER_FN_RECOVERY_KEY, "1");
        window.location.reload();
        return;
      }
      setError("Falha ao atualizar dados de mercado.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchAll]);

  return { prices, global, fearGreed, loading, error, lastUpdate, refresh: fetchAll };
}
