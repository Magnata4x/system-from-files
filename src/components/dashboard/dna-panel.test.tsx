import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DnaPanel } from "./dna-panel";
import { useDnaProfile } from "@/hooks/useDnaProfile";
import { useDnaStats } from "@/hooks/useDnaStats";

vi.mock("@/hooks/useDnaProfile", () => ({ useDnaProfile: vi.fn() }));
vi.mock("@/hooks/useDnaStats", () => ({ useDnaStats: vi.fn() }));
vi.mock("@/hooks/useBackendAuth", () => ({ useBackendAuth: () => ({ userId: "u1", ready: true }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

const mockedProfile = vi.mocked(useDnaProfile);
const mockedStats = vi.mocked(useDnaStats);

function idle<T>(data: T) {
  return { data, isLoading: false, isError: false } as any;
}

describe("DnaPanel — dados honestos", () => {
  it("não exibe zeros, estilo moderate ou dados fictícios quando o perfil não foi calculado", () => {
    mockedProfile.mockReturnValue(
      idle({
        userId: "u1",
        hasProfile: false,
        consistency: null,
        discipline: null,
        riskControl: null,
        timing: null,
        emotionalControl: null,
        avgWinRate: null,
        bestSession: null,
        worstSession: null,
        overtradingRisk: null,
        tradingStyle: null,
      }),
    );
    mockedStats.mockReturnValue({
      data: {
        hasData: false,
        totalTrades: 0,
        winRate: 0,
        avgPnlPct: 0,
        bestPair: null,
        worstPair: null,
        bestHour: null,
        worstHour: null,
        maxDrawdownPct: 0,
        totalPnl: 0,
        radar: [],
        gauges: [],
        heatmap: [],
        evolution: [],
        insights: [],
      },
      isLoading: false,
      isError: false,
    } as any);

    render(<DnaPanel />);

    expect(screen.getByText("Perfil DNA ainda não calculado. Nenhum dado fictício é exibido.")).toBeTruthy();
    expect(screen.queryByText("moderate")).toBeNull();
    expect(screen.queryByText("MOMENTUM TRADER")).toBeNull();
  });

  it("renderiza — para dimensões nulas e só mostra win rate quando as estatísticas têm dados", () => {
    mockedProfile.mockReturnValue(
      idle({
        userId: "u1",
        hasProfile: true,
        consistency: null,
        discipline: 70,
        riskControl: null,
        timing: 60,
        emotionalControl: null,
        avgWinRate: 91,
        bestSession: null,
        worstSession: null,
        overtradingRisk: null,
        tradingStyle: null,
      }),
    );
    mockedStats.mockReturnValue({
      data: {
        hasData: false,
        totalTrades: 0,
        winRate: 0,
        avgPnlPct: 0,
        bestPair: null,
        worstPair: null,
        bestHour: null,
        worstHour: null,
        maxDrawdownPct: 0,
        totalPnl: 0,
        radar: [],
        gauges: [],
        heatmap: [],
        evolution: [],
        insights: [],
      },
      isLoading: false,
      isError: false,
    } as any);

    render(<DnaPanel />);

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("70")).toBeTruthy();
    expect(screen.getByText("60")).toBeTruthy();
    expect(screen.queryByText("91.0%")).toBeNull();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
