import { createFileRoute } from "@tanstack/react-router";
import { handleApi } from "@/lib/server/api-auth.server";
import { getMarketCalendar } from "@/lib/server/market-calendar.server";

export const Route = createFileRoute("/api/market/calendar")({
  server: {
    handlers: {
      GET: async ({ request }) => handleApi(request, () => getMarketCalendar()),
    },
  },
});
