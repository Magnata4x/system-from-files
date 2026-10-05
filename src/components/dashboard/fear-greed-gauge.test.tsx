import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useMarketData } = vi.hoisted(() => ({ useMarketData: vi.fn() }));
vi.mock("@/lib/market-data-store", () => ({ useMarketData }));
vi.mock("./data-status", async () => {
  const actual = await vi.importActual<typeof import("./data-status")>("./data-status");
  return actual;
});

import { FearGreedGauge } from "./fear-greed-gauge";

const DAY = 24 * 60 * 60 * 1000;

describe("FearGreedGauge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não desenha histórico sem dados e não afirma 7 dias", () => {
    useMarketData.mockReturnValue({
      fearGreed: { value: 50, label: "Neutral", history: [], updatedAt: Date.now() },
      loading: false,
      metadataStatus: "ok",
    });

    render(<FearGreedGauge />);

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Histórico indisponível; exibindo apenas a leitura atual.")).toBeTruthy();
    expect(screen.queryByText(/7 dias/)).toBeNull();
  });

  it("expõe o histórico real no wrapper acessível", () => {
    const now = Date.now();
    useMarketData.mockReturnValue({
      fearGreed: {
        value: 50,
        label: "Neutral",
        history: Array.from({ length: 7 }, (_, index) => ({
          value: 40 + index,
          label: "Neutral",
          timestamp: now - (6 - index) * DAY,
        })),
        updatedAt: now,
      },
      loading: false,
      metadataStatus: "ok",
    });

    render(<FearGreedGauge />);

    expect(screen.getByRole("img", { name: "Histórico de Fear & Greed, 7 dias" })).toBeTruthy();
  });
});
