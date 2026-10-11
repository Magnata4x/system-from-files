-- Separate Binance credentials by environment without deleting existing records.
-- Existing rows are assigned to "demo" by the column default; no credentials are copied
-- between environments and production remains gated by server configuration.
ALTER TABLE public.exchange_credentials
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'demo';

ALTER TABLE public.exchange_credentials
  DROP CONSTRAINT IF EXISTS exchange_credentials_environment_check;

ALTER TABLE public.exchange_credentials
  ADD CONSTRAINT exchange_credentials_environment_check
  CHECK (environment IN ('demo', 'testnet', 'production'));

-- This table historically used user_id as its primary key. Replace that key with
-- (user_id, environment) so one user's Testnet and production credentials can coexist.
DO $$
DECLARE
  pk_name text;
  pk_columns text[];
BEGIN
  SELECT c.conname,
         array_agg(a.attname ORDER BY k.ordinality)
    INTO pk_name, pk_columns
  FROM pg_constraint c
  JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality) ON true
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
  WHERE c.conrelid = 'public.exchange_credentials'::regclass
    AND c.contype = 'p'
  GROUP BY c.conname;

  IF pk_name IS NOT NULL AND pk_columns = ARRAY['user_id']::text[] THEN
    EXECUTE format('ALTER TABLE public.exchange_credentials DROP CONSTRAINT %I', pk_name);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS exchange_credentials_user_environment_uidx
  ON public.exchange_credentials (user_id, environment);
