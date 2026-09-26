import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { manipulationSnapshot } from "@/lib/server/engine.server";

export const Route = createFileRoute("/api/manipulation/snapshot/$pair")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleApi(request, () => manipulationSnapshot(decodeURIComponent(params.pair))),
    },
  },
});
