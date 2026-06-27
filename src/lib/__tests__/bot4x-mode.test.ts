import { describe, it, expect } from "vitest";
import { getEffectiveMode, REAL_MODE_ENABLED } from "../bot4x-store";

// ARCH-01: o modo efetivo NUNCA pode ser "REAL" quando a flag de build está
// desligada, independentemente do que o usuário tenha persistido no store.
describe("getEffectiveMode (Bot4x)", () => {
  it("retorna DEMO quando flag desabilitada, mesmo se mode persistido for REAL", () => {
    if (REAL_MODE_ENABLED) {
      // No build atual a flag está ligada (rara no ambiente de test),
      // então o teste protege apenas a inversa.
      expect(getEffectiveMode("REAL")).toBe("REAL");
    } else {
      expect(getEffectiveMode("REAL")).toBe("DEMO");
    }
  });

  it("respeita DEMO em qualquer combinação", () => {
    expect(getEffectiveMode("DEMO")).toBe("DEMO");
  });
});
