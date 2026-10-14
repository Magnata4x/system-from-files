import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dashboardState, botState } = vi.hoisted(() => ({
  dashboardState: {
    risk: { dailyPnlPct: 0 },
    riskStale: false,
    riskUpdatedAt: Date.now(),
  },
  botState: { mode: "DEMO", profile: "conservador", leverage: 3 },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/lib/dashboard-store", () => ({
  useDashboardStore: (selector: (state: typeof dashboardState) => unknown) => selector(dashboardState),
}));
vi.mock("@/lib/bot4x-store", () => ({
  getEffectiveMode: (mode: string) => mode,
  isBot4xCircuitBreakerTriggered: (pnl: number) => pnl <= -1.5,
  useBot4xStore: (selector: (state: typeof botState) => unknown) => selector(botState),
}));
vi.mock("@/hooks/useDnaProfile", () => ({ useDnaProfile: vi.fn() }));
vi.mock("@/hooks/useDnaStats", () => ({ useDnaStats: vi.fn() }));
vi.mock("@/hooks/useSentiment", () => ({ useSentiment: vi.fn() }));
vi.mock("@/hooks/useBackendAuth", () => ({ useBackendAuth: vi.fn() }));

import { Bot4xSummaryWidget } from "./integration-widgets";

describe("Bot4xSummaryWidget — validade temporal do risco", () => {
  beforeEach(() => {
    dashboardState.risk = { dailyPnlPct: 0 };
    dashboardState.riskStale = false;
    dashboardState.riskUpdatedAt = Date.now();
    botState.mode = "DEMO";
  });
  afterEach(cleanup);

  it("não mostra Circuit OK quando o store marca risco desatualizado", () => {
    dashboardState.riskStale = true;
    render(<Bot4xSummaryWidget />);
    expect(screen.getByText("Risco desatualizado")).toBeTruthy();
    expect(screen.queryByText("Circuit OK")).toBeNull();
  });

  it("não mostra Circuit OK quando a leitura tem mais de 60 segundos", () => {
    dashboardState.riskStale = false;
    dashboardState.riskUpdatedAt = Date.now() - 60_001;
    render(<Bot4xSummaryWidget />);
    expect(screen.getByText("Risco desatualizado")).toBeTruthy();
    expect(screen.queryByText("Circuit OK")).toBeNull();
  });
});
