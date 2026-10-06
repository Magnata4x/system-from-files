import { describe, expect, it } from "vitest";
import { mapSimulationResult } from "@/adapters/backend/calibrator.adapter";

const base = {
  trades: 2, wins: 1, losses: 1, win_rate: 50, pnl: 1, pnl_pct: 0.1,
  max_drawdown: 1, sharpe: 0.5, equity_curve: [],
};

describe("calibrator persistence contract", () => {
  it("marca execução persistida somente quando o backend confirma o run", () => {
    const result = mapSimulationResult({
      ...base,
      persistence: { status: "persisted", run_id: "run-123" },
    });
    expect(result.persistence).toEqual({ status: "persisted", runId: "run-123" });
  });

  it("não apresenta falha de persistência como histórico persistido", () => {
    const result = mapSimulationResult({
      ...base,
      persistence: { status: "failed", reason: "Supabase indisponível" },
    });
    expect(result.persistence.status).toBe("failed");
    expect(result.persistence.runId).toBeUndefined();
    expect(result.persistence.reason).toBe("Supabase indisponível");
  });
});
