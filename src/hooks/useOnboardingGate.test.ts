import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { maybeSingle } = vi.hoisted(() => ({ maybeSingle: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  },
}));

import { useOnboardingGate } from "./useOnboardingGate";

const props = (overrides: Partial<Parameters<typeof useOnboardingGate>[0]> = {}) => ({
  loading: false,
  userId: "user-1",
  needsClientCheck: true,
  onSignedOut: vi.fn(),
  onIncomplete: vi.fn(),
  ...overrides,
});

describe("useOnboardingGate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    maybeSingle.mockResolvedValue({ data: { onboarding_completed: true }, error: null });
  });

  it("checks once across new props objects and callback identities", async () => {
    const states: string[] = [];
    const { result, rerender } = renderHook(
      (p) => {
        const value = useOnboardingGate(p);
        states.push(value.state);
        return value;
      },
      { initialProps: props() },
    );
    await waitFor(() => expect(result.current.state).toBe("ready"));
    const readyAt = states.lastIndexOf("checking") + 1;

    rerender(props());
    rerender(props({ onSignedOut: vi.fn(), onIncomplete: vi.fn() }));

    expect(states.slice(readyAt).every((state) => state === "ready")).toBe(true);
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("skips the query when the client check is not needed", async () => {
    const { result } = renderHook(() => useOnboardingGate(props({ needsClientCheck: false })));
    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it("does not update state or call onIncomplete after unmount", async () => {
    let resolveQuery!: (value: { data: null; error: null }) => void;
    maybeSingle.mockReturnValue(new Promise((resolve) => { resolveQuery = resolve; }));
    const onIncomplete = vi.fn();
    const { unmount } = renderHook(() => useOnboardingGate(props({ onIncomplete })));
    unmount();
    await act(async () => {
      resolveQuery({ data: null, error: null });
    });
    expect(onIncomplete).not.toHaveBeenCalled();
  });

  it("cancels the previous query when userId changes", async () => {
    let resolveFirst!: (value: { data: null; error: null }) => void;
    maybeSingle
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ data: { onboarding_completed: true }, error: null });
    const onIncomplete = vi.fn();
    const { result, rerender } = renderHook(
      (p) => useOnboardingGate(p),
      { initialProps: props({ onIncomplete }) },
    );
    rerender(props({ userId: "user-2", onIncomplete }));
    await waitFor(() => expect(result.current.state).toBe("ready"));
    await act(async () => { resolveFirst({ data: null, error: null }); });
    expect(onIncomplete).not.toHaveBeenCalled();
    expect(result.current.state).toBe("ready");
  });
});
