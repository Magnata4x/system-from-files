import { useEffect } from "react";
import { useSignalsStore } from "@/lib/signals-store";
import { useDashboardStore } from "@/lib/dashboard-store";
import { useBot4xStore } from "@/lib/bot4x-store";

/**
 * Centraliza o cleanup dos stores Zustand que mantêm setInterval/setTimeout
 * em runtime (signals, dashboard, bot4x). Deve ser chamado no componente
 * raiz autenticado para garantir que ao desmontar (logout, navegação para
 * fora do shell, hot reload) todos os timers sejam limpos — evitando
 * memory leaks e callbacks órfãos disparando contra estado já zerado.
 */
export function useStoreCleanup() {
  useEffect(() => {
    return () => {
      useSignalsStore.getState().cleanup();
      useDashboardStore.getState().cleanup();
      useBot4xStore.getState().cleanup();
    };
  }, []);
}
