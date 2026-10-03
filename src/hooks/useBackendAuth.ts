import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authAdapter } from "@/adapters/backend/auth.adapter";

export function useBackendAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const syncBackendIdentity = async (sessionUserId: string) => {
      const me = await authAdapter.getMe();
      if (mounted) setUserId(me?.userId ?? sessionUserId);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUserId(session?.user.id ?? null);
      setReady(true);
      if (session?.user.id) void syncBackendIdentity(session.user.id);
    });

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const sessionUserId = data.session?.user.id ?? null;
        setUserId(sessionUserId);
        setReady(true);
        if (sessionUserId) void syncBackendIdentity(sessionUserId);
      })
      .catch(() => {
        if (mounted) setReady(true);
      });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { userId, ready };
}
