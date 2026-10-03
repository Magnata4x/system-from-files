import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authAdapter } from "@/adapters/backend/auth.adapter";

export function useBackendAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    const sync = async () => {
      const { data } = await supabase.auth.getSession();

      if (disposed) return;

      if (data.session) {
        // The Supabase session is the identity source. Do not block the
        // dashboard on the NestJS /auth/me endpoint being slow or unavailable.
        setUserId(data.session.user.id);
        setReady(true);

        // Refresh backend identity opportunistically without blocking render.
        void authAdapter.getMe().then((me) => {
          if (!disposed && me?.userId) setUserId(me.userId);
        });
      } else {
        setUserId(null);
        setReady(true);
      }
    };

    void sync();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void sync();
    });

    return () => {
      disposed = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { userId, ready };
}
