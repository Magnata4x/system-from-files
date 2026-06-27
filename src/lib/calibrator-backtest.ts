// Backtest com gestão de riscos:
//  - Stop/Take por trade (0,5% / 1% de variação de preço, intra-candle).
//  - Stop/Take diário em % de equity (-1,5% / +3%).
//  - Após +3% diário, trava o ganho e a cada +1% sobe o piso (trailing).
//  - Stop diário aciona pausa de 24h (take diário NÃO pausa, apenas trava o dia).
//  - Máx 10 operações simultâneas, cada uma usa 10% da banca atual.
//  - Engine único: 1 par (single) ou N pares (portfolio unificado).
//
// MODELO DE RISCO EM 3 CAMADAS (sincronizado com bot4x-store.ts):
//   banca total → allocationPct → capital ativo → RISK_PER_SLOT (10%) → slot size
//   Pior caso: 10 slots × 10% × SL 0.5% = 0.5% do capital ativo por wipeout total.
import type { Candle } from "./market-data";
import type {
  BackendSimulationResponse,
  BackendSimulationPoint,
  SimulationProfile,
} from "@/adapters/backend/calibrator.adapter";

// CORREÇÃO: importar calcRSI do engine para garantir que backtest e engine
// usem o mesmo algoritmo (Wilder smoothing). A função local usava média simples,
// divergindo do engine e produzindo sinais inconsistentes entre os dois contextos.
import { calcRSI as engineCalcRSI } from "./engine-scoring";

// ============ Risk Config ============
// IMPORTANTE: manter em sync com bot4x-store.ts (MAX_SLOTS=10, RISK_PER_SLOT=0.10).
// Alterar aqui sem alterar o store cria divergência entre backtest e execução real.
export const RISK_CONFIG = {
  positionFraction: 0.1, // 10% do equity por slot — sync com RISK_PER_SLOT
  maxConcurrent: 10, // máx. simultâneas — sync com MAX_SLOTS
  trade: { sl: 0.005, tp: 0.01 }, // movimento de preço (0.5% SL / 1.0% TP)
  daily: { sl: 0.015, tp: 0.03, trailStep: 0.01 }, // % de equity
  haltMs: 24 * 60 * 60 * 1000,
} as const;

// ============ Estratégias ============
function sma(values: number[], i: number, period: number): number | null {
  if (i + 1 < period) return null;
  let s = 0;
  for (let k = i - period + 1; k <= i; k++) s += values[k];
  return s / period;
}
// rsi: wrapper sobre engineCalcRSI para manter a assinatura (values[], i, period)
// usada pelas estratégias abaixo. Constrói OHLCVs sintéticos (close-only) e
// passa para o Wilder smoothing do engine — garantindo cálculo idêntico.
function rsi(values: number[], i: number, period = 14): number | null {
  if (i <= period) return null;
  const slice = values.slice(0, i + 1).map((close) => ({
    time: 0,
    open: close,
    high: close,
    low: close,
    close,
    volume: 0,
  }));
  return engineCalcRSI(slice, period);
}

type Signal = "LONG" | "SHORT" | "FLAT";
interface Ctx {
  closes: number[];
  i: number;
  candles?: Candle[];
}

// ===== ScalperEngine helpers (EMA, VWAP, ATR, volume anomaly) =====
function ema(values: number[], i: number, period: number): number | null {
  if (i + 1 < period) return null;
  const k = 2 / (period + 1);
  let e = values[i - period + 1];
  for (let j = i - period + 2; j <= i; j++) e = values[j] * k + e * (1 - k);
  return e;
}
function rollingVwap(candles: Candle[], i: number, period: number): number | null {
  if (i + 1 < period) return null;
  let pv = 0,
    vv = 0;
  for (let k = i - period + 1; k <= i; k++) {
    const c = candles[k];
    const tp = (c.high + c.low + c.close) / 3;
    pv += tp * c.volume;
    vv += c.volume;
  }
  return vv > 0 ? pv / vv : null;
}
function atr(candles: Candle[], i: number, period: number): number | null {
  if (i < period) return null;
  let s = 0;
  for (let k = i - period + 1; k <= i; k++) {
    const c = candles[k],
      p = candles[k - 1];
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    s += tr;
  }
  return s / period;
}

