import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { useMarketData } = vi.hoisted(() => ({ useMarketData: vi.fn() }));
const { useMarketHistory } = vi.hoisted(() => ({ useMarketHistory: vi.fn() }));
vi.mock("@/lib/market-data-store", () => ({ useMarketData }));
vi.mock("@/hooks/useMarketHistory", () => ({ useMarketHistory }));

import { BtcDominance } from "./btc-dominance";

describe("BtcDominance", () => {
  afterEach(() => vi.useRealTimers());

  it("mostra indisponível quando não existem pontos reais", () => {
    useMarketData.mockReturnValue({
      global: { btcDominance: 55, marketCapChange24h: 1, updatedAt: Date.now() },
      loading: false,
      metadataStatus: "ok",
    });
    useMarketHistory.mockReturnValue({
      data: { points: [] },
      isLoading: false,
      isError: false,
    });

    render(<BtcDominance />);

    expect(screen.getByText("Histórico de 30 dias indisponível.")).toBeTruthy();
  });

  it("ignora pontos sem dominância", () => {
    useMarketData.mockReturnValue({
      global: { btcDominance: 55, marketCapChange24h: 1, updatedAt: Date.now() },
      loading: false,
      metadataStatus: "ok",
    });
    useMarketHistory.mockReturnValue({
      data: {
        points: [
          { capturedAt: new Date().toISOString(), btcDominance: null, totalMarketCap: null, totalVolume: null, marketCapChange24h: null },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<BtcDominance />);

    expect(screen.getByText("Histórico de 30 dias indisponível.")).toBeTruthy();
  });

  it("marca o histórico como desatualizado quando o último ponto passa de 2 horas", () => {
    vi.useFakeTimers();
    const now = new Date("2026-10-05T16:00:00Z");
    vi.setSystemTime(now);
    const capturedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000 - 1).toISOString();

    useMarketData.mockReturnValue({
      global: { btcDominance: 55, marketCapChange24h: 1, updatedAt: now.getTime() },
      loading: false,
      metadataStatus: "ok",
    });
    useMarketHistory.mockReturnValue({
      data: {
        points: [
          { capturedAt, btcDominance: 55, totalMarketCap: null, totalVolume: null, marketCapChange24h: null },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<BtcDominance />);

    expect(screen.getByText(/Histórico persistido · CoinGecko · desatualizado/)).toBeTruthy();
  });
});
