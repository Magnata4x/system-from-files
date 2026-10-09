import { describe, expect, it } from "vitest";
import { signalEmptyMessage } from "./card-grid";

describe("signal empty states", () => {
  it("distinguishes loading, unavailable, stale, valid empty and filtered empty", () => {
    expect(signalEmptyMessage("loading", 0)).toContain("Carregando");
    expect(signalEmptyMessage("unavailable", 0)).toContain("Fonte de sinais indisponível");
    expect(signalEmptyMessage("stale", 0)).toContain("desatualizada");
    expect(signalEmptyMessage("ok", 0)).toBeNull();
    expect(signalEmptyMessage("ok", 3)).toContain("filtros atuais");
  });
});
