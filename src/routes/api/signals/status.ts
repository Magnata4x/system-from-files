import { createFileRoute } from "@tanstack/react-router"
import { handleApi, jsonResponse } from "@/lib/server/api-auth.server"
import { generateSignalsDetailed } from "@/lib/server/engine.server"

export const Route = createFileRoute("/api/signals/status")({
  server: {
    handlers: {
      GET: async ({ request }) => handleApi(request, async () => {
        const result = await generateSignalsDetailed()
        const discardedByReason = {
          sideways: result.discarded.filter((item) => item.reason === "sideways").length,
          below_min_score: result.discarded.filter((item) => item.reason === "below_min_score").length,
          source_error: result.discarded.filter((item) => item.reason === "source_error").length,
        }
        const reasons = Object.entries(discardedByReason)
          .filter(([, count]) => count > 0)
          .map(([reason]) => reason)
        const sourceStatus = result.failedPairs.length === result.analyzedPairs.length
          ? "unavailable"
          : result.failedPairs.length > 0
            ? "partial"
            : "ok"

        return jsonResponse({
          sourceStatus,
          analyzedPairs: result.analyzedPairs,
          failedPairs: result.failedPairs,
          discardedByReason,
          discarded: result.discarded,
          signalCount: result.signals.length,
          emptyReason: result.signals.length === 0 ? reasons : [],
        }, sourceStatus === "unavailable" ? 503 : 200, {
          "cache-control": "no-store",
          "x-signals-analyzed-pairs": result.analyzedPairs.join(","),
          "x-signals-failed-pairs": result.failedPairs.join(","),
        })
      }),
    },
  },
})
