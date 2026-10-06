import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface MarketCalendarEvent {
  source: string;
  eventName: string;
  importance: "high" | "med" | "low";
  scheduledAt: string;
  periodLabel: string | null;
  previous: string | null;
  actual: string | null;
  unit: string | null;
}

export interface MarketCalendarResponse {
  status: "available" | "unavailable";
  provider: "XOOMAR";
  timezone: "UTC";
  updatedAt: string | null;
  events: MarketCalendarEvent[];
  attribution: string | null;
}

export function useMarketCalendar() {
  return useQuery({
    queryKey: ["market", "calendar"],
    queryFn: () => api.get<MarketCalendarResponse>("/market/calendar"),
    staleTime: 5 * 60_000,
    refetchInterval: 15 * 60_000,
    retry: 1,
  });
}
