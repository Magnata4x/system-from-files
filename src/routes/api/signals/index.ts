import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { generateSignals } from "@/lib/server/engine.server";

export const Route = createFileRoute("/api/signals/")({
  server: {
    handlers: {
      GET: async ({ request }) => handleApi(request, async () => generateSignals()),
    },
  },
});
