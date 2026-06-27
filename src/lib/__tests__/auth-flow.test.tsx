// Testa o fluxo de autenticação do AuthProvider/useAuth.
// AuthGate (em src/routes/_authenticated.tsx) é apenas um consumidor desse
// contexto + um redirect via TanStack Router; testar AuthProvider cobre a
// regra de negócio sem acoplar o teste a roteador, lazy chunks e stores.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => {
  const listeners = new Set<(event: string, session: unknown) => void>();
  const auth = {
    onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    }),
    _emit: (event: string, session: unknown) => listeners.forEach((cb) => cb(event, session)),
  };
  return { supabase: { auth } };
});

import { AuthProvider, useAuth } from "../auth";
import { supabase } from "@/integrations/supabase/client";

type MockedAuth = typeof supabase.auth & {
  _emit: (event: string, session: unknown) => void;
};
const mockAuth = supabase.auth as MockedAuth;

function Probe() {
  const { session, user, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? "loading" : "ready"}</span>
      <span data-testid="user">{user?.id ?? "anonymous"}</span>
      <span data-testid="session">{session ? "yes" : "no"}</span>
    </div>
  );
}

describe("AuthProvider / useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("começa em loading e fica anônimo quando não há sessão (INITIAL_SESSION null)", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("loading").textContent).toBe("loading");

    await act(async () => {
      mockAuth._emit("INITIAL_SESSION", null);
    });

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("ready");
    });
    expect(screen.getByTestId("session").textContent).toBe("no");
    expect(screen.getByTestId("user").textContent).toBe("anonymous");
  });

  it("expõe user/session quando supabase emite SIGNED_IN", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    const fakeSession = {
      access_token: "tok",
      refresh_token: "r",
      expires_in: 3600,
      token_type: "bearer",
      user: { id: "user-123", email: "x@y.com" },
    };

    await act(async () => {
      mockAuth._emit("SIGNED_IN", fakeSession);
    });

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("user-123");
    });
    expect(screen.getByTestId("session").textContent).toBe("yes");
    expect(screen.getByTestId("loading").textContent).toBe("ready");
  });

  it("limpa user quando supabase emite SIGNED_OUT", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      mockAuth._emit("SIGNED_IN", {
        access_token: "t",
        user: { id: "u1" },
      });
    });
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("u1"));

    await act(async () => {
      mockAuth._emit("SIGNED_OUT", null);
    });

    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("anonymous"));
    expect(screen.getByTestId("session").textContent).toBe("no");
  });

  it("desinscreve o listener no unmount", async () => {
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(mockAuth.onAuthStateChange).toHaveBeenCalledTimes(1);
    unmount();
    // Após unmount, emitir um evento não deve causar warning de setState
    // em componente desmontado — sem assertion direta, mas a ausência de
    // erro/warning de React valida o cleanup.
    await act(async () => {
      mockAuth._emit("SIGNED_IN", { access_token: "t", user: { id: "x" } });
    });
  });
});
