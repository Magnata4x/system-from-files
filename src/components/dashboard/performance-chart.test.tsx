import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal(
  "ResizeObserver",
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const { useScoreDistribution } = vi.hoisted(() => ({ useScoreDistribution: vi.fn() }));
vi.mock("@/hooks/useScoreDistribution", () => ({ useScoreDistribution }));

import { PerformanceChart, buildScoreDistributionChartData } from "./performance-chart";

describe("PerformanceChart", () => {
  it("mapeia cada bucket para uma faixa real e seu n", () => {
    expect(buildScoreDistributionChartData([
      { from: 0, to: 20, n: 2 },
      { from: 80, to: 101, n: 5 },
    ])).toEqual([
      { label: "0–19", n: 2 },
      { label: "80–100", n: 5 },
    ]);
  });

  it("mostra indisponível sem grupos reais", () => {
    useScoreDistribution.mockReturnValue({ data: { groups: [], truncated: false }, isLoading: false, isError: false });
    render(<PerformanceChart />);
    expect(screen.getByText("Distribuição de scores indisponível.")).toBeTruthy();
  });

  it("mostra n real e o aviso de truncamento", () => {
    useScoreDistribution.mockReturnValue({
      data: {
        groups: [{
          asset: "BTC/USDT",
          timeframe: "4H",
          n: 5,
          buckets: [
            { from: 0, to: 20, n: 1 },
            { from: 20, to: 40, n: 0 },
            { from: 40, to: 60, n: 2 },
            { from: 60, to: 80, n: 0 },
            { from: 80, to: 101, n: 2 },
          ],
        }],
        latestDataAt: "2026-10-05T15:00:00Z",
        truncated: true,
      },
      isLoading: false,
      isError: false,
    });

    render(<PerformanceChart />);

    expect(screen.getByText("n = 5")).toBeTruthy();
    expect(screen.getByText(/Exibição limitada aos 10.000 sinais mais recentes/)).toBeTruthy();
  });
});
