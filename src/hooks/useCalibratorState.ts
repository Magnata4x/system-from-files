// Hook de leitura do estado do Bot4x Calibration Engine (BCE).
// - Fetch inicial via REST (calibratorAdapter.getState)
// - Atualização por polling a cada 15s (o backend não tem gateway WS
//   para 'calibrator:state').
import { useEffect, useRef, useState } from "react";
import {
  calibratorAdapter,
  type CalibratorStateUI,
} from "@/adapters/backend/calibrator.adapter";

export type WsStatus = "idle" | "connecting" | "open" | "closed" | "unauthenticated" | "error";
const POLL_INTERVAL_MS = 15_000;

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
  const [wsStatus, setWsStatus] = useState<WsStatus>("idle");
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

    setWsStatus("open");
    refetch();
    const pollId = window.setInterval(() => {
      refetch();
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(pollId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { data, isLoading, wsStatus, error, refetch };
}
