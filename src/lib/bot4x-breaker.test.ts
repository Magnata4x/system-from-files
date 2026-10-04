import { describe, expect, it } from "vitest";
import {
  BOT4X_CIRCUIT_BREAKER_PNL_PCT,
  isBot4xCircuitBreakerTriggered,
} from "./bot4x-store";

describe("Bot4x circuit breaker", () => {
  it("triggers at or below -1.5% PnL", () => {
    expect(BOT4X_CIRCUIT_BREAKER_PNL_PCT).toBe(-1.5);
    expect(isBot4xCircuitBreakerTriggered(-1.5)).toBe(true);
    expect(isBot4xCircuitBreakerTriggered(-1.51)).toBe(true);
    expect(isBot4xCircuitBreakerTriggered(-1.49)).toBe(false);
  });
});
