REVOKE UPDATE, DELETE ON public.bot4x_execution_intents FROM authenticated;
GRANT SELECT, INSERT ON public.bot4x_execution_intents TO authenticated;
GRANT ALL ON public.bot4x_execution_intents TO service_role;

DROP POLICY IF EXISTS "Users can create own execution intents" ON public.bot4x_execution_intents;
DROP POLICY IF EXISTS "Users can update own execution intents" ON public.bot4x_execution_intents;
DROP POLICY IF EXISTS "Users can delete own execution intents" ON public.bot4x_execution_intents;

CREATE POLICY "Users can create pending own execution intents"
ON public.bot4x_execution_intents
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending_confirmation'
  AND mode = 'REAL'
  AND confirmed_at IS NULL
  AND processed_at IS NULL
);

REVOKE EXECUTE ON FUNCTION public.set_bot4x_execution_intent_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_bot4x_execution_intent_updated_at() TO service_role;