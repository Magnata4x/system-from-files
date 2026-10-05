import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { buildScoreDistribution } from "@/lib/score-distribution";

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

          return {
            periodStart,
            generatedAt: new Date().toISOString(),
            groups: buildScoreDistribution(data),
            total: data.length,
          };
        }),
    },
  },
});
