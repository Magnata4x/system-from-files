import { describe, expect, it } from "vitest";
import { calculateSignalDistancePct } from "./signals-data";

describe("calculateSignalDistancePct", () => {
  it("calculates favorable and adverse distances for BUY", () => {
    expect(calculateSignalDistancePct(100, 105, "BUY")).toBe(5);
    expect(calculateSignalDistancePct(100, 95, "BUY")).toBe(-5);
  });

  it("calculates favorable and adverse distances for SELL", () => {
    expect(calculateSignalDistancePct(100, 95, "SELL")).toBe(5);
    expect(calculateSignalDistancePct(100, 105, "SELL")).toBe(-5);
  });

  it("returns null when a current or reference price is unavailable", () => {
    expect(calculateSignalDistancePct(null, 105, "BUY")).toBeNull();
    expect(calculateSignalDistancePct(100, null, "SELL")).toBeNull();
    expect(calculateSignalDistancePct(0, 105, "BUY")).toBeNull();
  });
});
