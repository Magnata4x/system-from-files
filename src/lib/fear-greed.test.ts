import { describe, expect, it } from "vitest";
import { buildFearGreedSeries } from "./fear-greed";

describe("buildFearGreedSeries", () => {
  it("retorna vazio para histórico ausente ou vazio", () => {
    expect(buildFearGreedSeries(null)).toEqual([]);
    expect(buildFearGreedSeries(undefined)).toEqual([]);
    expect(buildFearGreedSeries([])).toEqual([]);
  });

  it("ordena os pontos reais em ordem crescente sem criar pontos", () => {
    const input = [
      { value: 90, label: "Extreme Greed", timestamp: 3000 },
      { value: 30, label: "Fear", timestamp: 1000 },
      { value: 70, label: "Greed", timestamp: 2000 },
    ];
    const result = buildFearGreedSeries(input);

    expect(result.map((point) => point.timestamp)).toEqual([1000, 2000, 3000]);
    expect(result).toHaveLength(input.length);
  });

  it("descarta valores e timestamps inválidos", () => {
    const input = [
      { value: Number.NaN, label: "Invalid", timestamp: 1000 },
      { value: -1, label: "Invalid", timestamp: 2000 },
      { value: 101, label: "Invalid", timestamp: 3000 },
      { value: 50, label: "Neutral", timestamp: 0 },
      { value: 60, label: "Greed", timestamp: Number.NaN },
      { value: 40, label: "Neutral", timestamp: 4000 },
    ];
    const result = buildFearGreedSeries(input);

    expect(result).toEqual([{ value: 40, label: "Neutral", timestamp: 4000 }]);
    expect(result.length).toBeLessThanOrEqual(input.length);
  });
});
