
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  experience TEXT,
  markets TEXT[],
  goal TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  plan_tier              TEXT    DEFAULT 'starter',
  trading_style          TEXT    DEFAULT 'moderate',
  operations_today       INTEGER DEFAULT 0,
  drawdown_today         NUMERIC DEFAULT 0,
  overtrading_risk       BOOLEAN DEFAULT false,
  best_session           TEXT,
  worst_session          TEXT,
  avg_win_rate           NUMERIC DEFAULT 0,
  dna_consistency        INTEGER DEFAULT 0,
  dna_discipline         INTEGER DEFAULT 0,
  dna_risk_control       INTEGER DEFAULT 0,
  dna_timing             INTEGER DEFAULT 0,
  dna_emotional_control  INTEGER DEFAULT 0,
  dna_updated_at         TIMESTAMPTZ,
  recent_losses          INTEGER DEFAULT 0,
  open_loss_pct          NUMERIC DEFAULT 0,
  username text,
  phone_country text,
  phone text,
  country text,
  timezone text,
  bio text,
  website text,
  avatar_url text,
  CONSTRAINT chk_profiles_plan_tier CHECK (plan_tier IN ('starter','pro','institutional')),
  CONSTRAINT chk_profiles_trading_style CHECK (trading_style IN ('conservative','moderate','aggressive')),
  CONSTRAINT chk_dna_consistency CHECK (dna_consistency BETWEEN 0 AND 100),
  CONSTRAINT chk_dna_discipline CHECK (dna_discipline BETWEEN 0 AND 100),
  CONSTRAINT chk_dna_risk_control CHECK (dna_risk_control BETWEEN 0 AND 100),
  CONSTRAINT chk_dna_timing CHECK (dna_timing BETWEEN 0 AND 100),
  CONSTRAINT chk_dna_emotional_control CHECK (dna_emotional_control BETWEEN 0 AND 100)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE UNIQUE INDEX profiles_username_unique_ci
  ON public.profiles (lower(username)) WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- signals
