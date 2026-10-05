export interface ScoreRow {
  pair: string | null;
  timeframe: string | null;
  score: number | null;
}

export interface ScoreDistributionBucket {
  from: number;
  to: number;
  n: number;
}

export interface ScoreDistributionGroup {
  asset: string;
  timeframe: string;
  buckets: ScoreDistributionBucket[];
  n: number;
}

const BUCKETS = [
  { from: 0, to: 20 },
  { from: 20, to: 40 },
  { from: 40, to: 60 },
  { from: 60, to: 80 },
  { from: 80, to: 101 },
] as const;

export function buildScoreDistribution(rows: readonly ScoreRow[]): ScoreDistributionGroup[] {
  const groups = new Map<string, ScoreDistributionGroup>();

  for (const row of rows) {
    if (row.score == null || !Number.isFinite(row.score) || row.score < 0 || row.score > 100) continue;
    const asset = row.pair?.trim() || "Indisponível";
    const timeframe = row.timeframe?.trim() || "Indisponível";
    const key = `${asset}::${timeframe}`;
    let group = groups.get(key);

    if (!group) {
      group = {
        asset,
        timeframe,
        buckets: BUCKETS.map((bucket) => ({ ...bucket, n: 0 })),
        n: 0,
      };
      groups.set(key, group);
    }

    const bucketIndex = Math.min(4, Math.floor(row.score / 20));
    group.buckets[bucketIndex]!.n += 1;
    group.n += 1;
  }

  return [...groups.values()].sort((a, b) => b.n - a.n);
}
