import { createFileRoute } from "@tanstack/react-router";
import { ApiError, handleApi } from "@/lib/server/api-auth.server";
import { generateSignals } from "@/lib/server/engine.server";

export const Route = createFileRoute("/api/signals/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleApi(request, async () => {
          const signals = await generateSignals();
          const found = signals.find((s) => s.id === params.id);
          if (!found) throw new ApiError("Sinal não encontrado", 404);
          return found;
        }),
    },
  },
});
