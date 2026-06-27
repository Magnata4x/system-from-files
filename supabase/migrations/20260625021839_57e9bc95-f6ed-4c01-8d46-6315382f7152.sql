CREATE TABLE IF NOT EXISTS public.trade_outbox (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_data   JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE ON public.trade_outbox TO authenticated;
GRANT ALL ON public.trade_outbox TO service_role;

ALTER TABLE public.trade_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own outbox" ON public.trade_outbox FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own outbox" ON public.trade_outbox FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own outbox" ON public.trade_outbox FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trade_outbox_status ON public.trade_outbox(status, created_at)
  WHERE status = 'pending';