const STRATEGIES: Record<SimulationProfile, (c: Ctx) => Signal> = {
  conservador: ({ closes, i }) => {
    const f = sma(closes, i, 20),
      s = sma(closes, i, 50);
    if (f == null || s == null) return "FLAT";
    return f > s ? "LONG" : "FLAT";
  },
  rsi: ({ closes, i }) => {
    const r = rsi(closes, i, 14);
    if (r == null) return "FLAT";
    if (r < 30) return "LONG";
    if (r > 70) return "SHORT";
    return "FLAT";
  },
  aiscore: ({ closes, i }) => {
    const f = sma(closes, i, 10),
      s = sma(closes, i, 30),
      r = rsi(closes, i, 14);
    if (f == null || s == null || r == null) return "FLAT";
    const score = (f > s ? 1 : -1) + (r > 55 ? 1 : r < 45 ? -1 : 0);
    if (score >= 2) return "LONG";
    if (score <= -2) return "SHORT";
    return "FLAT";
  },
  agressivo: ({ closes, i }) => {
    if (i < 3) return "FLAT";
    const mom = (closes[i] - closes[i - 3]) / closes[i - 3];
    if (mom > 0.005) return "LONG";
    if (mom < -0.005) return "SHORT";
    return "FLAT";
  },
  // ScalperEngine (Bot4x): EMA9/21 + VWAP + ATR + volume + momentum.
  // Aprovação: confluência ≥ 80% (4 de 5 confirmações alinhadas).
  scalper: ({ closes, i, candles }) => {
    if (i < 22 || !candles) return "FLAT";
    const e9 = ema(closes, i, 9);
    const e21 = ema(closes, i, 21);
    const vwap = rollingVwap(candles, i, 20);
    const a = atr(candles, i, 14);
    if (e9 == null || e21 == null || vwap == null || a == null) return "FLAT";
    const price = closes[i];
    // momentum curto (3 candles)
    const mom = (closes[i] - closes[i - 3]) / closes[i - 3];
    // volume anomaly: vol atual vs média 20
    let vSum = 0;
    for (let k = i - 19; k <= i; k++) vSum += candles[k].volume;
    const vAvg = vSum / 20;
    const vCur = candles[i].volume;
    const volAnom = vAvg > 0 ? vCur / vAvg : 1;
    // força do candle (corpo / range)
    const c = candles[i];
    const range = c.high - c.low;
    const body = Math.abs(c.close - c.open);
    const bodyRatio = range > 0 ? body / range : 0;
    const bullishCandle = c.close > c.open;
    // ATR mínimo (rejeita mercado lateral extremo: ATR < 0.05% do preço)
    if (a / price < 0.0005) return "FLAT";

    // Confluências LONG
    const longChecks = [e9 > e21, price > vwap, mom > 0.0015, volAnom >= 1.3, bullishCandle && bodyRatio >= 0.55];
    const shortChecks = [e9 < e21, price < vwap, mom < -0.0015, volAnom >= 1.3, !bullishCandle && bodyRatio >= 0.55];
    const longScore = longChecks.filter(Boolean).length / longChecks.length;
    const shortScore = shortChecks.filter(Boolean).length / shortChecks.length;
    if (longScore >= 0.8) return "LONG";
    if (shortScore >= 0.8) return "SHORT";
    return "FLAT";
  },
  // IntradayEngine (Bot4x): EMA20/50, RSI, MACD, ATR, volume crescente, estrutura.
  // Aprovação: confluência ≥ 80% (5 de 6 confirmações alinhadas).
  intraday: ({ closes, i, candles }) => {
    if (i < 60 || !candles) return "FLAT";
    const e20 = ema(closes, i, 20);
    const e50 = ema(closes, i, 50);
    const r = rsi(closes, i, 14);
    const a = atr(candles, i, 14);
    if (e20 == null || e50 == null || r == null || a == null) return "FLAT";
    const price = closes[i];
    // MACD (12,26,9) — linha vs sinal
    const macdLine = (() => {
      const f = ema(closes, i, 12);
      const s = ema(closes, i, 26);
      return f != null && s != null ? f - s : null;
    })();
    if (macdLine == null) return "FLAT";
    // sinal = EMA9 do MACD aproximada: compara com macd de 3 candles atrás
    const macdPrev = (() => {
      const f = ema(closes, i - 3, 12);
      const s = ema(closes, i - 3, 26);
      return f != null && s != null ? f - s : null;
    })();
    if (macdPrev == null) return "FLAT";
    // Tendência (EMA20 x EMA50) + momentum (preço x EMA20)
    const trendUp = e20 > e50 && price > e20;
    const trendDown = e20 < e50 && price < e20;
    // Volume crescente: média 5 > média 20
    let v5 = 0,
      v20 = 0;
    for (let k = i - 4; k <= i; k++) v5 += candles[k].volume;
    for (let k = i - 19; k <= i; k++) v20 += candles[k].volume;
    const volRising = v5 / 5 > (v20 / 20) * 1.1;
    // Estrutura: maior alta/baixa em 10 candles
    let hh = -Infinity,
      ll = Infinity;
    for (let k = i - 9; k <= i; k++) {
      hh = Math.max(hh, candles[k].high);
      ll = Math.min(ll, candles[k].low);
    }
    const breakoutUp = candles[i].close >= hh * 0.999;
    const breakoutDown = candles[i].close <= ll * 1.001;
    // Volatilidade mínima (ATR ≥ 0.15% do preço)
    if (a / price < 0.0015) return "FLAT";

    const longChecks = [
      trendUp,
      r > 50 && r < 70,
      macdLine > 0 && macdLine > macdPrev,
      volRising,
      breakoutUp,
      a / price >= 0.0015,
    ];
    const shortChecks = [
      trendDown,
      r < 50 && r > 30,
      macdLine < 0 && macdLine < macdPrev,
      volRising,
      breakoutDown,
      a / price >= 0.0015,
    ];
    const longScore = longChecks.filter(Boolean).length / longChecks.length;
    const shortScore = shortChecks.filter(Boolean).length / shortChecks.length;
    if (longScore >= 0.8) return "LONG";
    if (shortScore >= 0.8) return "SHORT";
    return "FLAT";
  },
  // SwingEngine (Bot4x): EMA50/200, RSI, MACD, ADX proxy, volume institucional, rompimentos, pullbacks.
  // Aprovação: confluência ≥ 75% (6 de 8 confirmações alinhadas). RR alvo 1:3 (gerido pelo engine de risco).
  swing: ({ closes, i, candles }) => {
    if (i < 210 || !candles) return "FLAT";
    const e50 = ema(closes, i, 50);
    const e200 = ema(closes, i, 200);
    const r = rsi(closes, i, 14);
    const a = atr(candles, i, 14);
    if (e50 == null || e200 == null || r == null || a == null) return "FLAT";
    const price = closes[i];
    const macdLine = (() => {
      const f = ema(closes, i, 12);
      const s = ema(closes, i, 26);
      return f != null && s != null ? f - s : null;
    })();
    const macdPrev = (() => {
      const f = ema(closes, i - 5, 12);
      const s = ema(closes, i - 5, 26);
      return f != null && s != null ? f - s : null;
    })();
    if (macdLine == null || macdPrev == null) return "FLAT";
    // ADX proxy: força direcional via |EMA50 - EMA200| / preço
    const adxProxy = Math.abs(e50 - e200) / price;
    const strongTrend = adxProxy >= 0.015;
    // Volume institucional: média 20 acima da média 50
    let v20 = 0,
      v50 = 0;
    for (let k = i - 19; k <= i; k++) v20 += candles[k].volume;
    for (let k = i - 49; k <= i; k++) v50 += candles[k].volume;
    const volInst = v20 / 20 > (v50 / 50) * 1.15;
    // Rompimento 20 candles
    let hh = -Infinity,
      ll = Infinity;
    for (let k = i - 19; k <= i; k++) {
      hh = Math.max(hh, candles[k].high);
      ll = Math.min(ll, candles[k].low);
    }
    const breakoutUp = candles[i].close >= hh * 0.999;
    const breakoutDown = candles[i].close <= ll * 1.001;
    // Pullback de qualidade: preço encostou em EMA50 nos últimos 5 candles
    let pullbackUp = false,
      pullbackDown = false;
    for (let k = i - 4; k <= i; k++) {
      const e = ema(closes, k, 50);
      if (e == null) continue;
      if (candles[k].low <= e * 1.005 && candles[k].close > e) pullbackUp = true;
      if (candles[k].high >= e * 0.995 && candles[k].close < e) pullbackDown = true;
    }
    if (a / price < 0.002) return "FLAT"; // baixa participação / lateralidade

    const longChecks = [
      e50 > e200,
      price > e50,
      r > 50 && r < 70,
      macdLine > 0 && macdLine > macdPrev,
      strongTrend,
      volInst,
      breakoutUp,
      pullbackUp,
    ];
    const shortChecks = [
      e50 < e200,
      price < e50,
      r < 50 && r > 30,
      macdLine < 0 && macdLine < macdPrev,
      strongTrend,
      volInst,
      breakoutDown,
      pullbackDown,
    ];
    const longScore = longChecks.filter(Boolean).length / longChecks.length;
    const shortScore = shortChecks.filter(Boolean).length / shortChecks.length;
    if (longScore >= 0.75) return "LONG";
    if (shortScore >= 0.75) return "SHORT";
    return "FLAT";
  },
  // PositionEngine (Bot4x): EMA200/400, ciclo macro, fluxo institucional, correlação BTC/ETH.
  // Aprovação: confluência ≥ 70% (5 de 7 confirmações). RR alvo 1:4.
  position: ({ closes, i, candles }) => {
    if (i < 410 || !candles) return "FLAT";
    const e200 = ema(closes, i, 200);
    const e400 = ema(closes, i, 400);
    if (e200 == null || e400 == null) return "FLAT";
    const price = closes[i];
    // Estrutura macro: preço acima/abaixo da média 200 por ≥30 candles
    let macroBull = 0,
      macroBear = 0;
    for (let k = i - 29; k <= i; k++) {
      const e = ema(closes, k, 200);
      if (e == null) continue;
      if (closes[k] > e) macroBull++;
      else macroBear++;
    }
    const macroUp = macroBull >= 25;
    const macroDown = macroBear >= 25;
    // Ciclo: variação 90 candles
    const cycleRet = i >= 90 ? (closes[i] - closes[i - 90]) / closes[i - 90] : 0;
    // Fluxo institucional: volume médio 30 acima do 90
    let v30 = 0,
      v90 = 0;
    for (let k = i - 29; k <= i; k++) v30 += candles[k].volume;
    for (let k = i - 89; k <= i; k++) v90 += candles[k].volume;
    const instFlow = v30 / 30 > (v90 / 90) * 1.1;
    // Tendência dominante (EMA200 inclinação)
    const e200Prev = ema(closes, i - 20, 200);
    const slopeUp = e200Prev != null && e200 > e200Prev;
    const slopeDown = e200Prev != null && e200 < e200Prev;
    // Correlação BTC/ETH não disponível por símbolo individual; usa consistência de fechamento
    let upDays = 0,
      downDays = 0;
    for (let k = i - 19; k <= i; k++) {
      if (closes[k] > closes[k - 1]) upDays++;
      else downDays++;
    }
    const consUp = upDays >= 12;
    const consDown = downDays >= 12;

    const longChecks = [e200 > e400, price > e200, macroUp, cycleRet > 0.05, instFlow, slopeUp, consUp];
    const shortChecks = [e200 < e400, price < e200, macroDown, cycleRet < -0.05, instFlow, slopeDown, consDown];
    const longScore = longChecks.filter(Boolean).length / longChecks.length;
    const shortScore = shortChecks.filter(Boolean).length / shortChecks.length;
    if (longScore >= 0.7) return "LONG";
    if (shortScore >= 0.7) return "SHORT";
    return "FLAT";
  },
};

