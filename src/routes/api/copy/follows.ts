import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { addCopyFollow, listCopyFollows, removeCopyFollow } from "@/lib/server/copy.server";

export const Route = createFileRoute("/api/copy/follows")({
  server: {
    handlers: {
      GET: async ({ request }) => handleApi(request, (user) => listCopyFollows(user)),
      POST: async ({ request }) =>
        handleApi(request, async (user) => {
          const body = (await request.json().catch(() => ({}))) as {
            traderId?: string;
            traderHandle?: string;
            config?: Record<string, unknown>;
          };
          return addCopyFollow(user, body);
        }),
      DELETE: async ({ request }) =>
        handleApi(request, async (user) => {
          const traderId = new URL(request.url).searchParams.get("traderId") ?? "";
          return removeCopyFollow(user, traderId);
        }),
    },
  },
});
