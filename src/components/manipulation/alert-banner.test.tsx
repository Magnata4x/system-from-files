import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertBanner } from "./alert-banner";

describe("AlertBanner — dados honestos", () => {
  it("não aparece sem alerta ativo e sem risco elevado", () => {
    const { container } = render(
      <AlertBanner count={0} assets={[]} riskLevel="LOW" onDismiss={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("aparece quando o risco é HIGH mesmo sem alertas ativos", () => {
    render(
      <AlertBanner count={0} assets={["BTCUSDT"]} riskLevel="HIGH" onDismiss={() => {}} />,
    );
    expect(screen.getByText("⚠ Elevated manipulation risk: HIGH")).toBeTruthy();
  });

  it("não trata um nível desconhecido como risco elevado", () => {
    const { container } = render(
      <AlertBanner count={0} assets={[]} riskLevel="UNKNOWN" onDismiss={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("aparece para alertas MEDIUM/HIGH ativos", () => {
    render(
      <AlertBanner count={2} assets={["BTC/USDT", "ETH/USDT"]} onDismiss={() => {}} />,
    );
    expect(screen.getByText("⚡ 2 ACTIVE MANIPULATION ALERTS DETECTED")).toBeTruthy();
    expect(screen.getByText("BTC/USDT · ETH/USDT")).toBeTruthy();
  });
});
