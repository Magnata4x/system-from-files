import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authAdapter } from "@/adapters/backend/auth.adapter";

export function useBackendAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const me = await authAdapter.getMe();
        setUserId(me?.userId ?? data.session.user.id);
      } else {
        setUserId(null);
      }
      setReady(true);
    };
    sync();
    const { data: listener } = supabase.auth.onAuthStateChange(() => sync());
    return () => listener.subscription.unsubscribe();
  }, []);

  return { userId, ready };
}
