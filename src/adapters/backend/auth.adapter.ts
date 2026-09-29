// Bridge: usa a sessão Supabase apenas como identity layer
// e expõe o JWT para o backend NestJS validar.
import { supabase } from "@/integrations/supabase/client";
import { api } from "./api.adapter";


export const authAdapter = {
  async getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
  async getUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  },
  async refresh(): Promise<string | null> {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? null;
  },
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },
  async getMe(): Promise<{ userId: string; email: string; role: string } | null> {
    try {
      return await api.get<{ userId: string; email: string; role: string }>("/auth/me");
    } catch {
      return null;
    }
  },
};
