/// <reference types="vitest" />
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // jsdom é necessário para testar AuthProvider/React-DOM e qualquer
    // módulo que toque `window`/`localStorage` no top-level (ex.: stores
    // persistidos com zustand).
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/lib/**/*.{ts,tsx}"],
      exclude: [
        "src/lib/**/__tests__/**",
        "src/lib/**/*.test.{ts,tsx}",
        "src/lib/**/*.d.ts",
      ],
      thresholds: {
        // Mínimo de 60% para a camada de regras de negócio em src/lib.
        // Ajuste por arquivo conforme novos testes forem adicionados.
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
});
