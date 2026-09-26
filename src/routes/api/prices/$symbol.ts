import { createFileRoute } from "@tanstack/react-router";
import { ApiError, handleApi } from "@/lib/server/api-auth.server";
import { getTicker } from "@/lib/server/market.server";

export const Route = createFileRoute("/api/prices/$symbol")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleApi(request, async () => {
          const ticker = await getTicker(decodeURIComponent(params.symbol));
          if (!ticker) throw new ApiError("Par não encontrado", 404);
          return {
            symbol: ticker.pair,
            price: ticker.price,
            change24h: ticker.changePct,
            volume24h: ticker.quoteVolume,
            high24h: ticker.high,
            low24h: ticker.low,
            updatedAt: new Date().toISOString(),
          };
        }),
    },
  },
});
