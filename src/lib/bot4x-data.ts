export type ExecMode = "DEMO" | "REAL";
export type Side = "LONG" | "SHORT";
export type CalibProfile =
  | "conservador"
  | "rsi"
  | "aiscore"
  | "agressivo"
  | "scalper"
  | "intraday"
  | "swing"
  | "position";

export type ProfileSpec = {
  id: CalibProfile;
  name: string;
  color: string;
  riskLabel: string;
  desc: string;
  rsiBuy: number;
  rsiSell: number;
  aiScore: number;
  fomo: number;
  wr: number;
  blockings30d: number;
  trades30d: number;
  riskRank: 1 | 2 | 3 | 4;
  warning?: { level: "amber" | "red"; text: string };
  levMatrix: Record<number, "ok" | "warn" | "no">;
};

export const PROFILES: Record<CalibProfile, ProfileSpec> = {
  conservador: {
    id: "conservador",
    name: "Conservador",
    color: "#3B6D11",
    riskLabel: "Risco Baixo",
    desc: "Máxima proteção patrimonial. Opera apenas em confluências institucionais perfeitas.",
    rsiBuy: 35,
    rsiSell: 65,
    aiScore: 85,
    fomo: 15,
    wr: 62,
    blockings30d: 647,
    trades30d: 183,
    riskRank: 1,
    levMatrix: { 1: "ok", 2: "ok", 3: "ok", 4: "warn", 5: "warn", 6: "warn", 7: "warn", 8: "no", 9: "no", 10: "no" },
  },
  rsi: {
    id: "rsi",
    name: "Calibrado RSI",
    color: "#185FA5",
    riskLabel: "Risco Moderado",
    desc: "RSI ampliado para capturar extremos menos severos. Reduz ~25% dos bloqueios.",
    rsiBuy: 40,
    rsiSell: 60,
    aiScore: 85,
    fomo: 15,
    wr: 59,
    blockings30d: 485,
    trades30d: 221,
    riskRank: 2,
    warning: { level: "amber", text: "⚠ Monitorar disjuntores em lev 1:6 e 1:10" },
    levMatrix: { 1: "ok", 2: "ok", 3: "ok", 4: "ok", 5: "warn", 6: "warn", 7: "warn", 8: "warn", 9: "no", 10: "no" },
  },
  aiscore: {
    id: "aiscore",
    name: "Calibrado aiScore",
    color: "#534AB7",
    riskLabel: "Risco Médio",
    desc: "aiScore reduzido para 78. Libera sinais em dias de baixa volatilidade.",
    rsiBuy: 35,
    rsiSell: 65,
    aiScore: 78,
    fomo: 15,
    wr: 57,
    blockings30d: 516,
    trades30d: 208,
    riskRank: 3,
    warning: { level: "red", text: "⛔ Não usar com alavancagem 1:8 e 1:10" },
    levMatrix: { 1: "ok", 2: "ok", 3: "ok", 4: "ok", 5: "warn", 6: "warn", 7: "warn", 8: "no", 9: "no", 10: "no" },
  },
  agressivo: {
    id: "agressivo",
    name: "Agressivo",
    color: "#A32D2D",
    riskLabel: "Risco Alto",
    desc: "RSI 40/60 + aiScore 78 + FOMO 20%. Máximo volume de operações.",
    rsiBuy: 40,
    rsiSell: 60,
    aiScore: 78,
    fomo: 20,
    wr: 53,
    blockings30d: 378,
    trades30d: 267,
    riskRank: 4,
    warning: { level: "red", text: "🚨 EXCLUSIVO para alavancagem 1:1 e 1:3" },
    levMatrix: { 1: "ok", 2: "ok", 3: "warn", 4: "warn", 5: "warn", 6: "warn", 7: "no", 8: "no", 9: "no", 10: "no" },
  },
  scalper: {
    id: "scalper" as CalibProfile,
    name: "Scalper",
    color: "#E0A82E",
    riskLabel: "Scalping M1-M5",
    desc: "ScalperEngine: EMA9/21, VWAP, ATR, volume e momentum. Confluência ≥80% em M1/M3/M5.",
    rsiBuy: 35,
    rsiSell: 65,
    aiScore: 80,
    fomo: 25,
    wr: 56,
    blockings30d: 420,
    trades30d: 312,
    riskRank: 4,
    warning: { level: "amber", text: "⚠ Scalping de alta frequência — requer baixo spread" },
    levMatrix: { 1: "ok", 2: "ok", 3: "ok", 4: "warn", 5: "warn", 6: "warn", 7: "no", 8: "no", 9: "no", 10: "no" },
  },
  intraday: {
    id: "intraday" as CalibProfile,
    name: "Intraday",
    color: "#2E86C1",
    riskLabel: "Intraday M15-H1",
    desc: "IntradayEngine: EMA20/50, RSI, MACD, ATR, volume crescente e estrutura. RR ≥ 1:2.",
    rsiBuy: 40,
    rsiSell: 60,
    aiScore: 80,
    fomo: 20,
    wr: 58,
    blockings30d: 390,
    trades30d: 178,
    riskRank: 3,
    warning: { level: "amber", text: "⚠ Requer tendência clara e volume crescente" },
    levMatrix: { 1: "ok", 2: "ok", 3: "ok", 4: "ok", 5: "warn", 6: "warn", 7: "warn", 8: "no", 9: "no", 10: "no" },
  },
  swing: {
    id: "swing" as CalibProfile,
    name: "Swing",
    color: "#16A085",
    riskLabel: "Swing H4-D1",
    desc: "SwingEngine: EMA50/200, RSI, MACD, ADX, volume institucional. Confluência ≥75%, RR ≥1:3.",
    rsiBuy: 45,
    rsiSell: 55,
    aiScore: 75,
    fomo: 30,
    wr: 61,
    blockings30d: 340,
    trades30d: 92,
    riskRank: 2,
    warning: { level: "amber", text: "⚠ Requer ADX favorável e tendência confirmada" },
    levMatrix: { 1: "ok", 2: "ok", 3: "ok", 4: "ok", 5: "warn", 6: "warn", 7: "no", 8: "no", 9: "no", 10: "no" },
  },
  position: {
    id: "position" as CalibProfile,
    name: "Position",
    color: "#8E44AD",
    riskLabel: "Position D1-W1",
    desc: "PositionEngine: EMA200/400, ciclo macro, fluxo institucional, correlação BTC/ETH. Confluência ≥70%, RR ≥1:4.",
    rsiBuy: 50,
    rsiSell: 50,
    aiScore: 70,
    fomo: 40,
    wr: 64,
    blockings30d: 280,
    trades30d: 32,
    riskRank: 2,
    warning: { level: "amber", text: "⚠ Tendência macro de longo prazo — exposição prolongada" },
    levMatrix: { 1: "ok", 2: "ok", 3: "ok", 4: "warn", 5: "warn", 6: "no", 7: "no", 8: "no", 9: "no", 10: "no" },
  },
};

