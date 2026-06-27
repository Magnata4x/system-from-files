import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";

export interface UserPrefsRow {
  compactPill: boolean;
  onboardingDone: boolean;
  wishlist: string[];
}

export async function loadPrefs(userId: string): Promise<UserPrefsRow | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("compact_pill, onboarding_done, wishlist")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    logger.error("[user-prefs-db] load", { error: error, message: error.message });
    return null;
  }
  if (!data) return null;
  return {
    compactPill: data.compact_pill,
    onboardingDone: data.onboarding_done,
    wishlist: data.wishlist ?? [],
  };
}

export async function savePrefs(userId: string, prefs: Partial<UserPrefsRow>): Promise<void> {
  const row = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    ...(prefs.compactPill !== undefined && { compact_pill: prefs.compactPill }),
    ...(prefs.onboardingDone !== undefined && { onboarding_done: prefs.onboardingDone }),
    ...(prefs.wishlist !== undefined && { wishlist: prefs.wishlist }),
  };
  const { error } = await supabase
    .from("user_preferences")
    .upsert(row, { onConflict: "user_id" });
  if (error) logger.error("[user-prefs-db] save", { error: error, message: error.message });
}
