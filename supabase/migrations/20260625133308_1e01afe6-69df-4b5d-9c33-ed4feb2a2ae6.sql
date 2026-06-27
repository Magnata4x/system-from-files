
-- Rate limit tracker keyed by arbitrary string (typically client IP).
-- Sibling of public.rate_limits (which is keyed by auth user_id) — needed
-- because endpoints like /api/auth/demo-session are called by anonymous
-- users where no auth.uid() exists.
DO $$
BEGIN
  CREATE TABLE public.rate_limits_by_key (
    key           TEXT        NOT NULL,
    action        TEXT        NOT NULL,
    window_start  TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
    count         INTEGER     NOT NULL DEFAULT 0,
    PRIMARY KEY (key, action, window_start)
  );
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE INDEX idx_rate_limits_by_key_window
    ON public.rate_limits_by_key (window_start);
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

-- No GRANTs to anon/authenticated — only service_role + SECURITY DEFINER
-- function may touch this table. RLS enabled with no policies = locked.
GRANT ALL ON public.rate_limits_by_key TO service_role;
ALTER TABLE public.rate_limits_by_key ENABLE ROW LEVEL SECURITY;

-- Helper: register one hit for (key, action) inside a rolling window and
-- return TRUE while the caller is still under the limit. Windows are
-- bucketed by truncating now() to p_window_seconds resolution so the
-- primary key collapses concurrent inserts cleanly.
CREATE OR REPLACE FUNCTION public.check_rate_limit_by_key(
  p_key             TEXT,
  p_action          TEXT,
  p_max             INTEGER,
  p_window_seconds  INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window TIMESTAMPTZ := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );
  v_count  INTEGER;
BEGIN
  INSERT INTO public.rate_limits_by_key(key, action, window_start, count)
  VALUES (p_key, p_action, v_window, 1)
  ON CONFLICT (key, action, window_start)
  DO UPDATE SET count = public.rate_limits_by_key.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit_by_key(TEXT, TEXT, INTEGER, INTEGER)
  TO service_role;

-- Pre-register the demo_session action with its policy so callers can
-- discover the configured limit from a single place.
DO $$
BEGIN
  CREATE TABLE public.rate_limit_policies (
    action          TEXT PRIMARY KEY,
    max_attempts    INTEGER     NOT NULL,
    window_seconds  INTEGER     NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

GRANT SELECT ON public.rate_limit_policies TO service_role;
ALTER TABLE public.rate_limit_policies ENABLE ROW LEVEL SECURITY;

INSERT INTO public.rate_limit_policies (action, max_attempts, window_seconds, description)
VALUES ('demo_session', 5, 60, 'Anonymous demo sign-in attempts per client IP')
ON CONFLICT (action) DO UPDATE
  SET max_attempts   = EXCLUDED.max_attempts,
      window_seconds = EXCLUDED.window_seconds,
      description    = EXCLUDED.description;
