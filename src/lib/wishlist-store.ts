import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadPrefs, savePrefs } from "./user-prefs-db";

export function useWishlist() {
  const [ids, setIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        loadPrefs(uid).then((p) => {
          if (p) setIds(p.wishlist);
        });
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        loadPrefs(uid).then((p) => {
          if (p) setIds(p.wishlist ?? []);
        });
      } else {
        setIds([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string) => {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      setIds(next);
      if (userId) savePrefs(userId, { wishlist: next });
      return next.includes(id);
    },
    [ids, userId],
  );

  const remove = useCallback(
    (id: string) => {
      const next = ids.filter((x) => x !== id);
      setIds(next);
      if (userId) savePrefs(userId, { wishlist: next });
    },
    [ids, userId],
  );

  return { ids, has, toggle, remove };
}
