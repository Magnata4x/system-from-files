import { useEffect, useRef, useState } from "react";
import { lookupOnboarding } from "@/lib/onboarding-status";

export type OnboardingGateState = "checking" | "ready" | "error";

export interface UseOnboardingGateOptions {
  loading: boolean;
  userId: string | undefined;
  needsClientCheck: boolean;
  onSignedOut: () => void;
  onIncomplete: () => void;
}

export function useOnboardingGate({
  loading,
  userId,
  needsClientCheck,
  onSignedOut,
  onIncomplete,
}: UseOnboardingGateOptions) {
  const [state, setState] = useState<OnboardingGateState>("checking");
  const [retryCount, setRetryCount] = useState(0);
  const callbacks = useRef({ onSignedOut, onIncomplete });

  useEffect(() => {
    callbacks.current = { onSignedOut, onIncomplete };
  }, [onSignedOut, onIncomplete]);

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      callbacks.current.onSignedOut();
      return;
    }
    if (!needsClientCheck) {
      setState("ready");
      return;
    }

    let cancelled = false;
    setState("checking");
    void lookupOnboarding(userId).then((result) => {
      if (cancelled) return;
      if (result === "error") {
        setState("error");
        return;
      }
      if (result === "incomplete") {
        callbacks.current.onIncomplete();
        return;
      }
      setState("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [loading, userId, needsClientCheck, retryCount]);

  return { state, retry: () => setRetryCount((count) => count + 1) };
}