// Fonte única de verdade para a ordem "mais seguro → mais arriscado" entre perfis.
// Derivada do `riskRank` de cada ProfileSpec acima — não duplicar esta lista em
// outros arquivos (era a causa do bug onde dna-auto-corrector.ts e
// dna-sim-corrector.ts discordavam sobre a posição de "swing" e "position").
// Sort é estável (ES2019+), então perfis com o mesmo riskRank mantêm a ordem
// de declaração em PROFILES acima.
export const PROFILE_RISK_LADDER: CalibProfile[] = (Object.keys(PROFILES) as CalibProfile[]).sort(
  (a, b) => PROFILES[a].riskRank - PROFILES[b].riskRank,
);

export function leverageRisk(lev: number): {
  tier: "low" | "med" | "high";
  label: string;
  color: string;
  diagnosis: string;
} {
  if (lev <= 3)
    return {
      tier: "low",
      label: "🟢 RISCO BAIXO",
      color: "#1D9E75",
      diagnosis: "Volatilidade absorvida. Boa zona para acumulação de WR.",
    };
  if (lev <= 7)
    return {
      tier: "med",
      label: "🟡 RISCO MÉDIO",
      color: "#EF9F27",
      diagnosis: "Alavancagem operacional. Requer disciplina de stop.",
    };
  return {
    tier: "high",
    label: "🔴 RISCO ALTO",
    color: "#E24B4A",
    diagnosis: "Liquidação próxima. Apenas com perfil Conservador + filtros máximos.",
  };
}

export function slTpFromLeverage(lev: number) {
  const sl = (0.005 / lev) * 100;
  const tp = (0.01 / lev) * 100;
  return { sl: sl.toFixed(3), tp: tp.toFixed(3) };
}

export type Order = {
  id: string;
  pair: string;
  side: Side;
  entry: number;
  sl: number;
  tp: number;
  openedAt: number;
  pnlPct: number;
};

export type FilterKey = "F1" | "F2" | "F3" | "F4" | "F5" | "F6";
export const FILTER_NAMES: Record<FilterKey, string> = {
  F1: "Universo",
  F2: "Grade",
  F3: "Par",
  F4: "Canal",
  F5: "Confluência",
  F6: "FOMO",
};

