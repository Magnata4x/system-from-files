import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import {
  deleteExchangeCredentials,
  getExchangeStatus,
  saveExchangeCredentials,
} from "@/lib/server/exchange.server";

export const Route = createFileRoute("/api/exchange/credentials")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, (user) => getExchangeStatus(user.supabase, user.userId)),
      POST: async ({ request }) =>
        handleApi(request, async (user) => {
          const body = (await request.json().catch(() => ({}))) as Record<string, string>;
          return saveExchangeCredentials(user.supabase, user.userId, body);
        }),
      DELETE: async ({ request }) =>
        handleApi(request, (user) => deleteExchangeCredentials(user.supabase, user.userId)),
    },
  },
});
