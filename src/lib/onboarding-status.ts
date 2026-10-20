import { supabase } from "@/integrations/supabase/client";

export type OnboardingLookup = "completed" | "incomplete" | "error";

export async function lookupOnboarding(userId: string): Promise<OnboardingLookup> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (error) return "error";
    return data?.onboarding_completed === true ? "completed" : "incomplete";
  } catch {
    return "error";
  }
}
