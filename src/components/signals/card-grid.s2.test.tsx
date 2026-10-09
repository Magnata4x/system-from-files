import { describe, expect, it } from "vitest";
import { formatDiscardedReasons } from "./card-grid";

describe("formatDiscardedReasons", () => {
  it("maps sideways market and below-score reasons to Portuguese text", () => {
    expect(formatDiscardedReasons({ sideways: 7, below_min_score: 3, source_error: 0 }))
      .toBe("7 pares laterais, 3 abaixo de 60.");
  });

  it("maps source errors and singular counts", () => {
    expect(formatDiscardedReasons({ sideways: 1, below_min_score: 0, source_error: 2 }))
      .toBe("1 par lateral, 2 com falha na fonte.");
  });

  it("returns null when there are no discard reasons", () => {
    expect(formatDiscardedReasons(null)).toBeNull();
    expect(formatDiscardedReasons({ sideways: 0, below_min_score: 0, source_error: 0 })).toBeNull();
  });
});
