
-- 1. Prevent plan_tier self-escalation at the policy level (defense in depth on top of existing trigger)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND plan_tier IS NOT DISTINCT FROM (SELECT p.plan_tier FROM public.profiles p WHERE p.id = auth.uid())
);

-- 2. Add explicit DELETE policy for trade_outbox so users can clean up their own entries
CREATE POLICY "Users delete own outbox"
ON public.trade_outbox
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3. Guard check_rate_limit so it cannot be invoked for another user's bucket
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id uuid, p_action text, p_max integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_window TIMESTAMPTZ := date_trunc('minute', NOW());
  v_count  INTEGER;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'check_rate_limit can only be called for the authenticated user'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.rate_limits(user_id, action, window_start, count)
  VALUES (p_user_id, p_action, v_window, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer) TO authenticated, service_role;
