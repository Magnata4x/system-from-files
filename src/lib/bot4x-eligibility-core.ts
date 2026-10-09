export type EligibilityProfile =
  | "conservador"
  | "regular"
  | "agressivo"
  | "agressivo-galaxy"
  | "rsi"
  | "aiscore"
  | "scalper"
  | "intraday"
  | "swing"
  | "position";

export type ManipulationRisk = "low" | "medium" | "high" | "unavailable";
export type IntentStatus =
  | "pending_confirmation"
  | "pending"
  | "submitted"
  | "completed"
  | "failed"
  | "cancelled";

export type EligibilityDecision =
  | { eligible: true; reason: "eligible"; adjustedScore: number; minimumScore: number }
  | {
      eligible: false;
      reason:
        | "unknown_data"
        | "invalid_input"
        | "inactive_signal"
        | "manipulation_high"
        | "circuit_breaker"
        | "profit_lock"
        | "slot_limit"
        | "risk_limit"
        | "score_below_minimum";
      adjustedScore: number | null;
      minimumScore: number | null;
    };

/** Limiares únicos para todos os consumidores de elegibilidade. */
export const PROFILE_MINIMUM_SCORE: Readonly<Record<EligibilityProfile, number>> = {
  conservador: 88,
  regular: 82,
  agressivo: 75,
  "agressivo-galaxy": 70,
  rsi: 85,
  aiscore: 78,
  scalper: 80,
  intraday: 80,
  swing: 75,
  position: 70,
};

/** dailyPnlPct is expressed in percentage points (e.g. -1.5 means -1.5%). */
export const CIRCUIT_BREAKER_DAILY_PNL_PCT = -1.5;
export const PROFIT_LOCK_DAILY_PNL_PCT = 3;

export const ACTIVE_INTENT_STATUSES: ReadonlySet<IntentStatus> = new Set([
  "pending_confirmation",
  "pending",
  "submitted",
]);

export interface EligibilityInput {
  profile: string | null | undefined;
  score: number | null | undefined;
  riskPct: number | null | undefined;
  maxRiskPct: number | null | undefined;
  signalStatus: string | null | undefined;
  dailyPnlPct: number | null | undefined;
  manipulationRisk: ManipulationRisk | string | null | undefined;
  circuitBreaker: string | null | undefined;
  activeIntentStatuses: readonly string[] | null | undefined;
  slotLimit: number | null | undefined;
}

function denied(
  reason: Exclude<EligibilityDecision, { eligible: true }>["reason"],
  adjustedScore: number | null = null,
  minimumScore: number | null = null,
): EligibilityDecision {
  return { eligible: false, reason, adjustedScore, minimumScore };
}

/**
 * Pure shared eligibility decision. Unknown or malformed operational inputs
 * always fail closed. PnL is percentage points, never a decimal fraction.
 */
export function evaluateEligibility(input: EligibilityInput): EligibilityDecision {
  const minimumScore =
    typeof input.profile === "string" && input.profile in PROFILE_MINIMUM_SCORE
      ? PROFILE_MINIMUM_SCORE[input.profile as EligibilityProfile]
      : null;

  if (
    minimumScore === null ||
    typeof input.score !== "number" ||
    !Number.isFinite(input.score) ||
    typeof input.riskPct !== "number" ||
    !Number.isFinite(input.riskPct) ||
    typeof input.maxRiskPct !== "number" ||
    !Number.isFinite(input.maxRiskPct) ||
    typeof input.dailyPnlPct !== "number" ||
    !Number.isFinite(input.dailyPnlPct) ||
    !Array.isArray(input.activeIntentStatuses) ||
    typeof input.slotLimit !== "number" ||
    !Number.isInteger(input.slotLimit) ||
    input.slotLimit < 0 ||
    !input.signalStatus ||
    !input.circuitBreaker ||
    !input.manipulationRisk
  ) {
    return denied("unknown_data", null, minimumScore);
  }

  if (!["low", "medium", "high"].includes(input.manipulationRisk)) {
    return denied("unknown_data", null, minimumScore);
  }
  if (input.signalStatus !== "active" && input.signalStatus !== "new" &&
      input.signalStatus !== "premium" && input.signalStatus !== "expiring") {
    return denied("inactive_signal", null, minimumScore);
  }
  if (input.circuitBreaker !== "none" && input.circuitBreaker !== "emergency" &&
      input.circuitBreaker !== "profitLock") {
    return denied("unknown_data", null, minimumScore);
  }
  if (input.dailyPnlPct <= CIRCUIT_BREAKER_DAILY_PNL_PCT || input.circuitBreaker === "emergency") {
    return denied("circuit_breaker", null, minimumScore);
  }
  if (input.dailyPnlPct >= PROFIT_LOCK_DAILY_PNL_PCT || input.circuitBreaker === "profitLock") {
    return denied("profit_lock", null, minimumScore);
  }
  if (input.manipulationRisk === "high") {
    return denied("manipulation_high", null, minimumScore);
  }
  if (input.riskPct < 0 || input.maxRiskPct <= 0) {
    return denied("invalid_input", null, minimumScore);
  }
  if (input.riskPct > input.maxRiskPct) {
    return denied("risk_limit", null, minimumScore);
  }

  const activeCount = input.activeIntentStatuses.filter((status) =>
    ACTIVE_INTENT_STATUSES.has(status as IntentStatus),
  ).length;
  if (activeCount >= input.slotLimit) {
    return denied("slot_limit", null, minimumScore);
  }

  const adjustedScore = input.score - (input.manipulationRisk === "medium" ? 8 : 0);
  if (adjustedScore < minimumScore) {
    return denied("score_below_minimum", adjustedScore, minimumScore);
  }
  return { eligible: true, reason: "eligible", adjustedScore, minimumScore };
}
