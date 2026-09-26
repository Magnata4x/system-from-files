import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { listPrices } from "@/lib/server/engine.server";

export const Route = createFileRoute("/api/prices/")({
  server: {
    handlers: {
      GET: async ({ request }) => handleApi(request, () => listPrices()),
    },
  },
});
