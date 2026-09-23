ALTER TABLE public.bot4x_configs
  ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'DEMO'
  CHECK (execution_mode IN ('DEMO', 'REAL'));

CREATE TABLE public.bot4x_execution_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id uuid NULL,
  pair text NOT NULL,
  side text NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quote_amount numeric NOT NULL CHECK (quote_amount > 0),
  mode text NOT NULL CHECK (mode IN ('DEMO', 'REAL')),
  status text NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('received', 'blocked', 'pending_confirmation', 'confirmed', 'processed', 'cancelled', 'failed')),
  readings jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL DEFAULT '',
  idempotency_key text NOT NULL,
  confirmed_at timestamptz NULL,
  processed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot4x_execution_intents TO authenticated;
GRANT ALL ON public.bot4x_execution_intents TO service_role;

ALTER TABLE public.bot4x_execution_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own execution intents"
ON public.bot4x_execution_intents FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own execution intents"
ON public.bot4x_execution_intents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own execution intents"
ON public.bot4x_execution_intents FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own execution intents"
ON public.bot4x_execution_intents FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX bot4x_execution_intents_user_status_created_idx
ON public.bot4x_execution_intents (user_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_bot4x_execution_intent_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_bot4x_execution_intents_updated_at
BEFORE UPDATE ON public.bot4x_execution_intents
FOR EACH ROW EXECUTE FUNCTION public.set_bot4x_execution_intent_updated_at();