import { describe, expect, it } from "vitest";
import { buildScoreDistribution } from "./score-distribution";

describe("score distribution", () => {
  it("agrupa apenas scores reais por ativo e timeframe", () => {
    const groups = buildScoreDistribution([
      { pair: "BTC/USDT", timeframe: "4H", score: 81 },
      { pair: "BTC/USDT", timeframe: "4H", score: 79 },
      { pair: "BTC/USDT", timeframe: "4H", score: 20 },
      { pair: "ETH/USDT", timeframe: "1H", score: 55 },
      { pair: "BTC/USDT", timeframe: "4H", score: null },
      { pair: "BTC/USDT", timeframe: "4H", score: 101 },
    ]);

    expect(groups).toEqual([
      {
        asset: "BTC/USDT",
        timeframe: "4H",
        buckets: [
          { from: 0, to: 20, n: 0 },
          { from: 20, to: 40, n: 1 },
          { from: 40, to: 60, n: 0 },
          { from: 60, to: 80, n: 1 },
          { from: 80, to: 101, n: 1 },
        ],
        n: 3,
      },
      {
        asset: "ETH/USDT",
        timeframe: "1H",
        buckets: [
          { from: 0, to: 20, n: 0 },
          { from: 20, to: 40, n: 0 },
          { from: 40, to: 60, n: 1 },
          { from: 60, to: 80, n: 0 },
          { from: 80, to: 101, n: 0 },
        ],
        n: 1,
      },
    ]);
  });

  it("não inventa grupos quando não existem sinais persistidos", () => {
    expect(buildScoreDistribution([])).toEqual([]);
  });
});
