REVOKE INSERT, UPDATE, DELETE ON public.bot4x_execution_intents FROM authenticated;

DROP POLICY IF EXISTS "Users can create own execution intents" ON public.bot4x_execution_intents;
DROP POLICY IF EXISTS "Users can update own execution intents" ON public.bot4x_execution_intents;
DROP POLICY IF EXISTS "Users can delete own execution intents" ON public.bot4x_execution_intents;

CREATE POLICY "Service role manages execution intents"
ON public.bot4x_execution_intents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role manages rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);