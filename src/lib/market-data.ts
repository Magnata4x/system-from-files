// Dados reais de mercado via Binance public API (klines).
// Sem autenticação. Usado pelo Calibrador para backtests reais.

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

/** Top 20 criptos pareadas com USDT na Binance (por capitalização de mercado). */
export const TOP_20_USDT_PAIRS: { symbol: string; label: string }[] = [
  { symbol: "BTCUSDT", label: "Bitcoin (BTC)" },
  { symbol: "ETHUSDT", label: "Ethereum (ETH)" },
  { symbol: "BNBUSDT", label: "BNB" },
  { symbol: "SOLUSDT", label: "Solana (SOL)" },
  { symbol: "XRPUSDT", label: "XRP" },
  { symbol: "ADAUSDT", label: "Cardano (ADA)" },
  { symbol: "DOGEUSDT", label: "Dogecoin (DOGE)" },
  { symbol: "TRXUSDT", label: "TRON (TRX)" },
  { symbol: "AVAXUSDT", label: "Avalanche (AVAX)" },
  { symbol: "LINKUSDT", label: "Chainlink (LINK)" },
  { symbol: "DOTUSDT", label: "Polkadot (DOT)" },
  { symbol: "MATICUSDT", label: "Polygon (MATIC)" },
  { symbol: "TONUSDT", label: "Toncoin (TON)" },
  { symbol: "SHIBUSDT", label: "Shiba Inu (SHIB)" },
  { symbol: "LTCUSDT", label: "Litecoin (LTC)" },
  { symbol: "BCHUSDT", label: "Bitcoin Cash (BCH)" },
  { symbol: "UNIUSDT", label: "Uniswap (UNI)" },
  { symbol: "ATOMUSDT", label: "Cosmos (ATOM)" },
  { symbol: "XLMUSDT", label: "Stellar (XLM)" },
  { symbol: "NEARUSDT", label: "NEAR Protocol (NEAR)" },
];

const BINANCE_HOSTS = [
  "https://api.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://data-api.binance.vision",
];

export type KlineInterval = "1h" | "4h" | "1d";

/** Busca klines reais da Binance, com fallback entre hosts. */
export async function fetchKlines(
  symbol: string,
  interval: KlineInterval,
  limit: number,
  opts?: { startTime?: number; endTime?: number },
): Promise<Candle[]> {
  const lim = Math.max(1, Math.min(1000, limit));
  let lastErr: unknown = null;
  for (const host of BINANCE_HOSTS) {
    try {
      const qs = new URLSearchParams({
        symbol,
        interval,
        limit: String(lim),
      });
      if (opts?.startTime) qs.set("startTime", String(opts.startTime));
      if (opts?.endTime) qs.set("endTime", String(opts.endTime));
      const url = `${host}/api/v3/klines?${qs.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = new Error(`Binance ${res.status}`);
        continue;
      }
      const raw = (await res.json()) as unknown[];
      if (!Array.isArray(raw)) continue;
      return raw.map((row) => {
        const r = row as (string | number)[];
        return {
          openTime: Number(r[0]),
          open: Number(r[1]),
          high: Number(r[2]),
          low: Number(r[3]),
          close: Number(r[4]),
          volume: Number(r[5]),
          closeTime: Number(r[6]),
        };
      });
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `Falha ao obter dados de mercado para ${symbol}: ${(lastErr as Error)?.message ?? "rede indisponível"}`,
  );
}

/** Escolhe o intervalo e a quantidade de candles para o período em dias. */
export function planFetch(periodDays: number): { interval: KlineInterval; limit: number } {
  if (periodDays <= 7) return { interval: "1h", limit: Math.min(1000, periodDays * 24) };
  if (periodDays <= 60) return { interval: "4h", limit: Math.min(1000, periodDays * 6) };
  return { interval: "1d", limit: Math.min(1000, periodDays) };
}
