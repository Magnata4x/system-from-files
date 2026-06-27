// Bot4x — Signal scoring logic for the 4 analytical engines.
// SCALPER (M5) · INTRADAY (H1) · SWING (H4) · POSITION (D1)
// Pure functions — no API calls. Consume OHLCV cache already populated.

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Volatility = "LOW" | "MEDIUM" | "HIGH";
export type Trend = "BULLISH" | "BEARISH" | "NEUTRAL";

export type RegimeType = "TRENDING" | "TRENDING_BULL" | "TRENDING_BEAR" | "RANGING" | "RANGING_BULL" | "RANGING_BEAR";

export interface MarketRegime {
  trend: Trend;
  type?: RegimeType;
}

export interface EngineSignal {
  score: number;
  threshold: number;
  side: Direction;
}

export interface MarketSnapshot {
  price: number;
  triggerPrice: number;
  manipulationScore: number;
  volatility: Volatility;
  rsi: number;
  aiScore: number;
  fearGreedIndex: number;
  btcDominance?: number;
  fundingRate?: number;
  btcCandles?: OHLCV[];
}

export type Zone = "TOP" | "MIDDLE" | "BOTTOM";
export type Direction = "BUY" | "SELL" | "HOLD";

// ===== Global helpers =====

export function calcChannelZone(candles: OHLCV[], currentPrice: number): Zone {
  const last20 = candles.slice(-20);
  const pivotHigh = Math.max(...last20.map((c) => c.high));
  const pivotLow = Math.min(...last20.map((c) => c.low));
  // Guarda: range zero (mercado completamente flat) faz `position` virar NaN.
  // NaN >= / <= sempre retorna false, então sem essa guarda a função já caía em
  // "MIDDLE" por acidente — deixamos explícito para não depender desse acaso.
  if (pivotHigh === pivotLow) return "MIDDLE";
  const position = (currentPrice - pivotLow) / (pivotHigh - pivotLow);
  if (position >= 0.75) return "TOP";
  if (position <= 0.3) return "BOTTOM";
  return "MIDDLE";
}

export function calcVolumeRatio(candles: OHLCV[]): number {
  const last20Vols = candles.slice(-20).map((c) => c.volume);
  const avgVol = last20Vols.reduce((a, b) => a + b, 0) / last20Vols.length;
  const currentVol = candles[candles.length - 1].volume;
  // Guarda: volume médio zero faria o ratio virar Infinity, inflando o score
  // artificialmente em qualquer engine que o consuma.
  if (!avgVol) return 0;
  return currentVol / avgVol - 1;
  // > 0.5  → high volume (+15)
  // 0–0.5  → neutral     (+0)
  // < 0    → below avg   (-10)
}