// ============ Tipos ============
export interface SymbolData {
  symbol: string;
  candles: Candle[];
}
export interface PortfolioParams {
  profile: SimulationProfile;
  symbols: SymbolData[];
  initialBalance: number;
  leverage: number;
  feePerTrade?: number;
}
export interface PairStat {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
}
export interface BacktestResponse extends BackendSimulationResponse {
  by_pair?: PairStat[];
  risk?: {
    dayStops: number;
    dayTakes: number;
    haltedDays: number;
    liquidated: boolean;
  };
}

interface OpenPos {
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  notional: number;
  entryTime: number;
}

const utcDayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
};

// ============ Engine ============
export function runPortfolioBacktest(p: PortfolioParams): BacktestResponse {
  const fee = p.feePerTrade ?? 0.0008;
  const leverage = Math.max(1, Math.min(125, p.leverage || 1));
  const lev = leverage;

  // Todos os perfis usam o mesmo modelo de risco: 10 slots × 10% do equity.
  // Scalper mantém SL/TP menores (0.25%/0.50%) por ser alta frequência,
  // mas compartilha o mesmo pool de slots que os demais perfis.
  const isScalper = p.profile === "scalper";
  const SL = isScalper ? 0.0025 : RISK_CONFIG.trade.sl; // Scalper: 0.25% | demais: 0.5%
  const TP = isScalper ? 0.005 : RISK_CONFIG.trade.tp; // Scalper: 0.50% | demais: 1.0%
  const MAX = RISK_CONFIG.maxConcurrent; // 10 slots para todos
  const FRAC = RISK_CONFIG.positionFraction; // 10% do equity por slot
  const DSL = RISK_CONFIG.daily.sl;
  const DTP = RISK_CONFIG.daily.tp;
  const STEP = RISK_CONFIG.daily.trailStep;
  const HALT = RISK_CONFIG.haltMs;

  // Index candles by closeTime per symbol
  const closesBySym = new Map<string, number[]>();
  const candleAt = new Map<string, Map<number, { idx: number; candle: Candle }>>();
  const timelineSet = new Set<number>();
  for (const s of p.symbols) {
    const closes: number[] = [];
    const m = new Map<number, { idx: number; candle: Candle }>();
    s.candles.forEach((c, idx) => {
      closes.push(c.close);
      m.set(c.closeTime, { idx, candle: c });
      timelineSet.add(c.closeTime);
    });
    closesBySym.set(s.symbol, closes);
    candleAt.set(s.symbol, m);
  }
  const timeline = Array.from(timelineSet).sort((a, b) => a - b);

  // Last known close per symbol (for mark-to-market between candles)
  const lastClose = new Map<string, number>();

  let cash = p.initialBalance;
  let open: OpenPos[] = [];
  let peak = p.initialBalance;
  let maxDd = 0;
  let dayKey: string | null = null;
  let dayStartEquity = p.initialBalance;
  let dailyFloor: number | null = null;
  let dailyHaltedForDay = false;
  let pauseUntilMs = 0;
  let liquidated = false;
  let dayStops = 0;
  let dayTakes = 0;
  let haltedDays = 0;

  const equity_curve: BackendSimulationPoint[] = [];
  const pairStats = new Map<string, PairStat>();
  const stat = (sym: string) => {
    let s = pairStats.get(sym);
    if (!s) {
      s = { symbol: sym, trades: 0, wins: 0, losses: 0, pnl: 0 };
      pairStats.set(sym, s);
    }
    return s;
  };

  const markedEquity = () => {
    let eq = cash;
    for (const pos of open) {
      const ref = lastClose.get(pos.symbol) ?? pos.entryPrice;
      const dir = pos.side === "LONG" ? 1 : -1;
      const ret = ((ref - pos.entryPrice) / pos.entryPrice) * dir * lev;
      eq += pos.notional * ret;
    }
    return eq;
  };

  const realizeClose = (pos: OpenPos, exitPrice: number) => {
    const dir = pos.side === "LONG" ? 1 : -1;
    const ret = ((exitPrice - pos.entryPrice) / pos.entryPrice) * dir * lev - fee;
    const pnl = pos.notional * ret;
    cash += pnl;
    const s = stat(pos.symbol);
    s.trades += 1;
    s.pnl += pnl;
    if (pnl >= 0) s.wins += 1;
    else s.losses += 1;
  };

  const closeAll = (_ts: number) => {
    for (const pos of open) {
      const ref = lastClose.get(pos.symbol) ?? pos.entryPrice;
      realizeClose(pos, ref);
    }
    open = [];
  };

  for (const ts of timeline) {
    // 1) Atualiza lastClose com os candles que fecham neste ts
    for (const s of p.symbols) {
      const c = candleAt.get(s.symbol)!.get(ts);
      if (c) lastClose.set(s.symbol, c.candle.close);
    }

    // 2) Checa SL/TP intra-candle para posições cujo símbolo fechou neste ts
    const remaining: OpenPos[] = [];
    for (const pos of open) {
      const cInfo = candleAt.get(pos.symbol)!.get(ts);
      if (!cInfo) {
        remaining.push(pos);
        continue;
      }
      const c = cInfo.candle;
      // Liquidação por alavancagem
      const worst = pos.side === "LONG" ? c.low : c.high;
      const adverse =
        pos.side === "LONG" ? (worst - pos.entryPrice) / pos.entryPrice : (pos.entryPrice - worst) / pos.entryPrice;
      if (adverse * lev <= -1) {
        const dir = pos.side === "LONG" ? 1 : -1;
        const ret = -1 - fee;
        const pnl = pos.notional * ret;
        cash += pnl;
        const s = stat(pos.symbol);
        s.trades += 1;
        s.losses += 1;
        s.pnl += pnl;
        liquidated = liquidated || cash <= 0;
        continue;
      }
      // SL/TP: ordem conservadora — checa SL primeiro se atingido
      const slPrice = pos.side === "LONG" ? pos.entryPrice * (1 - SL) : pos.entryPrice * (1 + SL);
      const tpPrice = pos.side === "LONG" ? pos.entryPrice * (1 + TP) : pos.entryPrice * (1 - TP);
      const hitSl = pos.side === "LONG" ? c.low <= slPrice : c.high >= slPrice;
      const hitTp = pos.side === "LONG" ? c.high >= tpPrice : c.low <= tpPrice;
      if (hitSl) {
        realizeClose(pos, slPrice);
        continue;
      }
      if (hitTp) {
        realizeClose(pos, tpPrice);
        continue;
      }
      remaining.push(pos);
    }
    open = remaining;

    // 3) Day rollover
    const k = utcDayKey(ts);
    if (k !== dayKey) {
      dayKey = k;
      dayStartEquity = Math.max(1e-6, markedEquity());
      dailyFloor = null;
      dailyHaltedForDay = false;
    }

    // 4) Avalia metas diárias
    let eq = markedEquity();
    const dailyPnl = (eq - dayStartEquity) / dayStartEquity;
    if (!dailyHaltedForDay) {
      if (dailyPnl <= -DSL) {
        closeAll(ts);
        pauseUntilMs = ts + HALT;
        dailyHaltedForDay = true;
        dayStops += 1;
        haltedDays += 1;
        eq = markedEquity();
      } else if (dailyPnl >= DTP) {
        const newFloor = DTP + Math.floor((dailyPnl - DTP) / STEP) * STEP;
        dailyFloor = Math.max(dailyFloor ?? -Infinity, newFloor);
        if (dailyPnl < dailyFloor) {
          closeAll(ts);
          dailyHaltedForDay = true;
          dayTakes += 1;
          eq = markedEquity();
        }
      }
    }

    // 5) Entradas (se não pausado, não halted, slot disponível)
    if (!dailyHaltedForDay && ts >= pauseUntilMs && open.length < MAX && cash > 0 && eq > 0) {
      const heldSymbols = new Set(open.map((o) => o.symbol));
      for (const s of p.symbols) {
        if (open.length >= MAX) break;
        if (heldSymbols.has(s.symbol)) continue;
        const cInfo = candleAt.get(s.symbol)!.get(ts);
        if (!cInfo) continue;
        const sig = STRATEGIES[p.profile]({ closes: closesBySym.get(s.symbol)!, i: cInfo.idx, candles: s.candles });
        if (sig === "FLAT") continue;
        if (eq <= 0 || cash <= 0) break;
        const notional = eq * FRAC;
        if (notional <= 0) break;
        open.push({
          symbol: s.symbol,
          side: sig,
          entryPrice: cInfo.candle.close,
          notional,
          entryTime: ts,
        });
        heldSymbols.add(s.symbol);
        eq = markedEquity();
      }
    }

    // 6) Curva de equity
    const point = Math.max(0, markedEquity());
    if (point > peak) peak = point;
    const dd = peak > 0 ? (peak - point) / peak : 0;
    if (dd > maxDd) maxDd = dd;
    equity_curve.push({ t: new Date(ts).toISOString(), equity: Number(point.toFixed(2)) });

    if (cash <= 0 && open.length === 0) {
      liquidated = true;
      break;
    }
  }

  // Fecha posições pendentes
  if (open.length > 0) {
    closeAll(timeline[timeline.length - 1] ?? Date.now());
    if (equity_curve.length > 0) {
      equity_curve[equity_curve.length - 1] = {
        t: equity_curve[equity_curve.length - 1].t,
        equity: Number(Math.max(0, cash).toFixed(2)),
      };
    }
  }

  const finalEquity = Math.max(0, cash);
  let wins = 0,
    losses = 0,
    trades = 0;
  for (const s of pairStats.values()) {
    wins += s.wins;
    losses += s.losses;
    trades += s.trades;
  }
  const pnl = finalEquity - p.initialBalance;
  const pnl_pct = (pnl / p.initialBalance) * 100;
  const win_rate = trades ? wins / trades : 0;

  const rets: number[] = [];
  for (let i = 1; i < equity_curve.length; i++) {
    const prev = equity_curve[i - 1].equity;
    if (prev > 0) rets.push((equity_curve[i].equity - prev) / prev);
  }
  const mean = rets.reduce((a, b) => a + b, 0) / Math.max(rets.length, 1);
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(rets.length - 1, 1);
  const std = Math.sqrt(variance);
  const sharpe = std > 0 ? Number(((mean / std) * Math.sqrt(rets.length)).toFixed(2)) : 0;

  const symLabel = p.symbols.length === 1 ? p.symbols[0].symbol : `${p.symbols.length} pares`;
  const commentary = liquidated
    ? `LIQUIDADO • alavancagem ${lev}× ${p.profile} em ${symLabel}`
    : `Gestão de risco ativa • ${symLabel} • alav ${lev}× • SL/TP ${SL * 100}%/${TP * 100}% por trade • SL/TP diário ${DSL * 100}%/${DTP * 100}% • ${dayStops} stop(s) diário(s) • ${dayTakes} take(s) diário(s) • 10 slots × 10% equity`;

  return {
    trades,
    wins,
    losses,
    win_rate: Number(win_rate.toFixed(4)),
    pnl: Number(pnl.toFixed(2)),
    pnl_pct: Number(pnl_pct.toFixed(2)),
    max_drawdown: Number(maxDd.toFixed(4)),
    sharpe,
    equity_curve,
    dna_feedback: {
      pattern_detected: `Risco: ${dayStops} stop(s) diário(s) · ${dayTakes} take(s) diário(s) · win rate ${(win_rate * 100).toFixed(1)}%`,
      correction: liquidated
        ? "Reduzir alavancagem — capital foi liquidado"
        : dayStops > dayTakes
          ? "Stops diários dominam — revisar perfil ou janela"
          : pnl >= 0
            ? "Parâmetros saudáveis — manter risco"
            : "PnL negativo mesmo com risco controlado — refinar entradas",
      expected_improvement: liquidated
        ? "Sobrevivência do capital + maior consistência"
        : "Maior estabilidade do Sharpe com SL/TP ativos",
    },
    commentary,
    by_pair: Array.from(pairStats.values()).map((s) => ({
      ...s,
      pnl: Number(s.pnl.toFixed(2)),
    })),
    risk: { dayStops, dayTakes, haltedDays, liquidated },
  };
}

// Compat: single-pair (mantém assinatura legacy)
export interface BacktestParams {
  profile: SimulationProfile;
  symbol: string;
  candles: Candle[];
  initialBalance: number;
  leverage: number;
  feePerTrade?: number;
}
export function runBacktest(p: BacktestParams): BacktestResponse {
  return runPortfolioBacktest({
    profile: p.profile,
    symbols: [{ symbol: p.symbol, candles: p.candles }],
    initialBalance: p.initialBalance,
    leverage: p.leverage,
    feePerTrade: p.feePerTrade,
  });
}
