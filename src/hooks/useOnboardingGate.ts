import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setState("error");
          return;
        }
        if (data?.onboarding_completed !== true) {
          callbacks.current.onIncomplete();
          return;
        }
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, userId, needsClientCheck, retryCount]);

  return { state, retry: () => setRetryCount((count) => count + 1) };
}
