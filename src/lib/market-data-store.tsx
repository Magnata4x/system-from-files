import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
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
  history: { value: number; label: string; timestamp: number }[];
}

export type MarketStatus = "loading" | "ok" | "stale" | "unavailable" | "error";

export interface MarketDataState {
  prices: Record<string, CoinPrice>;
  global: GlobalMetrics | null;
  fearGreed: FearGreed | null;
  loading: boolean;
  error: string | null;
  status: MarketStatus;
  lastUpdate: Date | null;
  lastTickAt: Date | null;
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
const COINGECKO_GLOBAL = "https://api.coingecko.com/api/v3/global";
const FEAR_GREED = "https://api.alternative.me/fng/?limit=7";
const STALE_AFTER_MS = 30_000;
const METADATA_TTL_MS = 60_000;
const FALLBACK_POLL_MS = 30_000;

function nowDate(): Date {
  return new Date();
}

function parseNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
  if (!(price > 0)) return null;

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
    lastUpdated: new Date(parseNumber(ticker.eventTime ?? ticker.E) || Date.now()),
  };
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
    refresh: () => this.refresh(),
  };
  private started = false;
  private socket: WebSocket | null = null;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private staleTimer: ReturnType<typeof setInterval> | null = null;
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
    if (this.visible) void this.refresh();
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
  }

  private onVisibility = () => {
    const visible = document.visibilityState === "visible";
    this.visible = visible;
    if (!visible) {
      this.stopSocket();
      this.stopFallback();
      return;
    }
    void this.refresh();
  };

  private stopSocket() {
    if (!this.socket) return;
    this.socket.onopen = null;
    this.socket.onmessage = null;
    this.socket.onerror = null;
    this.socket.onclose = null;
    try { this.socket.close(); } catch { /* ignore */ }
    this.socket = null;
  }

  private stopFallback() {
    if (this.fallbackTimer) clearInterval(this.fallbackTimer);
    this.fallbackTimer = null;
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
        lastTickAt: latest,
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
    const [globalResult, fearGreedResult] = await Promise.allSettled([
      fetch(COINGECKO_GLOBAL, { headers: { accept: "application/json" }, cache: "no-store" }),
      fetch(FEAR_GREED, { headers: { accept: "application/json" }, cache: "no-store" }),
    ]);

    let global = this.state.global;
    let fearGreed = this.state.fearGreed;

    if (globalResult.status === "fulfilled" && globalResult.value.ok) {
      const payload = (await globalResult.value.json()) as { data?: Record<string, unknown> };
      const data = payload.data ?? {};
      const cap = data.total_market_cap as Record<string, unknown> | undefined;
      const volume = data.total_volume as Record<string, unknown> | undefined;
      const dominance = data.market_cap_percentage as Record<string, unknown> | undefined;
      global = {
        totalMarketCap: parseNumber(cap?.usd),
        totalVolume: parseNumber(volume?.usd),
        btcDominance: parseNumber(dominance?.btc),
        marketCapChange24h: parseNumber(data.market_cap_change_percentage_24h_usd),
      };
    }

    if (fearGreedResult.status === "fulfilled" && fearGreedResult.value.ok) {
      const payload = (await fearGreedResult.value.json()) as {
        data?: Array<{ value: string; value_classification: string; timestamp?: string }>;
      };
      const history = (payload.data ?? []).map((item) => ({
        value: parseNumber(item.value),
        label: String(item.value_classification ?? ""),
        timestamp: parseNumber(item.timestamp) * 1000,
      })).filter((item) => item.value >= 0 && item.value <= 100);
      const current = history[0];
      if (current) fearGreed = { value: current.value, label: current.label, history };
    }

    this.patch({
      global,
      fearGreed,
      status: this.state.status === "loading" && Object.keys(this.state.prices).length ? "ok" : this.state.status,
    });
  }

  private connectSocket() {
    if (!this.visible || this.socket || typeof WebSocket === "undefined") return;
    const socket = new WebSocket(buildBinanceStreamUrl());
    this.socket = socket;

    socket.onopen = () => {
      this.stopFallback();
      this.patch({ error: null, status: "ok" });
    };

    socket.onmessage = (event) => {
      let payload: { data?: BinanceTicker } | BinanceTicker;
      try { payload = JSON.parse(event.data as string) as { data?: BinanceTicker } | BinanceTicker; } catch { return; }
      const ticker = "data" in payload ? payload.data : payload;
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
        lastTickAt: tickAt,
      });
    };

    socket.onerror = () => {
      this.patch({ error: "WebSocket Binance indisponível; usando atualização periódica.", status: Object.keys(this.state.prices).length ? "stale" : "error" });
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
