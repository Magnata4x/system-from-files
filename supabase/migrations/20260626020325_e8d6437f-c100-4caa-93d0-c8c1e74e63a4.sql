-- Remove ability for authenticated users to UPDATE the plan_tier column at all.
-- The existing trigger profiles_prevent_plan_tier_escalation continues to block
-- plan_tier changes from any role other than service_role as a defense in depth.
REVOKE UPDATE (plan_tier) ON public.profiles FROM authenticated;
REVOKE UPDATE (plan_tier) ON public.profiles FROM anon;

-- Replace the UPDATE policy with a clean owner-scoped check.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
