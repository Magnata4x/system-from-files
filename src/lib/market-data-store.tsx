import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { getMarketSnapshot } from "@/lib/market.functions";
import {
  MARKET_ASSETS,
  MARKET_BINANCE_SYMBOLS,
  isValidBinanceSymbol,
  MARKET_EXCHANGE,
  MARKET_INSTRUMENT,
} from "@/lib/market-symbols";

export interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  pair: string;
  exchange: typeof MARKET_EXCHANGE;
  instrument: typeof MARKET_INSTRUMENT;
  price: number;
  change24h: number | null;
  marketCap: number | null;
  volume24h: number | null;
  high24h: number | null;
  low24h: number | null;
  lastUpdated: Date;
}

export interface GlobalMetrics {
  totalMarketCap: number | null;
  totalVolume: number | null;
  btcDominance: number | null;
  marketCapChange24h: number | null;
  updatedAt: number | null;
}

export interface FearGreed {
  value: number;
  label: string;
  history: { value: number; label: string; timestamp: number }[];
  updatedAt: number | null;
}

export type MarketStatus = "loading" | "ok" | "stale" | "unavailable" | "error";
export type MetadataStatus = "loading" | "ok" | "stale" | "unavailable";

export interface MarketDataState {
  prices: Record<string, CoinPrice>;
  global: GlobalMetrics | null;
  fearGreed: FearGreed | null;
  loading: boolean;
  error: string | null;
  status: MarketStatus;
  lastUpdate: Date | null;
  lastTickAt: Date | null;
  metadataUpdatedAt: Date | null;
  metadataFetchedAt: Date | null;
  metadataStatus: MetadataStatus;
  refresh: () => Promise<void>;
}

interface BinanceTicker {
  symbol?: string;
  lastPrice?: string;
  priceChangePercent?: string;
  quoteVolume?: string;
  volume?: string;
  highPrice?: string;
  lowPrice?: string;
  eventTime?: number;
  E?: number;
  c?: string;
  P?: string;
  q?: string;
  v?: string;
  h?: string;
  l?: string;
}

const BINANCE_REST = "https://api.binance.com/api/v3/ticker/24hr";
const BINANCE_WS = "wss://stream.binance.com:9443/stream?streams=";
const STALE_AFTER_MS = 30_000;
const METADATA_TTL_MS = 60_000;
const METADATA_STALE_AFTER_MS = 5 * 60_000;
const FALLBACK_POLL_MS = 30_000;

function parseNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function buildBinanceRestUrl(symbols = MARKET_BINANCE_SYMBOLS): string {
  const valid = symbols.filter(isValidBinanceSymbol);
  return `${BINANCE_REST}?symbols=${encodeURIComponent(JSON.stringify(valid))}`;
}

export function buildBinanceStreamUrl(symbols = MARKET_BINANCE_SYMBOLS): string {
  const valid = symbols.filter(isValidBinanceSymbol);
  return BINANCE_WS + valid.map((symbol) => `${symbol.toLowerCase()}@ticker`).join("/");
}

export function normalizeBinanceTicker(ticker: BinanceTicker): CoinPrice | null {
  const symbol = String(ticker.symbol ?? "").toUpperCase();
  if (!isValidBinanceSymbol(symbol)) return null;
  const asset = MARKET_ASSETS.find((item) => item.binanceSymbol === symbol);
  if (!asset) return null;

  const price = parseNumber(ticker.lastPrice ?? ticker.c);
  if (price == null || !(price > 0)) return null;

  return {
    id: asset.symbol.toLowerCase(),
    symbol: asset.symbol,
    name: asset.name,
    pair: asset.pair,
    exchange: MARKET_EXCHANGE,
    instrument: MARKET_INSTRUMENT,
    price,
    change24h: parseNumber(ticker.priceChangePercent ?? ticker.P),
    marketCap: null,
    volume24h: parseNumber(ticker.quoteVolume ?? ticker.q),
    high24h: parseNumber(ticker.highPrice ?? ticker.h),
    low24h: parseNumber(ticker.lowPrice ?? ticker.l),
    lastUpdated: new Date(parseNumber(ticker.eventTime ?? ticker.E) ?? Date.now()),
  };
}