// NOVO: calcRSI — cálculo próprio de RSI (Wilder's smoothing) para uso interno.
// O engine INTRADAY dependia de snapshot.rsi vindo do backend, que em fallback
// ficava com valor fixo (64) do mockBTCSnapshot. Agora o engine pode calcular
// diretamente dos candles quando disponível.
export function calcRSI(candles: OHLCV[], period = 14): number {
  if (candles.length < period + 1) return 50; // neutro — dados insuficientes

  // Seed: média simples dos primeiros `period` gains/losses
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder smoothing para o restante dos candles
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

// ===== Engine 1 — SCALPER (M5) =====

export function calcScalperScore(snapshot: MarketSnapshot, candles: OHLCV[]): EngineSignal {
  // Hard block
  if (snapshot.manipulationScore >= 60) return { score: 0, threshold: 70, side: "HOLD" };

  let score = 55; // raised from 50 — scalper is high-frequency, needs higher base

  // Volatility — no longer penalizes LOW, only rewards HIGH/MEDIUM
  if (snapshot.volatility === "HIGH") score += 15;
  if (snapshot.volatility === "MEDIUM") score += 8;
  // LOW: no penalty, no bonus — handled by adaptive threshold below

  // Channel zone — MIDDLE exige confluência de volume + AI para reduzir falsos positivos
  const zone = calcChannelZone(candles, snapshot.price);
  if (zone === "BOTTOM") score += 20;
  if (zone === "TOP") score += 20;
  // MIDDLE: sinal só se volume alto E AI forte — caso contrário bloqueia
  if (zone === "MIDDLE") {
    const vr = calcVolumeRatio(candles);
    if (!(vr > 0.3 && snapshot.aiScore >= 70)) {
      return { score: 0, threshold: 70, side: "HOLD" };
    }
  }

  // AI score
  if (snapshot.aiScore >= 75) score += 15;
  else if (snapshot.aiScore >= 60) score += 8;
  else score -= 10;

  // Volume (normalized ratio)
  const vr = calcVolumeRatio(candles);
  if (vr > 0.5) score += 15;
  else if (vr < 0) score -= 8;


  // Anti-FOMO hard block
  const drift = Math.abs((snapshot.price - snapshot.triggerPrice) / snapshot.triggerPrice);
  if (drift > 0.02) return { score: 0, threshold: 70, side: "HOLD" };

  score = Math.max(0, Math.min(100, score));

  // Adaptive threshold by volatility + zone
  let threshold = 68;
  if (snapshot.volatility === "HIGH" && zone !== "MIDDLE") threshold = 72;
  if (snapshot.volatility === "MEDIUM" && zone !== "MIDDLE") threshold = 68;
  if (snapshot.volatility === "LOW") threshold = 63;

  const lastCandle = candles[candles.length - 1];
  const middleDir: Direction = lastCandle.close > lastCandle.open ? "BUY" : "SELL";
  const side: Direction =
    score >= threshold ? (zone === "BOTTOM" ? "BUY" : zone === "TOP" ? "SELL" : middleDir) : "HOLD";

  return { score, threshold, side };
}

export function scalperSignal(snapshot: MarketSnapshot, candles: OHLCV[]): Direction {
  return calcScalperScore(snapshot, candles).side;
}

export const SCALPER_RISK = { slPct: 0.5, tpPct: 1.0, rr: 2.0, expiryMin: 20 };

// ===== Engine 2 — INTRADAY (H1) =====

export function calcIntradayScore(snapshot: MarketSnapshot, candles: OHLCV[], regime: MarketRegime): EngineSignal {
  let score = 50;

  const zone = calcChannelZone(candles, snapshot.price);
  const isRanging = regime.type === "RANGING" || regime.type === "RANGING_BULL" || regime.type === "RANGING_BEAR";

  if (isRanging) {
    // RSI is OFF in ranging — use pivot channel logic instead
    if (zone === "BOTTOM") score += 25;
    if (zone === "TOP") score += 25;
    if (zone === "MIDDLE") score -= 15;

    // Candle body confirmation — must close in signal direction
    const lastCandle = candles[candles.length - 1];
    const candleDir: Direction = lastCandle.close > lastCandle.open ? "BUY" : "SELL";
    const signalDir: Direction = zone === "BOTTOM" ? "BUY" : "SELL";
    if (candleDir !== signalDir) score -= 20;

    // Manipulation
    if (snapshot.manipulationScore >= 75) score -= 25;
    else if (snapshot.manipulationScore >= 50) score -= 10;

    // AI score in ranging
    if (snapshot.aiScore >= 75 && zone !== "MIDDLE") score += 12;

    const threshold = 75;
    score = Math.max(0, Math.min(100, score));
    const side: Direction =
      score >= threshold ? (zone === "BOTTOM" ? "BUY" : zone === "TOP" ? "SELL" : "HOLD") : "HOLD";
    return { score, threshold, side };
  }

  // TRENDING regime — RSI dynamic logic
  // CORREÇÃO: snapshot.rsi pode ser undefined/stale em fallback mock.
  // Priorizar cálculo próprio via candles quando disponíveis (>= 15 candles).
  // Fallback explícito para 50 (neutro) em vez de depender de valor fixo externo.
  const rsi = candles.length >= 15 ? calcRSI(candles, 14) : (snapshot.rsi ?? 50);

  if (regime.trend === "BULLISH" && rsi < 40) score += 20;
  if (regime.trend === "BEARISH" && rsi > 65) score += 20;
  if (rsi >= 40 && rsi <= 60) score -= 10;

  // BTC dominance
  const dom = snapshot.btcDominance ?? 50;
  if (dom < 40) score -= 15;
  if (dom > 60) score += 8;

  // Volatility
  if (snapshot.volatility === "HIGH") score += 10;
  if (snapshot.volatility === "LOW") score -= 15;

  // Manipulation
  if (snapshot.manipulationScore >= 75) score -= 25;
  else if (snapshot.manipulationScore >= 50) score -= 10;

  // AI score graduated
  if (snapshot.aiScore >= 80 && zone !== "MIDDLE") score += 20;
  else if (snapshot.aiScore >= 75 && zone !== "MIDDLE") score += 15;
  else if (snapshot.aiScore >= 75 && zone === "MIDDLE") score += 5;

  // Candle body confirmation
  const lastCandle = candles[candles.length - 1];
  const expectedDir: Direction = regime.trend === "BULLISH" ? "BUY" : "SELL";
  const candleDir: Direction = lastCandle.close > lastCandle.open ? "BUY" : "SELL";
  if (candleDir !== expectedDir) score -= 15;

  // Fear & Greed
  const fg = snapshot.fearGreedIndex;
  if (fg <= 25) score += 10;
  if (fg >= 80) score -= 10;

  const threshold = 68;
  score = Math.max(0, Math.min(100, score));
  const side: Direction =
    score >= threshold ? (regime.trend === "BULLISH" ? "BUY" : regime.trend === "BEARISH" ? "SELL" : "HOLD") : "HOLD";
  return { score, threshold, side };
}

export const INTRADAY_RISK = { slPct: 1.5, tpPct: 3.2, rr: 2.1, expiryHours: 3 };

// ===== Engine 3 — SWING (H4) =====

export function calcADX(candles: OHLCV[], period = 14): number {
  // Wilder requer ao menos period candles para seed + period candles para DX
  if (candles.length < period * 2 + 1) return 25; // fallback neutro — dados insuficientes

  // CORREÇÃO: seed com smoothing de Wilder (RMA) correto.
  // O bug anterior fazia o loop de DX começar em `period + 1` sem incluir o
  // candle `period` na suavização, pulando um passo e inflando ADX em 5-8pts.
  // A abordagem correta: somar os primeiros `period` TRs/DMs como seed bruto
  // e depois aplicar o Wilder smoothing a partir do candle `period` (não period+1).

  // Passo 1: seed — soma simples dos primeiros `period` períodos (candles 1..period)
  let trSum = 0;
  let plusDmSum = 0;
  let minusDmSum = 0;

  for (let i = 1; i <= period; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const ph = candles[i - 1].high;
    const pl = candles[i - 1].low;
    const pc = candles[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    const upMove = h - ph;
    const downMove = pl - l;
    trSum += tr;
    plusDmSum += upMove > downMove && upMove > 0 ? upMove : 0;
    minusDmSum += downMove > upMove && downMove > 0 ? downMove : 0;
  }

  // Passo 2: Wilder smoothing a partir do candle `period` (inclusive — era period+1 antes)
  const dxValues: number[] = [];

  for (let i = period + 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const ph = candles[i - 1].high;
    const pl = candles[i - 1].low;
    const pc = candles[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    const upMove = h - ph;
    const downMove = pl - l;

    // Wilder: soma anterior - (soma / period) + novo valor
    trSum = trSum - trSum / period + tr;
    plusDmSum = plusDmSum - plusDmSum / period + (upMove > downMove && upMove > 0 ? upMove : 0);
    minusDmSum = minusDmSum - minusDmSum / period + (downMove > upMove && downMove > 0 ? downMove : 0);

    if (trSum === 0) continue;
    const plusDI = (plusDmSum / trSum) * 100;
    const minusDI = (minusDmSum / trSum) * 100;
    const diSum = plusDI + minusDI;
    if (diSum === 0) continue;
    dxValues.push((Math.abs(plusDI - minusDI) / diSum) * 100);
  }

  if (dxValues.length < period) return 25;

  // ADX = média dos últimos `period` valores de DX
  const lastDx = dxValues.slice(-period);
  return Math.round(lastDx.reduce((a, b) => a + b, 0) / lastDx.length);
}

export function calcFibProximity(candles: OHLCV[], price: number): "ON_FIB" | "NEAR_FIB" | "OFF_FIB" {
  const last50 = candles.slice(-50);
  const swingH = Math.max(...last50.map((c) => c.high));
  const swingL = Math.min(...last50.map((c) => c.low));
  const range = swingH - swingL;
  // Guarda: range zero previne fibs todos iguais a swingL
  if (range === 0) return "OFF_FIB";
  const fibs = [0.382, 0.5, 0.618].map((f) => swingL + range * f);
  const nearest = Math.min(...fibs.map((f) => Math.abs(price - f) / price));
  if (nearest < 0.005) return "ON_FIB";
  if (nearest < 0.01) return "NEAR_FIB";
  return "OFF_FIB";
}

export function calcSwingScore(
  snapshot: MarketSnapshot,
  candles: OHLCV[],
  regime: MarketRegime = { trend: "NEUTRAL" },
): EngineSignal {
  let score = 50;

  const adx = calcADX(candles, 14);
  if (adx >= 25 && adx <= 40) score += 20;
  if (adx > 40) score -= 10;
  if (adx < 25) score -= 15;

  const fr = snapshot.fundingRate ?? 0;
  if (fr > 0.001) score -= 20;
  if (fr < -0.001) score += 10;

  const fib = calcFibProximity(candles, snapshot.price);
  if (fib === "ON_FIB") score += 20;
  if (fib === "NEAR_FIB") score += 10;

  const manip = snapshot.manipulationScore;
  if (manip >= 80) score -= 20;
  else if (manip >= 65) score -= 10;
  else if (manip >= 50) score -= 5;

  if (snapshot.aiScore >= 70) score += 15;
  if (snapshot.aiScore < 45) score -= 10;

  const fg = snapshot.fearGreedIndex;
  if (fg <= 25) score += 15;
  if (fg >= 75) score -= 10;

  const finalScore = Math.max(0, Math.min(100, score));
  const threshold = 70;
  const side: Direction =
    finalScore >= threshold
      ? regime.trend === "BULLISH"
        ? "BUY"
        : regime.trend === "BEARISH"
          ? "SELL"
          : "HOLD"
      : "HOLD";
  return { score: finalScore, threshold, side };
}

export const SWING_RISK = { slPct: 3.0, tpPct: 7.0, rr: 2.3, expiryHours: 24 };

// ===== Engine 4 — POSITION (D1) =====

export function calcEMA(candles: OHLCV[], period: number): number {
  if (candles.length < period) return candles[candles.length - 1].close;
  const k = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  for (let i = period; i < candles.length; i++) ema = candles[i].close * k + ema * (1 - k);
  return ema;
}

export function calcBTCCorrelation(candles: OHLCV[], btcCandles: OHLCV[]): number {
  // CORREÇÃO: usar Math.min de (length - 1) para ambos garante que i+1 sempre
  // existe em ambos os arrays, evitando acesso fora dos limites que poluía o
  // coeficiente de Pearson quando os arrays tinham tamanhos diferentes.
  const n = Math.min(30, candles.length - 1, btcCandles.length - 1);
  // Dados insuficientes — retorna 0 em vez de 0.5 para não adicionar correlação
  // positiva artificial que inflava o score de Position quando btcCandles vazio.
  if (n < 10) return 0;


  // Retornos logarítmicos simples nas últimas n barras (alinhados pelo índice final)
  const startAsset = candles.length - 1 - n;
  const startBtc = btcCandles.length - 1 - n;

  const r = Array.from(
    { length: n },
    (_, i) => (candles[startAsset + i + 1].close - candles[startAsset + i].close) / candles[startAsset + i].close,
  );
  const br = Array.from(
    { length: n },
    (_, i) => (btcCandles[startBtc + i + 1].close - btcCandles[startBtc + i].close) / btcCandles[startBtc + i].close,
  );

  const mr = r.reduce((a, b) => a + b, 0) / n;
  const mbr = br.reduce((a, b) => a + b, 0) / n;
  const num = r.reduce((s, v, i) => s + (v - mr) * (br[i] - mbr), 0);
  const den = Math.sqrt(r.reduce((s, v) => s + (v - mr) ** 2, 0) * br.reduce((s, v) => s + (v - mbr) ** 2, 0));
  return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
}

export function detectWyckoff(candles: OHLCV[]): "ACCUMULATION" | "DISTRIBUTION" | "UNKNOWN" {
  // Guarda mínima — sem isso, candles.length - 10 negativo faz `candles[neg]`
  // retornar undefined e `.close` lançar TypeError em runtime.
  if (candles.length < 10) return "UNKNOWN";
  const last5 = candles.slice(-5);
  const avgVol = candles.slice(-20).reduce((s, c) => s + c.volume, 0) / 20;
  const highVol = last5.every((c) => c.volume > avgVol * 1.3);
  const lateral = last5.every((c) => Math.abs((c.close - c.open) / c.open) < 0.015);
  const priorClose = candles[candles.length - 10].close;
  const afterRally = candles[candles.length - 1].close > priorClose * 1.1;
  if (highVol && lateral && !afterRally) return "ACCUMULATION";
  if (highVol && lateral && afterRally) return "DISTRIBUTION";
  return "UNKNOWN";
}

export function calcPositionScore(snapshot: MarketSnapshot, candles: OHLCV[], regime: MarketRegime): EngineSignal {
  let score = 50;

  const fg = snapshot.fearGreedIndex;
  if (fg <= 25) score += regime.trend === "BEARISH" ? 15 : 30;
  if (fg > 25 && fg <= 40) score += 15;
  if (fg >= 75) score -= 20;
  if (fg >= 60 && fg < 75) score -= 5;

  const corr = calcBTCCorrelation(candles, snapshot.btcCandles ?? []);
  // corr === 0 significa dados insuficientes (fallback) — skip silencioso para
  // não penalizar/bonificar com correlação sintética.
  if (corr !== 0) {
    if (corr >= 0.8) score += 10;
    if (corr < 0.6 && regime.trend === "BEARISH") score -= 25;
  }


  const wyckoff = detectWyckoff(candles);
  if (wyckoff === "ACCUMULATION") score += 15;
  if (wyckoff === "DISTRIBUTION") score -= 10;

  if (snapshot.manipulationScore >= 80) score -= 15;

  if (snapshot.aiScore >= 75) score += 15;
  if (snapshot.aiScore < 40) score -= 15;

  const ema200 = calcEMA(candles, 200);
  if (snapshot.price < ema200) score -= 10;
  if (snapshot.price > ema200 * 1.02) score += 10;

  const finalScore = Math.max(0, Math.min(100, score));
  const threshold = 65;
  const side: Direction =
    finalScore >= threshold
      ? regime.trend === "BULLISH"
        ? "BUY"
        : regime.trend === "BEARISH"
          ? "SELL"
          : "HOLD"
      : "HOLD";
  return { score: finalScore, threshold, side };
}

export const POSITION_RISK = { slPct: 6.0, tpPct: 15.0, rr: 2.5, expiryDays: 7 };

// ===== Mock snapshot (BTC) =====

export const mockBTCSnapshot: MarketSnapshot = {
  price: 105420,
  triggerPrice: 105200,
  manipulationScore: 42,
  volatility: "LOW",
  rsi: 50, // neutro — 64 favorecia sinais SELL artificialmente no fallback BEARISH
  aiScore: 72,
  fearGreedIndex: 45,
  btcDominance: 54.2,
  fundingRate: 0.00045,
  btcCandles: [],
};

// Sample reasoning strings (reference only):
//  "ADX 31 — strong trend"
//  "Fib 61.8% at 104,200 — pullback level"
//  "BTC correlation 0.87"
//  "Wyckoff: ACCUMULATION"
//  "EMA200 below price — bullish"
