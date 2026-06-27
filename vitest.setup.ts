// Vitest global setup.
import { vi, afterEach } from "vitest";
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
