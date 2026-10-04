import { describe, expect, it } from "vitest";
import {
  buildBinanceRestUrl,
  buildBinanceStreamUrl,
  deriveMarketStatus,
  normalizeBinanceTicker,
} from "@/lib/market-data-store";

describe("market data — single Binance source", () => {
  it("gera uma requisição 24h única para o universo operacional", () => {
    const url = buildBinanceRestUrl();
    expect(url).toContain("ticker/24hr?symbols=");
    expect(decodeURIComponent(url)).toContain("BTCUSDT");
    expect(decodeURIComponent(url)).toContain("LTCUSDT");
    expect(decodeURIComponent(url)).not.toContain("USDTUSDT");
    expect(decodeURIComponent(url)).not.toContain("USDCUSDT");
    expect(decodeURIComponent(url)).not.toContain("STETHUSDT");
  });

  it("usa os mesmos streams spot da Binance para todos os blocos", () => {
    const url = buildBinanceStreamUrl();
    expect(url).toContain("btcusdt@ticker");
    expect(url).toContain("ethusdt@ticker");
    expect(url).not.toContain("steth");
    expect(url).not.toContain("usdc");
  });

  it("normaliza o preço real sem zerar dados ausentes", () => {
    const result = normalizeBinanceTicker({
      symbol: "BTCUSDT",
      lastPrice: "101234.50",
      priceChangePercent: "1.25",
      quoteVolume: "123",
      highPrice: "102000",
      lowPrice: "99000",
      E: Date.now(),
    });
    expect(result?.price).toBe(101234.5);
    expect(result?.pair).toBe("BTC/USDT");
    expect(result?.exchange).toBe("binance");
    expect(result?.instrument).toBe("spot");
  });

  it("rejeita símbolo inválido em vez de criar preço fantasma", () => {
    expect(normalizeBinanceTicker({ symbol: "STETHUSDT", lastPrice: "3000" })).toBeNull();
    expect(normalizeBinanceTicker({ symbol: "BTCUSD", lastPrice: "3000" })).toBeNull();
  });

  it("marca stale pelo tempo do último tick, não por erro HTTP", () => {
    const now = Date.now();
    expect(deriveMarketStatus(now - 1_000, true, now)).toBe("ok");
    expect(deriveMarketStatus(now - 31_000, true, now)).toBe("stale");
    expect(deriveMarketStatus(null, false, now)).toBe("unavailable");
  });
});
