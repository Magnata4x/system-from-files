// Wrapper fino sobre o useSignalsStore — fonte única de verdade.
// Polling removido: o store agora recebe sinais via WebSocket (backendWs)
// e usa um fallback de 60s apenas quando o WS está offline.
import { useSignalsStore } from "@/lib/signals-store";
import type { Signal } from "@/lib/signals-data";

export type { Signal };

export function useSignals() {
  const signals = useSignalsStore((s) => s.signals);
  const lastSyncAt = useSignalsStore((s) => s.lastSyncAt);
  return {
    signals,
    isLoading: lastSyncAt === null,
    lastSyncAt,
  };
}
