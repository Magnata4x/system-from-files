// Vitest global setup.
import { vi, afterEach } from "vitest";

// Unit tests must not depend on Lovable/Supabase project secrets. These are
// deliberately non-functional values used only to let the generated client
// initialize when a store imports it at module scope.
vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY ??= "test-publishable-key";
import { cleanup } from "@testing-library/react";

// `sonner` toast — usado pelo dna-auto-corrector; evita console noise.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
  },
}));

afterEach(() => {
  // Sem `globals: true`, testing-library não auto-limpa entre testes,
  // o que faz componentes do teste anterior continuarem montados.
  cleanup();
  if (typeof localStorage !== "undefined") localStorage.clear();
});
