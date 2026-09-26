// Cache compartilhado server-side usando a Cache API nativa do Cloudflare
// Workers (`caches.default`). Roda APENAS dentro de server functions ou
// server routes — não importar do bundle do browser.
//
// Por que `caches.default` em vez de Redis externo:
// - zero credencial nova; sem secret de Upstash/Redis para vazar
// - mesma região do edge → latência sub-ms em hit
// - escopo por colocation (PoP); aceitável para market data
//
// Em dev local (Vite/Node), `caches` é undefined; o wrapper degrada para
// um cache em memória por processo, com a mesma semântica de TTL.

type CacheStore = {
  match(req: Request): Promise<Response | undefined>;
  put(req: Request, res: Response): Promise<void>;
};

const memoryStore = new Map<string, { expiresAt: number; body: string }>();

function getEdgeCache(): CacheStore | undefined {
  const c = (globalThis as { caches?: { default?: CacheStore } }).caches;
  return c?.default;
}

// FIX PERF-01: O Map crescia indefinidamente porque entradas expiradas eram
// verificadas mas nunca removidas. Com userId na key (padrão "signals:list:{uid}")
// o Map expandia sem limite em Workers que reutilizam isolates entre requests.
// Solução: purge amortizado — após cada escrita, se o Map superar 500 entradas
// varremos e deletamos todas as que já expiraram. O custo é O(n) mas raro.
const MEMORY_STORE_PURGE_THRESHOLD = 500;

function memoryCachedJson<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = memoryStore.get(key);
  if (hit && hit.expiresAt > now) {
    return Promise.resolve(JSON.parse(hit.body) as T);
  }
  return loader().then((value) => {
    memoryStore.set(key, { expiresAt: now + ttlSeconds * 1000, body: JSON.stringify(value) });

    // Purge amortizado: limpar expirados apenas quando o Map ficar grande demais.
    if (memoryStore.size > MEMORY_STORE_PURGE_THRESHOLD) {
      const nowTs = Date.now();
      for (const [k, v] of memoryStore) {
        if (v.expiresAt <= nowTs) memoryStore.delete(k);
      }
    }

    return value;
  });
}

/**
 * Lê de `caches.default` se houver hit; senão, executa `loader`, armazena com
 * `Cache-Control: max-age=<ttl>` e devolve. A key é normalizada para uma URL
 * sintética — `caches.default` exige Request como chave.
 */
export async function cachedJson<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const edge = getEdgeCache();
  if (!edge) return memoryCachedJson(key, ttlSeconds, loader);

  const cacheKey = new Request(`https://cache.internal/${encodeURIComponent(key)}`);
  const hit = await edge.match(cacheKey);
  if (hit) {
    try {
      return (await hit.json()) as T;
    } catch {
      // payload corrompido: cai para o loader
    }
  }
  const value = await loader();
  const response = new Response(JSON.stringify(value), {
    headers: {
      "content-type": "application/json",
      "cache-control": `public, max-age=${Math.max(1, Math.floor(ttlSeconds))}`,
    },
  });
  await edge.put(cacheKey, response);
  return value;
}

/** Invalida uma única key. Não suporta wildcard em `caches.default`. */
export async function invalidate(key: string): Promise<void> {
  memoryStore.delete(key);
  const edge = getEdgeCache();
  if (!edge) return;
  const cacheKey = new Request(`https://cache.internal/${encodeURIComponent(key)}`);
  // Cache API: put de Response expirada efetivamente invalida.
  await edge.put(cacheKey, new Response("", { headers: { "cache-control": "max-age=0" } }));
}