CREATE TABLE public.signals (
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
  status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','invalidated','filled')),
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
CREATE INDEX idx_signals_status ON public.signals(status);
CREATE INDEX idx_signals_score ON public.signals(score DESC);
CREATE INDEX idx_signals_pair ON public.signals(pair);
CREATE INDEX idx_signals_user_id ON public.signals(user_id);
CREATE INDEX idx_signals_created_at ON public.signals(created_at DESC);
CREATE INDEX idx_signals_status_score ON public.signals(status, score DESC) WHERE status = 'active';
CREATE INDEX idx_signals_user_created ON public.signals(user_id, created_at DESC) WHERE user_id IS NOT NULL;

CREATE POLICY "signals_select_public" ON public.signals FOR SELECT TO authenticated USING (user_id IS NULL);
CREATE POLICY "signals_select_own" ON public.signals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "signals_insert_service" ON public.signals FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "signals_update_service" ON public.signals FOR UPDATE USING (auth.role() = 'service_role');

CREATE TRIGGER trg_signals_updated_at BEFORE UPDATE ON public.signals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bot4x_configs
CREATE TABLE public.bot4x_configs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  active           BOOLEAN     NOT NULL DEFAULT false,
  profile          TEXT        NOT NULL DEFAULT 'conservador' CHECK (profile IN ('conservador','calibradoRSI','calibradoAiScore','agressivo')),
  rsi_threshold_low   NUMERIC  DEFAULT 35,
  rsi_threshold_high  NUMERIC  DEFAULT 65,
  ai_score_min        INTEGER  DEFAULT 85,
  fomo_limit          NUMERIC  DEFAULT 15,
  leverage            INTEGER  DEFAULT 5,
  active_capital      NUMERIC  DEFAULT 0,
  daily_pnl           NUMERIC  DEFAULT 0,
  open_slots          INTEGER  DEFAULT 0 CHECK (open_slots BETWEEN 0 AND 10),
  total_trades_today  INTEGER  DEFAULT 0,
  circuit_breaker     TEXT     NOT NULL DEFAULT 'none' CHECK (circuit_breaker IN ('none','emergency','profitLock')),
  emergency_triggered_at   TIMESTAMPTZ,
  profit_lock_triggered_at TIMESTAMPTZ,
  exchange            TEXT     DEFAULT 'binance',
  api_key_set         BOOLEAN  DEFAULT false,
  sl_pct numeric DEFAULT 0.5 CHECK (sl_pct BETWEEN 0.1 AND 10),
  tp_pct numeric DEFAULT 1.0 CHECK (tp_pct BETWEEN 0.1 AND 20),
  allocation_pct integer DEFAULT 30 CHECK (allocation_pct BETWEEN 1 AND 100),
  total_capital numeric DEFAULT 1000,
  preferred_pairs jsonb NOT NULL DEFAULT '[]'::jsonb,
  avoid_pairs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot4x_configs TO authenticated;
GRANT ALL ON public.bot4x_configs TO service_role;
ALTER TABLE public.bot4x_configs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bot4x_configs_user_id ON public.bot4x_configs(user_id);
CREATE POLICY "bot4x_configs_own" ON public.bot4x_configs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_bot4x_configs_updated_at BEFORE UPDATE ON public.bot4x_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- copilot_history
CREATE TABLE public.copilot_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user','assistant','alert','system')),
  content     TEXT        NOT NULL,
  agent       TEXT,
  metadata    JSONB       DEFAULT '{}',
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.copilot_history TO authenticated;
GRANT ALL ON public.copilot_history TO service_role;
ALTER TABLE public.copilot_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_copilot_history_user_id ON public.copilot_history(user_id);
CREATE INDEX idx_copilot_history_created_at ON public.copilot_history(created_at DESC);
CREATE INDEX idx_copilot_history_user_time ON public.copilot_history(user_id, created_at DESC);
CREATE INDEX idx_copilot_history_expires ON public.copilot_history(expires_at);
CREATE POLICY "copilot_history_own" ON public.copilot_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_copilot_history_expires_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.expires_at := NEW.created_at + INTERVAL '90 days'; RETURN NEW; END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_copilot_history_expires_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_copilot_history_set_expires_at
  BEFORE INSERT OR UPDATE OF created_at ON public.copilot_history
  FOR EACH ROW EXECUTE FUNCTION public.set_copilot_history_expires_at();

-- bot4x_trades
CREATE TABLE public.bot4x_trades (
  id           text        PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day          date        NOT NULL,
  pair         text        NOT NULL,
  side         text        NOT NULL CHECK (side IN ('LONG','SHORT')),
  entry        numeric     NOT NULL,
  stop         numeric,
  target       numeric,
  result       text        NOT NULL CHECK (result IN ('WIN','LOSS','BLOCKED','OPEN')),
  pnl          numeric     NOT NULL DEFAULT 0,
  pnl_pct      numeric     NOT NULL DEFAULT 0,
  accumulated  numeric     NOT NULL DEFAULT 0,
  profile      text,
  leverage     integer,
  motivo       text,
  hour         integer,
  created_at   timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot4x_trades TO authenticated;
GRANT ALL ON public.bot4x_trades TO service_role;
ALTER TABLE public.bot4x_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own trades" ON public.bot4x_trades FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own trades" ON public.bot4x_trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own trades" ON public.bot4x_trades FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own trades" ON public.bot4x_trades FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX bot4x_trades_user_day ON public.bot4x_trades (user_id, day DESC);
CREATE INDEX bot4x_trades_user_pair ON public.bot4x_trades (user_id, pair);
CREATE INDEX idx_bot4x_trades_user_day_created ON public.bot4x_trades(user_id, day DESC, created_at DESC);

-- calibrator_runs
CREATE TABLE public.calibrator_runs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  profile         text        NOT NULL,
  symbol          text        NOT NULL,
  period_days     integer     NOT NULL,
  initial_balance numeric     NOT NULL,
  leverage        integer     NOT NULL DEFAULT 1,
  trades          integer     NOT NULL DEFAULT 0,
  wins            integer     NOT NULL DEFAULT 0,
  losses          integer     NOT NULL DEFAULT 0,
  win_rate        numeric     NOT NULL DEFAULT 0,
  pnl             numeric     NOT NULL DEFAULT 0,
  pnl_pct         numeric     NOT NULL DEFAULT 0,
  max_drawdown    numeric     NOT NULL DEFAULT 0,
  sharpe          numeric     NOT NULL DEFAULT 0,
  full_result     jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calibrator_runs TO authenticated;
GRANT ALL ON public.calibrator_runs TO service_role;
ALTER TABLE public.calibrator_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own runs" ON public.calibrator_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own runs" ON public.calibrator_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own runs" ON public.calibrator_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own runs" ON public.calibrator_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX calibrator_runs_user_created ON public.calibrator_runs(user_id, created_at DESC);

-- user_preferences
CREATE TABLE public.user_preferences (
  user_id         uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  compact_pill    boolean NOT NULL DEFAULT false,
  onboarding_done boolean NOT NULL DEFAULT false,
  wishlist        text[]  NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON public.user_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_notifications
CREATE TABLE public.user_notifications (
  id          text        PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text        NOT NULL,
  title       text        NOT NULL,
  body        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  read        boolean     NOT NULL DEFAULT false,
  dismissed   boolean     NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.user_notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX user_notifications_user_created ON public.user_notifications(user_id, created_at DESC);

-- trade_outbox
CREATE TABLE public.trade_outbox (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_data   JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_outbox TO authenticated;
GRANT ALL ON public.trade_outbox TO service_role;
ALTER TABLE public.trade_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own outbox" ON public.trade_outbox FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own outbox" ON public.trade_outbox FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own outbox" ON public.trade_outbox FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own outbox" ON public.trade_outbox FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_trade_outbox_status ON public.trade_outbox(status, created_at) WHERE status = 'pending';

-- user_roles + has_role
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','moderator','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- admin_audit_log
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  table_name text NOT NULL,
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_log_target_idx ON public.admin_audit_log(target_user_id, created_at DESC);
CREATE INDEX admin_audit_log_actor_idx ON public.admin_audit_log(actor_id, created_at DESC);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- rate_limits
CREATE TABLE public.rate_limits (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', NOW()),
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, action, window_start)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id UUID, p_action TEXT, p_max INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_window TIMESTAMPTZ := date_trunc('minute', NOW());
  v_count  INTEGER;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'check_rate_limit can only be called for the authenticated user' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.rate_limits(user_id, action, window_start, count)
  VALUES (p_user_id, p_action, v_window, 1)
  ON CONFLICT (user_id, action, window_start) DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;
  RETURN v_count <= p_max;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer) TO service_role;
