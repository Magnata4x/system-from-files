import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { computeDnaStats } from "@/lib/server/dna.server";

export const Route = createFileRoute("/api/dna/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => handleApi(request, (user) => computeDnaStats(user)),
    },
  },
});
