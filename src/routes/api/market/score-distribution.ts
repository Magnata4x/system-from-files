import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";

const BUCKETS = [
  { from: 0, to: 20 },
  { from: 20, to: 40 },
  { from: 40, to: 60 },
  { from: 60, to: 80 },
  { from: 80, to: 101 },
] as const;

type Group = {
  asset: string;
  timeframe: string;
  buckets: { from: number; to: number; n: number }[];
  n: number;
};

export const Route = createFileRoute("/api/market/score-distribution")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, async (user) => {
          const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

          const { data, error } = await user.supabase
            .from("signals")
            .select("pair,timeframe,score,created_at")
            .gte("created_at", periodStart)
            .order("created_at", { ascending: true })
            .limit(10_000);

          if (error) throw new Error(`Distribuição de scores indisponível: ${error.message}`);

          const groups = new Map<string, Group>();

          for (const row of data) {
            if (!Number.isFinite(row.score) || row.score < 0 || row.score > 100) continue;
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

          return {
            periodStart,
            generatedAt: new Date().toISOString(),
            groups: [...groups.values()].sort((a, b) => b.n - a.n),
            total: data.length,
          };
        }),
    },
  },
});
