// Contexto de trace simples — usa AsyncLocalStorage no servidor (Node/Worker)
// quando disponível, e cai num slot global no browser. Permite que o
// interceptor de erro do axios e o cliente WebSocket leiam o trace_id atual
// sem precisar receber o config da request.

type Store = { traceId: string };

let als: { getStore: () => Store | undefined; run: <T>(s: Store, fn: () => T) => T } | undefined;

// Tentar carregar AsyncLocalStorage apenas em runtime Node-like. Em browser
// puro o import falha silenciosamente e usamos o fallback global.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = (globalThis as { process?: { versions?: { node?: string } } }).process?.versions?.node
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("node:async_hooks")
    : undefined;
  if (mod?.AsyncLocalStorage) {
    als = new mod.AsyncLocalStorage();
  }
} catch {
  als = undefined;
}

let fallbackTraceId: string | undefined;

export function setTraceId(id: string): void {
  const store = als?.getStore();
  if (store) {
    store.traceId = id;
    return;
  }
  fallbackTraceId = id;
}

export function getTraceId(): string | undefined {
  return als?.getStore()?.traceId ?? fallbackTraceId;
}

export function runWithTraceId<T>(id: string, fn: () => T): T {
  if (als) return als.run({ traceId: id }, fn);
  const previous = fallbackTraceId;
  fallbackTraceId = id;
  try {
    return fn();
  } finally {
    fallbackTraceId = previous;
  }
}

export function generateTraceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
