import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader } from "@tanstack/react-start/server";
import { cachedJson } from "./cache";
import { type SignalListItemDTO, mapSignal, resolveApiBase, SIGNALS_TTL } from "./signals.mappers";

export type { SignalListItemDTO };

export const getSignalsList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SignalListItemDTO[]> => {
    const base = resolveApiBase();

    // Sem backend externo: usa o motor interno portado (mesma lógica de /api/signals).
    if (!base) {
      return cachedJson(`signals:list:${context.userId}`, SIGNALS_TTL, async () => {
        const { generateSignals } = await import("@/lib/server/engine.server");
        const raw = await generateSignals();
        return raw.map((s) => mapSignal(s as unknown as Record<string, unknown>));
      });
    }

    const authHeader = getRequestHeader("authorization");
    if (!authHeader) return [];

    return cachedJson(`signals:list:${context.userId}`, SIGNALS_TTL, async () => {
      const res = await fetch(`${base.replace(/\/+$/, "")}/signals`, {
        headers: { authorization: authHeader, accept: "application/json" },
      });
      if (!res.ok) return [];
      const raw = (await res.json()) as Array<Record<string, unknown>>;
      return raw.map(mapSignal);
    });
  });
