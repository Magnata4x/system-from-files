import { describe, expect, it } from "vitest";
import { TOUR_MAP } from "./tour-content";

describe("dashboard tour anchors", () => {
  it("keeps the dashboard metric and live-price selectors", () => {
    const selectors = TOUR_MAP.dashboard.steps.map((step) => step.selector);
    expect(selectors).toContain("[data-tour='metric-signals']");
    expect(selectors).toContain("[data-tour='top-bar-prices']");
  });
});
