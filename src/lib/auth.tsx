import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1) Subscreve PRIMEIRO para não perder eventos disparados durante a
    //    hidratação inicial (SIGNED_IN logo após restore do localStorage,
    //    TOKEN_REFRESHED enquanto getSession ainda resolve, etc.).
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s);
      setLoading(false);
    });

    // 2) Hidrata sincronamente a partir do storage. Sem isso, no F5 a UI
    //    fica em loading até o INITIAL_SESSION chegar (race que aparecia
    //    como "tela em branco" ao recarregar).
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });

    // 3) Garante refresh do token quando a aba volta a ficar visível ou
    //    a rede reconecta — evita 401 silencioso após sleep / suspensão
    //    do navegador, que também causava tela vazia até o próximo evento.
    const refreshIfStale = async () => {
      const { data } = await supabase.auth.getSession();
      const expiresAt = data.session?.expires_at ?? 0;
      const now = Math.floor(Date.now() / 1000);
      // Refresh proativo se faltar menos de 60s para expirar.
      if (data.session && expiresAt - now < 60) {
        await supabase.auth.refreshSession();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshIfStale();
    };
    const onOnline = () => void refreshIfStale();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
