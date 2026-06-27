-- Rate limiting infrastructure (per-user, per-minute fixed window).

CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', NOW()),
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, action, window_start)
);

-- Counters are an internal mechanism — no client should read or write them
-- directly. Only the SECURITY DEFINER function below mutates this table,
-- and only service_role has any access.
GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon: RLS denies everything by default,
-- which is exactly what we want.

CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON public.rate_limits(window_start);

-- Atomic increment + check. Returns TRUE when the caller is still within
-- the allowed budget for the current minute, FALSE when the limit is hit.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action  TEXT,
  p_max     INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window TIMESTAMPTZ := date_trunc('minute', NOW());
  v_count  INTEGER;
BEGIN
  INSERT INTO public.rate_limits(user_id, action, window_start, count)
  VALUES (p_user_id, p_action, v_window, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

-- check_rate_limit is callable by signed-in users (RLS-checked policies
-- on copilot_history / bot4x_trades will invoke it). Block anon.
REVOKE ALL ON FUNCTION public.check_rate_limit(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID, TEXT, INTEGER) TO authenticated, service_role;

-- Janitor: drop counters older than 1 hour (windows older than that can
-- never be incremented again).
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  WITH d AS (
    DELETE FROM public.rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM d;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;

-- ── Apply on copilot_history (60 inserts/min/user) ────────────────────
-- Replace the existing INSERT policy with one that calls check_rate_limit.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.copilot_history'::regclass
      AND polcmd = 'a' -- INSERT
  LOOP
    EXECUTE format('DROP POLICY %I ON public.copilot_history', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "Users insert own copilot_history with rate limit"
ON public.copilot_history
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.check_rate_limit(auth.uid(), 'copilot_history.insert', 60)
);

-- ── Apply on bot4x_trades (30 inserts/min/user) ───────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.bot4x_trades'::regclass
      AND polcmd = 'a' -- INSERT
  LOOP
    EXECUTE format('DROP POLICY %I ON public.bot4x_trades', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "Users insert own bot4x_trades with rate limit"
ON public.bot4x_trades
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.check_rate_limit(auth.uid(), 'bot4x_trades.insert', 30)
);
