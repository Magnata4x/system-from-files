import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";

const MAX_DAYS = 90;

export const Route = createFileRoute("/api/market/history")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, async (user) => {
          const url = new URL(request.url);
          const requestedDays = Number(url.searchParams.get("days") ?? "30");
          const days = Number.isFinite(requestedDays)
            ? Math.max(1, Math.min(MAX_DAYS, Math.floor(requestedDays)))
            : 30;
          const periodStart = new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();

          const { data, error } = await (user.supabase as any)
            .from("market_snapshots")
            .select(
              "captured_at,source,total_market_cap,total_volume,btc_dominance,market_cap_change_24h",
            )
            .gte("captured_at", periodStart)
            .order("captured_at", { ascending: true })
            .limit(10_000);

          if (error) {
            console.warn(`[api] Histórico de mercado indisponível: ${error.message}`);
            return {
              periodStart,
              generatedAt: new Date().toISOString(),
              source: "coingecko",
              points: [],
            };
          }

          return {
            periodStart,
            generatedAt: new Date().toISOString(),
            source: data[0]?.source ?? "coingecko",
            points: data.map((row) => ({
              capturedAt: row.captured_at,
              totalMarketCap: row.total_market_cap,
              totalVolume: row.total_volume,
              btcDominance: row.btc_dominance,
              marketCapChange24h: row.market_cap_change_24h,
            })),
          };
        }),
    },
  },
});
