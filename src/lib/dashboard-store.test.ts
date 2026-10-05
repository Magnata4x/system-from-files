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
  signalsUpdatedAt: null,
  manipAlerts: [],
  manipLoading: false,
  manipError: null,
  manipStale: false,
  manipUpdatedAt: null,
} as unknown as Parameters<typeof selectSignalsStatus>[0];

describe("dashboard metric selectors", () => {
  it("distinguishes loading, unavailable, stale and successful zero signals", () => {
    expect(selectSignalsStatus({ ...base, signalsLoading: true })).toBe("loading");
    expect(selectSignalsStatus({ ...base, signalsError: "timeout" })).toBe("unavailable");
    expect(selectSignalsStatus({
      ...base,
      signals: [{
        id: "1", asset: "BTC/USDT", direction: "BUY", score: 80,
        entry: 100, stop: 99, target: 102, rr: 2, tf: "1h", time: new Date().toISOString(),
      }],
      signalsStale: true,
    })).toBe("stale");
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
        manipAlerts: [{
          id: "1", severity: "LOW", type: "STOP HUNT", asset: "BTC/USDT", tf: "1h",
          confidence: 50, ago: "1m", desc: "", action: "", detail: "",
        }],
      }),
    ).toBe(false);
    expect(
      selectHasActiveManipulationAlerts({
        ...base,
        manipAlerts: [{
          id: "2", severity: "MEDIUM", type: "STOP HUNT", asset: "BTC/USDT", tf: "1h",
          confidence: 70, ago: "1m", desc: "", action: "", detail: "",
        }],
      }),
    ).toBe(true);
  });
});
