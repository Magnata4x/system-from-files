/**
 * Sentry bootstrap. Idempotent: chamadas múltiplas (HMR) são no-op após a
 * primeira. Em dev (sem DSN) o módulo expõe stubs que não fazem nada,
 * mantendo o mesmo contrato para o resto do código.
 */
import * as Sentry from "@sentry/react";

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) {
    // Sem DSN: deixar Sentry como no-op. captureException/Message viram
    // chamadas vazias quando o client não foi inicializado.
    return;
  }
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
    tracesSampleRate: 0.1,
    // Integrations padrão do browser SDK já cobrem fetch/xhr/history.
    // Se o pacote @sentry/tanstackstart-react for adicionado depois,
    // trocar aqui pelo tanstackRouterBrowserTracingIntegration.
  });
  initialized = true;
}

export { Sentry };
