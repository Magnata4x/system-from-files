import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { loadPrefs, savePrefs } from "./user-prefs-db";

type State = {
  compactPill: boolean;
  onboardingDone: boolean;
  setCompactPill: (v: boolean) => void;
  setOnboardingDone: (v: boolean) => void;
  loadFromDb: (userId: string) => Promise<void>;
};

export const useBot4xPrefs = create<State>((set) => ({
  compactPill: false,
  onboardingDone: false,

  setCompactPill: (compactPill) => {
    set({ compactPill });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) savePrefs(data.user.id, { compactPill });
    });
  },
  setOnboardingDone: (onboardingDone) => {
    set({ onboardingDone });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) savePrefs(data.user.id, { onboardingDone });
    });
  },
  loadFromDb: async (userId) => {
    const prefs = await loadPrefs(userId);
    if (prefs) set({ compactPill: prefs.compactPill, onboardingDone: prefs.onboardingDone });
  },
}));

// Carrega ao logar; limpa ao deslogar
supabase.auth.onAuthStateChange((event, session) => {
  const uid = session?.user?.id;
  if (uid && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
    useBot4xPrefs.getState().loadFromDb(uid);
  }
  if (event === "SIGNED_OUT") {
    useBot4xPrefs.setState({ compactPill: false, onboardingDone: false });
  }
});
