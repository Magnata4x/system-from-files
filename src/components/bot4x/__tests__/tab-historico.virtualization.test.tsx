import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TabHistorico } from "@/components/bot4x/tab-historico";
import { useBot4xStore } from "@/lib/bot4x-store";
import type { Trade } from "@/lib/bot4x-data";

// jsdom does not lay out elements: offsetHeight/Width are 0, so
// @tanstack/react-virtual would render zero items. Force a viewport
// large enough to render ~15 rows of 36px each.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() {
      return 600;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return 1280;
    },
  });
  if (!(globalThis as any).ResizeObserver) {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  // Recharts e outros componentes podem usar matchMedia.
  if (!window.matchMedia) {
    window.matchMedia = (() => ({
      matches: false,
      media: "",
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })) as unknown as typeof window.matchMedia;
  }
});

function makeTrades(n: number): Trade[] {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (i % 30));
    return {
      id: `t-${i}`,
      day: d.toISOString().slice(0, 10),
      pair: "BTC/USDT",
      side: i % 2 === 0 ? "LONG" : "SHORT",
      entry: 100 + i,
      stop: 95 + i,
      target: 110 + i,
      result: i % 3 === 0 ? "WIN" : "LOSS",
      pnl: i % 2 === 0 ? 5 : -3,
      pnlPct: i % 2 === 0 ? 0.5 : -0.3,
      accumulated: i,
      profile: "conservador",
      leverage: 3,
      motivo: `motivo ${i}`,
      hour: i % 24,
    } as Trade;
  });
}

describe("TabHistorico — virtualização", () => {
  beforeEach(() => {
    useBot4xStore.setState({ history: makeTrades(500) });
  });

  it("renderiza apenas as linhas visíveis (+overscan), não as 500", () => {
    render(<TabHistorico />);

    const rows = screen.getAllByTestId("trade-row");

    // Viewport = 600px / 36px ≈ 17 linhas + overscan 10 = ~27 no máximo.
    // Vasta margem em relação a 500; o que importa é NÃO renderizar tudo.
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(40);
    expect(rows.length).toBeLessThan(500);
  });

  it("define container interno com altura total proporcional a 500 linhas", () => {
    render(<TabHistorico />);
    const inner = screen.getByTestId("trade-list-inner");
    const height = parseInt(inner.style.height, 10);
    // 500 * 36 = 18000 px de "espaço virtual" para o scroll funcionar.
    expect(height).toBeGreaterThan(10000);
  });
});
