import { createFileRoute } from "@tanstack/react-router";
import { ApiError, handleApi } from "@/lib/server/api-auth.server";

export const Route = createFileRoute("/api/copilot/history")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, async (user) => {
          const limit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
          const { data, error } = await user.supabase
            .from("copilot_history")
            .select("id, role, content, agent, metadata, created_at")
            .eq("user_id", user.userId)
            .order("created_at", { ascending: false })
            .limit(Math.min(200, Math.max(1, limit)));
          if (error) throw new ApiError(error.message, 500);
          return (data ?? []).reverse();
        }),
      POST: async ({ request }) =>
        handleApi(request, async (user) => {
          const body = (await request.json().catch(() => ({}))) as {
            role?: string;
            content?: string;
            agent?: string;
          };
          if (!body.role || !body.content) throw new ApiError("role e content são obrigatórios");
          const { data, error } = await user.supabase
            .from("copilot_history")
            .insert({
              user_id: user.userId,
              role: body.role,
              content: body.content,
              agent: body.agent ?? null,
            })
            .select("id, role, content, agent, created_at")
            .single();
          if (error) throw new ApiError(error.message, 500);
          return data;
        }),
    },
  },
});
