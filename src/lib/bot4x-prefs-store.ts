import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { loadPrefs, savePrefs, DEFAULT_BOT4X_ALERTS, type Bot4xAlertPrefs } from "./user-prefs-db";

type State = {
  compactPill: boolean;
  onboardingDone: boolean;
  bot4xAlerts: Bot4xAlertPrefs;
  setCompactPill: (v: boolean) => void;
  setOnboardingDone: (v: boolean) => void;
  setBot4xAlert: (key: keyof Bot4xAlertPrefs, value: boolean) => void;
  loadFromDb: (userId: string) => Promise<void>;
};

export const useBot4xPrefs = create<State>((set, get) => ({
  compactPill: false,
  onboardingDone: false,
  bot4xAlerts: DEFAULT_BOT4X_ALERTS,

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
  setBot4xAlert: (key, value) => {
    const bot4xAlerts = { ...get().bot4xAlerts, [key]: value };
    set({ bot4xAlerts });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) savePrefs(data.user.id, { bot4xAlerts });
    });
  },
  loadFromDb: async (userId) => {
    const prefs = await loadPrefs(userId);
    if (prefs) {
      set({
        compactPill: prefs.compactPill,
        onboardingDone: prefs.onboardingDone,
        bot4xAlerts: prefs.bot4xAlerts,
      });
    }
  },
}));

// Carrega ao logar; limpa ao deslogar
supabase.auth.onAuthStateChange((event, session) => {
  const uid = session?.user?.id;
  if (uid && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
    useBot4xPrefs.getState().loadFromDb(uid);
  }
  if (event === "SIGNED_OUT") {
    useBot4xPrefs.setState({
      compactPill: false,
      onboardingDone: false,
      bot4xAlerts: DEFAULT_BOT4X_ALERTS,
    });
  }
});
