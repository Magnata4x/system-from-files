import { describe, it, expect } from "vitest";
import {
  calcRSI,
  calcVolumeRatio,
  calcChannelZone,
  calcScalperScore,
  calcIntradayScore,
  calcSwingScore,
  calcPositionScore,
  mockBTCSnapshot,
} from "../engine-scoring";
import type { OHLCV, MarketSnapshot, MarketRegime } from "../engine-scoring";

// Helpers ───────────────────────────────────────────────────────────────────
function bullCandles(n: number, start = 100, step = 1): OHLCV[] {
  return Array.from({ length: n }, (_, i) => {
    const close = start + i * step;
    return {
      time: i,
      open: close - step / 2,
      high: close + step / 2,
      low: close - step,
      close,
      volume: 1000,
    };
  });
}

function bearCandles(n: number, start = 200, step = 1): OHLCV[] {
  return bullCandles(n, start, -step);
}

function flatCandles(n: number, price = 100, volume = 1000): OHLCV[] {
  return Array.from({ length: n }, (_, i) => ({
    time: i,
    open: price,
    high: price,
    low: price,
    close: price,
    volume,
  }));
}

function snapshot(overrides: Partial<MarketSnapshot> = {}): MarketSnapshot {
  return { ...mockBTCSnapshot, ...overrides };
}

// calcChannelZone ──────────────────────────────────────────────────────────
describe("calcChannelZone", () => {
  it("classifica zona baseada em preço atual vs range histórico", () => {
    const candles = bullCandles(30, 100, 1);
    const zone = calcChannelZone(candles, candles[candles.length - 1].close);
    expect(["TOP", "MIDDLE", "BOTTOM"]).toContain(zone);
  });

  it("retorna MIDDLE (guard) quando range é zero — mercado completamente flat", () => {
    const candles = flatCandles(30, 100);
    expect(calcChannelZone(candles, 100)).toBe("MIDDLE");
    // Mesmo com preço fora do range, sem range não há como classificar.
    expect(calcChannelZone(candles, 999)).toBe("MIDDLE");
  });

  it("classifica TOP quando preço está acima de 75% do range", () => {
    const candles = bullCandles(30, 100, 1); // range ~100..130
    expect(calcChannelZone(candles, 129)).toBe("TOP");
  });

  it("classifica BOTTOM quando preço está abaixo de 30% do range", () => {
    const candles = bullCandles(30, 100, 1);
    expect(calcChannelZone(candles, 101)).toBe("BOTTOM");
  });
});

// calcRSI ──────────────────────────────────────────────────────────────────
describe("calcRSI", () => {
  it("retorna 50 (neutro) quando há dados insuficientes (<15 candles)", () => {
    expect(calcRSI(flatCandles(5))).toBe(50);
    expect(calcRSI(flatCandles(14))).toBe(50);
  });

  it("retorna 100 numa tendência de alta pura (sem losses)", () => {
    expect(calcRSI(bullCandles(50))).toBe(100);
  });

  it("retorna valor baixo numa tendência de queda pura", () => {
    expect(calcRSI(bearCandles(50))).toBeLessThan(10);
  });

  it("retorna valor entre 0 e 100 sempre", () => {
    const rsi = calcRSI(bullCandles(30));
    expect(rsi).toBeGreaterThanOrEqual(0);
    expect(rsi).toBeLessThanOrEqual(100);
  });
});

// calcVolumeRatio ──────────────────────────────────────────────────────────
describe("calcVolumeRatio", () => {
  it("retorna ~0 quando volume é constante", () => {
    expect(Math.abs(calcVolumeRatio(flatCandles(30, 100, 1000)))).toBeLessThan(0.01);
  });

  it("retorna 0 (guard) quando volume médio é zero", () => {
    expect(calcVolumeRatio(flatCandles(30, 100, 0))).toBe(0);
  });

  it("retorna valor positivo quando volume atual > média", () => {
    const candles = flatCandles(30, 100, 1000);
    candles[candles.length - 1].volume = 3000;
    expect(calcVolumeRatio(candles)).toBeGreaterThan(1);
  });
});

