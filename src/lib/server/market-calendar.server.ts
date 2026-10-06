import { cachedJson } from "@/lib/cache";

const XOOMAR_CALENDAR_URL = "https://xoomar.com/api/markets/calendar";
export const MARKET_CALENDAR_TTL_SECONDS = 30 * 60;
export const MARKET_CALENDAR_DAYS = 7;

export type MarketCalendarEvent = {
  source: string;
  eventName: string;
  importance: "high" | "med" | "low";
  scheduledAt: string;
  periodLabel: string | null;
  previous: string | null;
  actual: string | null;
  unit: string | null;
};

type XoomarResponse = {
  data?: Array<{
    source?: string;
    eventName?: string;
    importance?: string;
    scheduledAt?: string;
    periodLabel?: string | null;
    previous?: string | null;
    actual?: string | null;
    unit?: string | null;
  }>;
  updatedAt?: string;
  meta?: { sourceAttribution?: string };
};

export type MarketCalendarResponse = {
  status: "available" | "unavailable";
  provider: "XOOMAR";
  timezone: "UTC";
  updatedAt: string | null;
  events: MarketCalendarEvent[];
  attribution: string | null;
};

function isImportance(value: string | undefined): value is MarketCalendarEvent["importance"] {
  return value === "high" || value === "med" || value === "low";
}

export function normalizeCalendarEvents(payload: XoomarResponse, now = new Date()): MarketCalendarEvent[] {
  return (payload.data ?? [])
    .flatMap((event) => {
      if (!event.scheduledAt || !event.eventName || !isImportance(event.importance)) return [];
      const scheduledAt = new Date(event.scheduledAt);
      if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= now) return [];
      return [{
        source: event.source ?? "unknown",
        eventName: event.eventName,
        importance: event.importance,
        scheduledAt: scheduledAt.toISOString(),
        periodLabel: event.periodLabel ?? null,
        previous: event.previous ?? null,
        actual: event.actual ?? null,
        unit: event.unit ?? null,
      }];
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchCalendar(from: string, to: string): Promise<XoomarResponse> {
  const response = await fetch(
    `${XOOMAR_CALENDAR_URL}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { headers: { accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`XOOMAR HTTP ${response.status}`);
  return (await response.json()) as XoomarResponse;
}

export async function getMarketCalendar(now = new Date()): Promise<MarketCalendarResponse> {
  const from = dateOnly(now);
  const to = dateOnly(new Date(now.getTime() + MARKET_CALENDAR_DAYS * 24 * 60 * 60 * 1000));
  const cacheKey = `market-calendar:${from}:${to}`;

  try {
    return await cachedJson(cacheKey, MARKET_CALENDAR_TTL_SECONDS, async () => {
      const payload = await fetchCalendar(from, to);
      return {
        status: "available" as const,
        provider: "XOOMAR" as const,
        timezone: "UTC" as const,
        updatedAt: payload.updatedAt ?? new Date().toISOString(),
        events: normalizeCalendarEvents(payload, now),
        attribution: payload.meta?.sourceAttribution ?? "Data: XOOMAR",
      };
    });
  } catch (error) {
    console.warn("[api] calendário econômico indisponível", error);
    return {
      status: "unavailable",
      provider: "XOOMAR",
      timezone: "UTC",
      updatedAt: null,
      events: [],
      attribution: null,
    };
  }
}
