import { createFileRoute } from "@tanstack/react-router";
import { ApiError, handleApi } from "@/lib/server/api-auth.server";

export const Route = createFileRoute("/api/calibrator/feedback/$userId")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleApi(request, async (user) => {
          if (params.userId !== "me" && params.userId !== user.userId) {
            throw new ApiError("Forbidden", 403);
          }
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          const { error } = await user.supabase.from("copilot_history").insert({
            user_id: user.userId,
            role: "system",
            agent: "calibrator",
            content: JSON.stringify(body).slice(0, 4000),
          });
          if (error) throw new ApiError(error.message, 500);
          return { ok: true };
        }),
    },
  },
});
