-- DB-2.1: close remaining table-level DML paths discovered during live ACL verification.
-- Keep reads governed by the existing RLS policies; clients must not delete records
-- or write operational ledgers/outbox directly. Re-establish only explicit user
-- preference/profile INSERT and UPDATE allowlists after removing broad table grants.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.bot4x_configs FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.bot4x_trades FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.trade_outbox FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

GRANT INSERT (
  user_id, active, profile, rsi_threshold_low, rsi_threshold_high, ai_score_min,
  fomo_limit, leverage, exchange, sl_pct, tp_pct,
  allocation_pct, total_capital, preferred_pairs, avoid_pairs, execution_mode
) ON TABLE public.bot4x_configs TO authenticated;
GRANT UPDATE (
  active, profile, rsi_threshold_low, rsi_threshold_high, ai_score_min, fomo_limit,
  leverage, exchange, sl_pct, tp_pct,
  allocation_pct, total_capital, preferred_pairs, avoid_pairs, execution_mode
) ON TABLE public.bot4x_configs TO authenticated;

GRANT INSERT (
  id, full_name, email, experience, markets, goal, onboarding_completed, created_at,
  updated_at, trading_style, overtrading_risk, best_session, worst_session,
  recent_losses, open_loss_pct, username, phone_country, phone, country, timezone,
  bio, website, avatar_url
) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (
  full_name, email, experience, markets, goal, onboarding_completed, updated_at,
  trading_style, overtrading_risk, best_session, worst_session, recent_losses,
  open_loss_pct, username, phone_country, phone, country, timezone, bio, website,
  avatar_url
) ON TABLE public.profiles TO authenticated;

-- Server-owned config columns are never writable by client roles.
REVOKE INSERT (circuit_breaker, daily_pnl, open_slots, active_capital, total_trades_today, api_key_set)
  ON TABLE public.bot4x_configs FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (circuit_breaker, daily_pnl, open_slots, active_capital, total_trades_today, api_key_set)
  ON TABLE public.bot4x_configs FROM PUBLIC, anon, authenticated;

-- Server-owned DNA and outcome fields are never writable by client roles.
REVOKE INSERT (dna_updated_at, operations_today, drawdown_today, avg_win_rate,
               recent_losses, open_loss_pct)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (dna_updated_at, operations_today, drawdown_today, avg_win_rate,
               recent_losses, open_loss_pct)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- Backend-only operational writes.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bot4x_configs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bot4x_trades TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.trade_outbox TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;