export type ChannelZone = "BOTTOM" | "MIDDLE" | "TOP";
export type TickSide = "BUY" | "SELL" | null;
export type Verdict = "EXECUTE" | "IGNORE" | "FOMO_BLOCKED" | "GRID_SATURATED" | "EMERGENCY_SHUTDOWN";
export type F5SubKey = "RSI" | "AISCORE" | "LIQGRAB";

export type Tick = {
  id: string;
  ts: number;
  pair: string;
  side: TickSide;
  channelZone: ChannelZone;
  rsi: number;
  aiScore: number;
  liquidityGrab: boolean;
  fomoDisplacement: number;
  // current calibration snapshot
  profileId: CalibProfile;
  rsiBuy: number;
  rsiSell: number;
  aiScoreMin: number;
  fomoLimit: number;
  // open slots used at the moment
  slotsUsed: number;
  // filter results
  filters: Record<FilterKey, boolean>;
  blockedAt?: FilterKey;
  f5Sub?: F5SubKey; // which sub-criterion of F5 failed
  verdict: Verdict;
  detail: Record<FilterKey, string>;
};

export type Trade = {
  id: string;
  day: string;
  pair: string;
  side: Side;
  entry: number;
  stop: number;
  target: number;
  result: "WIN" | "LOSS" | "BLOCKED" | "SHUTDOWN";
  pnl: number;
  pnlPct: number;
  accumulated: number;
  profile: CalibProfile;
  leverage: number;
  motivo: string;
  hour: number;
};

const PAIRS = [
  "BTC/USDT",
  "ETH/USDT",
  "SOL/USDT",
  "BNB/USDT",
  "XRP/USDT",
  "ARB/USDT",
  "AVAX/USDT",
  "LINK/USDT",
  "DOGE/USDT",
  "MATIC/USDT",
];
const MAX_SLOTS = 10; // keep in sync with bot4x-store.ts MAX_SLOTS
const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(a: T[]) => a[rand(a.length)];

type MakeTickCtx = {
  profile: ProfileSpec;
  slotsUsed: number; // 0..3
  busyPairs?: string[]; // pairs in active orders
  shutdown?: boolean; // emergency shutdown active
};

