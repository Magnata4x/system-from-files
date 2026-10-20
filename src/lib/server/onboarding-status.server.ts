import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function readOnboardingStatus(
  request: Request | undefined,
): Promise<{ completed: boolean }> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Authentication service is not configured");
  }

  const authHeader = request?.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Authentication required to verify onboarding");
  }
  const token = authHeader.slice("Bearer ".length);
  if (!token) throw new Error("Authentication required to verify onboarding");

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (claimsError || typeof userId !== "string" || !userId) {
    throw new Error("Unable to validate authentication");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Unable to verify onboarding status");
  return { completed: data?.onboarding_completed === true };
}
