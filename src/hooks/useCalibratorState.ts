// Hook de leitura do estado do Bot4x Calibration Engine (BCE).
// - Fetch inicial via REST (calibratorAdapter.getState)
// - Atualização contínua via WS no canal 'calibrator:state'
// Não renderiza nada; apenas expõe o estado para componentes consumirem.
import { useEffect, useRef, useState } from "react";
import { backendWs, type WsStatus } from "@/adapters/backend/ws-client";
import {
  calibratorAdapter,
  mapCalibratorState,
  type BackendCalibratorPayload,
  type CalibratorStateUI,
} from "@/adapters/backend/calibrator.adapter";

export interface UseCalibratorStateResult {
  data: CalibratorStateUI | null;
  isLoading: boolean;
  wsStatus: WsStatus;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCalibratorState(userId: string | undefined): UseCalibratorStateResult {
  const [data, setData] = useState<CalibratorStateUI | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>(backendWs.getStatus());
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  async function refetch() {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await calibratorAdapter.getState(userId);
      if (mountedRef.current) setData(res);
    } catch (e) {
      if (mountedRef.current) setError(e as Error);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    if (!userId) return;

    refetch();

    const offStatus = backendWs.onStatus((s) => {
      if (mountedRef.current) setWsStatus(s);
    });

    const offMsg = backendWs.on("calibrator:state", (payload) => {
      if (!payload || typeof payload !== "object") return;
      try {
        const mapped = mapCalibratorState(payload as BackendCalibratorPayload);
        if (mountedRef.current) setData(mapped);
      } catch {
        /* ignore malformed payload */
      }
    });

    // Garante conexão (no-op se já conectado)
    backendWs.connect("/copilot");

    return () => {
      mountedRef.current = false;
      offStatus();
      offMsg();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { data, isLoading, wsStatus, error, refetch };
}
