// DADOS DE DEMONSTRAÇÃO — NÃO USAR EM PRODUÇÃO
//
// Este módulo é carregado SOMENTE via `import("./signals-data.mock")` atrás
// de um guard `import.meta.env.DEV`. Em builds de produção o tree-shaking
// remove a referência e o chunk não é emitido — assim mocks não vazam como
// sinais reais nem mesmo em caso de bug de renderização.
import type { AssetClass, Session, Signal, SetupType, SignalDirection, SignalStatus } from "./signals-data";

const exchanges = ["Binance", "Bybit", "OKX", "Coinbase"];
const setups: SetupType[] = ["BOS+OB", "CHoCH+FVG", "VWAP", "S/R", "Breakout", "Reversal"];
const sessions: Session[] = ["Asia", "London", "NY"];
const tfs: Signal["tf"][] = ["5m", "15m", "1H", "4H", "1D"];

const pairs: { sym: string; cls: AssetClass; price: number }[] = [
  { sym: "BTC/USDT", cls: "Crypto", price: 43240 },
  { sym: "ETH/USDT", cls: "Crypto", price: 2251 },
  { sym: "SOL/USDT", cls: "Crypto", price: 102.4 },
  { sym: "BNB/USDT", cls: "Crypto", price: 308 },
  { sym: "LINK/USDT", cls: "Crypto", price: 14.62 },
  { sym: "AVAX/USDT", cls: "Crypto", price: 36.1 },
  { sym: "ARB/USDT", cls: "Crypto", price: 1.78 },
  { sym: "INJ/USDT", cls: "Crypto", price: 28.4 },
  { sym: "MATIC/USDT", cls: "Crypto", price: 0.82 },
  { sym: "DOT/USDT", cls: "Crypto", price: 6.84 },
  { sym: "UNI/USDT", cls: "Crypto", price: 6.21 },
  { sym: "ATOM/USDT", cls: "Crypto", price: 9.12 },
  { sym: "EUR/USD", cls: "Forex", price: 1.0842 },
  { sym: "GBP/USD", cls: "Forex", price: 1.2671 },
  { sym: "USD/JPY", cls: "Forex", price: 149.32 },
  { sym: "AUD/USD", cls: "Forex", price: 0.6584 },
  { sym: "SPX500", cls: "Indices", price: 5128 },
  { sym: "NAS100", cls: "Indices", price: 18020 },
  { sym: "DJI30", cls: "Indices", price: 38940 },
  { sym: "DAX40", cls: "Indices", price: 17840 },
  { sym: "AAPL", cls: "Stocks", price: 191.2 },
  { sym: "TSLA", cls: "Stocks", price: 178.4 },
  { sym: "NVDA", cls: "Stocks", price: 875.1 },
  { sym: "MSFT", cls: "Stocks", price: 421.5 },
];

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export const mockSignals: Signal[] = pairs.map((p, i) => {
  const rand = seedRandom(i + 1);
  const direction: SignalDirection = rand() > 0.4 ? "BUY" : "SELL";
  const score = Math.round(55 + rand() * 42);
  const tf = tfs[Math.floor(rand() * tfs.length)];
  const entry = p.price;
  const moveStop = entry * (0.005 + rand() * 0.02);
  const moveTarget = moveStop * (1.8 + rand() * 2);
  const stop = direction === "BUY" ? entry - moveStop : entry + moveStop;
  const target = direction === "BUY" ? entry + moveTarget : entry - moveTarget;
  const rr = Number((moveTarget / moveStop).toFixed(1));
  const ageMin = Math.floor(rand() * 220);
  let status: SignalStatus = "active";
  if (ageMin < 5) status = "new";
  if (score >= 90) status = "premium";
  if (ageMin > 180) status = "expiring";
  if (i === 5) status = "expired";
  if (i === 11) status = "invalidated";
  const manipRisk = rand() > 0.75 ? "high" : rand() > 0.45 ? "medium" : "low";
  return {
    id: `sig-${i + 1}`,
    asset: p.sym,
    assetClass: p.cls,
    exchange: p.cls === "Crypto" ? exchanges[Math.floor(rand() * exchanges.length)] : p.cls === "Stocks" ? "NASDAQ" : p.cls === "Forex" ? "OANDA" : "CME",
    direction,
    score,
    tf,
    entry,
    stop,
    target,
    rr,
    riskPct: Number((0.5 + rand() * 1.8).toFixed(2)),
    volDelta: Math.round(40 + rand() * 220),
    confirms: {
      rsi: rand() > 0.25,
      macd: rand() > 0.3,
      volume: rand() > 0.2,
      structure: rand() > 0.15,
      vwap: rand() > 0.4,
    },
    dnaMatch: Math.round(40 + rand() * 58),
    manipRisk: manipRisk as "low" | "medium" | "high",
    setup: setups[Math.floor(rand() * setups.length)],
    session: sessions[Math.floor(rand() * sessions.length)],
    ageMin,
    status,
    isMock: true,
  };
});
