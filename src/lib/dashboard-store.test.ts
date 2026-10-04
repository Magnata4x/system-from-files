import { describe, expect, it } from "vitest";
import {
  selectHasActiveManipulationAlerts,
  selectManipulationStatus,
  selectSignalsStatus,
} from "./dashboard-store";

const base = {
  signals: [],
  signalsLoading: false,
  signalsError: null,
  signalsStale: false,
  manipAlerts: [],
  manipLoading: false,
  manipError: null,
} as never;

describe("dashboard metric selectors", () => {
  it("distinguishes loading, unavailable, stale and successful zero signals", () => {
    expect(selectSignalsStatus({ ...base, signalsLoading: true })).toBe("loading");
    expect(selectSignalsStatus({ ...base, signalsError: "timeout" })).toBe("unavailable");
    expect(selectSignalsStatus({ ...base, signals: [{ id: "1" }], signalsStale: true })).toBe("stale");
    expect(selectSignalsStatus(base)).toBe("ok");
  });

  it("treats zero manipulation alerts as a valid successful result", () => {
    expect(selectManipulationStatus(base)).toBe("ok");
    expect(
      selectManipulationStatus({ ...base, manipError: "timeout" }),
    ).toBe("unavailable");
  });

  it("only marks HIGH/MEDIUM manipulation as active", () => {
    expect(
      selectHasActiveManipulationAlerts({
        ...base,
        manipAlerts: [{ severity: "LOW" }],
      }),
    ).toBe(false);
    expect(
      selectHasActiveManipulationAlerts({
        ...base,
        manipAlerts: [{ severity: "MEDIUM" }],
      }),
    ).toBe(true);
  });
});
