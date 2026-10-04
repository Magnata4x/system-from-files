import { describe, expect, it } from "vitest";
import { mapDnaProfile } from "./dna.adapter";

describe("mapDnaProfile", () => {
  it("preserva null e hasProfile sem fabricar score ou estilo", () => {
    const result = mapDnaProfile({
      userId: "u1",
      hasProfile: false,
      consistency: null,
      discipline: null,
      riskControl: null,
      timing: null,
      emotionalControl: null,
      avgWinRate: null,
      bestSession: null,
      worstSession: null,
      overtradingRisk: null,
      tradingStyle: null,
    });

    expect(result).toMatchObject({
      userId: "u1",
      hasProfile: false,
      dnaConsistency: null,
      dnaDiscipline: null,
      dnaRiskControl: null,
      dnaTiming: null,
      dnaEmotionalControl: null,
      avgWinRate: null,
      style: null,
    });
  });
});
