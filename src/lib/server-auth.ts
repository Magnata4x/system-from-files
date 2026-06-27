// Server-side auth probe.
// Cannot use `requireSupabaseAuth` middleware directly here because it
// THROWS on missing/invalid auth (which is fine for protected data fns,
// but fatal for a probe). We replicate its claim-verification logic and
// return a plain DTO instead.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AuthSession =
  | { isAuthenticated: true; userId: string }
  | { isAuthenticated: false; userId?: undefined };

export const getAuthSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthSession> => {
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        return { isAuthenticated: false };
      }

      const request = getRequest();
      const authHeader = request?.headers?.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        // Sem bearer token — SSR inicial (sessão vive em localStorage)
        // ou usuário deslogado. Deixa o AuthGate decidir no client.
        return { isAuthenticated: false };
      }

      const token = authHeader.slice("Bearer ".length);
      if (!token) return { isAuthenticated: false };

      const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims?.sub) return { isAuthenticated: false };

      return { isAuthenticated: true, userId: String(data.claims.sub) };
    } catch {
      return { isAuthenticated: false };
    }
  },
);
