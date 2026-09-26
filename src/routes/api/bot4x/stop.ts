import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { updateConfig } from "@/lib/server/bot4x.server";

export const Route = createFileRoute("/api/bot4x/stop")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleApi(request, (user) => updateConfig(user.supabase, user.userId, { active: false })),
    },
  },
});
