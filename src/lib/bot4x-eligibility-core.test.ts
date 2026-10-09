import { describe, expect, it } from "vitest";
import {
  ACTIVE_INTENT_STATUSES,
  CIRCUIT_BREAKER_DAILY_PNL_PCT,
  evaluateEligibility,
  PROFILE_MINIMUM_SCORE,
  type EligibilityInput,
} from "./bot4x-eligibility-core";

const base: EligibilityInput = {
  profile: "conservador",
  score: 90,
  riskPct: 0.5,
  maxRiskPct: 1,
  signalStatus: "active",
  dailyPnlPct: 0,
  manipulationRisk: "low",
  circuitBreaker: "none",
  activeIntentStatuses: [],
  slotLimit: 3,
};

describe("shared Bot4x eligibility core", () => {
  it.each(Object.entries(PROFILE_MINIMUM_SCORE))(
    "uses one minimum score for profile %s",
    (profile, minimum) => {
      expect(evaluateEligibility({ ...base, profile, score: minimum }).eligible).toBe(true);
      expect(evaluateEligibility({ ...base, profile, score: minimum - 0.01 }).reason).toBe("score_below_minimum");
    },
  );

  it("counts pending_confirmation, pending and submitted as active slots", () => {
    expect([...ACTIVE_INTENT_STATUSES]).toEqual(["pending_confirmation", "pending", "submitted"]);
    const result = evaluateEligibility({
      ...base,
      activeIntentStatuses: ["pending_confirmation", "pending", "submitted", "completed", "failed"],
      slotLimit: 3,
    });
    expect(result.reason).toBe("slot_limit");
  });

  it("fails closed when manipulation risk is unknown", () => {
    expect(evaluateEligibility({ ...base, manipulationRisk: "unknown" }).reason).toBe("unknown_data");
    expect(evaluateEligibility({ ...base, manipulationRisk: null }).reason).toBe("unknown_data");
  });

  it("blocks at the circuit-breaker boundary of -1.5 percentage points", () => {
    expect(CIRCUIT_BREAKER_DAILY_PNL_PCT).toBe(-1.5);
    expect(evaluateEligibility({ ...base, dailyPnlPct: -1.5 }).reason).toBe("circuit_breaker");
    expect(evaluateEligibility({ ...base, dailyPnlPct: -1.49 }).eligible).toBe(true);
  });

  it("fails closed when operational values are missing or invalid", () => {
    expect(evaluateEligibility({ ...base, dailyPnlPct: null }).reason).toBe("unknown_data");
    expect(evaluateEligibility({ ...base, profile: "unrecognized" }).reason).toBe("unknown_data");
    expect(evaluateEligibility({ ...base, slotLimit: null }).reason).toBe("unknown_data");
    expect(evaluateEligibility({ ...base, riskPct: Number.NaN }).reason).toBe("unknown_data");
  });

  it("applies the medium manipulation score penalty and risk cap", () => {
    expect(evaluateEligibility({ ...base, score: 95, manipulationRisk: "medium" }).eligible).toBe(true);
    expect(evaluateEligibility({ ...base, score: 90, manipulationRisk: "medium" }).reason).toBe("score_below_minimum");
    expect(evaluateEligibility({ ...base, riskPct: 1.01 }).reason).toBe("risk_limit");
  });
});
