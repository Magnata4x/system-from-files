import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { testExchangeCredentials } from "@/lib/server/exchange.server";

export const Route = createFileRoute("/api/exchange/test")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleApi(request, (user) => testExchangeCredentials(user.supabase, user.userId)),
    },
  },
});
