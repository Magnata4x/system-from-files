/**
 * Structured logger com integração Sentry em produção.
 *
 * - Em dev: console.* normal (legível).
 * - Em prod: JSON estruturado em uma linha (pronto para ingestão) e
 *   forward de `error`/`warn` para Sentry quando configurado.
 *
 * FIX OBS-01: trace_id é injetado automaticamente em cada linha de log
 * quando disponível via trace-context, eliminando a necessidade de passar
 * o id manualmente em cada chamada e permitindo correlação de logs no
 * Cloudflare Workers Logs / Logpush.
 */
/* eslint-disable no-console */
import { Sentry } from "./sentry";
// FIX OBS-01: importação lazy para evitar dependência circular em módulos
// que importam logger antes do trace-context estar inicializado.
import { getTraceId } from "./trace-context";

const isProd = import.meta.env.PROD;

type Context = Record<string, unknown>;

function emit(level: "debug" | "log" | "info" | "warn" | "error", message: string, context?: Context) {
  // FIX OBS-01: enriquecer automaticamente com trace_id quando disponível.
  const traceId = getTraceId();
  const enriched: Context = {
    ...(traceId ? { trace_id: traceId } : {}),
    ...(context ?? {}),
  };

  if (isProd) {
    const line = JSON.stringify({
      level,
      message,
      ...enriched,
      ts: new Date().toISOString(),
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else if (level === "info") console.info(line);
    else if (level === "debug") console.debug(line);
    else console.log(line);
    return;
  }
  // Dev: argumentos crus pra preservar object inspection no devtools.
  const ctx = Object.keys(enriched).length ? enriched : "";
  if (level === "error") console.error(message, ctx);
  else if (level === "warn") console.warn(message, ctx);
  else if (level === "info") console.info(message, ctx);
  else if (level === "debug") console.debug(message, ctx);
  else console.log(message, ctx);
}

export const logger = {
  debug: (message: string, context?: Context) => {
    if (!isProd) emit("debug", message, context);
  },
  log: (message: string, context?: Context) => {
    if (!isProd) emit("log", message, context);
  },
  info: (message: string, context?: Context) => {
    if (!isProd) emit("info", message, context);
  },
  warn: (message: string, context?: Context) => {
    emit("warn", message, context);
    if (isProd) Sentry.captureMessage(message, { level: "warning", extra: context });
  },
  error: (message: string, context?: Context) => {
    emit("error", message, context);
    if (isProd) {
      const err = context?.error;
      if (err instanceof Error) {
        Sentry.captureException(err, { extra: { message, ...context } });
      } else {
        Sentry.captureMessage(message, { level: "error", extra: context });
      }
    }
  },
  /**
   * Erros catastróficos que devem disparar alertas imediatos.
   * Sempre emite no console e captura no Sentry com level=fatal.
   */
  fatal: (message: string, context?: Context) => {
    if (isProd) {
      const line = JSON.stringify({
        level: "fatal",
        message,
        ...(context ?? {}),
        ts: new Date().toISOString(),
      });
      console.error(line);
    } else {
      console.error("[FATAL]", message, context ?? "");
    }
    const err = context?.error;
    if (err instanceof Error) {
      Sentry.captureException(err, { level: "fatal", extra: { message, ...context } });
    } else {
      Sentry.captureMessage(message, { level: "fatal", extra: context });
    }
  },
};
