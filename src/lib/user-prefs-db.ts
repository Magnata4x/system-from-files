import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";

export interface Bot4xAlertPrefs {
  configChanged: boolean;
  slTpHit: boolean;
  executionFailed: boolean;
  circuitBreaker: boolean;
}

export const DEFAULT_BOT4X_ALERTS: Bot4xAlertPrefs = {
  configChanged: true,
  slTpHit: true,
  executionFailed: true,
  circuitBreaker: true,
};

function parseAlerts(raw: unknown): Bot4xAlertPrefs {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    configChanged: o["configChanged"] !== false,
    slTpHit: o["slTpHit"] !== false,
    executionFailed: o["executionFailed"] !== false,
    circuitBreaker: o["circuitBreaker"] !== false,
  };
}

export interface UserPrefsRow {
  compactPill: boolean;
  onboardingDone: boolean;
  wishlist: string[];
  bot4xAlerts: Bot4xAlertPrefs;
}

export async function loadPrefs(userId: string): Promise<UserPrefsRow | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("compact_pill, onboarding_done, wishlist, bot4x_alerts")
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
    bot4xAlerts: parseAlerts((data as { bot4x_alerts?: unknown }).bot4x_alerts),
  };
}

export async function savePrefs(userId: string, prefs: Partial<UserPrefsRow>): Promise<void> {
  const row = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    ...(prefs.compactPill !== undefined && { compact_pill: prefs.compactPill }),
    ...(prefs.onboardingDone !== undefined && { onboarding_done: prefs.onboardingDone }),
    ...(prefs.wishlist !== undefined && { wishlist: prefs.wishlist }),
    ...(prefs.bot4xAlerts !== undefined && {
      bot4x_alerts: { ...prefs.bot4xAlerts } as Record<string, boolean>,
    }),
  };
  const { error } = await supabase
    .from("user_preferences")
    .upsert(row, { onConflict: "user_id" });
  if (error) logger.error("[user-prefs-db] save", { error: error, message: error.message });
}
