// DNA Pair Analyzer — analyzes Bot4x trade history per pair.
// Classification via Wilson confidence interval + Bonferroni correction.
// Replaces the old streak-based logic (statistically invalid for small N).
//
// Pure function over the Bot4x store history. UI consumes the result
// and (optionally) writes preferred/avoid lists back into the store so
// the execution engine biases new orders toward winners.

import type { Trade } from "./bot4x-data";

export type PairTrend = "UP" | "DOWN" | "FLAT";

export type PairAnalysis = {
  pair: string;
  total: number; // trades volume on this pair (last N)
  wins: number;
  losses: number;
  winRate: number; // 0..100
  pnlSum: number; // % cumulative
  streak: number; // signed: kept for display only, not used for classification
  trend: PairTrend; // last 5 trades trend direction
  volumeScore: number; // 0..100 relative to busiest pair
  recommendation: "PREFER" | "AVOID" | "NEUTRAL";
  reason: string;
  confidence: number; // 0..1 — margin above/below global baseline (0 if NEUTRAL)
};

export type PairAnalysisResult = {
  analyses: PairAnalysis[];
  preferred: string[];
  avoid: string[];
  generatedAt: number;
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Default minimum closed trades (WIN+LOSS) per pair before any PREFER/AVOID
// verdict. Below this, the sample is too small to distinguish signal from noise.
// Pode ser sobrescrito via opção `minSample` em `analyzePairs(...)` ou pela
// configuração `dnaMinSample` persistida no Bot4x store (UI em /dna-pairs).
export const DEFAULT_DNA_MIN_SAMPLE = 10;

// Faixa permitida pela configuração de usuário (UI clampa nesses limites).
export const DNA_MIN_SAMPLE_BOUNDS = { min: 5, max: 100 } as const;

// ─── STATISTICAL HELPERS ──────────────────────────────────────────────────────

/**
 * Wilson score interval for a proportion.
 * Better than raw win rate for small N — automatically shrinks toward 0.5
 * when evidence is scarce (e.g. 3W/0L still gives a low IC_low).
 */
function wilsonInterval(wins: number, n: number, z = 1.96): { low: number; high: number } {
  if (n === 0) return { low: 0, high: 1 };
  const p = wins / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return {
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin),
  };
}

/**
 * Bonferroni-corrected z-score.
 * Adjusts confidence level when testing multiple pairs simultaneously
 * to keep the family-wise false positive rate at ~5%.
 */
function bonferroniZ(alpha: number): number {
  if (alpha >= 0.05) return 1.96;
  if (alpha >= 0.01) return 2.576;
  if (alpha >= 0.001) return 3.291;
  return 3.891;
}

// ─── DISPLAY HELPERS (unchanged from original) ────────────────────────────────

function countStreak(trades: Trade[]): number {
  // trades expected newest-first; returns +N if last N are WIN, -N if LOSS
  // Kept for display only — not used for PREFER/AVOID classification.
  if (!trades.length) return 0;
  const first = trades[0].result;
  if (first !== "WIN" && first !== "LOSS") return 0;
  let n = 0;
  for (const t of trades) {
    if (t.result === first) n++;
    else break;
  }
  return first === "WIN" ? n : -n;
}

function trendOf(trades: Trade[]): PairTrend {
  // sum pnlPct over last 5 trades (already newest-first)
  const last5 = trades.slice(0, 5);
  const sum = last5.reduce((acc, t) => acc + (t.pnlPct ?? 0), 0);
  if (sum > 0.3) return "UP";
  if (sum < -0.3) return "DOWN";
  return "FLAT";
}

// ─── MAIN FUNCTION ────────────────────────────────────────────────────────────

