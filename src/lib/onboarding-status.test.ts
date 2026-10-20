import { beforeEach, describe, expect, it, vi } from "vitest";

const { maybeSingle } = vi.hoisted(() => ({ maybeSingle: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle })),
      })),
    })),
  },
}));

import { lookupOnboarding } from "./onboarding-status";

describe("lookupOnboarding", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    maybeSingle.mockResolvedValue({ data: { onboarding_completed: true }, error: null });
  });

  it("returns completed for a completed profile", async () => {
    await expect(lookupOnboarding("user-1")).resolves.toBe("completed");
  });

  it("returns incomplete for an explicitly incomplete profile", async () => {
    maybeSingle.mockResolvedValue({ data: { onboarding_completed: false }, error: null });
    await expect(lookupOnboarding("user-1")).resolves.toBe("incomplete");
  });

  it("treats a missing profile as incomplete", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(lookupOnboarding("new-user")).resolves.toBe("incomplete");
  });

  it("returns error for a Supabase query error", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: new Error("read denied") });
    await expect(lookupOnboarding("user-1")).resolves.toBe("error");
  });

  it("returns error when the query promise rejects", async () => {
    maybeSingle.mockRejectedValue(new Error("network failure"));
    await expect(lookupOnboarding("user-1")).resolves.toBe("error");
  });
});