export function deriveMetadataStatus(
  lastSuccessAt: number | null,
  hasMetadata: boolean,
  now = Date.now(),
): MetadataStatus {
  if (!hasMetadata) return "unavailable";
  if (lastSuccessAt == null) return "stale";
  return now - lastSuccessAt > METADATA_STALE_AFTER_MS ? "stale" : "ok";
}

export function deriveMarketStatus(
  lastTickAt: number | null,
  hasPrices: boolean,
  now = Date.now(),
): MarketStatus {
  if (!hasPrices) return "unavailable";
  if (lastTickAt == null) return "loading";
  return now - lastTickAt > STALE_AFTER_MS ? "stale" : "ok";
}

class MarketDataStore {
  private listeners = new Set<() => void>();
  private state: MarketDataState = {
    prices: {},
    global: null,
    fearGreed: null,
    loading: true,
    error: null,
    status: "loading",
    lastUpdate: null,
    lastTickAt: null,
    metadataUpdatedAt: null,
    metadataFetchedAt: null,
    metadataStatus: "loading",
    refresh: () => this.refresh(),
  };
  private started = false;
  private socket: WebSocket | null = null;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private staleTimer: ReturnType<typeof setInterval> | null = null;
  private metadataTimer: ReturnType<typeof setInterval> | null = null;
  private metadataAt = 0;
  private visible = true;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): MarketDataState => this.state;

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private patch(patch: Partial<MarketDataState>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.visible = document.visibilityState === "visible";
    document.addEventListener("visibilitychange", this.onVisibility);
    if (this.visible) {
      void this.refresh();
      this.startMetadataTimer();
    }
    this.staleTimer = setInterval(() => this.updateStatus(), 5_000);
  }

  stop() {
    if (!this.started) return;
    this.started = false;
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.stopSocket();
    this.stopFallback();
    if (this.staleTimer) clearInterval(this.staleTimer);
    this.staleTimer = null;
    this.stopMetadataTimer();
  }

  private onVisibility = () => {
    const visible = document.visibilityState === "visible";
    this.visible = visible;
    if (!visible) {
      this.stopSocket();
      this.stopFallback();
      this.stopMetadataTimer();
      return;
    }
    this.startMetadataTimer();
    void this.refresh();
  };

  private stopSocket() {
    if (!this.socket) return;
    this.socket.onopen = null;
    this.socket.onmessage = null;
    this.socket.onerror = null;
    this.socket.onclose = null;
    try {
      this.socket.close();
    } catch {
      /* ignore */
    }
    this.socket = null;
  }

  private stopFallback() {
    if (this.fallbackTimer) clearInterval(this.fallbackTimer);
    this.fallbackTimer = null;
  }

  private startMetadataTimer() {
    if (this.metadataTimer || !this.visible) return;
    this.metadataTimer = setInterval(() => void this.refreshMetadata(), METADATA_TTL_MS);
  }

  private stopMetadataTimer() {
    if (this.metadataTimer) clearInterval(this.metadataTimer);
    this.metadataTimer = null;
  }

  private startFallback() {
    if (this.fallbackTimer || !this.visible) return;
    this.fallbackTimer = setInterval(() => void this.refreshPrices(), FALLBACK_POLL_MS);
  }

  async refresh() {
    if (!this.visible) return;
    await this.refreshPrices();
    await this.refreshMetadata();
    this.connectSocket();
  }

  private async refreshPrices() {
    if (!this.visible) return;
    try {
      const response = await fetch(buildBinanceRestUrl(), {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Binance ${response.status}`);
      const raw = (await response.json()) as BinanceTicker[];
      const next: Record<string, CoinPrice> = {};
      for (const ticker of raw) {
        const price = normalizeBinanceTicker(ticker);
        if (price) next[price.symbol] = price;
      }
      if (!Object.keys(next).length) throw new Error("Binance retornou zero símbolos válidos");
      const latest = Math.max(...Object.values(next).map((item) => item.lastUpdated.getTime()));
      this.patch({
        prices: next,
        loading: false,
        error: null,
        status: "ok",
        lastUpdate: new Date(latest),
        lastTickAt: new Date(latest),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.patch({
        loading: false,
        error: "Falha ao atualizar dados de mercado.",
        status: Object.keys(this.state.prices).length ? "stale" : "error",
      });
      this.startFallback();
      console.warn("[market-data] Binance REST falhou:", message);
    }
  }

  private async refreshMetadata() {
    if (!this.visible || Date.now() - this.metadataAt < METADATA_TTL_MS) return;
    this.metadataAt = Date.now();
    this.patch({ metadataStatus: "loading" });

    try {
      const snapshot = await getMarketSnapshot();
      const global = snapshot.global
        ? {
            totalMarketCap: snapshot.global.totalMarketCap,
            totalVolume: snapshot.global.totalVolume,
            btcDominance: snapshot.global.btcDominance,
            marketCapChange24h: snapshot.global.marketCapChange24h,
            updatedAt: snapshot.global.updatedAt,
          }
        : this.state.global;
      const fearGreed = snapshot.fearGreed
        ? {
            value: snapshot.fearGreed.value,
            label: snapshot.fearGreed.label,
            history: snapshot.fearGreed.history,
            updatedAt: snapshot.fearGreed.updatedAt,
          }
        : this.state.fearGreed;
      const metadataUpdatedAt = snapshot.metadataUpdatedAt
        ? new Date(snapshot.metadataUpdatedAt)
        : this.state.metadataUpdatedAt;
      const hasAny = Boolean(global || fearGreed);
      const complete = Boolean(snapshot.global && snapshot.fearGreed);
      this.patch({
        global,
        fearGreed,
        metadataUpdatedAt,
        metadataFetchedAt: new Date(),
        metadataStatus: complete ? "ok" : hasAny ? "stale" : "unavailable",
      });
    } catch (error) {
      console.warn("[market-data] metadados indisponíveis:", error);
      this.patch({
        metadataStatus: this.state.global || this.state.fearGreed ? "stale" : "unavailable",
      });
    }
  }

  private connectSocket() {
    if (!this.visible || this.socket || typeof WebSocket === "undefined") return;
    const socket = new WebSocket(buildBinanceStreamUrl());
    this.socket = socket;

    socket.onopen = () => {
      this.stopFallback();
      this.patch({ error: null });
    };

    socket.onmessage = (event) => {
      let payload: { data?: BinanceTicker };
      try {
        payload = JSON.parse(event.data as string) as { data?: BinanceTicker };
      } catch {
        return;
      }
      const ticker = payload.data;
      if (!ticker) return;
      const price = normalizeBinanceTicker(ticker);
      if (!price) return;
      const prices = { ...this.state.prices, [price.symbol]: price };
      const tickAt = price.lastUpdated.getTime();
      this.patch({
        prices,
        loading: false,
        error: null,
        status: "ok",
        lastUpdate: price.lastUpdated,
        lastTickAt: new Date(tickAt),
      });
    };

    socket.onerror = () => {
      this.patch({
        error: "WebSocket Binance indisponível; usando atualização periódica.",
        status: Object.keys(this.state.prices).length ? "stale" : "error",
      });
      this.stopSocket();
      this.startFallback();
    };

    socket.onclose = () => {
      this.socket = null;
      if (this.visible) this.startFallback();
    };
  }

  private updateStatus() {
    const hasPrices = Object.keys(this.state.prices).length > 0;
    const metadataStatus = deriveMetadataStatus(
      this.state.metadataFetchedAt?.getTime() ?? null,
      Boolean(this.state.global || this.state.fearGreed),
    );
    if (metadataStatus !== this.state.metadataStatus && metadataStatus !== "loading") {
      this.patch({ metadataStatus });
    }
    const status = deriveMarketStatus(this.state.lastTickAt?.getTime() ?? null, hasPrices);
    if (status !== "loading" || this.state.loading) {
      if (status !== this.state.status && !(this.state.status === "error" && !hasPrices)) {
        this.patch({ status });
      }
    }
  }
}

const marketStore = new MarketDataStore();
const MarketDataContext = createContext<MarketDataStore | null>(null);

export function MarketDataProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    marketStore.start();
    return () => marketStore.stop();
  }, []);

  return <MarketDataContext.Provider value={marketStore}>{children}</MarketDataContext.Provider>;
}

export function useMarketData(): MarketDataState {
  const store = useContext(MarketDataContext);
  if (!store) throw new Error("useMarketData deve ser usado dentro de MarketDataProvider");
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export const MARKET_STALE_AFTER_MS = STALE_AFTER_MS;
export const MARKET_METADATA_STALE_AFTER_MS = METADATA_STALE_AFTER_MS;
