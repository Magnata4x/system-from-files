import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { buildScoreDistribution } from "@/lib/score-distribution";

const MAX_ROWS = 10_000;

export const Route = createFileRoute("/api/market/score-distribution")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, async (user) => {
          const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

          const { data: rows, error } = await user.supabase
            .from("signals")
            .select("pair,timeframe,score,created_at")
            .gte("created_at", periodStart)
            .order("created_at", { ascending: false })
            .limit(MAX_ROWS + 1);

          if (error) throw new Error(`Distribuição de scores indisponível: ${error.message}`);

          const rowsLimited = rows ?? [];
          const truncated = rowsLimited.length > MAX_ROWS;
          const data = rowsLimited.slice(0, MAX_ROWS);
          const latestDataAt = data[0]?.created_at ?? null;

          const groups = buildScoreDistribution(data);
          const total = groups.reduce((sum, group) => sum + group.n, 0);

          return {
            periodStart,
            generatedAt: new Date().toISOString(),
            latestDataAt,
            truncated,
            groups,
            total,
          };
        }),
    },
  },
});
