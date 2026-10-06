import { describe, expect, it } from "vitest";
import { normalizeCalendarEvents } from "./market-calendar.server";

describe("market calendar normalization", () => {
  it("keeps only future valid events and normalizes timestamps to UTC", () => {
    const now = new Date("2026-10-06T12:00:00.000Z");
    const result = normalizeCalendarEvents({
      data: [
        { source: "bls", eventName: "Past", importance: "high", scheduledAt: "2026-10-06T11:00:00.000Z" },
        { source: "bls", eventName: "Future", importance: "high", scheduledAt: "2026-10-08T12:30:00-04:00" },
        { source: "bls", eventName: "Invalid", importance: "high", scheduledAt: "not-a-date" },
      ],
    }, now);

    expect(result).toHaveLength(1);
    expect(result[0]?.eventName).toBe("Future");
    expect(result[0]?.scheduledAt).toBe("2026-10-08T16:30:00.000Z");
  });

  it("preserves a genuinely empty calendar as an empty list", () => {
    expect(normalizeCalendarEvents({ data: [] }, new Date("2026-10-06T12:00:00.000Z"))).toEqual([]);
  });

  it("does not manufacture fallback events", () => {
    expect(normalizeCalendarEvents({ data: undefined }, new Date("2026-10-06T12:00:00.000Z"))).toEqual([]);
  });
});
