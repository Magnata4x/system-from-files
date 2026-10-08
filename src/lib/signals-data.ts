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
  entry: number | null;
  stop: number | null;
  target: number | null;
  rr: number | null;
  riskPct: number | null;
  volDelta: number | null;
  confirms: { rsi: boolean | null; macd: boolean | null; volume: boolean | null; structure: boolean | null; vwap: boolean | null } | null;
  dnaMatch: number | null;
  manipRisk: "low" | "medium" | "high" | null;
  setup: SetupType | string | null;
  session: Session | string | null;
  createdAt?: string | null;
  ageMin: number | null;
  status: SignalStatus | null;
  isMock?: boolean;
};

export function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (p >= 10) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(4);
}

export function formatAge(min: number | null): string {
  if (min == null || !Number.isFinite(min)) return "—";
  if (min < 1) return "agora";
  if (min < 60) return `${min}m atrás`;
  const h = Math.floor(min / 60);
  return `${h}h atrás`;
}
