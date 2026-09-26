import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { listManipulationAlerts } from "@/lib/server/engine.server";

export const Route = createFileRoute("/api/manipulation/alerts")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, async () => {
          const params = new URL(request.url).searchParams;
          return listManipulationAlerts({
            symbol: params.get("symbol") ?? undefined,
            riskLevel: params.get("riskLevel") ?? undefined,
            limit: Math.min(100, Number(params.get("limit") ?? 20) || 20),
          });
        }),
    },
  },
});
