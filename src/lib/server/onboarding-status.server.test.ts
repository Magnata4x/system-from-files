import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { readOnboardingStatus } from "./onboarding-status.server";

describe("readOnboardingStatus", () => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const getClaims = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    createClient.mockReturnValue({ auth: { getClaims }, from });
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
    maybeSingle.mockResolvedValue({ data: { onboarding_completed: true }, error: null });
  });

  it("validates the bearer token and reads the authenticated profile", async () => {
    const request = new Request("https://app.test/", {
      headers: { authorization: "Bearer test-token" },
    });
    await expect(readOnboardingStatus(request)).resolves.toEqual({ completed: true });
    expect(getClaims).toHaveBeenCalledWith("test-token");
    expect(from).toHaveBeenCalledWith("profiles");
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("rejects requests without a bearer token", async () => {
    await expect(readOnboardingStatus(new Request("https://app.test/"))).rejects.toThrow(
      "Authentication required to verify onboarding",
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("throws on profile query errors instead of treating them as incomplete", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: new Error("network failure") });
    await expect(
      readOnboardingStatus(new Request("https://app.test/", {
        headers: { authorization: "Bearer test-token" },
      })),
    ).rejects.toThrow("Unable to verify onboarding status");
  });
});