export function makeTick(ctx: MakeTickCtx): Tick {
  const { profile, slotsUsed, busyPairs = [], shutdown = false } = ctx;
  const pair = pick(PAIRS);

  // channel zone distribution: 30% BOTTOM, 30% TOP, 40% MIDDLE
  const cz = Math.random();
  const channelZone: ChannelZone = cz < 0.3 ? "BOTTOM" : cz < 0.6 ? "TOP" : "MIDDLE";
  const side: TickSide = channelZone === "BOTTOM" ? "BUY" : channelZone === "TOP" ? "SELL" : null;

  const rsi = +(Math.random() * 100).toFixed(1);
  const aiScore = Math.random() < 0.55 ? +(85 + Math.random() * 15).toFixed(1) : +(60 + Math.random() * 25).toFixed(1);
  const liquidityGrab = Math.random() < 0.65;
  const fomoDisplacement = +(Math.random() * 25).toFixed(1);

  const filters: Record<FilterKey, boolean> = { F1: true, F2: true, F3: true, F4: true, F5: true, F6: true };
  const detail: Record<FilterKey, string> = {
    F1: `Top 10 USDT`,
    F2: `${slotsUsed}/${MAX_SLOTS} slots`,
    F3: `Par livre`,
    F4: `Zona ${channelZone}`,
    F5: `RSI ${rsi} · aiScore ${aiScore} · liqGrab ${liquidityGrab ? "✓" : "✗"} · ${profile.name}`,
    F6: `Desl. ${fomoDisplacement}% (≤ ${profile.fomo}%)`,
  };

  let blockedAt: FilterKey | undefined;
  let f5Sub: F5SubKey | undefined;
  let verdict: Verdict = "EXECUTE";

  // F1: always pass (mocked top 10)
  // F2: grid saturation
  if (slotsUsed >= MAX_SLOTS) {
    filters.F2 = false;
    blockedAt = "F2";
    verdict = "GRID_SATURATED";
    detail.F2 = `Grade ${MAX_SLOTS}/${MAX_SLOTS} — saturada`;
  }
  // F3: pair busy
  else if (busyPairs.includes(pair)) {
    filters.F3 = false;
    blockedAt = "F3";
    verdict = "IGNORE";
    detail.F3 = `Par ${pair} já ativo`;
  }
  // F4: middle channel
  else if (channelZone === "MIDDLE") {
    filters.F4 = false;
    blockedAt = "F4";
    verdict = "IGNORE";
    detail.F4 = `Zona MIDDLE → BLOQUEADO`;
  }
  // F5: confluence
  else if (side === "BUY" && rsi >= profile.rsiBuy) {
    filters.F5 = false;
    blockedAt = "F5";
    f5Sub = "RSI";
    verdict = "IGNORE";
    detail.F5 = `RSI ${rsi} ≥ ${profile.rsiBuy} (esperado < ${profile.rsiBuy})`;
  } else if (side === "SELL" && rsi <= profile.rsiSell) {
    filters.F5 = false;
    blockedAt = "F5";
    f5Sub = "RSI";
    verdict = "IGNORE";
    detail.F5 = `RSI ${rsi} ≤ ${profile.rsiSell} (esperado > ${profile.rsiSell})`;
  } else if (aiScore < profile.aiScore) {
    filters.F5 = false;
    blockedAt = "F5";
    f5Sub = "AISCORE";
    verdict = "IGNORE";
    detail.F5 = `aiScore ${aiScore} < ${profile.aiScore}`;
  } else if (!liquidityGrab) {
    filters.F5 = false;
    blockedAt = "F5";
    f5Sub = "LIQGRAB";
    verdict = "IGNORE";
    detail.F5 = `liquidityGrab ausente`;
  }
  // F6: FOMO
  else if (fomoDisplacement > profile.fomo) {
    filters.F6 = false;
    blockedAt = "F6";
    verdict = "FOMO_BLOCKED";
    detail.F6 = `Desl. ${fomoDisplacement}% > ${profile.fomo}%`;
  }

  // Emergency shutdown overrides
  if (shutdown) {
    verdict = "EMERGENCY_SHUTDOWN";
  }

  // Mark filters after the blocked one as not reached
  if (blockedAt) {
    const order: FilterKey[] = ["F1", "F2", "F3", "F4", "F5", "F6"];
    const idx = order.indexOf(blockedAt);
    for (let i = idx + 1; i < order.length; i++) filters[order[i]] = false;
  }

  return {
    id: `tk_${Date.now()}_${rand(99999)}`,
    ts: Date.now(),
    pair,
    side,
    channelZone,
    rsi,
    aiScore,
    liquidityGrab,
    fomoDisplacement,
    profileId: profile.id,
    rsiBuy: profile.rsiBuy,
    rsiSell: profile.rsiSell,
    aiScoreMin: profile.aiScore,
    fomoLimit: profile.fomo,
    slotsUsed,
    filters,
    blockedAt,
    f5Sub,
    verdict,
    detail,
  };
}

export function genHistory(n = 80): Trade[] {
  const out: Trade[] = [];
  let acc = 1000;
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - rand(30));
    const pair = pick(PAIRS);
    const side: Side = Math.random() > 0.5 ? "LONG" : "SHORT";
    const r = Math.random();
    let result: Trade["result"];
    if (r < 0.55) result = "WIN";
    else if (r < 0.85) result = "LOSS";
    else if (r < 0.96) result = "BLOCKED";
    else result = "SHUTDOWN";
    const entry = +(100 + Math.random() * 40000).toFixed(2);
    const stop = +(entry * (side === "LONG" ? 0.995 : 1.005)).toFixed(2);
    const target = +(entry * (side === "LONG" ? 1.01 : 0.99)).toFixed(2);
    const pnlPct =
      result === "WIN"
        ? +(0.3 + Math.random() * 0.7).toFixed(2)
        : result === "LOSS"
          ? -+(0.3 + Math.random() * 0.5).toFixed(2)
          : 0;
    const pnl = +(acc * (pnlPct / 100)).toFixed(2);
    acc = +(acc + pnl).toFixed(2);
    const profile = pick<CalibProfile>(["conservador", "rsi", "aiscore", "agressivo"]);
    const leverage = 1 + rand(10);
    const motivo =
      result === "WIN"
        ? "TP atingido"
        : result === "LOSS"
          ? "SL atingido"
          : result === "BLOCKED"
            ? `Bloqueado em F${1 + rand(6)}`
            : "Circuit breaker -1.5%";
    out.push({
      id: `tr_${i}`,
      day: d.toISOString().slice(0, 10),
      pair,
      side,
      entry,
      stop,
      target,
      result,
      pnl,
      pnlPct,
      accumulated: acc,
      profile,
      leverage,
      motivo,
      hour: rand(24),
    });
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

export function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
