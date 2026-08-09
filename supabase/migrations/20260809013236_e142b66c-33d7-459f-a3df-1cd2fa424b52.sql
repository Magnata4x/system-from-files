ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS bot4x_alerts jsonb NOT NULL
  DEFAULT '{"configChanged":true,"slTpHit":true,"executionFailed":true,"circuitBreaker":true}'::jsonb;