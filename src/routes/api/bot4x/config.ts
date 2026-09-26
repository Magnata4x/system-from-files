import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { getOrCreateConfig, updateConfig } from "@/lib/server/bot4x.server";

export const Route = createFileRoute("/api/bot4x/config")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, (user) => getOrCreateConfig(user.supabase, user.userId)),
      PATCH: async ({ request }) =>
        handleApi(request, async (user) => {
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          return updateConfig(user.supabase, user.userId, body);
        }),
    },
  },
});
