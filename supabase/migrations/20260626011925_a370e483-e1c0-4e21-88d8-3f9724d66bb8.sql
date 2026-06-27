-- Prevent users from self-escalating their plan_tier or other billing-controlled fields.
CREATE OR REPLACE FUNCTION public.prevent_plan_tier_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (backend/billing) to change plan_tier freely.
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
    RAISE EXCEPTION 'plan_tier can only be modified by the billing system'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_plan_tier_self_escalation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_prevent_plan_tier_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_plan_tier_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_plan_tier_self_escalation();