// Engine signals: snapshots de alta, baixa e neutro ────────────────────────
const bullRegime: MarketRegime = { trend: "BULLISH", type: "TRENDING_BULL" };
const bearRegime: MarketRegime = { trend: "BEARISH", type: "TRENDING_BEAR" };
const neutralRegime: MarketRegime = { trend: "NEUTRAL", type: "RANGING" };

describe("calcScalperScore", () => {
  it("produz EngineSignal válido em mercado de alta", () => {
    const sig = calcScalperScore(
      snapshot({ rsi: 65, aiScore: 80, volatility: "MEDIUM", manipulationScore: 20 }),
      bullCandles(30),
    );
    expect(sig.score).toBeGreaterThanOrEqual(0);
    expect(sig.score).toBeLessThanOrEqual(100);
    expect(["BUY", "SELL", "HOLD"]).toContain(sig.side);
  });

  it("produz EngineSignal válido em mercado de baixa", () => {
    const sig = calcScalperScore(
      snapshot({ rsi: 30, aiScore: 25, volatility: "HIGH", manipulationScore: 20 }),
      bearCandles(30),
    );
    expect(sig.score).toBeGreaterThanOrEqual(0);
    expect(sig.score).toBeLessThanOrEqual(100);
  });

  it("retorna HOLD quando manipulationScore >= 60 (hard block)", () => {
    const sig = calcScalperScore(snapshot({ manipulationScore: 80 }), bullCandles(30));
    expect(sig.side).toBe("HOLD");
    expect(sig.score).toBe(0);
  });

  it("produz EngineSignal válido em mercado neutro", () => {
    const sig = calcScalperScore(
      snapshot({ rsi: 50, aiScore: 50, volatility: "LOW", manipulationScore: 20 }),
      flatCandles(30),
    );
    expect(sig.score).toBeGreaterThanOrEqual(0);
  });
});

describe("calcIntradayScore", () => {
  it.each([
    ["alta", bullRegime, bullCandles(60), { rsi: 60, aiScore: 75 }],
    ["baixa", bearRegime, bearCandles(60), { rsi: 35, aiScore: 25 }],
    ["neutro", neutralRegime, flatCandles(60), { rsi: 50, aiScore: 50 }],
  ] as const)("produz EngineSignal válido em mercado de %s", (_label, regime, candles, snap) => {
    const sig = calcIntradayScore(snapshot(snap), candles, regime);
    expect(sig.score).toBeGreaterThanOrEqual(0);
    expect(sig.score).toBeLessThanOrEqual(100);
    expect(["BUY", "SELL", "HOLD"]).toContain(sig.side);
  });
});

describe("calcSwingScore", () => {
  it.each([
    ["alta", bullRegime, bullCandles(220), { rsi: 60, aiScore: 75 }],
    ["baixa", bearRegime, bearCandles(220), { rsi: 35, aiScore: 25 }],
    ["neutro", neutralRegime, flatCandles(220), { rsi: 50, aiScore: 50 }],
  ] as const)("produz EngineSignal válido em mercado de %s", (_label, regime, candles, snap) => {
    const sig = calcSwingScore(snapshot(snap), candles, regime);
    expect(sig.score).toBeGreaterThanOrEqual(0);
    expect(sig.score).toBeLessThanOrEqual(100);
    expect(["BUY", "SELL", "HOLD"]).toContain(sig.side);
  });
});

describe("calcPositionScore", () => {
  it.each([
    ["alta", bullRegime, bullCandles(220), { rsi: 60, aiScore: 75 }],
    ["baixa", bearRegime, bearCandles(220), { rsi: 35, aiScore: 25 }],
    ["neutro", neutralRegime, flatCandles(220), { rsi: 50, aiScore: 50 }],
  ] as const)("produz EngineSignal válido em mercado de %s", (_label, regime, candles, snap) => {
    const sig = calcPositionScore(snapshot(snap), candles, regime);
    expect(sig.score).toBeGreaterThanOrEqual(0);
    expect(sig.score).toBeLessThanOrEqual(100);
    expect(["BUY", "SELL", "HOLD"]).toContain(sig.side);
  });
});
