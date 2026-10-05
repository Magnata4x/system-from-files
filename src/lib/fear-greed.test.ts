import { describe, expect, it } from "vitest";
import { getFearGreedHistory7d } from "./fear-greed";

const DAY = 24 * 60 * 60 * 1000;

describe("fear greed history", () => {
  it("retorna somente pontos reais dentro dos últimos 7 dias, em ordem", () => {
    const now = 10 * DAY;
    const result = getFearGreedHistory7d(
      [
        { value: 50, label: "Neutral", timestamp: now - 8 * DAY },
        { value: 30, label: "Fear", timestamp: now - 2 * DAY },
        { value: 70, label: "Greed", timestamp: now - 5 * DAY },
        { value: 90, label: "Extreme Greed", timestamp: now - DAY },
      ],
      now,
    );

    expect(result.map((point) => point.value)).toEqual([70, 30, 90]);
    expect(result).toHaveLength(3);
  });

  it("não cria pontos quando o histórico real está ausente", () => {
    expect(getFearGreedHistory7d([], 10 * DAY)).toEqual([]);
  });

  it("não fabrica valor para ponto inválido", () => {
    expect(
      getFearGreedHistory7d(
        [{ value: Number.NaN, label: "Invalid", timestamp: 10 * DAY - DAY }],
        10 * DAY,
      ),
    ).toEqual([]);
  });
});
