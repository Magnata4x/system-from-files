import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScoreBadge, scoreColor } from "./score-badge";

describe("ScoreBadge", () => {
  it("exposes the score to assistive technology", () => {
    render(<ScoreBadge score={82} />);
    expect(screen.getByLabelText("Score 82").textContent).toContain("82");
  });

  it("uses theme tokens rather than fixed hex colors", () => {
    expect(scoreColor(95)).toBe("var(--score-excellent)");
    expect(scoreColor(80)).toBe("var(--score-good)");
    expect(scoreColor(65)).toBe("var(--score-medium)");
    expect(scoreColor(40)).toBe("var(--score-low)");
  });
});
