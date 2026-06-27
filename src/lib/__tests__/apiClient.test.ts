// Testa interceptors do apiClient: anexo de Bearer + x-trace-id, e retry em 401
// com refreshSession sem loop infinito.
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Captura os handlers dos interceptors via spy em axios.create.
type ReqHandler = (cfg: Record<string, unknown>) => Promise<Record<string, unknown>>;
type RespErrHandler = (err: Record<string, unknown>) => unknown;

const captured: {
  request?: ReqHandler;
  responseSuccess?: (r: unknown) => unknown;
  responseError?: RespErrHandler;
  instance?: ReturnType<typeof vi.fn>;
} = {};

vi.mock("axios", () => {
  const create = vi.fn(() => {
    // Instância callable (chamada como apiClient(original) no retry).
    const instance = vi.fn(() => Promise.resolve({ retried: true }));
    Object.assign(instance, {
      interceptors: {
        request: {
          use: (fn: ReqHandler) => {
            captured.request = fn;
          },
        },
        response: {
          use: (ok: (r: unknown) => unknown, err: RespErrHandler) => {
            captured.responseSuccess = ok;
            captured.responseError = err;
          },
        },
      },
    });
    captured.instance = instance as unknown as ReturnType<typeof vi.fn>;
    return instance;
  });
  return { default: { create }, create };
});

// Supabase auth mock — variáveis controladas por teste.
const supabaseAuth = {
  getSession: vi.fn(),
  refreshSession: vi.fn(),
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: supabaseAuth },
}));

vi.mock("../sentry", () => ({
  Sentry: {
    withScope: (fn: (s: { setTag: () => void; setContext: () => void }) => void) =>
      fn({ setTag: () => {}, setContext: () => {} }),
    captureException: vi.fn(),
  },
}));

beforeAll(async () => {
  // Garante BASE_URL não-vazia para que o interceptor de request não rejeite.
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
  await import("../apiClient");
});

beforeEach(() => {
  supabaseAuth.getSession.mockReset();
  supabaseAuth.refreshSession.mockReset();
});

describe("apiClient request interceptor", () => {
  it("anexa Authorization: Bearer <token> quando há sessão", async () => {
    supabaseAuth.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-123" } },
    });
    const cfg: Record<string, unknown> = { headers: {} };
    await captured.request!(cfg);
    expect((cfg.headers as Record<string, string>).Authorization).toBe("Bearer tok-123");
  });

  it("gera e anexa x-trace-id único por request", async () => {
    supabaseAuth.getSession.mockResolvedValue({ data: { session: null } });
    const cfgA: Record<string, unknown> = { headers: {} };
    const cfgB: Record<string, unknown> = { headers: {} };
    await captured.request!(cfgA);
    await captured.request!(cfgB);
    const traceA = (cfgA.headers as Record<string, string>)["x-trace-id"];
    const traceB = (cfgB.headers as Record<string, string>)["x-trace-id"];
    expect(traceA).toBeTruthy();
    expect(traceB).toBeTruthy();
    expect(traceA).not.toBe(traceB);
  });
});

describe("apiClient response interceptor", () => {
  it("em 401 com _retry=false: chama refreshSession e re-executa com novo token", async () => {
    supabaseAuth.refreshSession.mockResolvedValue({
      data: { session: { access_token: "new-tok" } },
      error: null,
    });
    const original: Record<string, unknown> = { headers: {}, url: "/x", method: "GET" };
    const err = { response: { status: 401 }, config: original };

    const result = await captured.responseError!(err);
    expect(supabaseAuth.refreshSession).toHaveBeenCalledTimes(1);
    expect((original.headers as Record<string, string>).Authorization).toBe("Bearer new-tok");
    expect(original._retry).toBe(true);
    // o retry passa pelo apiClient(original) → instance() retornou {retried:true}
    expect(result).toEqual({ retried: true });
    expect(captured.instance).toHaveBeenCalledWith(original);
  });

  it("em 401 com _retry=true: rejeita sem chamar refreshSession (sem loop)", async () => {
    const original: Record<string, unknown> = { headers: {}, _retry: true, url: "/x" };
    const err = { response: { status: 401 }, config: original, message: "unauthorized" };

    await expect(captured.responseError!(err)).rejects.toBe(err);
    expect(supabaseAuth.refreshSession).not.toHaveBeenCalled();
  });
});