export function analyzePairs(
  history: Trade[],
  options: { minSample?: number } = {},
): PairAnalysisResult {
  const minSampleRaw = options.minSample ?? DEFAULT_DNA_MIN_SAMPLE;
  const MIN_SAMPLE = Math.max(
    DNA_MIN_SAMPLE_BOUNDS.min,
    Math.min(DNA_MIN_SAMPLE_BOUNDS.max, Math.floor(minSampleRaw)),
  );
  // Sort newest-first by timestamp embedded in id (`o_<ts>_...`)
  const sorted = [...history].sort((a, b) => {
    const ta = Number((a.id.match(/^o_(\d+)/) ?? [])[1] ?? 0);
    const tb = Number((b.id.match(/^o_(\d+)/) ?? [])[1] ?? 0);
    return tb - ta;
  });

  // Group closed trades by pair
  const byPair = new Map<string, Trade[]>();
  for (const t of sorted) {
    if (t.result !== "WIN" && t.result !== "LOSS") continue;
    const arr = byPair.get(t.pair) ?? [];
    arr.push(t);
    byPair.set(t.pair, arr);
  }

  // ── Global baseline: overall win rate across ALL pairs combined ──────────
  // We compare each pair against the system's own average, not a fixed number.
  const closed = sorted.filter((t) => t.result === "WIN" || t.result === "LOSS");
  const globalWins = closed.filter((t) => t.result === "WIN").length;
  const pGlobal = closed.length ? globalWins / closed.length : 0.5;

  // ── Bonferroni correction: alpha / number of pairs tested this round ─────
  // Prevents inflated false positives when scanning 10–15 pairs at once.
  const k = Math.max(1, byPair.size);
  const z = bonferroniZ(0.05 / k);

  const maxVol = Math.max(1, ...Array.from(byPair.values()).map((a) => a.length));

  const analyses: PairAnalysis[] = [];

  for (const [pair, trades] of byPair) {
    const wins = trades.filter((t) => t.result === "WIN").length;
    const losses = trades.filter((t) => t.result === "LOSS").length;
    const total = wins + losses;
    const winRate = total ? Math.round((wins / total) * 100) : 0;
    const pnlSum = +trades.reduce((acc, t) => acc + (t.pnlPct ?? 0), 0).toFixed(2);
    const streak = countStreak(trades); // display only
    const trend = trendOf(trades);
    const volumeScore = Math.round((total / maxVol) * 100);

    let recommendation: PairAnalysis["recommendation"] = "NEUTRAL";
    let reason = "Sem padrão definido";
    let confidence = 0;

    // ── Rule 1: insufficient sample → always NEUTRAL ──────────────────────
    if (total < MIN_SAMPLE) {
      reason = `Amostra insuficiente (n=${total} — mínimo ${MIN_SAMPLE} trades fechados para veredito)`;
    } else {
      // ── Rules 2–4: Wilson IC vs global baseline ────────────────────────
      const { low, high } = wilsonInterval(wins, total, z);
      const wrPct = ((wins / total) * 100).toFixed(0);
      const icLow = (low * 100).toFixed(0);
      const icHigh = (high * 100).toFixed(0);
      const baseline = (pGlobal * 100).toFixed(0);

      if (low > pGlobal) {
        // IC entirely above baseline → statistically better than system average
        recommendation = "PREFER";
        confidence = low - pGlobal;
        reason = `WR ${wrPct}% · IC95 [${icLow}–${icHigh}%] acima da média do sistema (${baseline}%) · n=${total}`;
      } else if (high < pGlobal) {
        // IC entirely below baseline → statistically worse than system average
        recommendation = "AVOID";
        confidence = pGlobal - high;
        reason = `WR ${wrPct}% · IC95 [${icLow}–${icHigh}%] abaixo da média do sistema (${baseline}%) · n=${total}`;
      } else {
        // IC overlaps baseline → no statistical difference
        reason = `Sem diferença estatística vs. média do sistema (${baseline}%) · IC95 [${icLow}–${icHigh}%] · n=${total}`;
      }
    }

    analyses.push({
      pair,
      total,
      wins,
      losses,
      winRate,
      pnlSum,
      streak,
      trend,
      volumeScore,
      recommendation,
      reason,
      confidence,
    });
  }

  // Sort: PREFER first (by confidence desc), then NEUTRAL, then AVOID
  analyses.sort((a, b) => {
    const rank = (r: PairAnalysis["recommendation"]) => (r === "PREFER" ? 0 : r === "NEUTRAL" ? 1 : 2);
    const dr = rank(a.recommendation) - rank(b.recommendation);
    if (dr !== 0) return dr;
    return b.confidence - a.confidence;
  });

  return {
    analyses,
    preferred: analyses.filter((a) => a.recommendation === "PREFER").map((a) => a.pair),
    avoid: analyses.filter((a) => a.recommendation === "AVOID").map((a) => a.pair),
    generatedAt: Date.now(),
  };
}

// SANITY CHECK (development note):
// If history comes from genHistory() (random ~55% WIN), almost no pair should
// be marked PREFER/AVOID — they are all statistically indistinguishable.
// If PREFER/AVOID appear frequently on random data, the metric has a bug.
