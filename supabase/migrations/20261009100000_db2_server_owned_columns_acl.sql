-- DB-2: server-owned operational fields must not be writable by API clients.
-- Revoke table-level grants first: they override column-level restrictions.
-- Preserve the existing authenticated preference/profile allowlists explicitly.

REVOKE INSERT, UPDATE ON TABLE public.bot4x_configs FROM PUBLIC, anon, authenticated;
GRANT INSERT (
  user_id, active, profile, rsi_threshold_low, rsi_threshold_high, ai_score_min,
  fomo_limit, leverage, total_trades_today, exchange, api_key_set, sl_pct, tp_pct,
  allocation_pct, total_capital, preferred_pairs, avoid_pairs, execution_mode
) ON TABLE public.bot4x_configs TO authenticated;
GRANT UPDATE (
  active, profile, rsi_threshold_low, rsi_threshold_high, ai_score_min, fomo_limit,
  leverage, total_trades_today, exchange, api_key_set, sl_pct, tp_pct,
  allocation_pct, total_capital, preferred_pairs, avoid_pairs, execution_mode
) ON TABLE public.bot4x_configs TO authenticated;

-- These fields are computed/maintained by trusted backend operations.
REVOKE INSERT (circuit_breaker, daily_pnl, open_slots, active_capital)
  ON TABLE public.bot4x_configs FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (circuit_breaker, daily_pnl, open_slots, active_capital)
  ON TABLE public.bot4x_configs FROM PUBLIC, anon, authenticated;

REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
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

-- Operational DNA fields are server-owned. Include recent_losses/open_loss_pct:
-- the daily reset trigger also writes them and clients must not forge them.
REVOKE INSERT (dna_updated_at, operations_today, drawdown_today, avg_win_rate,
               recent_losses, open_loss_pct)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (dna_updated_at, operations_today, drawdown_today, avg_win_rate,
               recent_losses, open_loss_pct)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- Legacy trades and the transactional outbox are backend-write-only.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.bot4x_trades
  FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.trade_outbox
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bot4x_configs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bot4x_trades TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.trade_outbox TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;
