import { createFileRoute } from "@tanstack/react-router";
import { ApiError, handleApi } from "@/lib/server/api-auth.server";

export const Route = createFileRoute("/api/dna/profile/$userId")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleApi(request, async (user) => {
          if (params.userId !== "me" && params.userId !== user.userId) {
            throw new ApiError("Forbidden", 403);
          }
          const { data, error } = await user.supabase
            .from("profiles")
            .select(
              "dna_consistency, dna_discipline, dna_risk_control, dna_timing, dna_emotional_control, avg_win_rate, best_session, worst_session, overtrading_risk, trading_style",
            )
            .eq("id", user.userId)
            .maybeSingle();
          if (error) throw new ApiError(error.message, 500);
          if (!data) return null;
          return {
            userId: user.userId,
            consistency: data.dna_consistency ?? 0,
            discipline: data.dna_discipline ?? 0,
            riskControl: data.dna_risk_control ?? 0,
            timing: data.dna_timing ?? 0,
            emotionalControl: data.dna_emotional_control ?? 0,
            avgWinRate: Number(data.avg_win_rate ?? 0),
            bestSession: data.best_session ?? undefined,
            worstSession: data.worst_session ?? undefined,
            overtradingRisk: data.overtrading_risk ?? false,
            tradingStyle: (data.trading_style ?? "moderate") as
              | "conservative"
              | "moderate"
              | "aggressive",
          };
        }),
    },
  },
});
