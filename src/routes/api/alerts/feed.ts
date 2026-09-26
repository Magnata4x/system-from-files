import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { getAlertFeed, markAlertRead, markAllAlertsRead } from "@/lib/server/alerts.server";

export const Route = createFileRoute("/api/alerts/feed")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, (user) => {
          const limit = Number(new URL(request.url).searchParams.get("limit") ?? 40) || 40;
          return getAlertFeed(user, Math.min(100, limit));
        }),
      POST: async ({ request }) =>
        handleApi(request, async (user) => {
          const body = (await request.json().catch(() => ({}))) as { id?: string; all?: boolean };
          if (body.all) return markAllAlertsRead(user);
          if (!body.id) return { ok: false };
          return markAlertRead(user, body.id);
        }),
    },
  },
});
