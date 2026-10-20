import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authState, navigateMock, lookupMock, upsertMock } = vi.hoisted(() => ({
  authState: {
    loading: false as boolean,
    session: { user: { id: "user-1" } } as { user: { id: string } } | null,
    user: { id: "user-1", email: "user@example.com" } as { id: string; email: string } | null,
  },
  navigateMock: vi.fn(),
  lookupMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
  };
});
vi.mock("@/lib/auth", () => ({ useAuth: () => authState }));
vi.mock("@/lib/onboarding-status", () => ({ lookupOnboarding: lookupMock }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ upsert: upsertMock }),
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      setSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

import { Route as IndexRoute } from "./index";
import { Route as LoginRoute } from "./login";
import { Route as OnboardingRoute } from "./_authenticated/onboarding";

const IndexComponent = IndexRoute.options.component!;
const LoginComponent = LoginRoute.options.component!;
const OnboardingComponent = OnboardingRoute.options.component!;

describe("onboarding route gates", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authState.loading = false;
    authState.session = { user: { id: "user-1" } };
    authState.user = { id: "user-1", email: "user@example.com" };
    lookupMock.mockResolvedValue("completed");
    upsertMock.mockResolvedValue({ error: null });
  });

  it("routes completed users from / to the dashboard", async () => {
    render(<IndexComponent />);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({
      to: "/dashboard",
      replace: true,
    }));
  });

  it("routes incomplete users from / to onboarding", async () => {
    lookupMock.mockResolvedValue("incomplete");
    render(<IndexComponent />);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({
      to: "/onboarding",
      replace: true,
    }));
  });

  it("shows a retry on lookup errors at / and retries without redirecting", async () => {
    lookupMock.mockResolvedValueOnce("error").mockResolvedValueOnce("incomplete");
    render(<IndexComponent />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(navigateMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(lookupMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({
      to: "/onboarding",
      replace: true,
    }));
  });

  it("does not render the onboarding form or write on lookup errors", async () => {
    lookupMock.mockResolvedValue("error");
    render(<OnboardingComponent />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("What's your trading experience?")).toBeNull();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("renders onboarding only after an incomplete result", async () => {
    lookupMock.mockResolvedValue("incomplete");
    render(<OnboardingComponent />);
    expect(await screen.findByText("What's your trading experience?")).toBeTruthy();
  });

  it("redirects completed onboarding users and does not render the form", async () => {
    lookupMock.mockResolvedValue("completed");
    render(<OnboardingComponent />);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({
      to: "/dashboard",
      replace: true,
    }));
    expect(screen.queryByText("What's your trading experience?")).toBeNull();
  });

  it("sends an authenticated login session through / without reading the profile", async () => {
    render(<LoginComponent />);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({
      to: "/",
      replace: true,
    }));
    expect(lookupMock).not.toHaveBeenCalled();
  });
});
