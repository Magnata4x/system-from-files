export type SignalDirection = "BUY" | "SELL";
export type SignalStatus = "active" | "new" | "premium" | "expiring" | "expired" | "invalidated";
export type AssetClass = "Crypto" | "Forex" | "Indices" | "Stocks";
export type SetupType = "BOS+OB" | "CHoCH+FVG" | "VWAP" | "S/R" | "Breakout" | "Reversal";
export type Session = "Asia" | "London" | "NY";

export type Signal = {
  id: string;
  asset: string;
  assetClass: AssetClass;
  exchange: string;
  direction: SignalDirection;
  score: number;
  tf: "1m" | "5m" | "15m" | "1H" | "4H" | "1D";
  entry: number;
  stop: number;
  target: number;
  rr: number;
  riskPct: number;
  volDelta: number; // % vol vs avg
  confirms: { rsi: boolean; macd: boolean; volume: boolean; structure: boolean; vwap: boolean };
  dnaMatch: number; // 0-100
  manipRisk: "low" | "medium" | "high";
  setup: SetupType;
  session: Session;
  ageMin: number;
  status: SignalStatus;
  /** true = dado de demonstração, não usar para trading real */
  isMock?: boolean;
};

// Dados de demonstração foram extraídos para `signals-data.mock.ts` e são
// carregados via import dinâmico atrás de `import.meta.env.DEV` no store.
// Mantemos aqui apenas tipos e helpers de formatação para que o bundle de
// produção não contenha nenhum mock.

export function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (p >= 10) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(4);
}

export function formatAge(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return `${h}h ago`;
}
