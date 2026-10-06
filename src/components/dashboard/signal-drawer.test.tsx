import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useDashboardStore } = vi.hoisted(() => ({
  useDashboardStore: vi.fn(),
}));

vi.mock("@/lib/dashboard-store", () => ({ useDashboardStore }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/alerts">{children}</a>,
}));
vi.mock("./score-badge", () => ({
  ScoreBadge: ({ score }: { score: number }) => <span>Score {score}</span>,
}));

import { SignalDrawer } from "./signal-drawer";

const signalA = {
  id: "btc-1",
  asset: "BTC/USDT",
  direction: "BUY" as const,
  score: 82,
  entry: 100000,
  stop: 99000,
  target: 102000,
  rr: 2,
  tf: "4H",
  time: "2026-10-05T15:00:00Z",
  type: "trend-following",
  setup: "Tendência de alta",
  confluences: ["Tendência de mercado confirmada", "RSI alinhado à direção"],
};

const signalB = {
  id: "eth-2",
  asset: "ETH/USDT",
  direction: "SELL" as const,
  score: 71,
  entry: 4000,
  stop: null,
  target: null,
  rr: null,
  tf: "—",
  time: "2026-10-05T15:05:00Z",
};

describe("SignalDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra os metadados do sinal real selecionado", () => {
    useDashboardStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        selectedSignal: signalA,
        setSelectedSignal: vi.fn(),
      }),
    );

    render(<SignalDrawer />);

    expect(screen.getByText("BTC/USDT")).toBeTruthy();
    expect(screen.getByText("Score 82")).toBeTruthy();
    expect(screen.getByText("trend-following")).toBeTruthy();
    expect(screen.getByText("Tendência de alta")).toBeTruthy();
    expect(screen.getByText(/RSI alinhado à direção/)).toBeTruthy();
  });

  it("não reaproveita metadados de outro sinal e usa — quando campos opcionais faltam", () => {
    useDashboardStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        selectedSignal: signalB,
        setSelectedSignal: vi.fn(),
      }),
    );

    render(<SignalDrawer />);

    expect(screen.getByText("ETH/USDT")).toBeTruthy();
    expect(screen.getByText("Score 71")).toBeTruthy();
    expect(screen.queryByText("trend-following")).toBeNull();
    expect(screen.queryByText("Tendência de alta")).toBeNull();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });
});
