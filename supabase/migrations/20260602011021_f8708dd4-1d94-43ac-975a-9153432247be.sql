-- ============================================================
-- 1) Expand profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_tier              TEXT    DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS trading_style          TEXT    DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS operations_today       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drawdown_today         NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtrading_risk       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS best_session           TEXT,
  ADD COLUMN IF NOT EXISTS worst_session          TEXT,
  ADD COLUMN IF NOT EXISTS avg_win_rate           NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dna_consistency        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dna_discipline         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dna_risk_control       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dna_timing             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dna_emotional_control  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dna_updated_at         TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_plan_tier') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_plan_tier
      CHECK (plan_tier IN ('starter','pro','institutional'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_trading_style') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_trading_style
      CHECK (trading_style IN ('conservative','moderate','aggressive'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_dna_consistency') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT chk_dna_consistency CHECK (dna_consistency BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_dna_discipline') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT chk_dna_discipline CHECK (dna_discipline BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_dna_risk_control') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT chk_dna_risk_control CHECK (dna_risk_control BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_dna_timing') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT chk_dna_timing CHECK (dna_timing BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_dna_emotional_control') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT chk_dna_emotional_control CHECK (dna_emotional_control BETWEEN 0 AND 100);
  END IF;
END$$;

-- ============================================================
-- 2) signals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.signals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pair            TEXT        NOT NULL,
  side            TEXT        NOT NULL CHECK (side IN ('BUY','SELL')),
  score           INTEGER     NOT NULL CHECK (score BETWEEN 0 AND 100),
  ai_score        INTEGER     DEFAULT 0,
  entry_price     NUMERIC     NOT NULL,
  stop_loss       NUMERIC,
  take_profit1    NUMERIC,
  take_profit2    NUMERIC,
  timeframe       TEXT        DEFAULT '4H',
  status          TEXT        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','invalidated','filled')),
  channel_zone    TEXT        CHECK (channel_zone IN ('TOP','MIDDLE','BOTTOM')),
  rsi             NUMERIC,
  liquidity_grab  BOOLEAN     DEFAULT false,
  ai_reasoning    TEXT,
  confirmations   TEXT,
  invalidations   TEXT,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON public.signals TO authenticated;
GRANT ALL ON public.signals TO service_role;

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_signals_status     ON public.signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_score      ON public.signals(score DESC);
CREATE INDEX IF NOT EXISTS idx_signals_pair       ON public.signals(pair);
CREATE INDEX IF NOT EXISTS idx_signals_user_id    ON public.signals(user_id);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON public.signals(created_at DESC);

DROP POLICY IF EXISTS "signals_select_all"     ON public.signals;
DROP POLICY IF EXISTS "signals_insert_service" ON public.signals;
DROP POLICY IF EXISTS "signals_update_service" ON public.signals;

CREATE POLICY "signals_select_all"     ON public.signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "signals_insert_service" ON public.signals FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "signals_update_service" ON public.signals FOR UPDATE USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS trg_signals_updated_at ON public.signals;
CREATE TRIGGER trg_signals_updated_at
  BEFORE UPDATE ON public.signals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3) bot4x_configs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bot4x_configs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  active           BOOLEAN     NOT NULL DEFAULT false,
  profile          TEXT        NOT NULL DEFAULT 'conservador'
                   CHECK (profile IN ('conservador','calibradoRSI','calibradoAiScore','agressivo')),
  rsi_threshold_low   NUMERIC  DEFAULT 35,
  rsi_threshold_high  NUMERIC  DEFAULT 65,
  ai_score_min        INTEGER  DEFAULT 85,
  fomo_limit          NUMERIC  DEFAULT 15,
  leverage            INTEGER  DEFAULT 5,
  active_capital      NUMERIC  DEFAULT 0,
  daily_pnl           NUMERIC  DEFAULT 0,
  open_slots          INTEGER  DEFAULT 0 CHECK (open_slots BETWEEN 0 AND 3),
  total_trades_today  INTEGER  DEFAULT 0,
  circuit_breaker     TEXT     NOT NULL DEFAULT 'none'
                      CHECK (circuit_breaker IN ('none','emergency','profitLock')),
  emergency_triggered_at   TIMESTAMPTZ,
  profit_lock_triggered_at TIMESTAMPTZ,
  exchange            TEXT     DEFAULT 'binance',
  api_key_set         BOOLEAN  DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot4x_configs TO authenticated;
GRANT ALL ON public.bot4x_configs TO service_role;

ALTER TABLE public.bot4x_configs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bot4x_configs_user_id ON public.bot4x_configs(user_id);

DROP POLICY IF EXISTS "bot4x_configs_own" ON public.bot4x_configs;
CREATE POLICY "bot4x_configs_own" ON public.bot4x_configs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_bot4x_configs_updated_at ON public.bot4x_configs;
CREATE TRIGGER trg_bot4x_configs_updated_at
  BEFORE UPDATE ON public.bot4x_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4) copilot_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.copilot_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user','assistant','alert','system')),
  content     TEXT        NOT NULL,
  agent       TEXT,
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.copilot_history TO authenticated;
GRANT ALL ON public.copilot_history TO service_role;

ALTER TABLE public.copilot_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_copilot_history_user_id    ON public.copilot_history(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_history_created_at ON public.copilot_history(created_at DESC);

DROP POLICY IF EXISTS "copilot_history_own" ON public.copilot_history;
CREATE POLICY "copilot_history_own" ON public.copilot_history FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5) Default Bot4x config for existing users
-- ============================================================
INSERT INTO public.bot4x_configs (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
