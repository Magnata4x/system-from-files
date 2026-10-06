import { describe, expect, it, vi } from "vitest";

const { builder, from } = vi.hoisted(() => {
  const builder = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };
  builder.insert.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  return { builder, from: vi.fn(() => builder) };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { calibratorHistoryStore, recordSimulation } from "./calibrator-history-store";

const params = {
  profile: "conservador" as const,
  symbol: "BTCUSDT",
  periodDays: 30,
  initialBalance: 1000,
  leverage: 1,
};

const result = {
  trades: 0, wins: 0, losses: 0, winRate: 0, pnl: 0, pnlPct: 0,
  maxDrawdown: 0, sharpe: 0, equityCurve: [],
  dnaFeedback: { patternDetected: "", correction: "", expectedImprovement: "" },
  commentary: "",
};

describe("calibrator history persistence", () => {
  it("recusa registrar simulação sem usuário autenticado", async () => {
    await expect(recordSimulation(undefined, params, result)).rejects.toMatchObject({
      code: "CALIBRATOR_PERSISTENCE_FAILED",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("propaga falha do Supabase em vez de fabricar local_*", async () => {
    builder.single.mockResolvedValueOnce({
      data: null,
      error: { message: "database unavailable", code: "DB_DOWN", details: "", hint: "" },
    });

    await expect(calibratorHistoryStore.add("user-a", {
      userId: "user-a",
      params,
      result,
    })).rejects.toMatchObject({ code: "CALIBRATOR_PERSISTENCE_FAILED" });

    expect(from).toHaveBeenCalledWith("calibrator_runs");
  });
});
